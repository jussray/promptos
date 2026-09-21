import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { request as playwrightRequest } from 'playwright';
import worker from '../github-app/worker.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const webhookSecret = 'promptos-test-webhook-secret';
const githubCalls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('https://api.github.com/')) return originalFetch(input, init);

  const method = init.method || 'GET';
  const headers = new Headers(init.headers || {});
  githubCalls.push({
    url,
    method,
    authorizationScheme: String(headers.get('authorization') || '').split(' ')[0] || null,
    body: init.body ? JSON.parse(init.body) : null,
  });

  if (url.endsWith('/app/installations/123/access_tokens') && method === 'POST') {
    return new Response(JSON.stringify({ token: 'ghs_promptos_test_installation_token' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (url.includes('/repos/jussray/promptos/issues/41/comments?') && method === 'GET') {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (url.endsWith('/repos/jussray/promptos/issues/41/comments') && method === 'POST') {
    return new Response(JSON.stringify({ id: 999, body: githubCalls.at(-1).body?.body || '' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'unexpected mocked GitHub API request' }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  });
};

const env = {
  GITHUB_APP_ID: '123456',
  GITHUB_APP_PRIVATE_KEY: privateKeyPem,
  GITHUB_WEBHOOK_SECRET: webhookSecret,
};

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const request = new Request(`http://127.0.0.1${req.url}`, {
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
const baseURL = `http://127.0.0.1:${address.port}`;
const api = await playwrightRequest.newContext({ baseURL });

try {
  const health = await api.get('/health');
  assert.equal(health.status(), 200);
  const healthBody = await health.json();
  assert.equal(healthBody.contract, 'promptos/github-app@v1');
  assert.ok(healthBody.authority.denied.includes('merge'));
  assert.ok(healthBody.authority.denied.includes('code_write'));

  const unsigned = await api.post('/github/webhook', {
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'ping',
      'x-github-delivery': 'delivery-unsigned',
    },
    data: '{}',
  });
  assert.equal(unsigned.status(), 401);

  const payload = JSON.stringify({
    action: 'created',
    installation: { id: 123 },
    repository: { full_name: 'jussray/promptos' },
    issue: { number: 41, pull_request: { url: 'https://api.github.com/repos/jussray/promptos/pulls/41' } },
    comment: { body: '/promptos status' },
    sender: { login: 'jussray', type: 'User' },
  });
  const signature = `sha256=${createHmac('sha256', webhookSecret).update(payload).digest('hex')}`;
  const signed = await api.post('/github/webhook', {
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'issue_comment',
      'x-github-delivery': 'delivery-status-1',
      'x-hub-signature-256': signature,
    },
    data: payload,
  });
  assert.equal(signed.status(), 200);
  const signedBody = await signed.json();
  assert.equal(signedBody.action, 'status-commented');

  const tokenCall = githubCalls.find((call) => call.url.endsWith('/app/installations/123/access_tokens'));
  assert.ok(tokenCall, 'installation token call missing');
  assert.equal(tokenCall.authorizationScheme, 'Bearer');

  const commentCall = githubCalls.find(
    (call) => call.method === 'POST' && call.url.endsWith('/repos/jussray/promptos/issues/41/comments'),
  );
  assert.ok(commentCall, 'PromptOS status comment call missing');
  assert.match(commentCall.body.body, /promptos-delivery:delivery-status-1/);
  assert.match(commentCall.body.body, /no code-write, merge, deployment/i);

  const proof = {
    contract: 'promptos/github-app@v1',
    healthStatus: health.status(),
    unsignedWebhookStatus: unsigned.status(),
    signedCommandStatus: signed.status(),
    signedCommandAction: signedBody.action,
    githubApiCalls: githubCalls.map(({ url, method }) => ({ url, method })),
    secretsRecorded: false,
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/promptos-github-app-proof.json', `${JSON.stringify(proof, null, 2)}\n`);
  console.log('PromptOS GitHub App signed webhook runtime proved with Playwright request client');
} finally {
  await api.dispose();
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
}
