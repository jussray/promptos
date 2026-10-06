import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidates, authorizePromotion } from './evidence-bound-optimizer.mjs';

const experiment = { id: 'exp-proof', intentFingerprint: 'abc123proof' };
const cases = [{ id: 'build' }, { id: 'truth' }, { id: 'clarity' }];
const weights = { quality: 2, correctness: 3 };

const baseline = {
  id: 'baseline',
  results: cases.map(({ id }) => ({ caseId: id, metrics: { quality: 0.7, correctness: 0.8 } })),
};
const challenger = {
  id: 'challenger',
  results: cases.map(({ id }) => ({ caseId: id, metrics: { quality: 0.9, correctness: 0.9 } })),
};

test('recommends a challenger only after identical-case scoring and leaves promotion unauthorized', () => {
  const receipt = evaluateCandidates({
    experiment,
    cases,
    candidates: [baseline, challenger],
    metricWeights: weights,
    baselineCandidateId: 'baseline',
    minimumImprovement: 0.05,
    maximumCaseRegression: 0.02,
  });
  assert.equal(receipt.recommendation, 'challenger');
  assert.equal(receipt.decision, 'RECOMMEND_FOR_APPROVAL');
  assert.equal(receipt.authority.optimizerMayPromote, false);
  assert.match(receipt.receiptFingerprint, /^[a-f0-9]{24}$/);
  assert.deepEqual(authorizePromotion(receipt), {
    authorized: false,
    reason: 'FOUNDER_OR_DELEGATED_APPROVAL_REQUIRED',
  });
  assert.equal(authorizePromotion(receipt, { approved: true, approvedBy: 'founder' }).authorized, true);
});

test('fails closed when a candidate did not run the same cases', () => {
  const incomplete = { id: 'incomplete', results: challenger.results.slice(0, 2) };
  assert.throws(() => evaluateCandidates({
    experiment,
    cases,
    candidates: [baseline, incomplete],
    metricWeights: weights,
    baselineCandidateId: 'baseline',
  }), /missing identical evaluation cases/);
});

test('keeps baseline when aggregate gain hides an unacceptable case regression', () => {
  const risky = {
    id: 'risky',
    results: [
      { caseId: 'build', metrics: { quality: 1, correctness: 1 } },
      { caseId: 'truth', metrics: { quality: 1, correctness: 1 } },
      { caseId: 'clarity', metrics: { quality: 0.5, correctness: 0.5 } },
    ],
  };
  const receipt = evaluateCandidates({
    experiment,
    cases,
    candidates: [baseline, risky],
    metricWeights: weights,
    baselineCandidateId: 'baseline',
    maximumCaseRegression: 0.05,
  });
  assert.equal(receipt.recommendation, null);
  assert.equal(receipt.decision, 'KEEP_BASELINE');
  assert.equal(receipt.comparison.regressionSafe, false);
});
