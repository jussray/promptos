import { createHash } from 'node:crypto';

export const OPTIMIZER_RECEIPT_SCHEMA = 'juss/evidence-bound-optimizer@v1';

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const token = (value) => String(value ?? '').trim().slice(0, 180);
const clamp = (value) => Math.max(0, Math.min(1, value));
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);

function normalizeMetrics(metrics = {}) {
  return Object.fromEntries(Object.entries(metrics).flatMap(([name, value]) => {
    const score = finite(value);
    return score === null ? [] : [[token(name), clamp(score)]];
  }));
}

function caseScore(result, weights) {
  const metrics = normalizeMetrics(result.metrics);
  const entries = Object.entries(weights);
  const denominator = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!denominator) throw new Error('Optimizer requires at least one positive metric weight.');
  const numerator = entries.reduce((sum, [metric, weight]) => sum + (metrics[metric] ?? 0) * weight, 0);
  return numerator / denominator;
}

export function evaluateCandidates(input = {}) {
  const experiment = input.experiment;
  if (!experiment?.intentFingerprint) throw new Error('Optimizer requires an experiment intent fingerprint.');
  const cases = Array.isArray(input.cases) ? input.cases : [];
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (!cases.length || !candidates.length) throw new Error('Optimizer requires cases and candidates.');

  const weights = Object.fromEntries(Object.entries(input.metricWeights ?? {}).flatMap(([metric, raw]) => {
    const weight = finite(raw);
    return weight !== null && weight > 0 ? [[token(metric), weight]] : [];
  }));
  if (!Object.keys(weights).length) throw new Error('Optimizer requires positive metric weights.');

  const expectedCaseIds = cases.map((item) => token(item.id));
  if (new Set(expectedCaseIds).size !== expectedCaseIds.length || expectedCaseIds.some((id) => !id)) {
    throw new Error('Optimizer cases require unique ids.');
  }

  const scored = candidates.map((candidate) => {
    const id = token(candidate.id);
    if (!id) throw new Error('Optimizer candidates require ids.');
    const results = Array.isArray(candidate.results) ? candidate.results : [];
    const byCase = new Map(results.map((result) => [token(result.caseId), result]));
    const missing = expectedCaseIds.filter((caseId) => !byCase.has(caseId));
    if (missing.length) throw new Error(`Candidate ${id} is missing identical evaluation cases: ${missing.join(', ')}`);

    const perCase = expectedCaseIds.map((caseId) => ({
      caseId,
      score: caseScore(byCase.get(caseId), weights),
      metrics: normalizeMetrics(byCase.get(caseId).metrics),
    }));
    const score = perCase.reduce((sum, item) => sum + item.score, 0) / perCase.length;
    return { id, score, perCase };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const baselineId = token(input.baselineCandidateId || scored[0].id);
  const baseline = scored.find((item) => item.id === baselineId);
  if (!baseline) throw new Error('Baseline candidate must be part of the evaluated set.');
  const winner = scored[0];
  const minimumImprovement = Math.max(0, finite(input.minimumImprovement) ?? 0);
  const maximumRegression = Math.max(0, finite(input.maximumCaseRegression) ?? 0);
  const deltas = winner.perCase.map((item, index) => item.score - baseline.perCase[index].score);
  const improvement = winner.score - baseline.score;
  const regressionSafe = deltas.every((delta) => delta >= -maximumRegression);
  const beatsBaseline = winner.id !== baseline.id && improvement >= minimumImprovement && regressionSafe;

  const receiptCore = {
    schema: OPTIMIZER_RECEIPT_SCHEMA,
    experimentId: token(experiment.id),
    intentFingerprint: token(experiment.intentFingerprint),
    caseIds: expectedCaseIds,
    metricWeights: weights,
    baselineCandidateId: baseline.id,
    ranking: scored.map(({ id, score }) => ({ id, score })),
    recommendation: beatsBaseline ? winner.id : null,
    decision: beatsBaseline ? 'RECOMMEND_FOR_APPROVAL' : 'KEEP_BASELINE',
    authority: {
      optimizerMayPromote: false,
      promotionRequiresApproval: true,
    },
  };

  return Object.freeze({
    ...receiptCore,
    receiptFingerprint: hash(receiptCore),
    comparison: Object.freeze({ improvement, regressionSafe, minimumImprovement, maximumRegression }),
  });
}

export function authorizePromotion(receipt, approval = {}) {
  if (receipt?.schema !== OPTIMIZER_RECEIPT_SCHEMA) throw new Error('Unsupported optimizer receipt.');
  if (!receipt.recommendation) return { authorized: false, reason: 'NO_RECOMMENDED_CHALLENGER' };
  if (approval.approved !== true || !token(approval.approvedBy)) {
    return { authorized: false, reason: 'FOUNDER_OR_DELEGATED_APPROVAL_REQUIRED' };
  }
  return {
    authorized: true,
    candidateId: receipt.recommendation,
    approvedBy: token(approval.approvedBy),
    receiptFingerprint: receipt.receiptFingerprint,
  };
}
