const textEncoder = new TextEncoder();

export const PROMPTOS_STATE_POLICY = Object.freeze({
  schemaVersion: 1,
  maxBytes: 524288,
  maxStars: 500,
  maxCustomPrompts: 100,
  maxTitleLength: 120,
  maxSubLength: 240,
  maxBodyLength: 20000,
  maxPlatforms: 8,
});

const ALLOWED_TOP_LEVEL = Object.freeze(['schemaVersion', 'stars', 'custom', 'theme', '_v']);
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ALLOWED_CATS = new Set([
  'coding', 'research', 'redteam', 'system', 'design', 'ecom', 'cloudflare',
  'learning', 'growth', 'ops', 'custom', 'debug', 'security', 'review', 'plan',
  'copy', 'data',
]);

function reject(message) {
  throw new Error(`PromptOS state rejected: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rejectDangerousKeys(value, path = 'root') {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) reject(`${path} contains forbidden key ${key}`);
    rejectDangerousKeys(value[key], `${path}.${key}`);
  }
}

function boundedString(value, label, min, max) {
  if (typeof value !== 'string') reject(`${label} must be a string`);
  if (value.length < min || value.length > max) reject(`${label} length must be ${min}-${max}`);
  return value;
}

function normalizeStars(stars) {
  if (stars == null) return {};
  if (!isPlainObject(stars)) reject('stars must be an object');
  const keys = Object.keys(stars);
  if (keys.length > PROMPTOS_STATE_POLICY.maxStars) reject('too many starred prompts');
  const normalized = {};
  for (const key of keys) {
    if (key.length > 80 || !/^[A-Za-z0-9_-]+$/.test(key)) reject(`invalid star id ${key}`);
    if (stars[key] !== true) reject('star values must be true');
    normalized[key] = true;
  }
  return normalized;
}

function normalizeCustom(custom) {
  if (custom == null) return [];
  if (!Array.isArray(custom)) reject('custom must be an array');
  if (custom.length > PROMPTOS_STATE_POLICY.maxCustomPrompts) reject('too many custom prompts');

  const ids = new Set();
  return custom.map((prompt, index) => {
    const label = `custom[${index}]`;
    if (!isPlainObject(prompt)) reject(`${label} must be an object`);
    const allowed = new Set(['id', 'emoji', 'title', 'sub', 'cat', 'platforms', 'body', 'ts']);
    for (const key of Object.keys(prompt)) {
      if (!allowed.has(key)) reject(`${label} contains unknown key ${key}`);
    }

    const id = boundedString(prompt.id, `${label}.id`, 1, 80);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) reject(`${label}.id contains invalid characters`);
    if (ids.has(id)) reject(`duplicate custom id ${id}`);
    ids.add(id);

    const title = boundedString(prompt.title, `${label}.title`, 1, PROMPTOS_STATE_POLICY.maxTitleLength);
    const sub = prompt.sub == null ? '' : boundedString(prompt.sub, `${label}.sub`, 0, PROMPTOS_STATE_POLICY.maxSubLength);
    const cat = prompt.cat == null ? 'custom' : boundedString(prompt.cat, `${label}.cat`, 1, 32);
    if (!ALLOWED_CATS.has(cat)) reject(`${label}.cat is unsupported`);
    const emoji = prompt.emoji == null ? '✨' : boundedString(prompt.emoji, `${label}.emoji`, 0, 16);
    const body = boundedString(prompt.body, `${label}.body`, 1, PROMPTOS_STATE_POLICY.maxBodyLength);

    if (!Array.isArray(prompt.platforms)
      || prompt.platforms.length < 1
      || prompt.platforms.length > PROMPTOS_STATE_POLICY.maxPlatforms) {
      reject(`${label}.platforms must contain 1-${PROMPTOS_STATE_POLICY.maxPlatforms} entries`);
    }
    const platforms = prompt.platforms.map((platform, platformIndex) => {
      const normalized = boundedString(platform, `${label}.platforms[${platformIndex}]`, 1, 32).trim();
      if (!/^[A-Za-z0-9._ -]+$/.test(normalized)) reject(`${label}.platforms[${platformIndex}] contains invalid characters`);
      return normalized;
    });

    const ts = prompt.ts == null ? 0 : prompt.ts;
    if (!Number.isSafeInteger(ts) || ts < 0) reject(`${label}.ts must be a non-negative integer`);

    return {id, emoji, title, sub, cat, platforms, body, ts};
  });
}

export function validatePromptOSStateText(json) {
  if (typeof json !== 'string') reject('payload must be text');
  if (textEncoder.encode(json).byteLength > PROMPTOS_STATE_POLICY.maxBytes) {
    reject(`payload exceeds ${PROMPTOS_STATE_POLICY.maxBytes} bytes`);
  }

  let data;
  try {
    data = JSON.parse(json);
  } catch {
    reject('invalid JSON');
  }

  if (!isPlainObject(data)) reject('root must be an object');
  rejectDangerousKeys(data);
  for (const key of Object.keys(data)) {
    if (!ALLOWED_TOP_LEVEL.includes(key)) reject(`unknown top-level key ${key}`);
  }
  if (data.schemaVersion !== PROMPTOS_STATE_POLICY.schemaVersion) {
    reject(`schemaVersion must be ${PROMPTOS_STATE_POLICY.schemaVersion}`);
  }

  const theme = data.theme == null ? 'dark' : data.theme;
  if (theme !== 'dark' && theme !== 'light') reject('theme must be dark or light');

  const version = data._v == null ? 0 : data._v;
  if (!Number.isSafeInteger(version) || version < 0) reject('_v must be a non-negative integer');

  return Object.freeze({
    schemaVersion: PROMPTOS_STATE_POLICY.schemaVersion,
    stars: normalizeStars(data.stars),
    custom: normalizeCustom(data.custom),
    theme,
    _v: version,
  });
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const normalized = {};
    for (const key of Object.keys(value).sort()) normalized[key] = canonicalize(value[key]);
    return normalized;
  }
  return value;
}

export function canonicalPromptOSStateJSON(state) {
  return JSON.stringify(canonicalize(state));
}

export async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function promptOSStateFingerprint(state) {
  return sha256Hex(canonicalPromptOSStateJSON(state));
}
