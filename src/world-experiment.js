import {
  LANE_REGISTRY,
  recommendedRoute,
  resolveNorthStar,
} from './prompt-memory.js';

export const EXPERIMENT_INTENT_CONTRACT = 'juss/experiment-intent@v1';
const CONTENT_SPECIES = new Set(['build', 'proof', 'story', 'teach', 'participate', 'other']);

function normalizeText(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function safeToken(value) {
  return normalizeText(value, 120).toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '') || 'general';
}

function stableHash(value) {
  const text = String(value ?? '');
  let a = 2166136261;
  let b = 5381;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    a ^= code;
    a = Math.imul(a, 16777619);
    b = ((b << 5) + b) ^ code;
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

function stringList(values, maxItems = 20) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => safeToken(value)).filter(Boolean))].slice(0, maxItems);
}

function textList(values, maxItems = 20, maxLength = 500) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeText(value, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function intentFingerprintPayload(contract) {
  return {
    laneId: contract.laneId,
    workflowId: contract.workflowId,
    founderIntent: contract.founderIntent,
    hypothesis: contract.hypothesis,
    northStar: contract.northStar,
    metrics: contract.metrics,
    acceptanceCriteria: contract.acceptanceCriteria,
  };
}

export function createExperimentIntentContract(input = {}, now = new Date()) {
  const founderIntent = normalizeText(input.founderIntent);
  const hypothesis = normalizeText(input.hypothesis);
  const workflowId = safeToken(input.workflowId || 'world.experiment');
  const laneId = Object.hasOwn(LANE_REGISTRY, input.laneId) ? input.laneId : 'general';
  if (!founderIntent) throw new Error('Experiment intent requires founderIntent.');
  if (!hypothesis) throw new Error('Experiment intent requires hypothesis.');

  const northStarMetric = resolveNorthStar(laneId, input.northStarMetric || input.successMetric || '');
  const northStar = Object.freeze({
    metric: northStarMetric,
    target: normalizeText(input.target, 500) || null,
  });
  const requestedMetrics = stringList(input.metrics);
  const allowedMetrics = LANE_REGISTRY[laneId].metrics;
  const metrics = [...new Set([northStarMetric, ...requestedMetrics.filter((metric) => allowedMetrics.includes(metric))])];
  const acceptanceCriteria = textList(input.acceptanceCriteria);
  const route = recommendedRoute(laneId, input.channel || '');
  const contentSpecies = safeToken(input.contentSpecies || 'other');
  const fingerprintSource = {
    laneId,
    workflowId,
    founderIntent,
    hypothesis,
    northStar,
    metrics,
    acceptanceCriteria,
  };
  const intentFingerprint = stableHash(JSON.stringify(fingerprintSource));

  return Object.freeze({
    schema: EXPERIMENT_INTENT_CONTRACT,
    id: normalizeText(input.id, 180) || `experiment_${stableHash(`${laneId}|${workflowId}|${founderIntent}|${hypothesis}|${now.toISOString()}`)}`,
    laneId,
    workflowId,
    founderIntent,
    hypothesis,
    intentFingerprint,
    northStar,
    metrics,
    acceptanceCriteria: Object.freeze([...acceptanceCriteria]),
    proofPolicy: Object.freeze({
      executionProofIsNotCompletion: true,
      completionRequiresOutcomeEvidence: true,
      outcomeEvidenceMustBindIntentFingerprint: true,
      completionRequiresAcceptanceCriteriaWhenProvided: true,
    }),
    channel: normalizeText(input.channel, 120) || null,
    contentSpecies: CONTENT_SPECIES.has(contentSpecies) ? contentSpecies : 'other',
    variables: {
      format: normalizeText(input.variables?.format, 120) || null,
      topic: normalizeText(input.variables?.topic, 500) || null,
      hook: normalizeText(input.variables?.hook, 500) || null,
      audience: normalizeText(input.variables?.audience, 500) || null,
    },
    sourcePromptId: normalizeText(input.sourcePromptId, 180) || null,
    sourceLineageId: normalizeText(input.sourceLineageId, 180) || null,
    route: Object.freeze({
      recommendedExecutors: Object.freeze([...route.recommendedExecutors]),
      channel: route.channel,
      executionAuthority: 'advisory-only',
      publicationRequiresApproval: true,
    }),
    createdAt: now.toISOString(),
  });
}

export function validateExperimentIntentContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object') return { valid: false, errors: ['Experiment intent must be an object.'] };
  if (contract.schema !== EXPERIMENT_INTENT_CONTRACT) errors.push('Unsupported experiment intent schema.');
  if (!Object.hasOwn(LANE_REGISTRY, contract.laneId)) errors.push('Unknown lane.');
  if (!normalizeText(contract.id, 180)) errors.push('Missing experiment id.');
  if (!normalizeText(contract.founderIntent)) errors.push('Missing founder intent.');
  if (!normalizeText(contract.hypothesis)) errors.push('Missing hypothesis.');
  if (!Array.isArray(contract.metrics) || !contract.metrics.includes(contract.northStar?.metric)) errors.push('North Star must be included in metrics.');
  if (!Array.isArray(contract.acceptanceCriteria)) errors.push('Acceptance criteria must be an array.');
  if (!normalizeText(contract.intentFingerprint, 120)) {
    errors.push('Missing intent fingerprint.');
  } else {
    const expectedFingerprint = stableHash(JSON.stringify(intentFingerprintPayload(contract)));
    if (contract.intentFingerprint !== expectedFingerprint) errors.push('Intent fingerprint does not match the experiment contract.');
  }
  if (contract.proofPolicy?.executionProofIsNotCompletion !== true) errors.push('Execution proof cannot satisfy task completion.');
  if (contract.proofPolicy?.completionRequiresOutcomeEvidence !== true) errors.push('Outcome evidence is required for completion.');
  if (contract.proofPolicy?.outcomeEvidenceMustBindIntentFingerprint !== true) errors.push('Outcome evidence must bind the experiment intent fingerprint.');
  if (contract.proofPolicy?.completionRequiresAcceptanceCriteriaWhenProvided !== true) errors.push('Acceptance criteria proof gate cannot be removed.');
  if (contract.route?.executionAuthority !== 'advisory-only') errors.push('Experiment intent cannot grant execution authority.');
  if (contract.route?.publicationRequiresApproval !== true) errors.push('Publication approval gate cannot be removed.');
  return { valid: errors.length === 0, errors };
}
