import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { handlePromptPaywall } from './prompt-paywall.js';

const c = globalThis.crypto || webcrypto;
const audience = '813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com';
const { privateKey, publicKey } = await c.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const jwk = await c.subtle.exportKey('jwk', publicKey);
jwk.kid = 'test-key';
jwk.alg = 'RS256';
const now = () => Math.floor(Date.now() / 1000);
const calls = [];
let upstream;
const env = {
  PROMPTOS_JUSSPAY: {
    async fetch(request) {
      calls.push({ url: request.url, method: request.method, auth: request.headers.get('Authorization') });
      if (upstream === 'outage') throw new Error('unavailable');
      if (upstream === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });
      if (upstream === 'invalid') return Response.json({ paid: true });
      return Response.json({ entitlements: upstream ?? [] });
    }
  }
};
const run = (path, method = 'GET', token, config = env) => handlePromptPaywall(
  new Request('https://promptos.example' + path, { method,
    headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  config, path, { 'Access-Control-Allow-Origin': 'https://jussray.github.io' }
);
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function jwt(overrides = {}) {
  const value = b64({ alg: 'RS256', kid: 'test-key' }) + '.' + b64({
    iss: 'https://accounts.google.com', aud: audience, sub: 'user-123',
    iat: now(), exp: now() + 3600, email: 'verified@example.com', email_verified: true, ...overrides
  });
  const signature = await c.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(value));
  return value + '.' + Buffer.from(signature).toString('base64url');
}
const oldFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), 'https://www.googleapis.com/oauth2/v3/certs', 'Never contact Stripe directly from PromptOS');
  return Response.json({ keys: [jwk] });
};

test('unconfigured JussPay denies all personal prompt admissions', async () => {
  const token = await jwt();
  assert.equal((await run('/prompts/admit', 'POST', token, {})).status, 503);
  assert.equal((await run('/billing/entitlement', 'GET', token, {})).status, 503);
});

test('unsigned, expired, wrong-audience or forged Google credentials never reach JussPay', async () => {
  calls.length = 0;
  assert.equal((await run('/prompts/admit', 'POST')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', 'not-a-jwt')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ exp: now() - 100 }))).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ aud: 'malicious-app' }))).status, 401);
  const signed = await jwt();
  assert.equal((await run('/prompts/admit', 'POST', signed.slice(0, -8) + 'invalidx')).status, 401);
  assert.equal(calls.length, 0);
});

test('signed Google credentials without verified email never reach JussPay', async () => {
  calls.length = 0;
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  for (const claims of [
    { email_verified: false }, { email_verified: undefined }, { email_verified: 'false' },
    { email_verified: 1 }, { email: undefined }, { email: '' }
  ]) {
    const token = await jwt(claims);
    assert.equal((await run('/prompts/admit', 'POST', token)).status, 401);
    assert.equal((await run('/billing/entitlement', 'GET', token)).status, 401);
  }
  assert.equal(calls.length, 0);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ email_verified: 'true' }))).status, 200);
});

test('free user and other product subscriptions cannot save personal prompts', async () => {
  const token = await jwt();
  upstream = [];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: false });
  upstream = [{ product: 'thinktank', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  upstream = [{ product: 'promptos', entitlements: ['read_library'], until: now() + 1000 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() - 10 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
});

test('verified Google bearer is forwarded to the private JussPay binding for its own subject check', async () => {
  const token = await jwt();
  calls.length = 0;
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: true });
  const admitted = await run('/prompts/admit', 'POST', token);
  assert.equal(admitted.status, 200);
  assert.deepEqual(await admitted.json(), { admitted: true, persistence: 'session-only' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(v => v.url), ['https://jusspay.internal/entitlements', 'https://jusspay.internal/entitlements']);
  assert(calls.every(v => v.method === 'GET' && v.auth === 'Bearer ' + token));
});

test('JussPay auth failures, provider outage and malformed data fail closed', async () => {
  const token = await jwt();
  for (const response of ['unauthorized', 'outage', 'invalid']) {
    upstream = response;
    assert.equal((await run('/prompts/admit', 'POST', token)).status, 503);
    assert.equal((await run('/billing/entitlement', 'GET', token)).status, 503);
  }
});

test('$1 checkout and webhook cannot bypass the JussPay commerce authority', async () => {
  const token = await jwt();
  calls.length = 0;
  assert.equal((await run('/billing/checkout', 'POST', token)).status, 503);
  assert.equal((await run('/billing/webhook', 'POST', token)).status, 404);
  assert.equal((await run('/billing/checkout', 'GET', token)).status, 405);
  assert.equal(calls.length, 0);
});

test('PromptOS Worker declares a private JussPay service binding for premium access',()=>{
  const config=JSON.parse(readFileSync(new URL('../wrangler.provider.jsonc',import.meta.url),'utf8'));
  assert(config.services.some(s=>s.binding==='PROMPTOS_JUSSPAY'&&s.service==='jusspay'));
  assert.equal(config.secrets.required.includes('PROMPTOS_STRIPE_SECRET_KEY'),false);
  assert.equal(config.secrets.required.includes('PROMPTOS_AI_OPERATOR_KEY'),true);
});

test.after(() => { globalThis.fetch = oldFetch; });
