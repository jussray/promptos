import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, webcrypto } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { request as playwrightRequest } from 'playwright';
import worker from '../github-app/worker.mjs';
import { canonicalizeRelayJsonV3, RELAY_CONTRACT, RELAY_URL } from '../github-app/federated-relay.mjs';

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privateJwk = privateKey.export({ format: 'jwk' });
const publicJwk = publicKey.export({ format: 'jwk' });
const webhookSecret = 'promptos-test-webhook-secret';
const githubWebhookCalls = [];
const relayEnvelopes = [];
const originalFetch = globalThis.fetch;
const sourceSha = 'a'.repeat(40);
const targetSha = 'b'.repeat(40);

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url !== RELAY_URL) {
    githubWebhookCalls.push(url);
    return new Response(JSON.stringify({ error: 'unexpected-external-call' }), { status: 500 });
  }

  const envelope = JSON.parse(init.body);
  relayEnvelopes.push(envelope);
  const signature = envelope.signature.valueBase64Url;
  const unsigned = { ...envelope };
  delete unsigned.signature;
  const verifyKey = await webcrypto.subtle.importKey('jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']);
  const signatureBytes = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - signature.length % 4) % 4), 'base64');
  const signatureValid = await webcrypto.subtle.verify(
    'Ed25519',
    verifyKey,
    signatureBytes,
    new TextEncoder().encode(canonicalizeRelayJsonV3(unsigned)),
  );
  assert.equal(signatureValid, true, 'FCR relay signature must verify against the registered public JWK');
  assert.equal(envelope.contract, RELAY_CONTRACT);
  assert.equal(envelope.disposition, 'observe');
  assert.equal(envelope.source.member, 'promptos');
  assert.equal(envelope.source.repository, 'jussray/promptos');
  assert.equal(envelope.source.headSha, sourceSha);
  assert.ok(Number.isSafeInteger(envelope.ordering.sourceSequence));
  assert.ok(envelope.ordering.sourceSequence >= 0);
  assert.ok(envelope.ordering.sourceSequence < Number.MAX_SAFE_INTEGER);
  assert.equal(envelope.target.member, 'founder-control-room');
  assert.equal(envelope.target.headSha, targetSha);
  assert.equal(envelope.payload.contentType, 'application/json');
  assert.equal(envelope.payload.body.includes('private-comment-text-must-not-forward'), false);
  assert.equal(envelope.payload.body.includes('unrecognized-promptos-command'), true);
  assert.equal(envelope.executionAuthorized, undefined);

  const previous = relayEnvelopes.length > 1 ? relayEnvelopes[0] : null;
  if (previous) {
    assert.equal(
      canonicalizeRelayJsonV3(previous),
      canonicalizeRelayJsonV3(envelope),
      'GitHub delivery retries must produce byte-equivalent relay envelopes',
    );
  }

  const receipt = {
    contract: RELAY_CONTRACT,
    status: 'accepted',
    messageId: envelope.messageId,
    messageFingerprint: 'c'.repeat(64),
    sourceKeyId: envelope.signature.keyId,
    sourceSequence: envelope.ordering.sourceSequence,
    chainId: envelope.ordering.chainId,
    chainPosition: envelope.ordering.chainPosition,
    logicalOperationId: envelope.ordering.logicalOperationId,
    predecessorProofCookie: envelope.predecessorProofCookie,
    successorProofCookie: 'Q4R:v3:test-successor-cookie',
    sourceHeadSha: sourceSha,
    targetHeadSha: targetSha,
    evidenceDigest: 'd'.repeat(64),
    executionAuthorized: false,
    authorityTransferred: false,
    approvalCarriedForward: false,
    acceptedAt: envelope.issuedAt,
  };
  return new Response(JSON.stringify({
    contract: RELAY_CONTRACT,
    outcome: previous ? 'duplicate' : 'accepted',
    receipt,
    executionAuthorized: false,
    authorityTransferred: false,
    approvalCarriedForward: false,
  }), { status: previous ? 200 : 201, headers: { 'content-type': 'application/json' } });
};

