import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adaptV10DecisionForPromptOS, validateSubmittedV10DecisionReceipt } from './v10-decision-receipt.mjs';

const EXPECTED_HASH = '44912cf24230209d5f8f64cab39cfb424ea2178091d3b3c7462abd607d65c7a2';
const fixture = JSON.parse(
  readFileSync(new URL('../testdata/v10-decision-cycle-conformance.json', import.meta.url), 'utf8'),
);

test('PromptOS preserves the canonical Chief decision identity without promoting authority', () => {
  assert.deepEqual(validateSubmittedV10DecisionReceipt(fixture), { valid: true, errors: [] });

  const adapted = adaptV10DecisionForPromptOS(fixture, {
    intent: 'Compile the canonical V10 conformance mission.',
    project: fixture.projectSlug,
  });

  assert.equal(fixture.decisionHash, EXPECTED_HASH);
  assert.equal(adapted.decisionContext.decisionHash, EXPECTED_HASH);
  assert.equal(adapted.decisionContext.sourceTrust, 'submitted-unverified');
  assert.equal(adapted.decisionContext.authorityCeiling, 'reason');
  assert.equal(adapted.decisionContext.requiresFounderApproval, true);
  assert.equal(adapted.decisionContext.executionAuthorized, false);
});
