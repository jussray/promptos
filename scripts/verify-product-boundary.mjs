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

const forbiddenPromptOSAuthority = [
  'agent execution authority',
  'production mutation authority',
  'provider authentication authority',
  'deployment authority',
  'publication authority',
];
for (const capability of forbiddenPromptOSAuthority) {
  assert.ok(contract.doesNotOwn.includes(capability), `PromptOS authority boundary must deny: ${capability}`);
}

const requiredPromptOSOwnership = [
  'founder intent capture',
  'context and constraint shaping',
  'prompt and workflow composition',
  'portable operating patterns',
  'human-reviewed learning loops',
];
for (const capability of requiredPromptOSOwnership) {
  assert.ok(contract.owns.includes(capability), `PromptOS ownership must include: ${capability}`);
}

assert.match(contract.handoff.authorityRule, /advisory input/i);
assert.match(contract.handoff.authorityRule, /cannot widen Chief AI authority/i);
assert.match(contract.handoff.authorityRule, /cannot.*prove.*execution/i);

assert.equal(
  contract.contentFingerprint.PromptOS,
  'intent -> context -> workflow -> execution request -> learning',
);
assert.equal(
  contract.contentFingerprint.ChiefAI,
  'request -> authority boundary -> execution -> verification -> receipt',
);

console.log('PromptOS/Chief product boundary contract verified.');
