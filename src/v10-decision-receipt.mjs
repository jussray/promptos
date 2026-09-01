export const V10_DECISION_CYCLE_CONTRACT = 'juss-v10/decision-cycle@v1';

export const REQUIRED_V10_LENSES = Object.freeze([
  'human',
  'me',
  'futureyou',
  'truthmode',
  'confess',
  'billgates',
  'elonmusk',
  'ooda',
  'redteam',
  'lindymode',
  'data-analytics',
  'product-design',
  'deep-research',
  'steal',
]);

const HASH = /^[0-9a-f]{64}$/i;
const SHA = /^[0-9a-f]{40}$/i;

function rawText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function text(value, max = 4000) {
  return rawText(value).slice(0, max);
}

function list(value, maxItems = 40, max = 1000) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, max)).filter(Boolean))].slice(0, maxItems);
}

export function validateSubmittedV10DecisionReceipt(receipt) {
  const errors = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { valid: false, errors: ['Decision receipt must be an object'] };
  }

  if (receipt.contract !== V10_DECISION_CYCLE_CONTRACT) errors.push('Unsupported decision receipt contract');
  if (!text(receipt.goal)) errors.push('Decision receipt goal is required');
  if (!text(receipt.workspaceId, 160)) errors.push('Decision receipt workspaceId is required');
  if (!text(receipt.projectSlug, 160)) errors.push('Decision receipt projectSlug is required');

  const expectedHeadSha = rawText(receipt.expectedHeadSha);
  if (expectedHeadSha && !SHA.test(expectedHeadSha)) {
    errors.push('Decision receipt expectedHeadSha must be a full Git SHA when present');
  }
  const decisionHash = rawText(receipt.decisionHash);
  if (!HASH.test(decisionHash)) errors.push('Decision receipt decisionHash must be sha256');

  if (receipt.authorityCeiling !== 'reason') errors.push('Decision receipt cannot exceed reason authority');
  if (receipt.executionAuthorized !== false) errors.push('Decision receipt cannot authorize execution');
  if (receipt.requiresFounderApproval !== true) errors.push('Decision receipt must require founder approval');
  if (!text(receipt.recommendation)) errors.push('Decision receipt recommendation is required');
  if (!text(receipt.nextGate)) errors.push('Decision receipt nextGate is required');
  if (list(receipt.proofRequirements).length === 0) errors.push('Decision receipt proof requirements are required');
  if (list(receipt.outcomeSignals).length === 0) errors.push('Decision receipt outcome signals are required');
  if (list(receipt.stopConditions).length === 0) errors.push('Decision receipt stop conditions are required');

  const reports = Array.isArray(receipt.lensReports) ? receipt.lensReports : [];
  const seen = new Set();
  for (const report of reports) {
    const lens = text(report?.lens, 80).toLowerCase();
    if (!lens) continue;
    if (seen.has(lens)) errors.push(`Duplicate V10 decision lens: ${lens}`);
    seen.add(lens);
  }
  for (const lens of REQUIRED_V10_LENSES) {
    if (!seen.has(lens)) errors.push(`Required V10 decision lens missing: ${lens}`);
  }

  return { valid: errors.length === 0, errors };
}

export function adaptV10DecisionForPromptOS(receipt, missionInput = {}) {
  const validation = validateSubmittedV10DecisionReceipt(receipt);
  if (!validation.valid) throw new Error(validation.errors.join('; '));

  const existingConstraints = list(missionInput.constraints);
  const decisionConstraints = [
    `Bind mission reasoning to V10 decision ${receipt.decisionHash}.`,
    'Treat the submitted Chief decision receipt as context, not execution authority.',
    'Preserve recorded dissent, proof requirements, outcome signals, rollback, stop conditions, and next gate.',
    'FCR must independently resolve receipt identity, current project state, exact-head context when applicable, and founder approval before execution.',
  ];

  const protocols = [...new Set([
    ...list(missionInput.protocols, 30, 100),
    ...REQUIRED_V10_LENSES,
  ])];

  return Object.freeze({
    ...missionInput,
    intent: text(missionInput.intent || missionInput.goal) || text(receipt.goal),
    project: text(missionInput.project, 200) || text(receipt.projectSlug, 200),
    constraints: [...new Set([...existingConstraints, ...decisionConstraints])],
    protocols,
    decisionContext: Object.freeze({
      contract: receipt.contract,
      decisionHash: rawText(receipt.decisionHash).toLowerCase(),
      sourceSystem: 'chief-ai-machine',
      sourceTrust: 'submitted-unverified',
      authorityCeiling: 'reason',
      executionAuthorized: false,
      requiresFounderApproval: true,
      expectedHeadSha: rawText(receipt.expectedHeadSha).toLowerCase() || null,
      customerOutcome: text(receipt.customerOutcome),
      bottleneck: text(receipt.bottleneck),
      recommendation: text(receipt.recommendation),
      dissent: list(receipt.dissent, 30, 1500),
      proofRequirements: list(receipt.proofRequirements),
      outcomeSignals: list(receipt.outcomeSignals),
      rollback: text(receipt.rollback),
      stopConditions: list(receipt.stopConditions),
      nextGate: text(receipt.nextGate),
    }),
  });
}
