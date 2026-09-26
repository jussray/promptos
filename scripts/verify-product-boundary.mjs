import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  compileWorkflowArtifact,
  validateWorkflowArtifact,
  PROMPTOS_MODEL_EXECUTION_PROFILES,
  PROMPTOS_MODEL_EXECUTION_HANDOFF_FIELDS,
} from '../src/workflow-artifact.mjs';

const contractPath = new URL('../.control-room/product-boundary.json', import.meta.url);
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const modelExecutionPath = new URL('../.control-room/model-execution.contract.json', import.meta.url);
const modelExecution = JSON.parse(fs.readFileSync(modelExecutionPath, 'utf8'));

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

const codexAdapter = contract.providerAdapters?.codex;
assert.ok(codexAdapter, 'PromptOS must preserve the Codex provider adapter');
assert.equal(codexAdapter.contract, 'promptos/provider-adapter/codex@v1');
assert.equal(codexAdapter.authority, 'advisory-routing-only');
assert.equal(codexAdapter.availabilitySource, 'live-runtime-palette-and-current-official-codex-behavior');
assertExactUniqueSet(codexAdapter.requiredPreflightIfAvailable, ['/status', '/permissions'], 'Codex preflight');
assertExactUniqueSet(codexAdapter.goalPlanningIfAvailable, ['/goal', '/plan'], 'Codex goal/planning commands');
assertExactUniqueSet(codexAdapter.capabilityDiscoveryIfAvailable, ['/skills', '/mcp'], 'Codex capability discovery commands');
assertExactUniqueSet(codexAdapter.verificationIfAvailable, ['/review'], 'Codex verification commands');
assertExactUniqueSet(codexAdapter.continuityIfAvailable, ['/resume', '/compact'], 'Codex continuity commands');
assertExactUniqueSet(codexAdapter.contextSplitIfAvailable, ['/fork', '/side'], 'Codex context split commands');
assertExactUniqueSet(
  codexAdapter.executionLane,
  [
    'observe-current-runtime-command-availability',
    'status',
    'permissions',
    'bind-goal-and-stop-condition',
    'plan-nontrivial-change',
    'discover-relevant-skills-and-mcp',
    'inspect-authoritative-repository-state',
    'implement-smallest-valid-change',
    'run-focused-tests-and-playwright-when-applicable',
    'review-current-diff',
    'persist-exact-head-receipts-rollback-and-unknowns',
    'compact-only-after-durable-receipts',
  ],
  'Codex execution lane',
);
assertExactUniqueSet(
  codexAdapter.attackChecks,
  [
    'host-version-command-drift',
    'permissions-mistaken-for-authority',
    'mcp-or-skill-availability-mistaken-for-authority',
    'review-mistaken-for-merge-or-runtime-proof',
    'context-split-or-resume-carries-stale-proof',
    'compact-drops-load-bearing-state',
    'model-or-fast-mode-changes-cost-or-behavior-without-reverification',
    'generated-or-remembered-instructions-outrank-checked-in-policy',
  ],
  'Codex attack checks',
);

const codexRules = Array.isArray(codexAdapter.rules) ? codexAdapter.rules : [];
for (const invariant of [
  'missing commands are not simulated',
  'availability is not authorization',
  '/review is review evidence only',
  'must reacquire repository/provider fingerprints',
  '/resume requires current repository, branch/head, provider, review, and runtime state',
  '/compact is allowed only after durable decisions, exact fingerprints, evidence IDs, blockers, rollback, and unresolved unknowns',
  '/init must not overwrite governed AGENTS.md instructions',
  'checked-in AGENTS.md, skills, tests, and current provider evidence remain policy authority',
]) {
  assert.ok(
    codexRules.some((rule) => rule.includes(invariant)),
    `Codex adapter must preserve invariant: ${invariant}`,
  );
}

