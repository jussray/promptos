import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  promptOSRecursiveHardeningHash,
  validateSubmittedRecursiveHardening,
} from './v10-recursive-hardening.mjs';

const EXPECTED_HARDENING_HASH = '2a6fe422c22e376c483e6fd366b3b93cf06bc290fbe682609dad8459438a4d98';
const decision = JSON.parse(readFileSync('testdata/v10-decision-cycle-conformance.json', 'utf8'));
const hardening = JSON.parse(readFileSync('testdata/v10-recursive-hardening-conformance.json', 'utf8'));

test('preserves the canonical Chief hardening identity for independent FCR recomputation', () => {
  assert.deepEqual(validateSubmittedRecursiveHardening(decision, hardening), {
    valid: true,
    authorityEligible: true,
    errors: [],
  });
  assert.equal(promptOSRecursiveHardeningHash(hardening), EXPECTED_HARDENING_HASH);
  assert.equal(hardening.hardeningHash, EXPECTED_HARDENING_HASH);
  assert.equal(hardening.decisionHash, decision.decisionHash);
  assert.equal(hardening.executionAuthorized, false);
});
