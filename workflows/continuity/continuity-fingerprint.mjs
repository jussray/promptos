import { createHash } from 'node:crypto';

export const MAIN_CONTINUITY_CONTRACT = 'juss/main-continuity@v1';
export const ASSISTANT_CONTINUITY_CONTRACT = 'juss/assistant-continuity@v1';

const FULL_SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9._/-]+$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hash(contract, label, ...parts) {
  return createHash('sha256')
    .update(JSON.stringify([contract, label, ...parts]))
    .digest('hex');
}

function normalizeMain(input) {
  if (!input || typeof input !== 'object') throw new Error('main continuity input must be an object');
  const repository = text(input.repository).toLowerCase();
  const branch = text(input.branch || 'main');
  const sha = text(input.sha).toLowerCase();
  const observedAt = text(input.observedAt) || null;

  if (!REPOSITORY.test(repository)) throw new Error('repository must be owner/name');
  if (!BRANCH.test(branch)) throw new Error('branch is invalid');
  if (!FULL_SHA.test(sha)) throw new Error('sha must be an exact 40-character Git SHA');
  if (observedAt !== null && !Number.isFinite(Date.parse(observedAt))) {
    throw new Error('observedAt must be an ISO-compatible timestamp when supplied');
  }

  return { repository, branch, sha, observedAt };
}

function normalizeAssistant(input) {
  if (!input || typeof input !== 'object') throw new Error('assistant continuity input must be an object');
  const source = text(input.source || 'chatgpt').toLowerCase();
  const operator = text(input.operator);
  if (!source) throw new Error('assistant source is required');
  if (!operator) throw new Error('assistant operator is required');
  if (!Array.isArray(input.mains) || input.mains.length === 0) {
    throw new Error('assistant continuity requires at least one observed main');
  }

  const mains = input.mains.map((item) => normalizeMain(item)).sort((a, b) => {
    const left = `${a.repository}\u0000${a.branch}`;
    const right = `${b.repository}\u0000${b.branch}`;
    return left.localeCompare(right);
  });
  const keys = mains.map((item) => `${item.repository}@${item.branch}`);
  if (new Set(keys).size !== keys.length) throw new Error('assistant mains must not contain duplicate repository/branch entries');

  return { source, operator, mains };
}

export function fingerprintMain(input) {
  const value = normalizeMain(input);
  return hash(MAIN_CONTINUITY_CONTRACT, 'main-fingerprint', value.repository, value.branch, value.sha);
}

export function buildMainContinuityCookie(mainFingerprint) {
  const value = text(mainFingerprint).toLowerCase();
  if (!SHA256.test(value)) throw new Error('mainFingerprint must be a SHA-256 fingerprint');
  return hash(MAIN_CONTINUITY_CONTRACT, 'main-cookie', value);
}

export function createMainContinuityReceipt(input) {
  const value = normalizeMain(input);
  const fingerprint = fingerprintMain(value);
  return Object.freeze({
    contract: MAIN_CONTINUITY_CONTRACT,
    repository: value.repository,
    branch: value.branch,
    sha: value.sha,
    observedAt: value.observedAt,
    fingerprint,
    cookie: buildMainContinuityCookie(fingerprint),
    browserCookie: false,
    deviceFingerprint: false,
    authorizing: false,
    approvalCarryForward: false,
    expiresOnMovement: true,
  });
}

export function evaluateMainContinuity(receipt, current) {
  try {
    if (!receipt || receipt.contract !== MAIN_CONTINUITY_CONTRACT) {
      return { state: 'invalid', reasons: ['receipt_invalid'], reacquireRequired: true };
    }
    const now = createMainContinuityReceipt(current);
    const reasons = [];
    if (receipt.repository !== now.repository) reasons.push('repository_moved');
    if (receipt.branch !== now.branch) reasons.push('branch_moved');
    if (receipt.sha !== now.sha) reasons.push('sha_moved');
    if (receipt.fingerprint !== now.fingerprint) reasons.push('fingerprint_moved');
    if (receipt.cookie !== now.cookie) reasons.push('cookie_moved');
    return reasons.length
      ? { state: 'stale', reasons: [...new Set(reasons)], reacquireRequired: true }
      : { state: 'current', reasons: [], reacquireRequired: false };
  } catch {
    return { state: 'invalid', reasons: ['current_input_invalid'], reacquireRequired: true };
  }
}

function mainStateVector(mains) {
  return mains.map((main) => {
    const fingerprint = fingerprintMain(main);
    return [
      main.repository,
      main.branch,
      main.sha,
      fingerprint,
      buildMainContinuityCookie(fingerprint),
    ];
  });
}

export function fingerprintAssistant(input) {
  const value = normalizeAssistant(input);
  return hash(
    ASSISTANT_CONTINUITY_CONTRACT,
    'assistant-fingerprint',
    value.source,
    value.operator,
    mainStateVector(value.mains),
  );
}

export function buildAssistantContinuityCookie(assistantFingerprint) {
  const value = text(assistantFingerprint).toLowerCase();
  if (!SHA256.test(value)) throw new Error('assistantFingerprint must be a SHA-256 fingerprint');
  return hash(ASSISTANT_CONTINUITY_CONTRACT, 'assistant-cookie', value);
}

export function createAssistantContinuityReceipt(input) {
  const value = normalizeAssistant(input);
  const mains = value.mains.map((main) => createMainContinuityReceipt(main));
  const fingerprint = fingerprintAssistant(value);
  return Object.freeze({
    contract: ASSISTANT_CONTINUITY_CONTRACT,
    source: value.source,
    operator: value.operator,
    mains,
    fingerprint,
    cookie: buildAssistantContinuityCookie(fingerprint),
    browserCookie: false,
    deviceFingerprint: false,
    personalDataFingerprint: false,
    authorizing: false,
    approvalCarryForward: false,
    expiresOnAnyMainMovement: true,
  });
}

export function evaluateAssistantContinuity(receipt, current) {
  try {
    if (!receipt || receipt.contract !== ASSISTANT_CONTINUITY_CONTRACT) {
      return { state: 'invalid', reasons: ['receipt_invalid'], reacquireRequired: true };
    }
    const now = createAssistantContinuityReceipt(current);
    const reasons = [];
    if (receipt.source !== now.source) reasons.push('source_moved');
    if (receipt.operator !== now.operator) reasons.push('operator_moved');
    if (JSON.stringify(receipt.mains.map((item) => [item.repository, item.branch, item.sha])) !== JSON.stringify(now.mains.map((item) => [item.repository, item.branch, item.sha]))) {
      reasons.push('main_set_moved');
    }
    if (receipt.fingerprint !== now.fingerprint) reasons.push('fingerprint_moved');
    if (receipt.cookie !== now.cookie) reasons.push('cookie_moved');
    return reasons.length
      ? { state: 'stale', reasons: [...new Set(reasons)], reacquireRequired: true }
      : { state: 'current', reasons: [], reacquireRequired: false };
  } catch {
    return { state: 'invalid', reasons: ['current_input_invalid'], reacquireRequired: true };
  }
}
