import { createHash } from 'node:crypto';
import { validateSubmittedV10DecisionReceipt } from './v10-decision-receipt.mjs';

export const RECURSIVE_HARDENING_CONTRACT = 'juss-v10/recursive-hardening@v1';
export const RECURSIVE_ATTACK_MODES = Object.freeze([
  'authority-inversion',
  'evidence-falsification',
  'human-outcome',
  'temporal-race',
]);
export const RECURSIVE_REQUIRED_SKILLS = Object.freeze([
  'human', 'me', 'futureyou', 'truthmode', 'confess', 'billgates', 'elonmusk',
  'ooda', 'redteam', 'lindymode', 'data-analytics', 'product-design',
  'deep-research', 'steal', 'l99', 'ultrathink', 'unlearn', '80-20',
  'antiadvice', 'first-principles', 'ycombinator', 'socrates',
]);

const HASH = /^[0-9a-f]{64}$/i;
const MODE_SET = new Set(RECURSIVE_ATTACK_MODES);
const DISPOSITIONS = new Set(['survived', 'revised', 'blocked']);

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value, maxItems = 60, max = 1000) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, max)).filter(Boolean))].sort().slice(0, maxItems);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function attack(value = {}) {
  return {
    mode: text(value.mode, 80).toLowerCase(),
    finding: text(value.finding, 3000),
    falsifier: text(value.falsifier, 3000),
    evidenceRefs: list(value.evidenceRefs, 30),
    skills: list(value.skills, 30, 120).map((skill) => skill.toLowerCase()),
    disposition: text(value.disposition, 40).toLowerCase(),
  };
}

function cycle(value = {}) {
  return {
    cycle: Number.isInteger(value.cycle) ? value.cycle : 0,
    inputConclusionHash: text(value.inputConclusionHash, 64).toLowerCase(),
    observation: text(value.observation, 3000),
    orientation: text(value.orientation, 3000),
    attacks: Array.isArray(value.attacks)
      ? value.attacks.map(attack).sort((left, right) => left.mode.localeCompare(right.mode))
      : [],
    decision: text(value.decision, 40).toLowerCase(),
    outputConclusion: text(value.outputConclusion, 4000),
    outputConclusionHash: text(value.outputConclusionHash, 64).toLowerCase(),
  };
}

function normalize(receipt = {}) {
  return {
    contract: RECURSIVE_HARDENING_CONTRACT,
    decisionHash: text(receipt.decisionHash, 64).toLowerCase(),
    initialConclusion: text(receipt.initialConclusion),
    initialConclusionHash: text(receipt.initialConclusionHash, 64).toLowerCase(),
    attackModes: list(receipt.attackModes, 10, 80).map((mode) => mode.toLowerCase()),
    cycles: Array.isArray(receipt.cycles) ? receipt.cycles.map(cycle) : [],
    finalConclusion: text(receipt.finalConclusion),
    finalConclusionHash: text(receipt.finalConclusionHash, 64).toLowerCase(),
    finalDisposition: text(receipt.finalDisposition, 40).toLowerCase(),
    skillsCovered: list(receipt.skillsCovered, 60, 120).map((skill) => skill.toLowerCase()),
    authorityCeiling: 'reason',
    requiresFounderApproval: true,
    executionAuthorized: false,
  };
}

function seed(receipt) {
  return JSON.stringify([
    receipt.contract,
    receipt.decisionHash,
    receipt.initialConclusion,
    receipt.initialConclusionHash,
    receipt.attackModes,
    receipt.cycles.map((entry) => [
      entry.cycle,
      entry.inputConclusionHash,
      entry.observation,
      entry.orientation,
      entry.attacks.map((item) => [
        item.mode,
        item.finding,
        item.falsifier,
        item.evidenceRefs,
        item.skills,
        item.disposition,
      ]),
      entry.decision,
      entry.outputConclusion,
      entry.outputConclusionHash,
    ]),
    receipt.finalConclusion,
    receipt.finalConclusionHash,
    receipt.finalDisposition,
    receipt.skillsCovered,
    receipt.authorityCeiling,
    receipt.requiresFounderApproval,
    receipt.executionAuthorized,
  ]);
}