const env = {
  GITHUB_WEBHOOK_SECRET: webhookSecret,
  PROMPTOS_RELAY_PRIVATE_KEY_JWK: JSON.stringify(privateJwk),
  PROMPTOS_RELAY_KEY_ID: 'promptos-relay-ed25519-test',
  PROMPTOS_GIT_SHA: sourceSha,
  FCR_RELAY_TARGET_SHA: targetSha,
};

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const request = new Request('http://127.0.0.1' + req.url, {
    method: req.method,
    headers: req.headers,
    body: body.length > 0 ? body : undefined,
  });
  const response = await worker.fetch(request, env);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address === 'object');
const baseURL = 'http://127.0.0.1:' + address.port;
const api = await playwrightRequest.newContext({ baseURL });

try {
  const health = await api.get('/health');
  assert.equal(health.status(), 200);
  const healthBody = await health.json();
  assert.equal(healthBody.contract, 'promptos/github-app@v2');
  assert.deepEqual(healthBody.authority.write, []);
  assert.ok(healthBody.authority.denied.includes('merge'));
  assert.ok(healthBody.authority.denied.includes('code_write'));

  const registration = await api.get('/github/registration');
  assert.equal(registration.status(), 200);
  const registrationBody = await registration.json();
  assert.deepEqual(registrationBody.permissions, {
    actions: 'read',
    contents: 'read',
    issues: 'read',
    pull_requests: 'read',
  });

  const unsigned = await api.post('/github/webhook', {
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'pull_request',
      'x-github-delivery': '00000000-0000-4000-8000-000000000001',
    },
    data: '{}',
  });
  assert.equal(unsigned.status(), 401);

  const payload = JSON.stringify({
    action: 'created',
    installation: { id: 123 },
    repository: { full_name: 'jussray/promptos' },
    issue: { number: 41, pull_request: { url: 'https://api.github.com/repos/jussray/promptos/pulls/41' } },
    comment: {
      body: '/promptos status private-comment-text-must-not-forward',
      created_at: new Date(Date.now() - 30_000).toISOString(),
    },
    sender: { login: 'jussray', type: 'User' },
  });
  const deliveryId = '00000000-0000-4000-8000-000000000041';
  const signature = 'sha256=' + createHmac('sha256', webhookSecret).update(payload).digest('hex');
  const requestOptions = {
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'issue_comment',
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': signature,
    },
    data: payload,
  };

  const first = await api.post('/github/webhook', requestOptions);
  assert.equal(first.status(), 200);
  const firstBody = await first.json();
  assert.equal(firstBody.action, 'fcr-observation-accepted');
  assert.equal(firstBody.relay.executionAuthorized, false);

  const retry = await api.post('/github/webhook', requestOptions);
  assert.equal(retry.status(), 200);
  const retryBody = await retry.json();
  assert.equal(retryBody.relay.outcome, 'duplicate');
  assert.equal(relayEnvelopes.length, 2);
  assert.equal(githubWebhookCalls.length, 0, 'PromptOS must not call GitHub write APIs directly');

  const proof = {
    contract: 'promptos/github-app@v2',
    healthStatus: health.status(),
    unsignedWebhookStatus: unsigned.status(),
    signedWebhookStatus: first.status(),
    retryStatus: retry.status(),
    retryOutcome: retryBody.relay.outcome,
    relayContract: RELAY_CONTRACT,
    signatureVerified: true,
    deterministicDeliveryRetry: true,
    directGitHubApiCalls: 0,
    executionAuthorized: false,
    secretsRecorded: false,
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/promptos-github-app-proof.json', JSON.stringify(proof, null, 2) + '\n');
  console.log('PromptOS GitHub App signed webhook to FCR Relay v3 round-trip proved with Playwright');
} finally {
  await api.dispose();
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
}
