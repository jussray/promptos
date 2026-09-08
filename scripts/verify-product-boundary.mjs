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
assert.equal(contract.chiefAI.role, 'governed-ai-cognition-proposal-layer');
assert.equal(
  contract.chiefAI.coreQuestion,
  'How do systems reason about bounded AI actions without self-authorizing them?',
);

assert.equal(contract.founderControlRoom.repository, 'jussray/founder-control-room');
assert.equal(contract.founderControlRoom.role, 'founder-decision-execution-authority-evidence-plane');
assert.equal(
  contract.founderControlRoom.coreQuestion,
  'What is currently true, what is authorized, and what evidence proves the outcome?',
);

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
  'bounded reasoning and proposal request',
  'PromptOS must hand Chief a bounded reasoning/proposal request rather than execution authority',
);
assert.equal(
  contract.handoff.fromChiefAI,
  'evidence-shaped proposal plus requested capability and verification',
  'Chief output must remain an evidence-shaped proposal',
);
assert.equal(
  contract.handoff.toFounderControlRoom,
  'current-truth and authority evaluation',
  'consequential handoff must terminate at Founder Control Room truth and authority evaluation',
);
assert.equal(
  contract.handoff.authorityRule,
  'A PromptOS artifact or Chief output is advisory input. Neither can widen execution authority or prove execution, deployment, provider state, publication, or external outcome. Founder Control Room may govern execution only under separately current authority and evidence gates.',
  'handoff authority rule must deny self-authorization and preserve the FCR authority gate',
);

for (const prohibitedProofTarget of ['execution', 'deployment', 'provider state', 'publication', 'external outcome']) {
  assert.ok(
    contract.handoff.authorityRule.includes(prohibitedProofTarget),
    `handoff authority rule must explicitly deny proof of ${prohibitedProofTarget}`,
  );
}

assert.equal(
  contract.contentFingerprint.PromptOS,
  'intent -> context -> workflow -> proposal request -> learning',
);
assert.equal(
  contract.contentFingerprint.ChiefAI,
  'request -> reasoning -> proposal -> evidence handoff',
);
assert.equal(
  contract.contentFingerprint.FounderControlRoom,
  'current truth -> authority decision -> governed execution -> independent verification -> receipt',
);

console.log('PromptOS/Chief/FCR product boundary contract verified.');
