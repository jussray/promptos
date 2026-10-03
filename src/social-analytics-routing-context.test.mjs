import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildSocialAnalyticsRoutingContext } from './social-analytics-routing-context.mjs';

function sha(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function decision(overrides = {}) {
  const identity = {
    version: 1,
    kind: 'chief-ai/social-analytics-decision-input@v1',
    source_system: 'founder-control-room',
    control_receipt_hash: 'a'.repeat(64),
    challenger_receipt_hash: 'b'.repeat(64),
    account_id: '@juss_fn_ray',
    platform: 'instagram',
    primary_metric: 'shares',
    comparison_state: 'COMPATIBLE',
    incompatibility_reasons: [],
    control_value: 3,
    challenger_value: 5,
    recommendation: 'MEASURE',
    ...overrides,
  };
  return {
    ...identity,
    decision_hash: sha(identity),
    authority: {
      evidence_only: true,
      learning_authority: 'advisory_only',
      execution_authorized: false,
      publish_authorized: false,
      content_mutation_authorized: false,
      may_increase_authority: false,
    },
  };
}

function continuity(sourceDecision, overrides = {}) {
  const identity = {
    version: 1,
    kind: 'sol/social-analytics-continuity@v1',
    source_decision_hash: sourceDecision.decision_hash,
    control_receipt_hash: sourceDecision.control_receipt_hash,
    challenger_receipt_hash: sourceDecision.challenger_receipt_hash,
    account_id: sourceDecision.account_id,
    platform: sourceDecision.platform,
    primary_metric: sourceDecision.primary_metric,
    comparison_state: sourceDecision.comparison_state,
    current_gate: sourceDecision.recommendation,
    predecessor_cookie_id: null,
    ...overrides,
  };
  const fingerprint = sha(identity);
  return {
    ...identity,
    continuity_fingerprint: fingerprint,
    cookie_id: `social:${fingerprint.slice(0, 24)}`,
    authority: {
      state_lineage_only: true,
      creates_truth: false,
      creates_authority: false,
      publish_authorized: false,
      execution_authorized: false,
    },
  };
}

test('routes only the exact Chief decision plus matching Sol lineage', () => {
  const chief = decision();
  const sol = continuity(chief);
  const context = buildSocialAnalyticsRoutingContext({ decision: chief, continuity: sol });
  assert.equal(context.source_decision_hash, chief.decision_hash);
  assert.equal(context.source_continuity_fingerprint, sol.continuity_fingerprint);
  assert.deepEqual(context.evidence_refs, [
    `fcr:${chief.control_receipt_hash}`,
    `fcr:${chief.challenger_receipt_hash}`,
    `chief:${chief.decision_hash}`,
    `sol:${sol.continuity_fingerprint}`,
  ]);
  assert.equal(context.recommendation, 'MEASURE');
  assert.equal(context.authority.can_publish, false);
  assert.equal(context.authority.creates_evidence, false);
});

test('rejects a Sol marker bound to a different Chief decision', () => {
  const chief = decision();
  const otherChief = decision({ challenger_receipt_hash: 'c'.repeat(64), challenger_value: 99 });
  const sol = continuity(otherChief);
  assert.throws(
    () => buildSocialAnalyticsRoutingContext({ decision: chief, continuity: sol }),
    /Sol marker is not bound to the supplied Chief decision/,
  );
});

test('rejects tampered Chief evidence instead of routing prose-shaped claims', () => {
  const chief = decision();
  const sol = continuity(chief);
  assert.throws(
    () => buildSocialAnalyticsRoutingContext({
      decision: { ...chief, account_id: '@jussnco' },
      continuity: sol,
    }),
    /decision_hash does not match exact Chief decision identity/,
  );
});

test('UNRESOLVED stays UNKNOWN and cannot be promoted into a winner', () => {
  const chief = decision({
    comparison_state: 'UNRESOLVED',
    incompatibility_reasons: ['window-kind-mismatch'],
    control_value: null,
    challenger_value: null,
    recommendation: 'UNRESOLVED',
  });
  const sol = continuity(chief);
  const context = buildSocialAnalyticsRoutingContext({ decision: chief, continuity: sol });
  assert.equal(context.comparison_state, 'UNRESOLVED');
  assert.equal(context.recommendation, 'UNRESOLVED');
  assert.equal(context.evidence_state, 'UNKNOWN');
  assert.ok(context.prompt_constraints.includes('missing-evidence-is-unknown'));
  assert.ok(context.prompt_constraints.includes('do-not-invent-algorithm-weights'));
});

test('routing hash changes when the evidence lineage changes', () => {
  const firstDecision = decision();
  const first = buildSocialAnalyticsRoutingContext({
    decision: firstDecision,
    continuity: continuity(firstDecision),
  });
  const secondDecision = decision({ challenger_receipt_hash: 'd'.repeat(64), challenger_value: 7 });
  const second = buildSocialAnalyticsRoutingContext({
    decision: secondDecision,
    continuity: continuity(secondDecision),
  });
  assert.notEqual(first.routing_hash, second.routing_hash);
});
