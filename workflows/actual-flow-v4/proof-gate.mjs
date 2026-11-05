/**
 * ACTUAL-FLOW V4 provenance adapter.
 * Non-secret evidence receipts only. Not a browser cookie, authentication,
 * approval, release, deployment, publication, or mutation authority.
 * Reuses the existing PromptOS continuity-fingerprint contract.
 */
import { createHash } from 'node:crypto';
import {
  createAssistantContinuityReceipt,
  evaluateAssistantContinuity,
} from '../continuity/continuity-fingerprint.mjs';

export const PROOF_CONTRACT = 'juss/actual-flow-v4-proof@v1';
const SHA256 = /^[0-9a-f]{64}$/;
const TRUTH = new Set(['VERIFIED', 'INFERRED', 'UNKNOWN', 'BLOCKED']);
const STAGES = new Set(['OBSERVE', 'ORIENT', 'CHALLENGE', 'DECIDE', 'ACT', 'VERIFY', 'RELEASE_REVIEW', 'STOP']);
const ID = /^[a-z0-9][a-z0-9._:-]{0,79}$/;

function string(value) { return typeof value === 'string' ? value.trim() : ''; }
function sha(parts) { return createHash('sha256').update(JSON.stringify(parts)).digest('hex'); }
function requireId(value, key) {
  const id = string(value);
  if (!ID.test(id)) throw new Error(`${key} must be a bounded lowercase slug`);
  return id;
}
function evidenceList(source) {
  if (!Array.isArray(source)) throw new Error('evidence must be an array');
  if (source.length > 100) throw new Error('too many evidence references');
  const seen = new Set();
  return source.map((e) => {
    if (!e || typeof e !== 'object') throw new Error('invalid evidence reference');
    const criterion = requireId(e.criterion, 'criterion');
    if (seen.has(criterion)) throw new Error('duplicate evidence criterion');
    seen.add(criterion);
    const truth = string(e.truth);
    if (!TRUTH.has(truth)) throw new Error('invalid truth classification');
    const ref = string(e.ref);
    if (ref.length > 200 || /[\r\n]/.test(ref)) throw new Error('invalid evidence reference');
    if (truth === 'VERIFIED' && !ref) throw new Error('verified evidence requires a source reference');
    return { criterion, truth, ref: ref || null };
  }).sort((a, b) => a.criterion.localeCompare(b.criterion));
}

function normalize(input) {
  if (!input || typeof input !== 'object') throw new Error('receipt input required');
  const goalId = requireId(input.goalId, 'goalId');
  const scopeId = requireId(input.scopeId, 'scopeId');
  const stage = string(input.stage);
  if (!STAGES.has(stage)) throw new Error('invalid OODA stage');
  const nextGate = requireId(input.nextGate, 'nextGate');
  const evidence = evidenceList(input.evidence);
  if (!Array.isArray(input.mains) || input.mains.length === 0) throw new Error('exact repository heads required');
  const source = string(input.source || 'chatgpt');
  const operator = string(input.operator);
  if (!operator || operator.length > 80) throw new Error('operator version required');
  return { goalId, scopeId, stage, nextGate, evidence, source, operator, mains: input.mains };
}

export function createEngineeringProofReceipt(input) {
  const v = normalize(input);
  // Delegates repository, branch, exact SHA, duplicate detection, and sorting to
  // PromptOS's pre-existing canonical continuity library.
  const continuity = createAssistantContinuityReceipt({
    source: v.source, operator: v.operator, mains: v.mains,
  });
  const evidence = Object.freeze(v.evidence.map(item => Object.freeze({ ...item })));
  Object.freeze(continuity.mains);
  const fingerprint = sha([
    PROOF_CONTRACT, 'engineering-proof', v.goalId, v.scopeId, v.stage,
    v.nextGate, continuity.fingerprint, evidence,
  ]);
  const cookie = sha([PROOF_CONTRACT, 'engineering-proof-cookie', fingerprint]);
  return Object.freeze({
    contract: PROOF_CONTRACT,
    goalId: v.goalId,
    scopeId: v.scopeId,
    stage: v.stage,
    evidence,
    nextGate: v.nextGate,
    continuity,
    fingerprint,
    cookie,
    browserCookie: false,
    deviceFingerprint: false,
    personalDataFingerprint: false,
    authorizing: false,
    approvalCarryForward: false,
    expiresOnStateMovement: true,
  });
}

