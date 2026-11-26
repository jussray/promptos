import assert from 'node:assert/strict';
import {
  createExperimentIntentContract,
  validateExperimentIntentContract,
} from '../src/world-experiment.js';

const contract = createExperimentIntentContract({
  laneId: 'content.creation',
  workflowId: 'facebook.world.adapter',
  founderIntent: 'Increase verified Facebook revenue without sacrificing originality.',
  hypothesis: 'Proof-led Reels will produce more qualified attention than generic announcements.',
  northStarMetric: 'revenue',
  metrics: ['revenue', 'meaningful_engagement', 'not_a_lane_metric'],
  acceptanceCriteria: [
    'Published result is bound to the exact experiment intent fingerprint.',
    'Revenue outcome is measured separately from execution proof.',
  ],
  channel: 'Facebook',
  contentSpecies: 'proof',
  variables: {
    format: 'reel',
    topic: 'show the product working',
    hook: 'visible before/after proof',
  },
}, new Date('2026-09-23T02:40:00.000Z'));

assert.deepEqual(validateExperimentIntentContract(contract), { valid: true, errors: [] });
assert.equal(contract.northStar.metric, 'revenue');
assert.deepEqual(contract.metrics, ['revenue', 'meaningful_engagement']);
assert.equal(contract.acceptanceCriteria.length, 2);
assert.match(contract.intentFingerprint, /^[0-9a-f]{16}$/);
assert.equal(contract.proofPolicy.executionProofIsNotCompletion, true);
assert.equal(contract.proofPolicy.completionRequiresOutcomeEvidence, true);
assert.equal(contract.proofPolicy.outcomeEvidenceMustBindIntentFingerprint, true);
assert.equal(contract.route.executionAuthority, 'advisory-only');
assert.equal(contract.route.publicationRequiresApproval, true);
assert.deepEqual(contract.route.recommendedExecutors, ['sol', 'chief', 'fcr']);

const tampered = {
  ...contract,
  founderIntent: 'Different intent after proof was captured.',
};
assert.equal(validateExperimentIntentContract(tampered).valid, false);
assert.ok(validateExperimentIntentContract(tampered).errors.includes('Intent fingerprint does not match the experiment contract.'));

const weakenedProofPolicy = {
  ...contract,
  proofPolicy: {
    ...contract.proofPolicy,
    executionProofIsNotCompletion: false,
  },
};
assert.equal(validateExperimentIntentContract(weakenedProofPolicy).valid, false);
assert.ok(validateExperimentIntentContract(weakenedProofPolicy).errors.includes('Execution proof cannot satisfy task completion.'));

const fallback = createExperimentIntentContract({
  laneId: 'content.creation',
  founderIntent: 'Test a Facebook content hypothesis.',
  hypothesis: 'A bounded test.',
  northStarMetric: 'made_up_metric',
});
assert.equal(fallback.northStar.metric, 'founder_intent_outcome');
assert.deepEqual(validateExperimentIntentContract(fallback), { valid: true, errors: [] });

console.log(JSON.stringify({
  status: 'passed',
  schema: contract.schema,
  experimentId: contract.id,
  intentFingerprint: contract.intentFingerprint,
}));