export function promptOSRecursiveHardeningHash(receipt) {
  return sha256(seed(normalize(receipt)));
}

export function validateSubmittedRecursiveHardening(decisionReceipt, hardeningReceipt) {
  const errors = [];
  const decisionValidation = validateSubmittedV10DecisionReceipt(decisionReceipt);
  if (!decisionValidation.valid) {
    errors.push(...decisionValidation.errors.map((error) => `base decision: ${error}`));
  }
  if (!hardeningReceipt || typeof hardeningReceipt !== 'object' || Array.isArray(hardeningReceipt)) {
    return { valid: false, authorityEligible: false, errors: ['Recursive hardening receipt must be an object'] };
  }

  const normalized = normalize(hardeningReceipt);
  if (hardeningReceipt.contract !== RECURSIVE_HARDENING_CONTRACT) errors.push('Unsupported recursive hardening contract');
  if (normalized.decisionHash !== text(decisionReceipt?.decisionHash, 64).toLowerCase()) {
    errors.push('Recursive hardening decisionHash does not match base decision');
  }
  if (normalized.initialConclusion !== text(decisionReceipt?.recommendation)) {
    errors.push('Recursive hardening must attack the base decision recommendation');
  }
  if (normalized.initialConclusionHash !== sha256(normalized.initialConclusion)) {
    errors.push('Recursive hardening initial conclusion hash mismatch');
  }
  if (normalized.attackModes.length !== 4 || RECURSIVE_ATTACK_MODES.some((mode) => !normalized.attackModes.includes(mode))) {
    errors.push('Recursive hardening requires exactly four canonical attack modes');
  }
  if (normalized.cycles.length !== 10) errors.push('Recursive hardening requires exactly 10 OODA cycles');

  let priorHash = normalized.initialConclusionHash;
  let survived = true;
  const observedSkills = new Set();
  normalized.cycles.forEach((entry, index) => {
    const number = index + 1;
    if (entry.cycle !== number) errors.push(`Recursive hardening cycle ${number} number mismatch`);
    if (entry.inputConclusionHash !== priorHash) errors.push(`Recursive hardening cycle ${number} input conclusion is stale`);
    if (!entry.observation) errors.push(`Recursive hardening cycle ${number} observation is required`);
    if (!entry.orientation) errors.push(`Recursive hardening cycle ${number} orientation is required`);
    if (entry.attacks.length !== 4) errors.push(`Recursive hardening cycle ${number} requires four attacks`);

    const modes = new Set();
    const findings = new Set();
    const cycleSkills = new Set();
    for (const item of entry.attacks) {
      if (!MODE_SET.has(item.mode)) errors.push(`Recursive hardening cycle ${number} has unsupported attack mode: ${item.mode}`);
      if (modes.has(item.mode)) errors.push(`Recursive hardening cycle ${number} repeats attack mode: ${item.mode}`);
      modes.add(item.mode);
      if (!item.finding) errors.push(`Recursive hardening cycle ${number} ${item.mode} finding is required`);
      if (findings.has(item.finding)) errors.push(`Recursive hardening cycle ${number} repeats an attack finding`);
      findings.add(item.finding);
      if (!item.falsifier) errors.push(`Recursive hardening cycle ${number} ${item.mode} falsifier is required`);
      if (item.evidenceRefs.length === 0) errors.push(`Recursive hardening cycle ${number} ${item.mode} evidence is required`);
      if (!DISPOSITIONS.has(item.disposition)) errors.push(`Recursive hardening cycle ${number} ${item.mode} disposition is invalid`);
      if (item.disposition !== 'survived') survived = false;
      item.skills.forEach((skill) => {
        cycleSkills.add(skill);
        observedSkills.add(skill);
      });
    }
    RECURSIVE_ATTACK_MODES.forEach((mode) => {
      if (!modes.has(mode)) errors.push(`Recursive hardening cycle ${number} missing attack mode: ${mode}`);
    });
    for (const skill of ['redteam', 'ooda']) {
      if (!cycleSkills.has(skill)) errors.push(`Recursive hardening cycle ${number} must exercise ${skill}`);
    }
    if (!DISPOSITIONS.has(entry.decision)) errors.push(`Recursive hardening cycle ${number} decision is invalid`);
    if (entry.decision !== 'survived') survived = false;
    if (entry.outputConclusionHash !== sha256(entry.outputConclusion)) {
      errors.push(`Recursive hardening cycle ${number} output conclusion hash mismatch`);
    }
    if (entry.decision === 'survived' && entry.outputConclusionHash !== priorHash) {
      errors.push(`Recursive hardening cycle ${number} cannot revise a survived conclusion`);
    }
    priorHash = entry.outputConclusionHash;
  });

  for (const skill of RECURSIVE_REQUIRED_SKILLS) {
    if (!observedSkills.has(skill)) errors.push(`Recursive hardening missing required skill coverage: ${skill}`);
  }
  if (JSON.stringify(normalized.skillsCovered) !== JSON.stringify([...observedSkills].sort())) {
    errors.push('Recursive hardening skillsCovered does not match observed attack skills');
  }
  if (normalized.finalConclusion !== (normalized.cycles.at(-1)?.outputConclusion || '')) {
    errors.push('Recursive hardening final conclusion does not match cycle 10');
  }
  if (normalized.finalConclusionHash !== sha256(normalized.finalConclusion) || normalized.finalConclusionHash !== priorHash) {
    errors.push('Recursive hardening final conclusion hash mismatch');
  }
  if (!DISPOSITIONS.has(normalized.finalDisposition)) errors.push('Recursive hardening final disposition is invalid');
  if (normalized.finalDisposition !== 'survived') survived = false;
  if (normalized.finalDisposition === 'survived' && normalized.finalConclusionHash !== normalized.initialConclusionHash) {
    errors.push('Recursive hardening survived disposition requires the original conclusion to remain unchanged');
  }

  if (hardeningReceipt.authorityCeiling !== 'reason') errors.push('Recursive hardening cannot exceed reason authority');
  if (hardeningReceipt.requiresFounderApproval !== true) errors.push('Recursive hardening must preserve founder approval');
  if (hardeningReceipt.executionAuthorized !== false) errors.push('Recursive hardening cannot authorize execution');
  if (!HASH.test(text(hardeningReceipt.hardeningHash, 64))) {
    errors.push('Recursive hardening hardeningHash must be sha256');
  } else if (promptOSRecursiveHardeningHash(normalized) !== text(hardeningReceipt.hardeningHash, 64).toLowerCase()) {
    errors.push('Recursive hardening hash does not match receipt content');
  }

  return {
    valid: errors.length === 0,
    authorityEligible: errors.length === 0 && survived && normalized.finalConclusionHash === normalized.initialConclusionHash,
    errors,
  };
}

export function adaptRecursiveHardeningForPromptOS(decisionReceipt, hardeningReceipt) {
  const validation = validateSubmittedRecursiveHardening(decisionReceipt, hardeningReceipt);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  return Object.freeze({
    contract: RECURSIVE_HARDENING_CONTRACT,
    hardeningHash: text(hardeningReceipt.hardeningHash, 64).toLowerCase(),
    decisionHash: text(hardeningReceipt.decisionHash, 64).toLowerCase(),
    sourceSystem: 'chief-ai-machine',
    sourceTrust: 'submitted-unverified',
    fourWayAttackCount: 4,
    oodaCycleCount: 10,
    authorityEligibleAsSubmitted: validation.authorityEligible,
    authorityCeiling: 'reason',
    executionAuthorized: false,
    requiresFounderApproval: true,
    independentFcrValidationRequired: true,
  });
}