/**
 * Structural consistency, not authenticity: hashes here are deliberately
 * non-secret, so they must NEVER grant trust, approval, or execution rights.
 * Reconstitute the receipt to detect accidental or adversarial field edits.
 */
function receiptIsInternallyConsistent(receipt) {
  if (!receipt || receipt.contract !== PROOF_CONTRACT ||
      !SHA256.test(string(receipt.fingerprint)) ||
      !SHA256.test(string(receipt.cookie))) return false;
  try {
    const prior = receipt.continuity;
    if (!prior || !Array.isArray(prior.mains)) return false;
    const expected = createEngineeringProofReceipt({
      goalId: receipt.goalId,
      scopeId: receipt.scopeId,
      stage: receipt.stage,
      nextGate: receipt.nextGate,
      evidence: receipt.evidence,
      source: prior.source,
      operator: prior.operator,
      mains: prior.mains,
    });
    return receipt.fingerprint === expected.fingerprint &&
      receipt.cookie === expected.cookie &&
      JSON.stringify(receipt.evidence) === JSON.stringify(expected.evidence) &&
      JSON.stringify(prior) === JSON.stringify(expected.continuity) &&
      receipt.authorizing === false &&
      receipt.approvalCarryForward === false &&
      receipt.browserCookie === false &&
      receipt.deviceFingerprint === false &&
      receipt.personalDataFingerprint === false &&
      receipt.expiresOnStateMovement === true;
  } catch {
    return false;
  }
}

export function evaluateEngineeringProofReceipt(receipt, current) {
  if (!receiptIsInternallyConsistent(receipt)) {
    return { state: 'invalid', reasons: ['receipt_invalid'], reacquireRequired: true };
  }
  try {
    const now = createEngineeringProofReceipt(current);
    const continuity = evaluateAssistantContinuity(receipt.continuity, {
      source: string(current.source || 'chatgpt'),
      operator: string(current.operator),
      mains: current.mains,
    });
    const reasons = [];
    if (continuity.state !== 'current') reasons.push('repository_continuity_changed');
    if (receipt.fingerprint !== now.fingerprint) reasons.push('goal_scope_or_evidence_changed');
    if (receipt.cookie !== now.cookie) reasons.push('proof_cookie_changed');
    // No receipt can ever promote itself into authority.
    if (receipt.authorizing !== false || receipt.approvalCarryForward !== false ||
        receipt.browserCookie !== false || receipt.deviceFingerprint !== false ||
        receipt.personalDataFingerprint !== false) reasons.push('unsafe_authority_or_privacy_marker');
    return reasons.length
      ? { state: 'stale', reasons, reacquireRequired: true }
      : { state: 'current', reasons: [], reacquireRequired: false };
  } catch {
    return { state: 'invalid', reasons: ['current_input_invalid'], reacquireRequired: true };
  }
}

export function proofGateVerdict(receipt) {
  if (!receiptIsInternallyConsistent(receipt)) return 'INCONCLUSIVE';
  if (receipt.evidence.some(e => e.truth === 'BLOCKED')) return 'BLOCKED';
  if (receipt.evidence.some(e => e.truth !== 'VERIFIED')) return 'PARTIAL';
  if (receipt.evidence.length === 0) return 'INCONCLUSIVE';
  // This reports evidence completeness only. It NEVER authorizes release.
  return 'EVIDENCE_COMPLETE_NOT_AUTHORIZED';
}
