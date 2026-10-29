import assert from 'node:assert/strict';
import test from 'node:test';

import { invokeProvider, providerStates } from './providers.js';

const KEY = 'TEST-KEY-NOT-A-REAL-SECRET';
const okFetch = () => {
  const impl = async () => new Response(JSON.stringify({ id: 'resp_1', status: 'completed', output_text: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } });
  impl.calls = 0;
  const wrapped = async (...args) => { wrapped.calls++; return impl(...args); };
  wrapped.calls = 0;
  return wrapped;
};

test('muse requires an explicitly configured allow-listed model (FCR semantics)', async () => {
  assert.equal(providerStates({ MODEL_API_KEY: KEY }).muse.state, 'ABSENT');
  assert.equal(providerStates({ MODEL_API_KEY: KEY, PROMPTOS_MUSE_MODEL: 'muse-spark-9.9' }).muse.state, 'ABSENT');
  assert.equal(providerStates({ MODEL_API_KEY: KEY, PROMPTOS_MUSE_MODEL: 'muse-spark-1.3' }).muse.state, 'INTEGRATED');
  const fetchImpl = okFetch();
  await assert.rejects(() => invokeProvider({ MODEL_API_KEY: KEY }, { provider: 'muse', prompt: 'hi' }, fetchImpl), /not configured/);
  assert.equal(fetchImpl.calls, 0);
});

test('any non-standard sensitivity is rejected before any network call', async () => {
  const env = { MODEL_API_KEY: KEY, PROMPTOS_MUSE_MODEL: 'muse-spark-1.3' };
  for (const sensitivity of ['crisis', 'restricted']) {
    const fetchImpl = okFetch();
    await assert.rejects(() => invokeProvider(env, { provider: 'muse', prompt: 'hi', sensitivity }, fetchImpl), /sensitive_context_not_authorized/);
    assert.equal(fetchImpl.calls, 0);
  }
});

test('source allowlist rejects user content; founder default and repository pass', async () => {
  const env = { MODEL_API_KEY: KEY, PROMPTOS_MUSE_MODEL: 'muse-spark-1.3' };
  const bad = okFetch();
  await assert.rejects(() => invokeProvider(env, { provider: 'muse', prompt: 'hi', source: 'user' }, bad), /user_content_not_authorized/);
  assert.equal(bad.calls, 0);
  const good = await invokeProvider(env, { provider: 'muse', prompt: 'hi', source: 'repository' }, okFetch());
  assert.equal(good.state, 'INTEGRATED');
  assert.equal(good.evidenceRef, 'provider:meta:resp_1');
  const dflt = await invokeProvider(env, { provider: 'muse', prompt: 'hi' }, okFetch());
  assert.equal(dflt.state, 'INTEGRATED');
});
