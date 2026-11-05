import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareProviderDeploy } from './prepare-provider-deploy.mjs';

async function withEnv(fn) {
  const directory = await mkdtemp(join(tmpdir(), 'promptos-preflight-'));
  try { await fn({ RUNNER_TEMP: directory, CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'fixture-token', PROMPTOS_OPENAI_MODEL: 'fixture-model' }); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
const existing = (names) => async () => Response.json({ success: true, result: names.map((name) => ({ name })) });

test('preserves installed keys without reading or requiring their values', () => withEnv(async (env) => {
  const result = await prepareProviderDeploy(env, existing(['OPENAI_API_KEY', 'PROMPTOS_AI_OPERATOR_KEY']));
  assert.deepEqual(JSON.parse(await readFile(result.path, 'utf8')), {});
  assert.deepEqual(result.reusedNames, []);
  assert.equal((await stat(result.path)).mode & 0o777, 0o600);
}));
test('reuses only a missing project secret and does not overwrite an installed key', () => withEnv(async (env) => {
  const result = await prepareProviderDeploy({ ...env, OPENAI_API_KEY: 'unused-fixture', PROMPTOS_AI_OPERATOR_KEY: 'operator-fixture' }, existing(['OPENAI_API_KEY']));
  assert.deepEqual(JSON.parse(await readFile(result.path, 'utf8')), { PROMPTOS_AI_OPERATOR_KEY: 'operator-fixture' });
}));
test('bootstrap requires both existing project secrets before creating a file', () => withEnv(async (env) => {
  await assert.rejects(prepareProviderDeploy(env, async () => new Response('', { status: 404 })), /Existing project secrets unavailable/);
  const result = await prepareProviderDeploy({ ...env, OPENAI_API_KEY: 'openai-fixture', PROMPTOS_AI_OPERATOR_KEY: 'operator-fixture' }, async () => new Response('', { status: 404 }));
  assert.deepEqual(result.reusedNames, ['OPENAI_API_KEY', 'PROMPTOS_AI_OPERATOR_KEY']);
}));
test('observation failure cannot be mistaken for absent secrets', () => withEnv(async (env) => {
  for (const status of [401, 403, 500]) {
    await assert.rejects(prepareProviderDeploy(env, async () => new Response('untrusted', { status })), /observation failed/);
  }
  await assert.rejects(prepareProviderDeploy(env, async () => { throw new Error('secret-bearing transport'); }), /observation failed/);
  await assert.rejects(prepareProviderDeploy(env, async () => Response.json({ success: false })), /Invalid Cloudflare/);
}));
test('malformed token stops before network access', () => withEnv(async (env) => {
  await assert.rejects(prepareProviderDeploy({ ...env, CLOUDFLARE_API_TOKEN: 'non-ascii-\u00e9' }, () => { throw new Error('must not call'); }), /credentials are missing or malformed/);
}));
