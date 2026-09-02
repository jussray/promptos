import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

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
  assert.equal(RECURSIVE_REQUIRED_SKILLS.includes('garyvee'), true);
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

test('rejects findings replayed in later cycles', () => {
  const replayed = structuredClone(hardening);
  replayed.cycles[1].attacks[0].finding = replayed.cycles[0].attacks[0].finding;
  replayed.hardeningHash = promptOSRecursiveHardeningHash(replayed);
  const result = validateSubmittedRecursiveHardening(decision, replayed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('repeats an attack finding')));
});

test('rejects null nested cycle and attack entries without throwing', () => {
  const nullCycle = structuredClone(hardening);
  nullCycle.cycles[0] = null;
  assert.doesNotThrow(() => validateSubmittedRecursiveHardening(decision, nullCycle));
  assert.equal(validateSubmittedRecursiveHardening(decision, nullCycle).valid, false);

  const nullAttack = structuredClone(hardening);
  nullAttack.cycles[0].attacks[0] = null;
  assert.doesNotThrow(() => validateSubmittedRecursiveHardening(decision, nullAttack));
  assert.equal(validateSubmittedRecursiveHardening(decision, nullAttack).valid, false);
});

test('rejects duplicate raw attack-mode declarations before normalization', () => {
  const duplicateDeclaration = structuredClone(hardening);
  duplicateDeclaration.attackModes.push(duplicateDeclaration.attackModes[0]);
  duplicateDeclaration.hardeningHash = promptOSRecursiveHardeningHash(duplicateDeclaration);
  const result = validateSubmittedRecursiveHardening(decision, duplicateDeclaration);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening requires exactly four unique declared attack modes'));
});

test('rejects hash values that only share a valid sha256 prefix', () => {
  const extendedReceiptHash = structuredClone(hardening);
  extendedReceiptHash.hardeningHash = `${hardening.hardeningHash}garbage`;
  const receiptHashResult = validateSubmittedRecursiveHardening(decision, extendedReceiptHash);
  assert.equal(receiptHashResult.valid, false);
  assert.ok(receiptHashResult.errors.includes('Recursive hardening hardeningHash must be sha256'));

  const extendedCycleHash = structuredClone(hardening);
  extendedCycleHash.cycles[0].inputConclusionHash = `${hardening.cycles[0].inputConclusionHash}garbage`;
  extendedCycleHash.hardeningHash = promptOSRecursiveHardeningHash(extendedCycleHash);
  const cycleHashResult = validateSubmittedRecursiveHardening(decision, extendedCycleHash);
  assert.equal(cycleHashResult.valid, false);
  assert.ok(cycleHashResult.errors.includes('Recursive hardening cycle 1 input conclusion is stale'));
});

test('rejects a decision hash with a valid sha256 prefix plus suffix', () => {
  const malformed = structuredClone(hardening);
  malformed.decisionHash = `${hardening.decisionHash}garbage`;
  malformed.hardeningHash = promptOSRecursiveHardeningHash(malformed);
  const result = validateSubmittedRecursiveHardening(decision, malformed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening decisionHash must be sha256'));
});

test('rejects a base expected-head SHA with a valid 40-hex prefix plus suffix', () => {
  const malformedDecision = structuredClone(decision);
  malformedDecision.expectedHeadSha = `${decision.expectedHeadSha}garbage`;
  const result = validateSubmittedRecursiveHardening(malformedDecision, hardening);
  assert.equal(result.valid, false);
  assert.equal(result.authorityEligible, false);
  assert.ok(result.errors.includes('base decision: Decision receipt expectedHeadSha must be a full Git SHA when present'));
});

test('requires the complete founder stack including garyvee', () => {
  const incomplete = structuredClone(hardening);
  for (const cycle of incomplete.cycles) {
    for (const attack of cycle.attacks) {
      attack.skills = attack.skills.filter((skill) => skill !== 'garyvee');
    }
  }
  incomplete.skillsCovered = incomplete.skillsCovered.filter((skill) => skill !== 'garyvee');
  incomplete.hardeningHash = promptOSRecursiveHardeningHash(incomplete);
  const result = validateSubmittedRecursiveHardening(decision, incomplete);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening missing required skill coverage: garyvee'));
});

test('rejects over-limit initial conclusions instead of truncating receipt identity', () => {
  const prefix = 'x'.repeat(4000);
  const first = structuredClone(hardening);
  first.initialConclusion = `${prefix}A`;
  first.initialConclusionHash = sha256(prefix);
  first.hardeningHash = promptOSRecursiveHardeningHash(first);
  const second = structuredClone(hardening);
  second.initialConclusion = `${prefix}B`;
  second.initialConclusionHash = sha256(prefix);
  second.hardeningHash = promptOSRecursiveHardeningHash(second);

  for (const candidate of [first, second]) {
    const result = validateSubmittedRecursiveHardening(decision, candidate);
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('Recursive hardening initial conclusion exceeds 4000 characters'));
  }
});

test('rejects over-limit cycle conclusions before hashing normalized content', () => {
  const candidate = structuredClone(hardening);
  const prefix = 'y'.repeat(4000);
  candidate.cycles[0].outputConclusion = `${prefix}suffix`;
  candidate.cycles[0].outputConclusionHash = sha256(prefix);
  candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
  const result = validateSubmittedRecursiveHardening(decision, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening cycle 1 output conclusion exceeds 4000 characters'));
});

test('rejects over-limit final conclusions before identity comparison', () => {
  const candidate = structuredClone(hardening);
  const prefix = 'z'.repeat(4000);
  candidate.finalConclusion = `${prefix}suffix`;
  candidate.finalConclusionHash = sha256(prefix);
  candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
  const result = validateSubmittedRecursiveHardening(decision, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening final conclusion exceeds 4000 characters'));
});

test('rejects over-limit observation and orientation narratives before normalization', () => {
  for (const field of ['observation', 'orientation']) {
    const candidate = structuredClone(hardening);
    candidate.cycles[0][field] = `${'n'.repeat(3000)}suffix`;
    candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
    const result = validateSubmittedRecursiveHardening(decision, candidate);
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes(`Recursive hardening cycle 1 ${field} exceeds 3000 characters`));
  }
});

test('rejects over-limit finding and falsifier narratives before normalization', () => {
  for (const field of ['finding', 'falsifier']) {
    const candidate = structuredClone(hardening);
    candidate.cycles[0].attacks[0][field] = `${'q'.repeat(3000)}suffix`;
    candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
    const result = validateSubmittedRecursiveHardening(decision, candidate);
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes(`Recursive hardening cycle 1 attack 1 ${field} exceeds 3000 characters`));
  }
});

test('rejects over-limit evidence reference strings before normalization', () => {
  const candidate = structuredClone(hardening);
  candidate.cycles[0].attacks[0].evidenceRefs[0] = `${'r'.repeat(1000)}suffix`;
  candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
  const result = validateSubmittedRecursiveHardening(decision, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening cycle 1 attack 1 evidence reference 1 exceeds 1000 characters'));
});

test('rejects evidence reference lists over 30 items before normalization', () => {
  const candidate = structuredClone(hardening);
  candidate.cycles[0].attacks[0].evidenceRefs = Array.from({ length: 31 }, (_, index) => `evidence-${index + 1}`);
  candidate.hardeningHash = promptOSRecursiveHardeningHash(candidate);
  const result = validateSubmittedRecursiveHardening(decision, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Recursive hardening cycle 1 attack 1 evidence references exceed 30 items'));
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
