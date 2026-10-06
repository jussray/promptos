const FULL_SHA = /^[0-9a-f]{40}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const AUTHORITY = Object.freeze({
  evidenceOnly: true,
  createsTruth: false,
  createsAuthority: false,
  executionAuthorized: false,
  mergeAuthorized: false,
  deployAuthorized: false,
  publishAuthorized: false,
  credentialMutationAuthorized: false,
  providerMutationAuthorized: false,
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function text(value, label, max = 4000) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim().slice(0, max);
}

function fullSha(value, label) {
  const out = text(value, label, 40).toLowerCase();
  if (!FULL_SHA.test(out)) throw new Error(`${label} must be a full git SHA`);
  return out;
}

function hash(value, label) {
  const out = text(value, label, 64).toLowerCase();
  if (!HASH.test(out)) throw new Error(`${label} must be SHA-256`);
  return out;
}

function instant(value, label) {
  const raw = text(value, label, 80);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new Error(`${label} must be an ISO timestamp`);
  return { raw, ms };
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(stable(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function exactAuthority(value, label = 'authority') {
  const input = record(value, label);
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (input[key] !== expected) throw new Error(`${label}.${key} widened or missing`);
  }
  return AUTHORITY;
}

function timingSafeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ''));
  const b = new TextEncoder().encode(String(right || ''));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function compile(input, checkedAt = new Date().toISOString()) {
  const source = record(input, 'handoff');
  if (source.schema !== 'juss/promptos-court-compile-handoff@v1') throw new Error('unsupported handoff schema');

  const caseId = text(source.caseId, 'caseId', 160);
  const repository = text(source.repository, 'repository', 300);
  const branch = text(source.branch, 'branch', 200);
  const headSha = fullSha(source.headSha, 'headSha');
  const witnessReceiptFingerprint = hash(source.witnessReceiptFingerprint, 'witnessReceiptFingerprint');
  const sourceHandoffFingerprint = hash(source.handoffFingerprint, 'handoffFingerprint');
  const observedAt = instant(source.observedAt, 'observedAt');
  const expiresAt = instant(source.expiresAt, 'expiresAt');
  if (expiresAt.ms <= observedAt.ms) throw new Error('expiresAt must be after observedAt');
  exactAuthority(source.authority);

  const core = { ...source };
  delete core.handoffFingerprint;
  if (await sha256(core) !== sourceHandoffFingerprint) throw new Error('handoff fingerprint mismatch');

  if (!Array.isArray(source.constraints) || source.constraints.some((x) => typeof x !== 'string' || !x.trim())) {
    throw new Error('constraints must be an array of strings');
  }

  const checked = instant(checkedAt, 'checkedAt');
  const expired = checked.ms > expiresAt.ms;
  const workflowCore = {
    version: 1,
    schema: 'juss/promptos-court-workflow@v1',
    caseId,
    sourceHandoffFingerprint,
    witnessReceiptFingerprint,
    subject: { repository, branch, headSha },
    observedAt: observedAt.raw,
    expiresAt: expiresAt.raw,
    state: expired ? 'BLOCKED_STALE_HANDOFF' : 'COMPILED',
    founderGoal: text(source.founderGoal, 'founderGoal', 4000),
    stopCondition: text(source.stopCondition, 'stopCondition', 2000),
    sourceTask: text(source.task, 'task', 2000),
    constraints: source.constraints.map((x) => x.trim().slice(0, 1000)),
    steps: expired ? [{
      id: 'refresh-evidence',
      action: 'return_to_court',
      purpose: 'The handoff lease expired. Re-observe the exact current subject before compiling successor work.',
      mayMutate: false,
    }] : [
      { id: 'bind-subject', action: 'verify_exact_subject', purpose: 'Bind successor work to the exact repository, branch, and head SHA.', mayMutate: false },
      { id: 'preserve-claims', action: 'preserve_truth_states', purpose: 'Carry VERIFIED, INFERRED, UNKNOWN, BLOCKED, and FAIL without promotion.', mayMutate: false },
      { id: 'compile-proof', action: 'compile_next_proof_gate', purpose: 'Translate the Court request into the smallest observation or verification workflow.', mayMutate: false },
      { id: 'return-court', action: 'return_to_court', purpose: 'Return compiled work for adjudication. Do not self-authorize execution.', mayMutate: false },
    ],
    authority: AUTHORITY,
  };

  return { ...workflowCore, workflowFingerprint: await sha256(workflowCore) };
}

async function handleRequest(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        service: 'promptos-court',
        release_sha: FULL_SHA.test(String(PROMPTOS_RELEASE_SHA || '')) ? String(env.PROMPTOS_RELEASE_SHA).toLowerCase() : 'unknown',
        authority: 'none',
      });
    }
    if (request.method !== 'POST' || url.pathname !== '/court/compile') return json({ error: 'not found' }, 404);
    if (!PROMPTOS_COURT_BRIDGE_KEY) return json({ error: 'court compiler not configured' }, 503);
    const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
    if (!timingSafeEqual(bearer, env.PROMPTOS_COURT_BRIDGE_KEY)) return json({ error: 'unauthorized' }, 401);
    const release = String(env.PROMPTOS_RELEASE_SHA || '').trim().toLowerCase();
    if (!FULL_SHA.test(release)) return json({ error: 'release identity unavailable' }, 503);
    try {
      const result = await compile(await request.json());
      return json({ service: 'promptos', release_sha: release, result, authority: 'none' });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'court compilation failed' }, 400);
    }

}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
