import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const BROWSER_REALITY_CONTRACT_ID = 'juss/browser-reality@v1';
export const BROWSER_REALITY_CANONICALIZATION = 'juss-browser-reality-canonical-json-v1';
export const BROWSER_REALITY_TRUTH_STATES = Object.freeze([
  'VERIFIED',
  'INFERRED',
  'UNKNOWN',
  'BLOCKED',
]);

const REQUIRED_INPUT_FIELDS = Object.freeze([
  'contractId',
  'authorizedInputUrl',
  'finalUrl',
  'observedAt',
  'scope',
  'observations',
]);
const OPTIONAL_INPUT_FIELDS = Object.freeze(['screenshotSha256']);
const OBSERVATION_FIELDS = Object.freeze(['state', 'statement']);
const MAX_NESTED_URL_DEPTH = 3;
const NESTED_URL_DEPTH_REDACTION = 'REDACTED_NESTED_URL';
const TRUTH_STATE_ORDER = new Map(BROWSER_REALITY_TRUTH_STATES.map((state, index) => [state, index]));
const TRACKING_QUERY_KEYS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'mibextid',
  'msclkid',
  'rdid',
  'share_url',
]);
const SENSITIVE_QUERY_KEYS = new Set([
  'accesstoken',
  'apikey',
  'auth',
  'authorization',
  'clientsecret',
  'code',
  'connectsid',
  'cookie',
  'cookies',
  'credential',
  'credentials',
  'csrftoken',
  'encryptedcontext',
  'idtoken',
  'jsessionid',
  'jwt',
  'key',
  'oauth',
  'oauthtoken',
  'password',
  'phpsessid',
  'refreshtoken',
  'secret',
  'session',
  'sessionid',
  'sid',
  'sig',
  'signature',
  'state',
  'token',
  'xsrftoken',
]);

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireExactFields(value, required, optional, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object`);
  const allowed = new Set([...required, ...optional]);
  for (const field of required) {
    if (!Object.hasOwn(value, field)) throw new TypeError(`${label}.${field} is required`);
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) throw new TypeError(`${label}.${field} is not allowed`);
  }
}

function normalizeText(value, label, maxLength) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!normalized) throw new TypeError(`${label} must not be empty`);
  if (normalized.length > maxLength) throw new TypeError(`${label} exceeds ${maxLength} characters`);
  return normalized;
}

function normalizedQueryKey(key) {
  return key.normalize('NFC').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shouldDropQueryKey(key) {
  const lower = key.normalize('NFC').toLowerCase();
  return lower.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lower);
}

function shouldRedactQueryValue(key) {
  return SENSITIVE_QUERY_KEYS.has(normalizedQueryKey(key));
}

function sanitizeDecodedQueryValue(rawValue, depth) {
  const normalized = rawValue.normalize('NFC');
  let nestedUrl;
  try {
    nestedUrl = new URL(normalized);
  } catch {
    return normalized;
  }
  if (nestedUrl.protocol !== 'https:' && nestedUrl.protocol !== 'http:') return normalized;
  if (depth >= MAX_NESTED_URL_DEPTH) return NESTED_URL_DEPTH_REDACTION;
  return sanitizeBrowserRealityUrlAtDepth(normalized, depth + 1);
}

function sanitizeBrowserRealityUrlAtDepth(rawUrl, depth) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 4096) {
    throw new TypeError('browser reality URL must be a non-empty string no longer than 4096 characters');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new TypeError('browser reality URL must be absolute');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TypeError('browser reality URL protocol must be http or https');
  }

  const pairs = [];
  for (const [rawKey, rawValue] of parsed.searchParams.entries()) {
    const key = rawKey.normalize('NFC');
    if (shouldDropQueryKey(key)) continue;
    const value = shouldRedactQueryValue(key)
      ? 'REDACTED'
      : sanitizeDecodedQueryValue(rawValue, depth);
    pairs.push([key, value]);
  }
  pairs.sort((left, right) => compareCodeUnits(left[0], right[0]) || compareCodeUnits(left[1], right[1]));

  const query = new URLSearchParams();
  for (const [key, value] of pairs) query.append(key, value);

  const hostname = parsed.hostname.toLowerCase();
  const renderedHost = hostname.startsWith('[') ? hostname : hostname.includes(':') ? `[${hostname}]` : hostname;
  const port = parsed.port ? `:${parsed.port}` : '';
  const pathname = parsed.pathname || '/';
  const search = query.size > 0 ? `?${query.toString()}` : '';
  return `${parsed.protocol.toLowerCase()}//${renderedHost}${port}${pathname}${search}`;
}

