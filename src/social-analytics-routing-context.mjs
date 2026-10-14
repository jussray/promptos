import { createHash } from 'node:crypto';

export const CHIEF_SOCIAL_ANALYTICS_DECISION_KIND = 'chief-ai/social-analytics-decision-input@v1';
export const SOL_SOCIAL_ANALYTICS_CONTINUITY_KIND = 'sol/social-analytics-continuity@v1';
export const PROMPTOS_SOCIAL_ANALYTICS_ROUTING_KIND = 'promptos/social-analytics-routing-context@v1';

const HASH = /^[0-9a-f]{64}$/i;

function text(value, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function sha(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function fail(errors) {
  throw Object.assign(new Error(`SOCIAL_ANALYTICS_ROUTING_REJECTED: ${errors.join('; ')}`), {
    code: 'SOCIAL_ANALYTICS_ROUTING_REJECTED',
    details: errors,
  });
}

function validateChiefDecision(input) {
  const source = record(input);
  if (!source) fail(['Chief decision must be an object']);
  const errors = [];
  const identity = {
    version: 1,
    kind: CHIEF_SOCIAL_ANALYTICS_DECISION_KIND,
    source_system: 'founder-control-room',
    control_receipt_hash: text(source.control_receipt_hash, 64).toLowerCase(),
    challenger_receipt_hash: text(source.challenger_receipt_hash, 64).toLowerCase(),
    account_id: text(source.account_id, 200),
    platform: text(source.platform, 80).toLowerCase(),
    primary_metric: text(source.primary_metric, 80),
    comparison_state: text(source.comparison_state, 40),
    incompatibility_reasons: Array.isArray(source.incompatibility_reasons)
      ? source.incompatibility_reasons.map((value) => text(value, 120)).filter(Boolean)
      : [],
    control_value: source.control_value ?? null,
    challenger_value: source.challenger_value ?? null,
    recommendation: text(source.recommendation, 40),
  };
  if (source.version !== 1) errors.push('Chief version must be 1');
  if (source.kind !== CHIEF_SOCIAL_ANALYTICS_DECISION_KIND) errors.push('Chief decision kind is invalid');
  if (source.source_system !== 'founder-control-room') errors.push('Chief source_system must be founder-control-room');
  if (!HASH.test(identity.control_receipt_hash)) errors.push('control_receipt_hash must be SHA-256');
  if (!HASH.test(identity.challenger_receipt_hash)) errors.push('challenger_receipt_hash must be SHA-256');
  if (!identity.account_id || !identity.platform || !identity.primary_metric) errors.push('Chief decision subject is incomplete');
  if (!['COMPATIBLE', 'UNRESOLVED'].includes(identity.comparison_state)) errors.push('comparison_state is invalid');
  if (!['MEASURE', 'UNRESOLVED'].includes(identity.recommendation)) errors.push('recommendation is invalid');

  const decisionHash = text(source.decision_hash, 64).toLowerCase();
  if (!HASH.test(decisionHash)) errors.push('decision_hash must be SHA-256');
  else if (sha(identity) !== decisionHash) errors.push('decision_hash does not match exact Chief decision identity');

  const authority = record(source.authority);
  if (!authority
      || authority.evidence_only !== true
      || authority.learning_authority !== 'advisory_only'
      || authority.execution_authorized !== false
      || authority.publish_authorized !== false
      || authority.content_mutation_authorized !== false
      || authority.may_increase_authority !== false) {
    errors.push('Chief authority must remain advisory-only');
  }
  if (errors.length > 0) fail(errors);
  return { identity, decision_hash: decisionHash };
}

function validateSolContinuity(input) {
  const source = record(input);
  if (!source) fail(['Sol continuity marker must be an object']);
  const errors = [];
  const identity = {
    version: 1,
    kind: SOL_SOCIAL_ANALYTICS_CONTINUITY_KIND,
    source_decision_hash: text(source.source_decision_hash, 64).toLowerCase(),
    control_receipt_hash: text(source.control_receipt_hash, 64).toLowerCase(),
    challenger_receipt_hash: text(source.challenger_receipt_hash, 64).toLowerCase(),
    account_id: text(source.account_id, 200),
    platform: text(source.platform, 80).toLowerCase(),
    primary_metric: text(source.primary_metric, 80),
    comparison_state: text(source.comparison_state, 40),
    current_gate: text(source.current_gate, 120),
    predecessor_cookie_id: source.predecessor_cookie_id === null ? null : text(source.predecessor_cookie_id, 160) || null,
  };
  if (source.version !== 1) errors.push('Sol version must be 1');
  if (source.kind !== SOL_SOCIAL_ANALYTICS_CONTINUITY_KIND) errors.push('Sol continuity kind is invalid');
  if (!HASH.test(identity.source_decision_hash)) errors.push('Sol source_decision_hash must be SHA-256');
  if (!HASH.test(identity.control_receipt_hash)) errors.push('Sol control_receipt_hash must be SHA-256');
  if (!HASH.test(identity.challenger_receipt_hash)) errors.push('Sol challenger_receipt_hash must be SHA-256');

  const fingerprint = text(source.continuity_fingerprint, 64).toLowerCase();
  if (!HASH.test(fingerprint)) errors.push('continuity_fingerprint must be SHA-256');
  else if (sha(identity) !== fingerprint) errors.push('continuity_fingerprint does not match exact Sol identity');
  if (source.cookie_id !== `social:${fingerprint.slice(0, 24)}`) errors.push('cookie_id does not match continuity fingerprint');

  const authority = record(source.authority);
  if (!authority
      || authority.state_lineage_only !== true
      || authority.creates_truth !== false
      || authority.creates_authority !== false
      || authority.publish_authorized !== false
      || authority.execution_authorized !== false) {
    errors.push('Sol continuity authority must remain lineage-only');
  }
  if (errors.length > 0) fail(errors);
  return { identity, continuity_fingerprint: fingerprint, cookie_id: source.cookie_id };
}

export function buildSocialAnalyticsRoutingContext({ decision, continuity } = {}) {
  const chief = validateChiefDecision(decision);
  const sol = validateSolContinuity(continuity);
  const errors = [];
  if (sol.identity.source_decision_hash !== chief.decision_hash) errors.push('Sol marker is not bound to the supplied Chief decision');
  if (sol.identity.control_receipt_hash !== chief.identity.control_receipt_hash) errors.push('control receipt lineage mismatch');
  if (sol.identity.challenger_receipt_hash !== chief.identity.challenger_receipt_hash) errors.push('challenger receipt lineage mismatch');
  if (sol.identity.account_id !== chief.identity.account_id) errors.push('account lineage mismatch');
  if (sol.identity.platform !== chief.identity.platform) errors.push('platform lineage mismatch');
  if (sol.identity.primary_metric !== chief.identity.primary_metric) errors.push('primary metric lineage mismatch');
  if (sol.identity.comparison_state !== chief.identity.comparison_state) errors.push('comparison state lineage mismatch');
  if (errors.length > 0) fail(errors);

  const identity = {
    version: 1,
    kind: PROMPTOS_SOCIAL_ANALYTICS_ROUTING_KIND,
    source_decision_hash: chief.decision_hash,
    source_continuity_fingerprint: sol.continuity_fingerprint,
    control_receipt_hash: chief.identity.control_receipt_hash,
    challenger_receipt_hash: chief.identity.challenger_receipt_hash,
    account_id: chief.identity.account_id,
    platform: chief.identity.platform,
    primary_metric: chief.identity.primary_metric,
    comparison_state: chief.identity.comparison_state,
    recommendation: chief.identity.recommendation,
    evidence_state: chief.identity.comparison_state === 'COMPATIBLE' ? 'OBSERVED' : 'UNKNOWN',
    evidence_refs: [
      `fcr:${chief.identity.control_receipt_hash}`,
      `fcr:${chief.identity.challenger_receipt_hash}`,
      `chief:${chief.decision_hash}`,
      `sol:${sol.continuity_fingerprint}`,
    ],
    prompt_constraints: [
      'preserve-account-boundary',
      'preserve-window-kind',
      'preserve-metric-definition',
      'missing-evidence-is-unknown',
      'do-not-invent-algorithm-weights',
      'do-not-convert-signal-into-publish-authority',
    ],
  };

  return Object.freeze({
    ...identity,
    routing_hash: sha(identity),
    authority: Object.freeze({
      routing_only: true,
      creates_evidence: false,
      creates_truth: false,
      can_publish: false,
      can_schedule: false,
      can_change_content: false,
      can_increase_authority: false,
    }),
  });
}

export { validateChiefDecision, validateSolContinuity };
