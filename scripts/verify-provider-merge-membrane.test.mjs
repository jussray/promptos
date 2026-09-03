import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProviderMergeMembrane } from './verify-provider-merge-membrane.mjs';

const REQUIRED_CHECK = 'Verify PromptOS control room tests';

function goodRuleset(overrides = {}) {
  return {
    id: 101,
    name: 'PromptOS main governance',
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 1,
          dismiss_stale_reviews_on_push: true,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          required_status_checks: [{ context: REQUIRED_CHECK }],
        },
      },
    ],
    ...overrides,
  };
}

test('VERIFIED only when the active main ruleset enforces the complete merge membrane', () => {
  const receipt = classifyProviderMergeMembrane([goodRuleset()]);
  assert.equal(receipt.state, 'VERIFIED');
  assert.deepEqual(receipt.failed, []);
  assert.equal(receipt.authority.authorizesMerge, false);
});

test('BLOCKED when no active ruleset applies to main', () => {
  const receipt = classifyProviderMergeMembrane([]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('activeRulesetAppliesToMain'));
});

test('evaluate-only rulesets do not satisfy provider enforcement', () => {
  const receipt = classifyProviderMergeMembrane([goodRuleset({ enforcement: 'evaluate' })]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('activeRulesetAppliesToMain'));
});

test('approval must be fresh and review threads resolved', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.map((rule) =>
    rule.type === 'pull_request'
      ? {
          ...rule,
          parameters: {
            ...rule.parameters,
            dismiss_stale_reviews_on_push: false,
            required_review_thread_resolution: false,
          },
        }
      : rule,
  );
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('pullRequestRequiredWithFreshApproval'));
});

test('the proven exact-head Control Room check must be required by provider policy', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.map((rule) =>
    rule.type === 'required_status_checks'
      ? {
          ...rule,
          parameters: { required_status_checks: [{ context: 'Some other check' }] },
        }
      : rule,
  );
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('exactHeadControlRoomCheckRequired'));
});

test('deletion and non-fast-forward rules are independently load-bearing', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.filter((rule) => !['deletion', 'non_fast_forward'].includes(rule.type));
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('deletionBlocked'));
  assert.ok(receipt.failed.includes('nonFastForwardBlocked'));
});

test('caller-shaped or missing bypass metadata never counts as explicit provider policy', () => {
  const receipt = classifyProviderMergeMembrane([goodRuleset({ bypass_actors: undefined })]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('bypassActorsAndModesExplicit'));
});

test('multiple active rulesets may compose the complete membrane', () => {
  const base = goodRuleset();
  const left = { ...base, id: 201, rules: base.rules.slice(0, 2) };
  const right = { ...base, id: 202, rules: base.rules.slice(2) };
  const receipt = classifyProviderMergeMembrane([left, right]);
  assert.equal(receipt.state, 'VERIFIED');
});
