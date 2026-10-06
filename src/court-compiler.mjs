import { createHash } from 'node:crypto';

export const PROMPTOS_COURT_HANDOFF_SCHEMA = 'juss/promptos-court-compile-handoff@v1';
export const PROMPTOS_COURT_WORKFLOW_SCHEMA = 'juss/promptos-court-workflow@v1';

const FULL_SHA = /^[0-9a-f]{40}$/i;
const HASH = /^[0-9a-f]{64}$/i;

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`COURT_COMPILE_REJECTED: ${label} must be an object`);
  }
  return value;
}

function text(value, label, max = 2000) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`COURT_COMPILE_REJECTED: ${label} is required`);
  }
  return value.trim().slice(0, max);
}

function sha(value, label) {
  const normalized = text(value, label, 40).toLowerCase();
  if (!FULL_SHA.test(normalized)) throw new Error(`COURT_COMPILE_REJECTED: ${label} must be a full git SHA`);
  return normalized;
}

function hash(value, label) {
  const normalized = text(value, label, 64).toLowerCase();
  if (!HASH.test(normalized)) throw new Error(`COURT_COMPILE_REJECTED: ${label} must be SHA-256`);
  return normalized;
}

function instant(value, label) {
  const raw = text(value, label, 80);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new Error(`COURT_COMPILE_REJECTED: ${label} must be an ISO timestamp`);
  return { raw, ms };
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function authority(value) {
  const input = record(value, 'authority');
  const expected = {
    evidenceOnly: true,
    createsTruth: false,
    createsAuthority: false,
    executionAuthorized: false,
    mergeAuthorized: false,
    deployAuthorized: false,
    publishAuthorized: false,
    credentialMutationAuthorized: false,
    providerMutationAuthorized: false,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (input[key] !== expectedValue) {
      throw new Error(`COURT_COMPILE_REJECTED: authority.${key} widened or missing`);
    }
  }
  return Object.freeze(expected);
}

export function courtHandoffFingerprint(input) {
  const source = { ...record(input, 'handoff') };
  delete source.handoffFingerprint;
  return fingerprint(source);
}

export function compileCourtHandoff(input, options = {}) {
  const source = record(input, 'handoff');
  if (source.schema !== PROMPTOS_COURT_HANDOFF_SCHEMA) {
    throw new Error('COURT_COMPILE_REJECTED: unsupported handoff schema');
  }

  const caseId = text(source.caseId, 'caseId', 160);
  const repository = text(source.repository, 'repository', 300);
  const branch = text(source.branch, 'branch', 200);
  const headSha = sha(source.headSha, 'headSha');
  const witnessReceiptFingerprint = hash(source.witnessReceiptFingerprint, 'witnessReceiptFingerprint');
  const sourceHandoffFingerprint = hash(source.handoffFingerprint, 'handoffFingerprint');
  const observedAt = instant(source.observedAt, 'observedAt');
  const expiresAt = instant(source.expiresAt, 'expiresAt');
  if (expiresAt.ms <= observedAt.ms) throw new Error('COURT_COMPILE_REJECTED: expiresAt must be after observedAt');
  const sourceAuthority = authority(source.authority);

  if (courtHandoffFingerprint(source) !== sourceHandoffFingerprint) {
    throw new Error('COURT_COMPILE_REJECTED: handoff fingerprint mismatch');
  }

  if (!Array.isArray(source.constraints) || source.constraints.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error('COURT_COMPILE_REJECTED: constraints must be an array of strings');
  }
  const constraints = source.constraints.map((item) => item.trim().slice(0, 1000));
  const checkedAt = instant(options.checkedAt ?? new Date().toISOString(), 'checkedAt');
  const expired = checkedAt.ms > expiresAt.ms;

  const workflowCore = {
    version: 1,
    schema: PROMPTOS_COURT_WORKFLOW_SCHEMA,
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
    constraints,
    steps: expired ? [
      {
        id: 'refresh-evidence',
        action: 'return_to_court',
        purpose: 'The handoff lease expired. Re-observe the exact current subject before compiling successor work.',
        mayMutate: false,
      },
    ] : [
      {
        id: 'bind-subject',
        action: 'verify_exact_subject',
        purpose: 'Bind all successor work to the exact repository, branch, and head SHA.',
        mayMutate: false,
      },
      {
        id: 'preserve-claims',
        action: 'preserve_truth_states',
        purpose: 'Carry VERIFIED, INFERRED, UNKNOWN, BLOCKED, and FAIL without promotion or averaging.',
        mayMutate: false,
      },
      {
        id: 'compile-proof',
        action: 'compile_next_proof_gate',
        purpose: 'Translate the Court request into the smallest observation or verification workflow allowed by the authority ceiling.',
        mayMutate: false,
      },
      {
        id: 'return-court',
        action: 'return_to_court',
        purpose: 'Return compiled work and evidence references for adjudication. Do not self-authorize execution.',
        mayMutate: false,
      },
    ],
    authority: sourceAuthority,
  };

  return Object.freeze({
    ...workflowCore,
    workflowFingerprint: fingerprint(workflowCore),
  });
}

export default compileCourtHandoff;