export function sanitizeBrowserRealityUrl(rawUrl) {
  return sanitizeBrowserRealityUrlAtDepth(rawUrl, 0);
}

function normalizeObservedAt(value) {
  if (typeof value !== 'string') throw new TypeError('browserRealityEvidence.observedAt must be a string');
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) throw new TypeError('browserRealityEvidence.observedAt must be a valid timestamp');
  return timestamp.toISOString();
}

function normalizeObservations(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    throw new TypeError('browserRealityEvidence.observations must contain 1 to 64 observations');
  }

  const normalized = value.map((observation, index) => {
    requireExactFields(observation, OBSERVATION_FIELDS, [], `browserRealityEvidence.observations[${index}]`);
    if (!TRUTH_STATE_ORDER.has(observation.state)) {
      throw new TypeError(`browserRealityEvidence.observations[${index}].state is invalid`);
    }
    return {
      state: observation.state,
      statement: normalizeText(
        observation.statement,
        `browserRealityEvidence.observations[${index}].statement`,
        1000,
      ),
    };
  });

  normalized.sort((left, right) => (
    TRUTH_STATE_ORDER.get(left.state) - TRUTH_STATE_ORDER.get(right.state)
    || compareCodeUnits(left.statement, right.statement)
  ));

  return normalized.filter((observation, index) => (
    index === 0
    || observation.state !== normalized[index - 1].state
    || observation.statement !== normalized[index - 1].statement
  ));
}

function normalizeScreenshotSha256(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new TypeError('browserRealityEvidence.screenshotSha256 must be a 64-character hexadecimal SHA-256 digest');
  }
  return value.toLowerCase();
}

export function buildBrowserRealityReceipt(input) {
  requireExactFields(input, REQUIRED_INPUT_FIELDS, OPTIONAL_INPUT_FIELDS, 'browserRealityEvidence');
  if (input.contractId !== BROWSER_REALITY_CONTRACT_ID) {
    throw new TypeError(`browserRealityEvidence.contractId must be ${BROWSER_REALITY_CONTRACT_ID}`);
  }

  const receipt = {
    contractId: BROWSER_REALITY_CONTRACT_ID,
    authorizedInputUrl: sanitizeBrowserRealityUrl(input.authorizedInputUrl),
    finalUrl: sanitizeBrowserRealityUrl(input.finalUrl),
    observedAt: normalizeObservedAt(input.observedAt),
    scope: normalizeText(input.scope, 'browserRealityEvidence.scope', 160),
    observations: normalizeObservations(input.observations),
  };
  if (Object.hasOwn(input, 'screenshotSha256')) {
    receipt.screenshotSha256 = normalizeScreenshotSha256(input.screenshotSha256);
  }
  return receipt;
}

export function canonicalizeBrowserRealityReceipt(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical browser reality receipt cannot contain non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeBrowserRealityReceipt(item)).join(',')}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort(compareCodeUnits);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeBrowserRealityReceipt(value[key])}`).join(',')}}`;
  }
  throw new TypeError('canonical browser reality receipt contains an unsupported value');
}

export function fingerprintBrowserRealityEvidence(input) {
  const receipt = buildBrowserRealityReceipt(input);
  const canonicalJson = canonicalizeBrowserRealityReceipt(receipt);
  const sha256 = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return Object.freeze({receipt, canonicalJson, sha256});
}

async function runDigestCli() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new TypeError('browser reality CLI input exceeds 1 MiB');
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const result = fingerprintBrowserRealityEvidence(input);
  process.stdout.write(`${JSON.stringify({
    contractId: BROWSER_REALITY_CONTRACT_ID,
    canonicalization: BROWSER_REALITY_CANONICALIZATION,
    evidenceFingerprintSha256: result.sha256,
  })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  runDigestCli().catch((error) => {
    console.error(`Browser reality evidence fingerprint failed: ${error.message}`);
    process.exitCode = 1;
  });
}
