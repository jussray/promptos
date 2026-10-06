import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './analytics.js';
import { courtHandoffFingerprint } from '../src/court-compiler.mjs';

const RELEASE_SHA = '1234567890abcdef1234567890abcdef12345678';

function env(overrides = {}) {
  return {
    PROMPTOS_AI_OPERATOR_KEY: 'operator-proof-key',
    PROMPTOS_RELEASE_SHA: RELEASE_SHA,
    OPENAI_API_KEY: 'test-openai-key',
    ...overrides,
  };
}

function request(path, init = {}) {
  return new Request(`https://promptos.example${path}`, init);
}

test('runtime identity is protected, exact-head, and secret-free', async () => {
  const unauthorized = await worker.fetch(request('/runtime-identity'), env());
  assert.equal(unauthorized.status, 401);

  const response = await worker.fetch(request('/runtime-identity', {
    headers: { Authorization: 'Bearer operator-proof-key' },
  }), env());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, 'promptos');
  assert.equal(body.release_sha, RELEASE_SHA);
  assert.deepEqual(body.providers.openai, { state: 'INTEGRATED', model: 'gpt-5.6-sol' });
  assert.equal(JSON.stringify(body).includes('test-openai-key'), false);
  assert.equal(JSON.stringify(body).includes('operator-proof-key'), false);
});

test('runtime proof returns provenance without model text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: 'resp_promptos_runtime_1',
    output_text: 'PROMPTOS_RUNTIME_PROOF_OK',
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const response = await worker.fetch(request('/runtime-proof', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer operator-proof-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: 'openai' }),
    }), env());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, {
      service: 'promptos',
      release_sha: RELEASE_SHA,
      provider: 'openai',
      model: 'gpt-5.6-sol',
      response_id: 'resp_promptos_runtime_1',
      evidence_ref: 'provider:openai:resp_promptos_runtime_1',
      provider_state: 'VERIFIED',
      authority: 'none',
    });
    assert.equal(JSON.stringify(body).includes('PROMPTOS_RUNTIME_PROOF_OK'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unknown release identity stays unknown rather than inventing a SHA', async () => {
  const response = await worker.fetch(request('/runtime-identity', {
    headers: { Authorization: 'Bearer operator-proof-key' },
  }), env({ PROMPTOS_RELEASE_SHA: '' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.release_sha, 'unknown');
});


function courtHandoff(overrides = {}) {
  const core = {
    schema: 'juss/promptos-court-compile-handoff@v1',
    caseId: 'court-case-1',
    repository: 'jussray/founder-control-room',
    branch: 'main',
    headSha: 'a'.repeat(40),
    witnessReceiptFingerprint: 'b'.repeat(64),
    observedAt: '2099-10-06T04:00:00Z',
    expiresAt: '2099-10-06T05:00:00Z',
    authority: {
      evidenceOnly: true,
      createsTruth: false,
      createsAuthority: false,
      executionAuthorized: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      publishAuthorized: false,
      credentialMutationAuthorized: false,
      providerMutationAuthorized: false,
    },
    task: 'compile the bounded next proof workflow',
    founderGoal: 'Preserve Court truth without widening authority.',
    stopCondition: 'Return compiled work only.',
    constraints: [
      'preserve truth states exactly',
      'do not convert consensus into authority',
    ],
    ...overrides,
  };
  return { ...core, handoffFingerprint: courtHandoffFingerprint(core) };
}

test('court compiler is protected and non-authorizing', async () => {
  const unauthorized = await worker.fetch(request('/court/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(courtHandoff()),
  }), env());
  assert.equal(unauthorized.status, 401);

  const response = await worker.fetch(request('/court/compile', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer operator-proof-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courtHandoff()),
  }), env());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, 'promptos');
  assert.equal(body.release_sha, RELEASE_SHA);
  assert.equal(body.authority, 'none');
  assert.equal(body.result.state, 'COMPILED');
  assert.equal(body.result.authority.executionAuthorized, false);
  assert.equal(body.result.authority.createsAuthority, false);
  assert.equal(body.result.steps.every((step) => step.mayMutate === false), true);
});

test('court compiler rejects tampering and widened authority', async () => {
  const tampered = courtHandoff();
  tampered.branch = 'other';
  const tamperedResponse = await worker.fetch(request('/court/compile', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer operator-proof-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tampered),
  }), env());
  assert.equal(tamperedResponse.status, 400);
  assert.match((await tamperedResponse.json()).error, /handoff fingerprint mismatch/);

  const widenedCore = courtHandoff();
  const widened = {
    ...widenedCore,
    authority: { ...widenedCore.authority, executionAuthorized: true },
  };
  widened.handoffFingerprint = courtHandoffFingerprint(widened);
  const widenedResponse = await worker.fetch(request('/court/compile', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer operator-proof-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(widened),
  }), env());
  assert.equal(widenedResponse.status, 400);
  assert.match((await widenedResponse.json()).error, /authority.executionAuthorized widened or missing/);
});
