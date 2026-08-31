import fs from 'node:fs';
import assert from 'node:assert/strict';

const contractPath = new URL('../.control-room/product-boundary.json', import.meta.url);
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

assert.equal(contract.schemaVersion, 1);
assert.equal(contract.product, 'PromptOS');
assert.equal(contract.repository, 'jussray/promptos');
assert.equal(contract.role, 'human-ai-operating-layer');
assert.equal(contract.coreQuestion, 'How do humans structure repeatable AI work?');

assert.equal(contract.chiefAI.repository, 'jussray/chief-ai-machine');
assert.equal(contract.chiefAI.role, 'governed-ai-execution-layer');
assert.equal(contract.chiefAI.coreQuestion, 'How do systems safely execute AI actions?');

const requiredPromptOSOwnership = [
  'founder intent capture',
  'context and constraint shaping',
  'prompt and workflow composition',
  'portable operating patterns',
  'human-reviewed learning loops',
];

const forbiddenPromptOSAuthority = [
  'agent execution authority',
  'production mutation authority',
  'provider authentication authority',
  'deployment authority',
  'publication authority',
];

function assertExactUniqueSet(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label} must be an array`);
  assert.equal(new Set(actual).size, actual.length, `${label} must not contain duplicates`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} must match the canonical set`);
}

assertExactUniqueSet(contract.owns, requiredPromptOSOwnership, 'PromptOS owns');
assertExactUniqueSet(contract.doesNotOwn, forbiddenPromptOSAuthority, 'PromptOS doesNotOwn');

for (const capability of forbiddenPromptOSAuthority) {
  assert.ok(!contract.owns.includes(capability), `PromptOS owns must not contain forbidden authority: ${capability}`);
}
for (const capability of requiredPromptOSOwnership) {
  assert.ok(!contract.doesNotOwn.includes(capability), `PromptOS doesNotOwn must not contradict owned capability: ${capability}`);
}

assert.equal(
  contract.handoff.fromPromptOS,
  'structured intent plus context plus constraints plus requested verification',
  'PromptOS handoff payload must remain bounded structured intent',
);
assert.equal(
  contract.handoff.toChiefAI,
  'bounded execution request',
  'Chief AI handoff target must remain a bounded execution request',
);
assert.equal(
  contract.handoff.authorityRule,
  'A PromptOS artifact is advisory input. It cannot widen Chief AI authority or prove execution, deployment, provider state, or publication.',
  'handoff authority rule must deny authority widening and every prohibited proof target',
);

for (const prohibitedProofTarget of ['execution', 'deployment', 'provider state', 'publication']) {
  assert.ok(
    contract.handoff.authorityRule.includes(prohibitedProofTarget),
    `handoff authority rule must explicitly deny proof of ${prohibitedProofTarget}`,
  );
}

assert.equal(
  contract.contentFingerprint.PromptOS,
  'intent -> context -> workflow -> execution request -> learning',
);
assert.equal(
  contract.contentFingerprint.ChiefAI,
  'request -> authority boundary -> execution -> verification -> receipt',
);

console.log('PromptOS/Chief product boundary contract verified.');
