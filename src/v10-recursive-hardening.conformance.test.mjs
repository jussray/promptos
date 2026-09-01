import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  RECURSIVE_REQUIRED_SKILLS,
  promptOSRecursiveHardeningHash,
  validateSubmittedRecursiveHardening,
} from './v10-recursive-hardening.mjs';

const EXPECTED_HARDENING_HASH = 'a13eede1751d12b994287f519c84be34a01b353e8b10efb0edca9b7806afc85e';
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
  assert.equal(RECURSIVE_REQUIRED_SKILLS.includes('garyvee'), true);
  assert.equal(hardening.skillsCovered.includes('garyvee'), true);
});
