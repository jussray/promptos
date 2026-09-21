import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const template = JSON.parse(await readFile('github-app/registration.template.json', 'utf8'));
const worker = await readFile('github-app/worker.mjs', 'utf8');
const docs = await readFile('github-app/README.md', 'utf8');
const workflow = await readFile('.github/workflows/github-app-tests.yml', 'utf8');

assert.equal(template.contract, 'promptos/github-app@v1');
assert.equal(template.public, false);
assert.deepEqual(template.permissions, {
  actions: 'read',
  contents: 'read',
  issues: 'write',
  pull_requests: 'read',
});
assert.deepEqual(template.events, ['issue_comment', 'pull_request', 'workflow_run']);
assert.deepEqual(template.required_runtime_secrets, [
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_WEBHOOK_SECRET',
]);

for (const forbidden of [
  'contents:write',
  'pull_requests:write',
  'actions:write',
  'workflows:write',
  'administration',
  'secrets',
  'deployments',
]) {
  assert.ok(template.explicitly_not_granted.includes(forbidden), `missing denied authority: ${forbidden}`);
}

for (const requiredSourceSignal of [
  "x-hub-signature-256",
  "x-github-delivery",
  "/app/installations/${installationId}/access_tokens",
  "issues/${issueNumber}/comments",
  "PROMPTOS_COMMENT_ON_FAILURES",
  "invalid-webhook-signature",
  "payload-too-large",
]) {
  assert.ok(worker.includes(requiredSourceSignal), `worker contract drifted: ${requiredSourceSignal}`);
}

for (const forbiddenEndpoint of ['/merges', '/git/refs', '/actions/workflows/']) {
  assert.ok(!worker.includes(forbiddenEndpoint), `v1 worker must not contain mutation endpoint: ${forbiddenEndpoint}`);
}

assert.match(docs, /source candidate only/i);
assert.match(docs, /cannot edit repository contents, merge pull requests/i);
assert.match(docs, /signed runtime receipt/i);
assert.ok(workflow.includes('node scripts/verify-github-app-contract.mjs'));
assert.ok(workflow.includes('node e2e/github-app-runtime.mjs'));

console.log('PromptOS GitHub App source contract verified');
