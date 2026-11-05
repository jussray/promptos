import assert from 'node:assert/strict';
import {
  createEngineeringProofReceipt, evaluateEngineeringProofReceipt,
  proofGateVerdict,
} from './proof-gate.mjs';

const base = {
  goalId: 'promptos-continuity', scopeId: 'workflow-proof',
  stage: 'VERIFY', nextGate: 'founder-review',
  source: 'chatgpt', operator: 'gpt-6',
  mains: [
    { repository: 'jussray/promptos', branch: 'main', sha: '1'.repeat(40) },
    { repository: 'jussray/founder-control-room', branch: 'main', sha: '2'.repeat(40) },
  ],
  evidence: [
    { criterion: 'source-current', truth: 'VERIFIED', ref: 'commit:1111111' },
    { criterion: 'runtime-qa', truth: 'UNKNOWN', ref: '' },
  ],
};
const one = createEngineeringProofReceipt(base);
const reverse = createEngineeringProofReceipt({ ...base, mains: [...base.mains].reverse(), evidence: [...base.evidence].reverse() });
assert.equal(one.fingerprint, reverse.fingerprint, 'inputs normalize deterministically');
assert.equal(one.cookie, reverse.cookie, 'cookie is deterministic');
assert.equal(evaluateEngineeringProofReceipt(one, base).state, 'current');
assert.equal(proofGateVerdict(one), 'PARTIAL');
assert.equal(one.authorizing, false);
assert.equal(one.browserCookie, false);
assert.equal(one.deviceFingerprint, false);
assert.equal(one.personalDataFingerprint, false);
assert.equal(one.approvalCarryForward, false);
for (const changed of [
  { ...base, mains: [{ ...base.mains[0], sha: '3'.repeat(40) }, base.mains[1]] },
  { ...base, nextGate: 'additional-review' },
  { ...base, goalId: 'other-goal' },
  { ...base, evidence: [{ criterion: 'source-current', truth: 'BLOCKED', ref: '' }] },
]) assert.equal(evaluateEngineeringProofReceipt(one, changed).state, 'stale');
assert.equal(proofGateVerdict(createEngineeringProofReceipt({ ...base, evidence: [
  { criterion: 'source-current', truth: 'VERIFIED', ref: 'sha:1' },
]})), 'EVIDENCE_COMPLETE_NOT_AUTHORIZED');
assert.throws(() => createEngineeringProofReceipt({ ...base, mains: [{ ...base.mains[0], sha: 'bad' }] }));
assert.throws(() => createEngineeringProofReceipt({ ...base, evidence: [{ criterion: 'truth', truth: 'VERIFIED', ref: '' }] }));
assert.throws(() => createEngineeringProofReceipt({ ...base, evidence: [
  { criterion: 'same', truth: 'UNKNOWN' }, { criterion: 'same', truth: 'UNKNOWN' },
] }));
const forged = { ...one, authorizing: true };
assert.equal(evaluateEngineeringProofReceipt(forged, base).state, 'invalid');
assert.equal(proofGateVerdict(forged), 'INCONCLUSIVE');
const forgedEvidence = { ...one, evidence: [{ criterion: 'runtime-qa', truth: 'VERIFIED', ref: 'fabricated' }] };
assert.equal(evaluateEngineeringProofReceipt(forgedEvidence, base).state, 'invalid');
assert.equal(proofGateVerdict(forgedEvidence), 'INCONCLUSIVE');
const forgedContinuity = { ...one, continuity: { ...one.continuity, mains: [
  { ...one.continuity.mains[0], sha: '3'.repeat(40) }, one.continuity.mains[1],
] } };
assert.equal(evaluateEngineeringProofReceipt(forgedContinuity, base).state, 'invalid');
assert.equal(proofGateVerdict(forgedContinuity), 'INCONCLUSIVE');
const forgedCookie = { ...one, cookie: '4'.repeat(64) };
assert.equal(evaluateEngineeringProofReceipt(forgedCookie, base).state, 'invalid');
assert.equal(proofGateVerdict(forgedCookie), 'INCONCLUSIVE');
assert.ok(Object.isFrozen(one.evidence));
assert.ok(Object.isFrozen(one.evidence[0]));
console.log('PASS actual-flow-v4 engineering evidence receipt verification');
