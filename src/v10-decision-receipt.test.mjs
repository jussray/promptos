import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_V10_LENSES,
  adaptV10DecisionForPromptOS,
  validateSubmittedV10DecisionReceipt,
} from './v10-decision-receipt.mjs';

function receipt(overrides = {}) {
  return {
    contract: 'juss-v10/decision-cycle@v1',
    goal: 'Sharpen the Business OS without duplicating authority.',
    workspaceId: 'juss-portfolio',
    projectSlug: 'promptos',
    expectedHeadSha: 'a'.repeat(40),
    customerOutcome: 'One clear founder decision with bounded proof.',
    bottleneck: 'Cross-system decision context can drift during handoff.',
    recommendation: 'Preserve the decision receipt through mission compilation.',
    decisionHash: 'b'.repeat(64),
    authorityCeiling: 'reason',
    executionAuthorized: false,
    requiresFounderApproval: true,
    lensReports: REQUIRED_V10_LENSES.map((lens) => ({ lens, finding: `${lens} finding`, recommendation: `${lens} move` })),
    dissent: ['Redteam requests a stricter proof gate.'],
    proofRequirements: ['exact-head CI', 'independent FCR validation'],
    outcomeSignals: ['time-to-proof', 'founder-goal-success-rate'],
    rollback: 'Discard the compiled mission; no provider mutation occurred.',
    stopConditions: ['authority mismatch', 'evidence contradiction'],
    nextGate: 'FCR validates identity and founder approval.',
    ...overrides,
  };
}

test('accepts a complete proposal-only Chief decision receipt', () => {
  assert.deepEqual(validateSubmittedV10DecisionReceipt(receipt()), { valid: true, errors: [] });
});

test('preserves the decision as submitted-unverified compiler context', () => {
  const adapted = adaptV10DecisionForPromptOS(receipt(), {
    intent: 'Compile the next bounded mission.',
    project: 'promptos',
    constraints: ['Do not mutate production.'],
  });

  assert.equal(adapted.decisionContext.sourceTrust, 'submitted-unverified');
  assert.equal(adapted.decisionContext.executionAuthorized, false);
  assert.equal(adapted.decisionContext.authorityCeiling, 'reason');
  assert.equal(adapted.decisionContext.decisionHash, 'b'.repeat(64));
  assert.ok(adapted.constraints.some((item) => item.includes('FCR must independently resolve')));
  assert.ok(REQUIRED_V10_LENSES.every((lens) => adapted.protocols.includes(lens)));
});

test('fails closed when any requested V10 lens is absent', () => {
  const incomplete = receipt({
    lensReports: REQUIRED_V10_LENSES.filter((lens) => lens !== 'product-design').map((lens) => ({ lens })),
  });
  assert.match(
    assert.throws(() => adaptV10DecisionForPromptOS(incomplete)).message,
    /Required V10 decision lens missing: product-design/,
  );
});

test('rejects authority promotion from a submitted reasoning receipt', () => {
  const escalated = receipt({ authorityCeiling: 'privileged', executionAuthorized: true });
  const validation = validateSubmittedV10DecisionReceipt(escalated);
  assert.ok(validation.errors.includes('Decision receipt cannot exceed reason authority'));
  assert.ok(validation.errors.includes('Decision receipt cannot authorize execution'));
});

test('keeps outcome and proof signals separate from task completion', () => {
  const adapted = adaptV10DecisionForPromptOS(receipt());
  assert.deepEqual(adapted.decisionContext.outcomeSignals, ['time-to-proof', 'founder-goal-success-rate']);
  assert.deepEqual(adapted.decisionContext.proofRequirements, ['exact-head CI', 'independent FCR validation']);
});
