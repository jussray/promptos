import { createHash } from 'node:crypto';

export const FOUNDER_DECISION_POLICY_CONTRACT = 'promptos/founder-decision-policies@v1';

export const FOUNDER_DECISION_POLICIES = Object.freeze({
  billgates: Object.freeze({
    role: 'conservative_lane',
    enabled: true,
    objective: 'durable_growth',
    behavior: Object.freeze({
      prefer_stable_options: true,
      prefer_reversible_changes: true,
      prefer_generated_docs: true,
      prefer_shared_fixtures: true,
    }),
    authorityEffect: 'none',
  }),
  elonmusk: Object.freeze({
    role: 'aggressive_lane',
    enabled: true,
    objective: 'upside_growth',
    behavior: Object.freeze({
      prefer_speed: true,
      prefer_first_principles: true,
      prefer_experimentation: true,
      prefer_small_bets_first: true,
    }),
    authorityEffect: 'none',
  }),
});

export const DECISION_PROOF_KINDS = Object.freeze([
  'source',
  'tests',
  'playwright',
  'provider',
  'runtime',
  'artifact',
]);

const POLICY_IDS = new Set(Object.keys(FOUNDER_DECISION_POLICIES));
const PROOF_KIND_SET = new Set(DECISION_PROOF_KINDS);
const EVIDENCE_FIELDS = Object.freeze(['growth', 'drawdown', 'speed', 'risk']);

function evidenceFingerprint(evidence) {
  return createHash('sha256')
    .update(JSON.stringify(EVIDENCE_FIELDS.map((field) => [field, evidence[field]])))
    .digest('hex');
}

export function validateDecisionEvidence(input = {}) {
  const evidence = {};
  const errors = [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  for (const field of EVIDENCE_FIELDS) {
    const value = Number(source[field]);
    if (!Number.isFinite(value)) {
      errors.push(`${field} must be finite`);
      continue;
    }
    if (value < 0) {
      errors.push(`${field} must be non-negative`);
      continue;
    }
    evidence[field] = value;
  }

  if (errors.length) return { valid: false, errors, evidence: null, fingerprint: null };
  return {
    valid: true,
    errors: [],
    evidence,
    fingerprint: evidenceFingerprint(evidence),
  };
}

export function scoreDecisionPolicy(policyId, input) {
  if (!POLICY_IDS.has(policyId)) throw new TypeError(`unknown decision policy: ${policyId}`);
  const checked = validateDecisionEvidence(input);
  if (!checked.valid) throw new TypeError(`invalid decision evidence: ${checked.errors.join('; ')}`);

  const { growth, drawdown, speed, risk } = checked.evidence;
  const score = policyId === 'billgates'
    ? growth - drawdown - risk + (1 / (1 + speed))
    : growth + speed - drawdown - risk;

  if (!Number.isFinite(score)) throw new RangeError(`decision score became non-finite for ${policyId}`);
  return score;
}

function validateProofRequirements(requiredProofs) {
  if (!Array.isArray(requiredProofs) || requiredProofs.length === 0) {
    return { valid: false, errors: ['at least one project-specific proof kind is required'], proofs: [] };
  }
  const proofs = [...new Set(requiredProofs)];
  const errors = proofs
    .filter((kind) => !PROOF_KIND_SET.has(kind))
    .map((kind) => `unsupported proof kind: ${kind}`);
  return { valid: errors.length === 0, errors, proofs };
}

/**
 * Evaluate the two founder decision policies against one shared evidence vector.
 * `allow` means the policy tournament may return a recommendation. It never means
 * execution, merge, deploy, publish, spend, or provider authority.
 */
export function evaluateDecisionTournament({ evidence, gates = {}, requiredProofs = [] } = {}) {
  const reasons = [];
  const checkedEvidence = validateDecisionEvidence(evidence);
  const checkedProofs = validateProofRequirements(requiredProofs);

  if (!checkedEvidence.valid) {
    for (const error of checkedEvidence.errors) reasons.push(`invalid_evidence:${error}`);
  }
  if (!checkedProofs.valid) {
    for (const error of checkedProofs.errors) reasons.push(`invalid_proof_requirement:${error}`);
  }

  if (gates.truthmodeApproved !== true) reasons.push('truthmode_block');
  if (gates.redteamVeto === true || gates.redteamPassed !== true) reasons.push('redteam_block');
  if (gates.lindyPassed !== true) reasons.push('lindy_block');
  if (gates.ultrathinkPassed !== true) reasons.push('ultrathink_block');

  if (checkedProofs.valid) {
    const proofs = gates.proofs && typeof gates.proofs === 'object' ? gates.proofs : {};
    for (const kind of checkedProofs.proofs) {
      if (proofs[kind] !== true) reasons.push(`proof_block:${kind}`);
    }
  }

  const base = {
    contract: FOUNDER_DECISION_POLICY_CONTRACT,
    evidenceFingerprint: checkedEvidence.fingerprint,
    requiredProofs: checkedProofs.proofs,
    executionAuthorized: false,
    authorityEffect: 'none',
    humanDecisionRequired: true,
  };

  if (reasons.length) {
    return {
      ...base,
      allow: false,
      reasons,
      winner: null,
      scores: null,
    };
  }

  const billgates = scoreDecisionPolicy('billgates', checkedEvidence.evidence);
  const elonmusk = scoreDecisionPolicy('elonmusk', checkedEvidence.evidence);
  const winner = billgates > elonmusk
    ? 'billgates'
    : elonmusk > billgates
      ? 'elonmusk'
      : 'tie';

  return {
    ...base,
    allow: true,
    reasons: ['approved'],
    winner,
    scores: { billgates, elonmusk },
  };
}
