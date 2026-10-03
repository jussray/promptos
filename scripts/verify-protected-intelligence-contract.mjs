import {readFile} from 'node:fs/promises';

const EXPECTED_PROJECT = 'jussray/promptos';
const EXPECTED_ROLE = 'prompt_workflow_compiler_routing_intelligence';
const REQUIRED_SUBJECTS = [
  'prompt_compilation',
  'protocol_lineage',
  'routing',
  'evaluation',
  'free_user_layer_boundary',
  'promotion_eligibility',
  'outcome_attribution',
  'revision_memory',
  'private_internal_boundary',
  'production_proof',
];
const REQUIRED_DURABLE_FORMS = ['code', 'internal_modules', 'policies', 'evaluators', 'workflow_engines', 'tests', 'receipts'];
const REQUIRED_INTERNAL = ['internal_orchestration', 'hidden_prompts', 'private_reasoning', 'evaluator_notes', 'private_learning_records', 'proprietary_lineage'];
const REQUIRED_LIVE_PROOF = ['source_head', 'deployment_identity', 'runtime_path', 'playwright_evidence', 'successor_fingerprint'];
const REQUIRED_CORE_SYSTEMS = new Map([
  ['jussray/founder-control-room', 'founder_operating_build_intelligence'],
  ['jussray/chief-ai-machine', 'executive_synthesis_reasoning_intelligence'],
  ['jussray/solcontinuity', 'challenge_evaluation_continuity_intelligence'],
  ['jussray/promptos', 'prompt_workflow_compiler_routing_intelligence'],
]);

const contract = JSON.parse(await readFile('.control-room/council-residency.contract.json', 'utf8'));
const errors = [];
const requireTrue = (label, value) => { if (value !== true) errors.push(`${label}: expected true`); };
const requireFalse = (label, value) => { if (value !== false) errors.push(`${label}: expected false`); };
const requireIncludes = (label, values, expected) => {
  if (!Array.isArray(values) || !values.includes(expected)) errors.push(`${label}: missing ${expected}`);
};

if (contract.contract !== 'juss/founder-council-federation@v2') errors.push('wrong Council federation contract id');
if (contract.project !== EXPECTED_PROJECT) errors.push(`wrong project: expected ${EXPECTED_PROJECT}`);
if (contract.projectRole !== EXPECTED_ROLE) errors.push(`wrong project role: expected ${EXPECTED_ROLE}`);

const shared = contract.topology?.sharedCouncilLayer;
requireTrue('shared Council layer is neutral', shared?.neutral);
requireFalse('shared Council layer is not owned by a core system', shared?.ownedByCoreSystem);
requireFalse('shared Council layer is not owned by an external provider', shared?.ownedByExternalProvider);
requireTrue('shared Council survives provider replacement', shared?.mustRemainAvailableAcrossExternalProviderReplacement);
requireTrue('shared Council is not required for peer core operation', shared?.mustNotBecomeCoreDependencyForPeerOperation);
if (shared?.physicalBacking !== 'UNDECIDED_UNTIL_SEPARATELY_AUTHORIZED') errors.push('shared Council physical backing was pre-selected without a separate authority gate');

const coreSystems = Array.isArray(contract.topology?.coreSystems) ? contract.topology.coreSystems : [];
for (const [repository, role] of REQUIRED_CORE_SYSTEMS) {
  const peer = coreSystems.find((entry) => entry?.repository === repository);
  if (!peer) {
    errors.push(`missing core peer: ${repository}`);
    continue;
  }
  requireTrue(`${repository} standalone`, peer.standalone);
  requireTrue(`${repository} peer`, peer.peer);
  requireTrue(`${repository} core function survives Council unavailability`, peer.coreFunctionSurvivesCouncilUnavailable);
  if (peer.role !== role) errors.push(`${repository}: wrong core role ${String(peer.role)}`);
}

const external = contract.topology?.externalProviderSeats;
requireTrue('external providers remain replaceable Council seats', external?.replaceable);
requireFalse('external providers are not a core dependency', external?.coreDependency);
requireTrue('external providers may be invoked from FCR', external?.mayBeInvokedFromFCR);
requireTrue('provider loss cannot erase portfolio state', external?.providerLossMustNotErasePortfolioState);
requireTrue('local project adapter is required', contract.topology?.localProjectAdapter?.required);
if (contract.topology?.localProjectAdapter?.path !== '.control-room') errors.push('local project adapter path drifted');
requireFalse('shared Council does not centralize execution authority', contract.topology?.centralizedExecutionAuthority);
requireFalse('shared Council layer grants no execution authority', contract.authority?.sharedCouncilLayerGrantsExecutionAuthority);

requireTrue('same Court/Council kernel', contract.jurisdiction?.sameCourtCouncilKernel);
requireTrue('repo/product/production scope', contract.jurisdiction?.repoProductProductionScoped);
for (const subject of REQUIRED_SUBJECTS) requireIncludes('PromptOS subject', contract.jurisdiction?.subjects, subject);

if (contract.intelligenceBoundary?.principle !== 'learn_encode_verify_compound_expose_value_protect_machinery') {
  errors.push('protected intelligence principle drifted');
}
requireTrue('reusable intelligence becomes durable capability', contract.intelligenceBoundary?.reusableIntelligenceMustBecomeDurableCapability);
requireTrue('intelligence does not depend on founder memory', contract.intelligenceBoundary?.intelligenceMustNotDependOnFounderMemory);
requireTrue('users own data and outputs', contract.intelligenceBoundary?.usersOwnTheirDataAndOutputs);
requireTrue('external providers remain replaceable', contract.intelligenceBoundary?.externalProvidersReplaceable);
for (const value of REQUIRED_DURABLE_FORMS) requireIncludes('durable intelligence form', contract.intelligenceBoundary?.durableForms, value);
for (const value of REQUIRED_INTERNAL) requireIncludes('internal-only intelligence', contract.intelligenceBoundary?.internalOnly, value);

requireTrue('affected live projects require end-to-end runtime proof', contract.completion?.affectedLiveProjectsRequireEndToEndRuntimeProof);
requireTrue('done words require runtime verification', contract.completion?.doneWordsRequireRuntimeVerificationWhenLiveGoal);
requireTrue('earlier stages do not satisfy live', contract.completion?.earlierStagesDoNotSatisfyLive);
for (const value of REQUIRED_LIVE_PROOF) requireIncludes('required live proof', contract.completion?.requiredLiveProof, value);

if (errors.length) {
  console.error('PromptOS protected intelligence contract failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(JSON.stringify({
  contract: contract.contract,
  project: contract.project,
  projectRole: contract.projectRole,
  status: 'passed',
  topology: 'neutral-shared-council-with-standalone-core-peers',
  subjects: REQUIRED_SUBJECTS,
  liveCompletion: REQUIRED_LIVE_PROOF,
}));
