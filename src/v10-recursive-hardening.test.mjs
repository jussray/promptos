import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  RECURSIVE_ATTACK_MODES,
  RECURSIVE_REQUIRED_SKILLS,
  adaptRecursiveHardeningForPromptOS,
  promptOSRecursiveHardeningHash,
  validateSubmittedRecursiveHardening,
} from './v10-recursive-hardening.mjs';

const decision = JSON.parse(readFileSync('testdata/v10-decision-cycle-conformance.json', 'utf8'));
const hardening = JSON.parse(readFileSync('testdata/v10-recursive-hardening-conformance.json', 'utf8'));

test('accepts exactly four attacks across ten chained OODA cycles', () => {
  assert.deepEqual(validateSubmittedRecursiveHardening(decision, hardening), {
    valid: true,
    authorityEligible: true,
    errors: [],
  });
  assert.equal(hardening.cycles.length, 10);
  for (const cycle of hardening.cycles) {
    assert.deepEqual(cycle.attacks.map((attack) => attack.mode).sort(), [...RECURSIVE_ATTACK_MODES].sort());
  }
  assert.equal(RECURSIVE_REQUIRED_SKILLS.every((skill) => hardening.skillsCovered.includes(skill)), true);
});

test('preserves hardening as submitted-unverified reasoning context', () => {
  const adapted = adaptRecursiveHardeningForPromptOS(decision, hardening);
  assert.equal(adapted.sourceTrust, 'submitted-unverified');
  assert.equal(adapted.fourWayAttackCount, 4);
  assert.equal(adapted.oodaCycleCount, 10);
  assert.equal(adapted.authorityEligibleAsSubmitted, true);
  assert.equal(adapted.authorityCeiling, 'reason');
  assert.equal(adapted.executionAuthorized, false);
  assert.equal(adapted.requiresFounderApproval, true);
  assert.equal(adapted.independentFcrValidationRequired, true);
});

test('rejects a stale recursive cycle', () => {
  const stale = structuredClone(hardening);
  stale.cycles[4].inputConclusionHash = 'f'.repeat(64);
  stale.hardeningHash = promptOSRecursiveHardeningHash(stale);
  const result = validateSubmittedRecursiveHardening(decision, stale);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening cycle 5 input conclusion is stale'));
});

test('rejects duplicate attack modes and findings', () => {
  const duplicate = structuredClone(hardening);
  duplicate.cycles[0].attacks[1].mode = duplicate.cycles[0].attacks[0].mode;
  duplicate.cycles[0].attacks[1].finding = duplicate.cycles[0].attacks[0].finding;
  duplicate.hardeningHash = promptOSRecursiveHardeningHash(duplicate);
  const result = validateSubmittedRecursiveHardening(decision, duplicate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('repeats attack mode')));
  assert.ok(result.errors.some((error) => error.includes('repeats an attack finding')));
});

test('cannot promote recursive reasoning into execution authority', () => {
  const escalated = structuredClone(hardening);
  escalated.authorityCeiling = 'privileged';
  escalated.requiresFounderApproval = false;
  escalated.executionAuthorized = true;
  escalated.hardeningHash = promptOSRecursiveHardeningHash(escalated);
  const result = validateSubmittedRecursiveHardening(decision, escalated);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening cannot exceed reason authority'));
  assert.ok(result.errors.includes('Recursive hardening must preserve founder approval'));
  assert.ok(result.errors.includes('Recursive hardening cannot authorize execution'));
});
