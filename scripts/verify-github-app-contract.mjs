import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const template = JSON.parse(await readFile('github-app/registration.template.json', 'utf8'));
const worker = await readFile('github-app/worker.mjs', 'utf8');
const relay = await readFile('github-app/federated-relay.mjs', 'utf8');
const docs = await readFile('github-app/README.md', 'utf8');
const workflow = await readFile('.github/workflows/github-app-tests.yml', 'utf8');

assert.equal(template.contract, 'promptos/github-app@v2');
assert.equal(template.public, false);
assert.deepEqual(template.permissions, {
  actions: 'read',
  contents: 'read',
  issues: 'read',
  pull_requests: 'read',
});
assert.deepEqual(template.events, ['issue_comment', 'pull_request', 'workflow_run']);
assert.ok(template.required_runtime_variables.includes('GITHUB_INSTALLATION_ID'));
assert.deepEqual(template.required_runtime_secrets, [
  'GITHUB_WEBHOOK_SECRET',
  'PROMPTOS_RELAY_PRIVATE_KEY_JWK',
]);
assert.deepEqual(template.required_runtime_variables, [
  'PROMPTOS_RELAY_KEY_ID',
  'PROMPTOS_GIT_SHA',
  'FCR_RELAY_TARGET_SHA',
  'GITHUB_INSTALLATION_ID',
]);

for (const forbidden of [
  'contents:write',
  'issues:write',
  'pull_requests:write',
  'actions:write',
  'workflows:write',
  'administration',
  'secrets',
  'deployments',
  'merge',
  'billing',
  'publication',
]) {
  assert.ok(template.explicitly_not_granted.includes(forbidden), 'missing denied authority: ' + forbidden);
}

for (const requiredSignal of [
  'x-hub-signature-256',
  'x-github-delivery',
  'invalid-webhook-signature',
  'payload-too-large',
  'GITHUB_INSTALLATION_ID',
  'sendFcrObservation',
]) {
  assert.ok(worker.includes(requiredSignal), 'worker contract drifted: ' + requiredSignal);
}

for (const requiredSignal of [
  'SOURCE_REPOSITORY_ID',
  'github-installation-not-allowlisted',
  'github-repository-not-allowlisted',
]) {
  assert.ok(relay.includes(requiredSignal), 'relay identity contract drifted: ' + requiredSignal);
}

for (const requiredSignal of [
  'juss/federated-agent-relay@v3',
  'Ed25519',
  'api.foundercontrolroom.org/api/federated-relay/v3',
  'PROMPTOS_RELAY_PRIVATE_KEY_JWK',
  'FCR_RELAY_TARGET_SHA',
  "disposition: 'observe'",
  'approvalCarriedForward: false',
]) {
  assert.ok(relay.includes(requiredSignal), 'relay contract drifted: ' + requiredSignal);
assert.ok(relay.includes('stableDeliveryIds(deliveryId)'), 'delivery retries must retain deterministic relay IDs');
assert.ok(relay.includes("sequence.slice(0, 13)"), 'source sequence must retain 52 bits of delivery identity to minimize uniqueness collisions');
assert.ok(relay.includes('issueComment.updated_at || issueComment.created_at'), 'edited comments must use a stable event timestamp');
}

for (const forbidden of [
  'createAppJwt',
  'postIssueComment',
  'githubRequest',
  'api.github.com',
]) {
  assert.ok(!worker.includes(forbidden), 'read-only app contains a direct GitHub API write path: ' + forbidden);
}

assert.match(docs, /read-only GitHub event observer/i);
assert.match(docs, /FCR remains the only execution-authority owner/i);
assert.ok(docs.includes('FCR founder-authorized boundary'), 'public relay-key registration must remain inside FCR governance');
assert.ok(workflow.includes('node scripts/verify-github-app-contract.mjs'));
assert.ok(workflow.includes('node e2e/github-app-runtime.mjs'));

console.log('PromptOS GitHub App and FCR relay source contracts verified');
