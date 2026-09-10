import '../workflows/continuity/verify.mjs';
import {readFile} from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/control-room-tests.yml';
const FOUNDER_CONTROL_CONTRACT = '.control-room/founder-control.contract.json';
const VERIFIER_PATH = 'scripts/verify-control-room-workflow-contract.mjs';
const WORKFLOW_ARTIFACT_PATH = 'src/workflow-artifact.mjs';
const WORKFLOW_REGISTRY_GLOB = 'workflows/**';
const WORKFLOW_MAKER_PATH = 'scripts/make-workflow.mjs';
const CONTINUITY_VERIFIER_PATH = 'workflows/continuity/verify.mjs';

const workflow = await readFile(WORKFLOW_PATH, 'utf8');
const errors = [];

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
}));
