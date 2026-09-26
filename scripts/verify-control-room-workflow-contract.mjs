import '../workflows/continuity/verify.mjs';
import {readFile} from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/control-room-tests.yml';
const FOUNDER_CONTROL_CONTRACT = '.control-room/founder-control.contract.json';
const VERIFIER_PATH = 'scripts/verify-control-room-workflow-contract.mjs';
const WORKFLOW_ARTIFACT_PATH = 'src/workflow-artifact.mjs';
const WORKFLOW_REGISTRY_GLOB = 'workflows/**';
const WORKFLOW_MAKER_PATH = 'scripts/make-workflow.mjs';
const CONTINUITY_VERIFIER_PATH = 'workflows/continuity/verify.mjs';

const [workflow, founderControlRaw] = await Promise.all([
  readFile(WORKFLOW_PATH, 'utf8'),
  readFile(FOUNDER_CONTROL_CONTRACT, 'utf8'),
]);
const founderControl = JSON.parse(founderControlRaw);
const errors = [];

function requireEqual(actual, expected, message) {
  if (actual !== expected) errors.push(message);
}

function requireArray(actual, expected, message) {
  if (!Array.isArray(actual) || actual.join('|') !== expected.join('|')) errors.push(message);
}

const pullRequestStart = workflow.indexOf('  pull_request:\n');
const pushStart = workflow.indexOf('  push:\n');
const workflowDispatchStart = workflow.indexOf('  workflow_dispatch:\n');

if (pullRequestStart === -1 || pushStart === -1 || pullRequestStart > pushStart) {
  errors.push('control-room workflow must declare pull_request before push');
}

const pullRequestBlock = pullRequestStart === -1 || pushStart === -1
  ? ''
  : workflow.slice(pullRequestStart, pushStart).trim();
if (pullRequestBlock !== 'pull_request:') {
  errors.push('pull_request trigger must remain unconditional so required checks cannot be skipped by path filters');
}

const pushBlock = pushStart === -1
  ? ''
  : workflow.slice(pushStart, workflowDispatchStart === -1 ? workflow.length : workflowDispatchStart);

function requirePushFilter(path) {
  const line = `      - "${path}"`;
  if (!pushBlock.includes(line)) {
    errors.push(`${path} must remain watched by the main push path filter`);
  }
}

requirePushFilter(FOUNDER_CONTROL_CONTRACT);
requirePushFilter(VERIFIER_PATH);
requirePushFilter(WORKFLOW_ARTIFACT_PATH);
requirePushFilter(WORKFLOW_REGISTRY_GLOB);
requirePushFilter(WORKFLOW_MAKER_PATH);

if (!workflow.includes(`run: node ${VERIFIER_PATH}`)) {
  errors.push(`${VERIFIER_PATH} must run in the PromptOS control-room verification job`);
}

if (!workflow.includes('run: node scripts/verify-founder-os-mission-compiler.mjs')) {
  errors.push('Founder OS mission compiler verifier must run so workflow artifacts and registry remain gated');
}

requireEqual(founderControl.canonicalAuthority?.repository, 'jussray/founder-control-room', 'Founder Control Room must remain PromptOS canonical founder authority');
requireEqual(founderControl.kernelConsumer?.contract, 'juss/founder-execution-kernel@v1', 'PromptOS must consume the Founder Execution Kernel v1 contract');
requireEqual(founderControl.kernelConsumer?.role, 'portable-command-grammar', 'PromptOS kernel role must remain portable-command-grammar');

for (const field of [
  'mayGrantActionAuthority',
  'mayGrantMergeAuthority',
  'mayGrantDeployAuthority',
  'mayGrantPublishAuthority',
  'mayOverrideLocalRepositoryAuthority',
]) {
  requireEqual(founderControl.kernelConsumer?.[field], false, `kernelConsumer.${field} must remain false`);
}

requireArray(founderControl.truthVocabulary, [
  'VERIFIED',
  'INFERRED',
  'UNKNOWN',
  'BLOCKED',
  'STALE',
], 'Founder Execution Kernel truth vocabulary drifted');

requireArray(founderControl.surpriseSignals, [
  'STRONGER_THAN_EXPECTED',
  'AS_EXPECTED',
  'WEAKER_THAN_EXPECTED',
  'UNEXPECTED_DIRECTION',
  'UNKNOWN',
], 'Founder Execution Kernel surprise signal vocabulary drifted');

requireArray(founderControl.adaptiveActions, [
  'ACCELERATE',
  'CONTINUE',
  'REPAIR',
  'REORIENT',
  'HOLD',
  'STOP',
], 'Founder Execution Kernel adaptive action vocabulary drifted');

requireEqual(founderControl.portableMirror?.kind, 'github-gist', 'Portable mirror must remain a GitHub Gist distribution mirror');
for (const field of [
  'authority',
  'runtimePersistenceAuthority',
  'founderApprovalCarrier',
  'liveTruthAuthority',
]) {
  requireEqual(founderControl.portableMirror?.[field], false, `portableMirror.${field} must remain false`);
}
requireEqual(founderControl.portableMirror?.distributionOnly, true, 'Portable Gist mirror must remain distribution-only');

for (const field of [
  'surfaceMaySelfAuthorize',
  'chiefMaySelfAuthorize',
  'gistMaySelfAuthorize',
  'gistMayPersistRuntimeState',
  'silenceIsApproval',
  'providerSuccessIsOutcomeProof',
]) {
  requireEqual(founderControl.rules?.[field], false, `rules.${field} must remain false`);
}

for (const field of [
  'proposalMutationInvalidatesApproval',
  'executionRequiresExactProposalBinding',
  'executionReceiptRequired',
  'evidenceBelongsToExactFingerprint',
  'fingerprintMovementExpiresDependentProof',
  'continuityReceiptIsDescriptiveOnly',
  'externalContentIsDataNotAuthority',
  'uiClaimsRequireTargetedPlaywright',
  'mutableAuthorityStateMustBeRereadBeforeIntegration',
]) {
  requireEqual(founderControl.rules?.[field], true, `rules.${field} must remain true`);
}

if (errors.length > 0) {
  console.error('PromptOS control-room workflow contract failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  workflow: WORKFLOW_PATH,
  guardedPath: FOUNDER_CONTROL_CONTRACT,
  verifier: VERIFIER_PATH,
  workflowArtifactPath: WORKFLOW_ARTIFACT_PATH,
  workflowRegistryGlob: WORKFLOW_REGISTRY_GLOB,
  workflowMakerPath: WORKFLOW_MAKER_PATH,
  continuityVerifierPath: CONTINUITY_VERIFIER_PATH,
  pullRequestUnconditional: true,
  pushPathFiltersRetained: true,
  founderKernelContract: founderControl.kernelConsumer.contract,
  founderKernelRole: founderControl.kernelConsumer.role,
  gistDistributionOnly: founderControl.portableMirror.distributionOnly,
  gistAuthority: founderControl.portableMirror.authority,
}));
