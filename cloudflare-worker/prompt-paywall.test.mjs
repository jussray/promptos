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
const map = new Map();
const env = {
  PROMPTOS_BILLING_KV: {
    async get(key) { return map.get(key) || null; },
    async put(key, value) { map.set(key, value); }
  },
  PROMPTOS_STRIPE_SECRET_KEY: 'sk_test_fake_not_a_real_secret',
  PROMPTOS_STRIPE_PRICE_ID: 'price_test_one',
  PROMPTOS_BILLING_SUCCESS_URL: 'https://example.com/thanks',
  PROMPTOS_BILLING_CANCEL_URL: 'https://example.com/canceled',
  PROMPTOS_STRIPE_WEBHOOK_SECRET: 'whsec_fake_not_a_real_secret'
};
const request = (path, method, token, headers = {}, body) => new Request('https://worker.example' + path, {
  method, headers: { ...headers, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body
});
const run = (path, method = 'GET', token, headers, body, config = env) =>
  handlePromptPaywall(request(path, method, token, headers, body), config, path, { 'Access-Control-Allow-Origin': '*' });
const b64 = input => Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');
async function jwt(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const text = b64({ alg: 'RS256', kid: 'test-key' }) + '.' + b64({
    iss: 'https://accounts.google.com', aud: audience, sub: 'user-123',
    iat: now, exp: now + 3600, ...overrides
  });
  const signature = await c.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(text));
  return text + '.' + Buffer.from(signature).toString('base64url');
}
const before = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href === 'https://www.googleapis.com/oauth2/v3/certs') {
    return Response.json({ keys: [jwk] });
  }
  if (href.startsWith('https://api.stripe.com/v1/subscriptions?')) {
    const active = map.get('subscriptionStatus') || 'active';
    return Response.json({ data: [{ status: active, items: { data: [{ price: { id: 'price_test_one' } }] } }] });
  }
  if (href === 'https://api.stripe.com/v1/checkout/sessions' && init.method === 'POST') {
    const params = new URLSearchParams(init.body);
    assert.equal(params.get('client_reference_id'), 'user-123');
    assert.equal(params.get('line_items[0][price]'), 'price_test_one');
    return Response.json({ url: 'https://checkout.stripe.com/pay/cs_test_valid' });
  }
  throw new Error('Unexpected network call ' + href);
};

test('rejects unconfigured billing and unauthenticated, forged or expired tokens', async () => {
  const empty = await run('/prompts/admit', 'POST', await jwt(), undefined, undefined, {});
  assert.equal(empty.status, 503);
  assert.equal((await run('/prompts/admit', 'POST')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', 'x.y.z')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ aud: 'attacker' }))).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ exp: 123456 }))).status, 401);
  const good = await jwt();
  assert.equal((await run('/prompts/admit', 'POST', good.slice(0, -8) + 'fakeeeee')).status, 401);
});

test('free user cannot admit personal prompt; paid price+status allows it', async () => {
  const token = await jwt();
  map.clear();
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: false });
  map.set('customer:user-123', 'cus_test001');
  const admit = await run('/prompts/admit', 'POST', token);
  assert.equal(admit.status, 200);
  assert.deepEqual(await admit.json(), { admitted: true, persistence: 'session-only' });
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: true });
  map.set('subscriptionStatus', 'past_due');
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  map.set('subscriptionStatus', 'canceled');
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  map.delete('subscriptionStatus');
});

test('checkout requires a verified identity and uses configured price, not browser price', async () => {
  const token = await jwt();
  map.set('customer:user-123', 'cus_test001');
  assert.equal((await run('/billing/checkout', 'POST', token)).status, 409, 'active subscribers must not purchase twice');
  map.clear();
  assert.equal((await run('/billing/checkout', 'POST')).status, 401);
  const response = await run('/billing/checkout', 'POST', token);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/pay/cs_test_valid' });
});

test('webhooks reject unsigned events; signed paid checkout maps verified customer', async () => {
  map.clear();
  const event = JSON.stringify({
    type: 'checkout.session.completed', data: { object: {
      mode: 'subscription', payment_status: 'paid',
      client_reference_id: 'user-123', customer: 'cus_test002'
    } }
  });
  const missing = await run('/billing/webhook', 'POST', null, {}, event);
  assert.equal(missing.status, 400);
  const t = Math.floor(Date.now() / 1000);
  const key = await c.subtle.importKey('raw', new TextEncoder().encode(env.PROMPTOS_STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hmac = Buffer.from(await c.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + event))).toString('hex');
  assert.equal((await run('/billing/webhook', 'POST', null,
    { 'Stripe-Signature': 't=' + (t - 3600) + ',v1=' + hmac }, event)).status, 400);
  assert.equal((await run('/billing/webhook', 'POST', null,
    { 'Stripe-Signature': 't=' + t + ',v1=' + hmac }, event)).status, 200);
  assert.equal(map.get('customer:user-123'), 'cus_test002');
});

test.after(() => { globalThis.fetch = before; });
