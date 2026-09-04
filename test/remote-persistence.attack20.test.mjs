import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const adapterSource = await readFile('parts/remote-persistence.js', 'utf8');
const workerSource = await readFile('cloudflare-worker/promptos-sync.js', 'utf8');
const wranglerSource = await readFile('cloudflare-worker/promptos-sync.wrangler.toml', 'utf8');
const indexSource = await readFile('index.html', 'utf8');

function makeAdapterRuntime(fetchImpl = async () => new Response('{}', {status: 500})) {
  const sandbox = {
    URL,
    Response,
    Headers,
    window: {
      fetch: fetchImpl,
      __promptosValidateImport(text) {
        const state = JSON.parse(text);
        if (state.schemaVersion !== 1) throw new Error('unsupported schema');
        return {schemaVersion: 1, state};
      },
    },
  };
  vm.runInNewContext(adapterSource, sandbox, {filename: 'parts/remote-persistence.js'});
  return sandbox.window.__PROMPTOS_REMOTE_PERSISTENCE__;
}

const attacks = [
  ['01 adapter is disabled by default', () => {
    assert.equal(makeAdapterRuntime().enabledByDefault, false);
  }],
  ['02 adapter remains outside the public script graph', () => {
    assert.equal(indexSource.includes('./parts/remote-persistence.js'), false);
  }],
  ['03 adapter does not use durable browser key-value storage', () => {
    assert.equal(adapterSource.includes('local' + 'Storage'), false);
  }],
  ['04 adapter does not use browser session key-value storage', () => {
    assert.equal(adapterSource.includes('session' + 'Storage'), false);
  }],
  ['05 adapter does not read or write document cookies', () => {
    assert.equal(adapterSource.includes('document.cookie'), false);
  }],
  ['06 endpoint must be HTTPS', () => {
    const api = makeAdapterRuntime();
    assert.throws(() => api.createAdapter({endpoint: 'http://example.test', getAuthorizationHeader: () => 'Bearer x'}), /HTTPS/);
  }],
  ['07 endpoint cannot embed credentials or query material', () => {
    const api = makeAdapterRuntime();
    assert.throws(() => api.createAdapter({endpoint: 'https://u:p@example.test/?token=x', getAuthorizationHeader: () => 'Bearer x'}), /credentials, query, or fragment/);
  }],
  ['08 authorization is callback-supplied rather than configured as a stored value', () => {
    assert.match(adapterSource, /getAuthorizationHeader callback is required/);
    assert.equal(adapterSource.includes('token:'), false);
  }],
  ['09 remote state requires schemaVersion 1', () => {
    assert.match(adapterSource, /remote state must use schemaVersion 1/);
  }],
  ['10 push requires current ETag', () => {
    assert.match(adapterSource, /push requires the current ETag/);
    assert.match(adapterSource, /'If-Match'/);
  }],
  ['11 push requires exact source SHA', () => {
    assert.match(adapterSource, /exact lowercase 40-character source SHA/);
    assert.match(adapterSource, /'X-PromptOS-Source-Sha'/);
  }],
  ['12 conflict response is fail-closed with no automatic merge', () => {
    assert.match(adapterSource, /response\.status === 412/);
    assert.equal(makeAdapterRuntime().automaticMerge, false);
  }],
  ['13 conflict response is not automatically retried', () => {
    assert.equal(makeAdapterRuntime().automaticRetry, false);
  }],
  ['14 worker has no PromptOS KV sync binding', () => {
    assert.equal(workerSource.includes('PROMPTOS_KV'), false);
    assert.equal(wranglerSource.includes('kv_namespaces'), false);
  }],
  ['15 worker uses a Durable Object state binding', () => {
    assert.match(workerSource, /PROMPTOS_STATE\.idFromName\('primary'\)/);
    assert.match(wranglerSource, /\[\[durable_objects\.bindings\]\]/);
  }],
  ['16 Durable Object storage is declared sqlite', () => {
    assert.match(wranglerSource, /\[exports\.PromptOSStateStore\][\s\S]*storage = "sqlite"/);
  }],
  ['17 sync secret is required but no value is committed', () => {
    assert.match(wranglerSource, /required = \["PROMPTOS_SYNC_SECRET"\]/);
    assert.equal(/PROMPTOS_SYNC_SECRET\s*=\s*"[^\"]+"/.test(wranglerSource), false);
  }],
  ['18 worker rejects wildcard CORS', () => {
    assert.equal(workerSource.includes("'Access-Control-Allow-Origin': '*'"), false);
    assert.equal(wranglerSource.includes('PROMPTOS_ALLOWED_ORIGIN = "*"'), false);
  }],
  ['19 worker requires bearer authorization for state routes', () => {
    assert.match(workerSource, /bearerAuthorized\(request, env\.PROMPTOS_SYNC_SECRET\)/);
    assert.match(workerSource, /unauthorized/);
  }],
  ['20 worker requires write preconditions and reports 428', () => {
    assert.match(workerSource, /precondition_required/);
    assert.match(workerSource, /428/);
  }],
  ['21 stale state writes report 412', () => {
    assert.match(workerSource, /state_conflict/);
    assert.match(workerSource, /412/);
  }],
  ['22 worker validates exact source SHA on writes', () => {
    assert.match(workerSource, /x-promptos-source-sha/);
    assert.match(workerSource, /invalid_source_sha/);
  }],
  ['23 worker validates the shared state schema before storage', () => {
    assert.match(workerSource, /validatePromptOSStateText\(body\)/);
  }],
  ['24 worker emits revision, fingerprint, source SHA, and ETag receipts', () => {
    assert.match(workerSource, /revision/);
    assert.match(workerSource, /fingerprint/);
    assert.match(workerSource, /sourceSha/);
    assert.match(workerSource, /'ETag'/);
  }],
  ['25 state payload size is bounded to the shared schema policy', () => {
    assert.match(workerSource, /PROMPTOS_STATE_POLICY\.maxBytes/);
    assert.match(workerSource, /payload_too_large/);
  }],
  ['26 health truth says persistence is still staged and disabled', () => {
    assert.match(workerSource, /staged-disabled-until-proof/);
  }],
];

for (const [name, fn] of attacks) test(`Attack-20 ${name}`, fn);
