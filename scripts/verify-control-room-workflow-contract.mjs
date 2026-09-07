import {readFile} from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/control-room-tests.yml';
const FOUNDER_CONTROL_CONTRACT = '.control-room/founder-control.contract.json';
const VERIFIER_PATH = 'scripts/verify-control-room-workflow-contract.mjs';
const WORKFLOW_ARTIFACT_PATH = 'src/workflow-artifact.mjs';
const WORKFLOW_REGISTRY_GLOB = 'workflows/**';
const WORKFLOW_MAKER_PATH = 'scripts/make-workflow.mjs';

const workflow = await readFile(WORKFLOW_PATH, 'utf8');
const errors = [];

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function requireBothFilters(path) {
  const line = `      - "${path}"`;
  if (countOccurrences(workflow, line) !== 2) {
    errors.push(`${path} must be watched by both pull_request and push path filters`);
  }
}

requireBothFilters(FOUNDER_CONTROL_CONTRACT);
requireBothFilters(VERIFIER_PATH);
requireBothFilters(WORKFLOW_ARTIFACT_PATH);
requireBothFilters(WORKFLOW_REGISTRY_GLOB);
requireBothFilters(WORKFLOW_MAKER_PATH);

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
}));
