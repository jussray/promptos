import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const REQUIRED = Object.freeze([
  'PROMPTOS_PUBLIC_URL',
  'PROMPTOS_PROVIDER_URL',
  'PROMPTOS_AI_OPERATOR_KEY',
]);

function expectedSha(env) {
  const candidate = typeof env.EXPECTED_HEAD_SHA === 'string'
    ? env.EXPECTED_HEAD_SHA.trim().toLowerCase()
    : '';
  return /^[0-9a-f]{40}$/.test(candidate) ? candidate : null;
}

export function preflightReceipt(env) {
  const missingPrerequisites = REQUIRED.filter((key) => !String(env[key] ?? '').trim());
  const sha = expectedSha(env);
  const blocked = missingPrerequisites.length > 0 || sha === null;
  return {
    schemaVersion: 1,
    kind: 'promptos-runtime-witness-preflight',
    expectedSha: sha,
    workStatus: blocked ? 'BLOCKED' : 'PASSED',
    runtimeProofStatus: 'NOT STARTED',
    missingPrerequisites,
    invalidExpectedHeadSha: sha === null,
  };
}

export function runtimeFailureReceipt(env) {
  return {
    schemaVersion: 1,
    kind: 'promptos-runtime-witness-failure',
    expectedSha: expectedSha(env),
    workStatus: 'FAILED',
    runtimeProofStatus: 'ATTEMPTED',
    errorCode: 'RUNTIME_PROOF_FAILED',
  };
}

export async function saveWitnessReceipt(directory, name, receipt) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const directory = process.env.PROMPTOS_RUNTIME_PROOF_DIR || 'artifacts/promptos-runtime-proof';
  const mode = process.argv[2] || 'preflight';
  if (mode === 'preflight') {
    const receipt = preflightReceipt(process.env);
    await saveWitnessReceipt(directory, 'preflight.json', receipt);
    if (receipt.workStatus === 'BLOCKED') {
      const reasons = [
        ...receipt.missingPrerequisites,
        ...(receipt.invalidExpectedHeadSha ? ['EXPECTED_HEAD_SHA_INVALID'] : []),
      ];
      console.error('Runtime witness preflight blocked: ' + reasons.join(', '));
      process.exitCode = 1;
    } else {
      console.log('Runtime witness preflight passed; deployed runtime proof has not run.');
    }
  } else if (mode === 'runtime-failed') {
    await saveWitnessReceipt(directory, 'runtime-failure.json', runtimeFailureReceipt(process.env));
    console.log('Runtime proof failure recorded without private response data.');
  } else {
    console.error('Unsupported runtime witness receipt mode.');
    process.exitCode = 2;
  }
}
