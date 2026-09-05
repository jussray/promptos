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
    current_user_can_bypass: 'never',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: REQUIRED_CHECK }],
        },
      },
      {
        type: 'code_scanning',
        parameters: {
          code_scanning_tools: [{ tool: 'CodeQL', security_alerts_threshold: 'high_or_higher', alerts_threshold: 'errors' }],
        },
      },
    ],
    ...overrides,
  };
}

test('VERIFIED only when active main governance matches the founder-only membrane', () => {
  const receipt = classifyProviderMergeMembrane([goodRuleset()]);
  assert.equal(receipt.state, 'VERIFIED');
  assert.equal(receipt.governancePhase, 'founder-only');
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

test('founder-only phase rejects inherited independent-review requirements', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.map((rule) =>
    rule.type === 'pull_request'
      ? {
          ...rule,
          parameters: {
            ...rule.parameters,
            required_approving_review_count: 1,
            require_code_owner_review: true,
            require_last_push_approval: true,
          },
        }
      : rule,
  );
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('founderOnlyPullRequestGate'));
});

test('review threads remain load-bearing even with zero native approval dependency', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.map((rule) =>
    rule.type === 'pull_request'
      ? { ...rule, parameters: { ...rule.parameters, required_review_thread_resolution: false } }
      : rule,
  );
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('founderOnlyPullRequestGate'));
});

test('the proven exact-head Control Room check must be strict and required', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.map((rule) =>
    rule.type === 'required_status_checks'
      ? {
          ...rule,
          parameters: {
            strict_required_status_checks_policy: false,
            required_status_checks: [{ context: REQUIRED_CHECK }],
          },
        }
      : rule,
  );
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('strictExactHeadControlRoomCheckRequired'));
});

test('CodeQL remains required in founder-only phase', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.filter((rule) => rule.type !== 'code_scanning');
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('codeQlRequired'));
});

test('deletion and non-fast-forward rules are independently load-bearing', () => {
  const ruleset = goodRuleset();
  ruleset.rules = ruleset.rules.filter((rule) => !['deletion', 'non_fast_forward'].includes(rule.type));
  const receipt = classifyProviderMergeMembrane([ruleset]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('deletionBlocked'));
  assert.ok(receipt.failed.includes('nonFastForwardBlocked'));
});

test('bypass actors remain forbidden in the founder-only provider membrane', () => {
  const receipt = classifyProviderMergeMembrane([
    goodRuleset({ bypass_actors: [{ actor_type: 'RepositoryRole', actor_id: 5, bypass_mode: 'always' }] }),
  ]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('zeroBypassPolicy'));
});

test('current-user always-bypass capability remains forbidden', () => {
  const receipt = classifyProviderMergeMembrane([goodRuleset({ current_user_can_bypass: 'always' })]);
  assert.equal(receipt.state, 'BLOCKED');
  assert.ok(receipt.failed.includes('zeroBypassPolicy'));
});

test('multiple active rulesets may compose the complete membrane only when each has zero bypass', () => {
  const base = goodRuleset();
  const left = { ...base, id: 201, rules: base.rules.slice(0, 2) };
  const right = { ...base, id: 202, rules: base.rules.slice(2) };
  const receipt = classifyProviderMergeMembrane([left, right]);
  assert.equal(receipt.state, 'VERIFIED');
});