for (const forbiddenAuthority of ['merge', 'deployment', 'spending', 'publication', 'destructive authority']) {
  assert.ok(
    codexRules.some((rule) => rule.includes('/permissions') && rule.includes(forbiddenAuthority)),
    `Codex /permissions rule must not widen ${forbiddenAuthority}`,
  );
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

assert.equal(modelExecution.schema, 'promptos/model-execution@v1');
assert.equal(modelExecution.authority, 'advisory-compilation-only');
assert.equal(modelExecution.truthSource, 'fcr-shared-evidence-spine');
assert.equal(modelExecution.runtimeIdentitySource, 'observe-per-run');
assert.equal(modelExecution.toolAvailabilitySource, 'observe-per-run');
assert.equal(modelExecution.modelConsensusIsProof, false);
assert.equal(modelExecution.requiresIndependentEvidenceForTruthUpgrade, true);
assertExactUniqueSet(
  modelExecution.mayAdapt,
  [
    'context-packaging',
    'reasoning-strategy',
    'tool-selection',
    'handoff-format',
    'verification-plan',
    'prompt-protocol-shape',
  ],
  'Model-native adaptable fields',
);
assertExactUniqueSet(
  modelExecution.mayNotAdapt,
  ['truth-state', 'authority-state', 'founder-approval', 'proof-state', 'project-canon'],
  'Model-native immutable truth fields',
);
const immutableFields = new Set(modelExecution.mayNotAdapt);
for (const adaptableField of modelExecution.mayAdapt) {
  assert.ok(!immutableFields.has(adaptableField), `model-native adaptable field must not overlap immutable state: ${adaptableField}`);
}

const solProfile = modelExecution.profiles?.['chatgpt-sol'];
const claudeProfile = modelExecution.profiles?.['claude-code'];
assert.ok(solProfile, 'PromptOS must preserve the ChatGPT Sol compiler profile');
assert.ok(claudeProfile, 'PromptOS must preserve the Claude compiler profile');
assert.equal(solProfile.provider, 'openai');
assert.equal(claudeProfile.provider, 'anthropic');
assert.notDeepEqual(solProfile.compilerBias, claudeProfile.compilerBias, 'model profiles should benefit from distinct compilation bias');
assert.notEqual(solProfile.promptShape, claudeProfile.promptShape, 'model profiles should use distinct prompt shapes');

assertExactUniqueSet(
  modelExecution.handoffFields,
  [
    'modelProfileId',
    'observedRuntimeModel',
    'observedCapabilities',
    'sourceTruthRefs',
    'authorityRequired',
    'proofRequired',
    'claims',
    'unknowns',
    'continuityFingerprint',
    'resultEvidence',
  ],
  'Model-native handoff fields',
);
assertExactUniqueSet(
  PROMPTOS_MODEL_EXECUTION_HANDOFF_FIELDS,
  modelExecution.handoffFields,
  'Workflow compiler model handoff fields',
);

for (const profileId of ['chatgpt-sol', 'claude-code']) {
  const jsonProfile = modelExecution.profiles[profileId];
  const compilerProfile = PROMPTOS_MODEL_EXECUTION_PROFILES[profileId];
  assert.ok(compilerProfile, `workflow compiler must implement ${profileId}`);
  assert.equal(compilerProfile.provider, jsonProfile.provider, `${profileId} provider must match the contract`);
  assert.equal(compilerProfile.promptShape, jsonProfile.promptShape, `${profileId} prompt shape must match the contract`);
  assert.deepEqual([...compilerProfile.compilerBias], jsonProfile.compilerBias, `${profileId} compiler bias must match the contract`);
  assert.ok(
    jsonProfile.rules.some((rule) => rule.includes('Never simulate')),
    `${profileId} must explicitly prohibit simulated unavailable tool use`,
  );
}

for (const requiredRule of [
  'may specialize prompt and protocol form per observed model profile but may not specialize reality',
  'never grants execution, merge, deployment, publication, spending, destructive, or founder authority',
  'independently validates its evidence',
  'reacquire governing evidence rather than voting or averaging',
  'absent from observedCapabilities must never be simulated',
  'invalidates predecessor proof',
]) {
  assert.ok(
    modelExecution.rules.some((rule) => rule.includes(requiredRule)),
    `Model-native contract must preserve invariant: ${requiredRule}`,
  );
}

const mission = {
  version: 'repair-proof-v1',
  intent: 'Compile a model-native PromptOS workflow without widening authority.',
  project: 'promptos',
  risk: 'low',
  authorityCeiling: 'L2',
  requiredEvidence: ['exact-head', 'playwright'],
  protocols: ['truthmode'],
  providers: ['openai', 'anthropic'],
  stopConditions: ['Required exact-head proof fails.'],
};

const solWorkflow = compileWorkflowArtifact(mission, {
  id: 'model-native-sol-proof',
  modelExecution: {
    modelProfileId: 'chatgpt-sol',
    observedRuntimeModel: 'gpt-5.6-sol',
    observedCapabilities: ['github', 'playwright'],
    sourceTruthRefs: ['fcr:truth-spine:repair-proof'],
    authorityRequired: ['source-write'],
    proofRequired: ['exact-head', 'playwright'],
    claims: ['model profile applied by compiler'],
    unknowns: [],
    continuityFingerprint: 'promptos:model-native:sol:repair-proof',
    resultEvidence: [],
  },
});
const claudeWorkflow = compileWorkflowArtifact(mission, {
  id: 'model-native-claude-proof',
  modelExecution: {
    modelProfileId: 'claude-code',
    observedRuntimeModel: 'claude-code-observed',
    observedCapabilities: ['github'],
    sourceTruthRefs: ['fcr:truth-spine:repair-proof'],
    authorityRequired: ['source-write'],
    proofRequired: ['exact-head'],
    claims: ['model profile applied by compiler'],
    unknowns: ['playwright capability not observed'],
    continuityFingerprint: 'promptos:model-native:claude:repair-proof',
    resultEvidence: [],
  },
});

for (const [label, workflow] of [['Sol', solWorkflow], ['Claude', claudeWorkflow]]) {
  const validation = validateWorkflowArtifact(workflow);
  assert.equal(validation.valid, true, `${label} model-native workflow must validate: ${validation.errors.join(' | ')}`);
  assert.ok(workflow.modelExecution, `${label} compiled workflow must carry modelExecution`);
  for (const field of modelExecution.handoffFields) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(workflow.modelExecution, field),
      `${label} compiled workflow must preserve model handoff field ${field}`,
    );
  }
  assert.equal(workflow.modelExecution.toolUseRule, 'observed-only-no-simulation');
  assert.equal(workflow.modelExecution.executionAuthorized, false);
  assert.equal(workflow.modelExecution.authorityTransferred, false);
  assert.equal(workflow.modelExecution.founderApprovalCarriedForward, false);
}

