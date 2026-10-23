import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './analytics.js';

const RELEASE_SHA = '1234567890abcdef1234567890abcdef12345678';
const OPERATOR_KEY = 'operator-contract-key';
const PROTECTED = [
  ['GET', '/runtime-identity'],
  ['POST', '/runtime-proof'],
  ['GET', '/providers'],
  ['POST', '/providers'],
  ['POST', '/optimizer/evaluate'],
];

function env(overrides = {}) {
  return {
    PROMPTOS_AI_OPERATOR_KEY: OPERATOR_KEY,
    PROMPTOS_RELEASE_SHA: RELEASE_SHA,
    OPENAI_API_KEY: 'test-openai-key',
    ...overrides,
  };
}

function fakeKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
    _store: store,
  };
}

function request(method, path, { bearer, body, headers = {} } = {}) {
  const h = { ...headers };
  if (bearer !== undefined) h.Authorization = `Bearer ${bearer}`;
  const init = { method, headers: h };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    h['Content-Type'] = 'application/json';
  }
  return new Request(`https://shared.promptos.example${path}`, init);
}

// Provider calls must never run for an unauthenticated or wrong-key caller.
function noProviderCalls(t) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error('provider must not be called'); };
  t.after(() => { globalThis.fetch = original; });
  return () => calls;
}

test('every protected endpoint rejects a missing bearer with 401 and never calls a provider', async (t) => {
  const calls = noProviderCalls(t);
  for (const [method, path] of PROTECTED) {
    const res = await worker.fetch(request(method, path, { body: method === 'GET' ? undefined : {} }), env());
    assert.equal(res.status, 401, `${method} ${path} must reject missing bearer`);
  }
  assert.equal(calls(), 0);
});

test('every protected endpoint rejects a wrong bearer with 401 and never calls a provider', async (t) => {
  const calls = noProviderCalls(t);
  for (const [method, path] of PROTECTED) {
    const res = await worker.fetch(request(method, path, { bearer: 'not-the-key', body: method === 'GET' ? undefined : {} }), env());
    assert.equal(res.status, 401, `${method} ${path} must reject wrong bearer`);
  }
  assert.equal(calls(), 0);
});

test('protected endpoints fail closed with 503 when the operator key is not configured', async () => {
  const noKey = env({ PROMPTOS_AI_OPERATOR_KEY: undefined });
  for (const [method, path] of PROTECTED) {
    const res = await worker.fetch(request(method, path, { bearer: OPERATOR_KEY, body: method === 'GET' ? undefined : {} }), noKey);
    assert.equal(res.status, 503, `${method} ${path} must not open without an operator key`);
  }
});

test('runtime identity carries the shared-OS contract fields and no secret material', async () => {
  const before = Date.now();
  const res = await worker.fetch(request('GET', '/runtime-identity', { bearer: OPERATOR_KEY }), env());
  assert.equal(res.status, 200);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.equal(body.schema, 'promptos/shared-runtime-identity@v1');
  assert.equal(body.service, 'promptos');
  assert.equal(body.release_sha, RELEASE_SHA);
  assert.equal(body.authority, 'none');
  const observed = Date.parse(body.observed_at);
  assert.ok(Number.isFinite(observed), 'observed_at must be an ISO timestamp');
  assert.ok(observed >= before - 1000 && observed <= Date.now() + 1000, 'observed_at must be server time');
  assert.equal(body.providers.openai.state, 'INTEGRATED');
  assert.equal(text.includes('test-openai-key'), false);
  assert.equal(text.includes(OPERATOR_KEY), false);
});

test('runtime identity reports unknown release rather than inventing a SHA', async () => {
  const res = await worker.fetch(request('GET', '/runtime-identity', { bearer: OPERATOR_KEY }), env({ PROMPTOS_RELEASE_SHA: undefined }));
  const body = await res.json();
  assert.equal(body.release_sha, 'unknown');
});

test('/event accepts only allow-listed events and rejects malformed bodies', async () => {
  const kv = fakeKv();
  const ok = await worker.fetch(request('POST', '/event', { body: { event: 'guest_session_started' } }), { ANALYTICS_KV: kv });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, event: 'guest_session_started', total: 1 });

  const unknown = await worker.fetch(request('POST', '/event', { body: { event: 'exfiltrate_profile' } }), { ANALYTICS_KV: kv });
  assert.equal(unknown.status, 400);

  const invalid = await worker.fetch(request('POST', '/event', { body: '{not json' }), { ANALYTICS_KV: kv });
  assert.equal(invalid.status, 400);

  assert.equal(kv._store.has('exfiltrate_profile'), false);
});

test('/event is not reachable with GET and /totals stays public, aggregate-only, and allow-listed', async () => {
  const kv = fakeKv({ guest_session_started: '4', google_signin_success: '2' });
  const getEvent = await worker.fetch(request('GET', '/event'), { ANALYTICS_KV: kv });
  assert.equal(getEvent.status, 404);

  const totals = await worker.fetch(request('GET', '/totals'), { ANALYTICS_KV: kv });
  assert.equal(totals.status, 200);
  assert.deepEqual(await totals.json(), {
    guest_session_started: 4,
    google_signin_success: 2,
    guest_to_google_upgrade: 0,
  });
});

test('unknown paths return 404 JSON and CORS preflight is answered without a body', async () => {
  const notFound = await worker.fetch(request('GET', '/not-a-route'), env());
  assert.equal(notFound.status, 404);
  assert.deepEqual(await notFound.json(), { error: 'not found' });

  const preflight = await worker.fetch(request('OPTIONS', '/runtime-identity'), env());
  assert.equal(preflight.status, 204);
  assert.equal(await preflight.text(), '');
});
