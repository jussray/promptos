import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  preflightReceipt,
  runtimeFailureReceipt,
  saveWitnessReceipt,
} from './runtime-provider-witness-receipt.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'runtime-provider-witness-receipt.mjs');
const SHA = 'a'.repeat(40);
const COMPLETE = {
  PROMPTOS_PUBLIC_URL: 'https://public.example.invalid',
  PROMPTOS_PROVIDER_URL: 'https://provider.example.invalid',
  PROMPTOS_AI_OPERATOR_KEY: 'synthetic-secret-never-retain',
  EXPECTED_HEAD_SHA: SHA,
};

test('complete preflight records only readiness, not successful runtime proof', () => {
  const receipt = preflightReceipt(COMPLETE);
  assert.equal(receipt.workStatus, 'PASSED');
  assert.equal(receipt.runtimeProofStatus, 'NOT STARTED');
  assert.equal(receipt.expectedSha, SHA);
  assert.deepEqual(receipt.missingPrerequisites, []);
  const saved = JSON.stringify(receipt);
  assert.doesNotMatch(saved, /synthetic-secret|example\.invalid/);
});

for (const name of ['PROMPTOS_PUBLIC_URL', 'PROMPTOS_PROVIDER_URL', 'PROMPTOS_AI_OPERATOR_KEY']) {
  test('missing ' + name + ' fails closed and records only the prerequisite name', () => {
    const receipt = preflightReceipt({ ...COMPLETE, [name]: ' ' });
    assert.equal(receipt.workStatus, 'BLOCKED');
    assert.equal(receipt.runtimeProofStatus, 'NOT STARTED');
    assert.deepEqual(receipt.missingPrerequisites, [name]);
    assert.doesNotMatch(JSON.stringify(receipt), /synthetic-secret|example\.invalid/);
  });
}

test('an invalid expected head is blocked without copying the invalid input', () => {
  const receipt = preflightReceipt({ ...COMPLETE, EXPECTED_HEAD_SHA: 'untrusted?value=private' });
  assert.equal(receipt.workStatus, 'BLOCKED');
  assert.equal(receipt.invalidExpectedHeadSha, true);
  assert.equal(receipt.expectedSha, null);
  assert.doesNotMatch(JSON.stringify(receipt), /untrusted/);
});

test('runtime failure receipt is not a verified runtime outcome', () => {
  const receipt = runtimeFailureReceipt(COMPLETE);
  assert.equal(receipt.workStatus, 'FAILED');
  assert.equal(receipt.runtimeProofStatus, 'ATTEMPTED');
  assert.equal(receipt.errorCode, 'RUNTIME_PROOF_FAILED');
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-secret|example\.invalid/);
});

test('receipts are actually persisted at the existing proof-artifact location', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'promptos-witness-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await saveWitnessReceipt(directory, 'preflight.json', preflightReceipt(COMPLETE));
  const disk = JSON.parse(await readFile(join(directory, 'preflight.json'), 'utf8'));
  assert.equal(disk.runtimeProofStatus, 'NOT STARTED');
});

test('blocked CLI preserves a receipt and exits nonzero', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'promptos-witness-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const proc = spawnSync(process.execPath, [SCRIPT, 'preflight'], {
    env: {
      ...COMPLETE,
      PROMPTOS_PUBLIC_URL: '',
      PROMPTOS_RUNTIME_PROOF_DIR: directory,
    },
    encoding: 'utf8',
  });
  assert.equal(proc.status, 1);
  assert.match(proc.stderr, /PROMPTOS_PUBLIC_URL/);
  const disk = JSON.parse(await readFile(join(directory, 'preflight.json'), 'utf8'));
  assert.equal(disk.workStatus, 'BLOCKED');
});

test('runtime failure CLI retains a red diagnostic and returns success only for recording', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'promptos-witness-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const proc = spawnSync(process.execPath, [SCRIPT, 'runtime-failed'], {
    env: { ...COMPLETE, PROMPTOS_RUNTIME_PROOF_DIR: directory },
    encoding: 'utf8',
  });
  assert.equal(proc.status, 0);
  const disk = JSON.parse(await readFile(join(directory, 'runtime-failure.json'), 'utf8'));
  assert.equal(disk.workStatus, 'FAILED');
  assert.equal(disk.runtimeProofStatus, 'ATTEMPTED');
});

test('complete CLI records preflight pass without claiming runtime success', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'promptos-witness-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const proc = spawnSync(process.execPath, [SCRIPT, 'preflight'], {
    env: { ...COMPLETE, PROMPTOS_RUNTIME_PROOF_DIR: directory },
    encoding: 'utf8',
  });
  assert.equal(proc.status, 0);
  const disk = JSON.parse(await readFile(join(directory, 'preflight.json'), 'utf8'));
  assert.equal(disk.workStatus, 'PASSED');
  assert.equal(disk.runtimeProofStatus, 'NOT STARTED');
  assert.equal(disk.expectedSha, SHA);
});
