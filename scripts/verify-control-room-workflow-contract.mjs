import {readFile} from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/control-room-tests.yml';
const FOUNDER_CONTROL_CONTRACT = '.control-room/founder-control.contract.json';
const VERIFIER_PATH = 'scripts/verify-control-room-workflow-contract.mjs';

const workflow = await readFile(WORKFLOW_PATH, 'utf8');
const errors = [];

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

const guardedPathLine = `      - "${FOUNDER_CONTROL_CONTRACT}"`;
const verifierPathLine = `      - "${VERIFIER_PATH}"`;

if (countOccurrences(workflow, guardedPathLine) !== 2) {
  errors.push(`${FOUNDER_CONTROL_CONTRACT} must be watched by both pull_request and push path filters`);
}

if (countOccurrences(workflow, verifierPathLine) !== 2) {
  errors.push(`${VERIFIER_PATH} must be watched by both pull_request and push path filters`);
}

if (!workflow.includes(`run: node ${VERIFIER_PATH}`)) {
  errors.push(`${VERIFIER_PATH} must run in the PromptOS control-room verification job`);
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
}));