assert.equal(solWorkflow.modelExecution.promptShape, solProfile.promptShape);
assert.equal(claudeWorkflow.modelExecution.promptShape, claudeProfile.promptShape);
assert.deepEqual(solWorkflow.modelExecution.compilerBias, solProfile.compilerBias);
assert.deepEqual(claudeWorkflow.modelExecution.compilerBias, claudeProfile.compilerBias);
assert.notDeepEqual(solWorkflow.modelExecution.compilerBias, claudeWorkflow.modelExecution.compilerBias);
assert.deepEqual(claudeWorkflow.modelExecution.observedCapabilities, ['github']);
assert.ok(!claudeWorkflow.modelExecution.observedCapabilities.includes('playwright'));

assert.throws(
  () => compileWorkflowArtifact(mission, {
    id: 'missing-runtime-model-proof',
    modelExecution: {
      modelProfileId: 'chatgpt-sol',
      sourceTruthRefs: ['fcr:truth-spine:repair-proof'],
      continuityFingerprint: 'promptos:model-native:missing-runtime',
    },
  }),
  /observedRuntimeModel is required/,
  'model-native compilation must fail closed without observed runtime identity',
);
assert.throws(
  () => compileWorkflowArtifact(mission, {
    id: 'missing-truth-ref-proof',
    modelExecution: {
      modelProfileId: 'claude-code',
      observedRuntimeModel: 'claude-code-observed',
      continuityFingerprint: 'promptos:model-native:missing-truth',
    },
  }),
  /sourceTruthRefs requires at least one authoritative truth reference/,
  'model-native compilation must fail closed without authoritative truth references',
);

console.log('PromptOS/Chief/FCR product boundary and model-native compiler contracts verified.');
