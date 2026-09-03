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
  'garyvee', 'ooda', 'redteam', 'lindymode', 'data-analytics', 'product-design',
  'deep-research', 'steal', 'l99', 'ultrathink', 'unlearn', '80-20',
  'antiadvice', 'first-principles', 'ycombinator', 'socrates',
]);

const HASH = /^[0-9a-f]{64}$/i;
const MODE_SET = new Set(RECURSIVE_ATTACK_MODES);
const DISPOSITIONS = new Set(['survived', 'revised', 'blocked']);
const CONCLUSION_MAX = 4000;
const NARRATIVE_MAX = 3000;
const EVIDENCE_REF_MAX_ITEMS = 30;
const EVIDENCE_REF_MAX = 1000;
const ATTACK_SKILL_MAX_ITEMS = 30;
const RECEIPT_SKILL_MAX_ITEMS = 60;
const SKILL_MAX = 120;

function rawText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function text(value, max = 4000) {
  return rawText(value).slice(0, max);
}

function hashText(value) {
  return rawText(value).toLowerCase();
}

function list(value, maxItems = 60, max = 1000) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, max)).filter(Boolean))].sort().slice(0, maxItems);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function attack(value = {}) {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    mode: text(item.mode, 80).toLowerCase(),
    finding: text(item.finding, NARRATIVE_MAX),
    falsifier: text(item.falsifier, NARRATIVE_MAX),
    evidenceRefs: list(item.evidenceRefs, EVIDENCE_REF_MAX_ITEMS, EVIDENCE_REF_MAX),
    skills: list(item.skills, ATTACK_SKILL_MAX_ITEMS, SKILL_MAX).map((skill) => skill.toLowerCase()),
    disposition: text(item.disposition, 40).toLowerCase(),
  };
}

function cycle(value = {}) {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    cycle: Number.isInteger(item.cycle) ? item.cycle : 0,
    inputConclusionHash: hashText(item.inputConclusionHash),
    observation: text(item.observation, NARRATIVE_MAX),
    orientation: text(item.orientation, NARRATIVE_MAX),
    attacks: Array.isArray(item.attacks)
      ? item.attacks.map(attack).sort((left, right) => left.mode.localeCompare(right.mode))
      : [],
    decision: text(item.decision, 40).toLowerCase(),
    outputConclusion: text(item.outputConclusion, CONCLUSION_MAX),
    outputConclusionHash: hashText(item.outputConclusionHash),
  };
}

function normalize(receipt = {}) {
  const value = receipt && typeof receipt === 'object' && !Array.isArray(receipt) ? receipt : {};
  return {
    contract: RECURSIVE_HARDENING_CONTRACT,
    decisionHash: hashText(value.decisionHash),
    initialConclusion: text(value.initialConclusion, CONCLUSION_MAX),
    initialConclusionHash: hashText(value.initialConclusionHash),
    attackModes: list(value.attackModes, 10, 80).map((mode) => mode.toLowerCase()),
    cycles: Array.isArray(value.cycles) ? value.cycles.map(cycle) : [],
    finalConclusion: text(value.finalConclusion, CONCLUSION_MAX),
    finalConclusionHash: hashText(value.finalConclusionHash),
    finalDisposition: text(value.finalDisposition, 40).toLowerCase(),
    skillsCovered: list(value.skillsCovered, RECEIPT_SKILL_MAX_ITEMS, SKILL_MAX).map((skill) => skill.toLowerCase()),
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

  const rawAttackModes = Array.isArray(hardeningReceipt.attackModes) ? hardeningReceipt.attackModes : [];
  const canonicalRawAttackModes = rawAttackModes.map((mode) => text(mode, 80).toLowerCase());
  if (
    rawAttackModes.length !== 4
    || canonicalRawAttackModes.some((mode) => !mode)
    || new Set(canonicalRawAttackModes).size !== 4
  ) {
    errors.push('Recursive hardening requires exactly four unique declared attack modes');
  }

  const rawDecisionHash = hashText(hardeningReceipt.decisionHash);
  if (!HASH.test(rawDecisionHash)) {
    errors.push('Recursive hardening decisionHash must be sha256');
  } else if (rawDecisionHash !== hashText(decisionReceipt?.decisionHash)) {
    errors.push('Recursive hardening decisionHash does not match base decision');
  }

  const rawInitialConclusion = rawText(hardeningReceipt.initialConclusion);
  const rawBaseConclusion = rawText(decisionReceipt?.recommendation);
  if (rawInitialConclusion.length > CONCLUSION_MAX) {
    errors.push(`Recursive hardening initial conclusion exceeds ${CONCLUSION_MAX} characters`);
  }
  if (rawBaseConclusion.length > CONCLUSION_MAX) {
    errors.push(`Base decision recommendation exceeds ${CONCLUSION_MAX} characters`);
  }
  if (rawInitialConclusion !== rawBaseConclusion) {
    errors.push('Recursive hardening must attack the base decision recommendation');
  }

  const rawCycles = Array.isArray(hardeningReceipt.cycles) ? hardeningReceipt.cycles : [];
  rawCycles.forEach((entry, index) => {
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    const number = index + 1;
    if (rawText(item.observation).length > NARRATIVE_MAX) {
      errors.push(`Recursive hardening cycle ${number} observation exceeds ${NARRATIVE_MAX} characters`);
    }
    if (rawText(item.orientation).length > NARRATIVE_MAX) {
      errors.push(`Recursive hardening cycle ${number} orientation exceeds ${NARRATIVE_MAX} characters`);
    }
    const rawAttacks = Array.isArray(item.attacks) ? item.attacks : [];
    rawAttacks.forEach((entryAttack, attackIndex) => {
      const attackItem = entryAttack && typeof entryAttack === 'object' && !Array.isArray(entryAttack)
        ? entryAttack
        : {};
      if (rawText(attackItem.finding).length > NARRATIVE_MAX) {
        errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} finding exceeds ${NARRATIVE_MAX} characters`);
      }
      if (rawText(attackItem.falsifier).length > NARRATIVE_MAX) {
        errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} falsifier exceeds ${NARRATIVE_MAX} characters`);
      }
      const rawEvidenceRefs = Array.isArray(attackItem.evidenceRefs) ? attackItem.evidenceRefs : [];
      if (rawEvidenceRefs.length > EVIDENCE_REF_MAX_ITEMS) {
        errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} evidence references exceed ${EVIDENCE_REF_MAX_ITEMS} items`);
      }
      rawEvidenceRefs.forEach((reference, referenceIndex) => {
        if (rawText(reference).length > EVIDENCE_REF_MAX) {
          errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} evidence reference ${referenceIndex + 1} exceeds ${EVIDENCE_REF_MAX} characters`);
        }
      });
      const rawSkills = Array.isArray(attackItem.skills) ? attackItem.skills : [];
      if (rawSkills.length > ATTACK_SKILL_MAX_ITEMS) {
        errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} skills exceed ${ATTACK_SKILL_MAX_ITEMS} items`);
      }
      rawSkills.forEach((skill, skillIndex) => {
        if (rawText(skill).length > SKILL_MAX) {
          errors.push(`Recursive hardening cycle ${number} attack ${attackIndex + 1} skill ${skillIndex + 1} exceeds ${SKILL_MAX} characters`);
        }
      });
    });
    if (rawText(item.outputConclusion).length > CONCLUSION_MAX) {
      errors.push(`Recursive hardening cycle ${number} output conclusion exceeds ${CONCLUSION_MAX} characters`);
    }
  });
  if (rawText(hardeningReceipt.finalConclusion).length > CONCLUSION_MAX) {
    errors.push(`Recursive hardening final conclusion exceeds ${CONCLUSION_MAX} characters`);
  }
  const rawSkillsCovered = Array.isArray(hardeningReceipt.skillsCovered) ? hardeningReceipt.skillsCovered : [];
  if (rawSkillsCovered.length > RECEIPT_SKILL_MAX_ITEMS) {
    errors.push(`Recursive hardening skillsCovered exceeds ${RECEIPT_SKILL_MAX_ITEMS} items`);
  }
  rawSkillsCovered.forEach((skill, skillIndex) => {
    if (rawText(skill).length > SKILL_MAX) {
      errors.push(`Recursive hardening skillsCovered entry ${skillIndex + 1} exceeds ${SKILL_MAX} characters`);
    }
  });

  const normalized = normalize(hardeningReceipt);
  if (hardeningReceipt.contract !== RECURSIVE_HARDENING_CONTRACT) errors.push('Unsupported recursive hardening contract');
  if (!HASH.test(normalized.initialConclusionHash) || normalized.initialConclusionHash !== sha256(normalized.initialConclusion)) {
    errors.push('Recursive hardening initial conclusion hash mismatch');
  }
  if (normalized.attackModes.length !== 4 || RECURSIVE_ATTACK_MODES.some((mode) => !normalized.attackModes.includes(mode))) {
    errors.push('Recursive hardening requires exactly four canonical attack modes');
  }
  if (normalized.cycles.length !== 10) errors.push('Recursive hardening requires exactly 10 OODA cycles');

  let priorHash = normalized.initialConclusionHash;
  let survived = true;
  const observedSkills = new Set();
  const findings = new Set();
  normalized.cycles.forEach((entry, index) => {
    const number = index + 1;
    if (entry.cycle !== number) errors.push(`Recursive hardening cycle ${number} number mismatch`);
    if (!HASH.test(entry.inputConclusionHash) || entry.inputConclusionHash !== priorHash) {
      errors.push(`Recursive hardening cycle ${number} input conclusion is stale`);
    }
    if (!entry.observation) errors.push(`Recursive hardening cycle ${number} observation is required`);
    if (!entry.orientation) errors.push(`Recursive hardening cycle ${number} orientation is required`);
    if (entry.attacks.length !== 4) errors.push(`Recursive hardening cycle ${number} requires four attacks`);

    const modes = new Set();
    const cycleSkills = new Set();
    for (const item of entry.attacks) {
      if (!MODE_SET.has(item.mode)) errors.push(`Recursive hardening cycle ${number} has unsupported attack mode: ${item.mode}`);
      if (modes.has(item.mode)) errors.push(`Recursive hardening cycle ${number} repeats attack mode: ${item.mode}`);
      modes.add(item.mode);
      if (!item.finding) errors.push(`Recursive hardening cycle ${number} ${item.mode} finding is required`);
      if (findings.has(item.finding)) errors.push(`Recursive hardening cycle ${number} repeats an attack finding`);
      if (item.finding) findings.add(item.finding);
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
    if (!HASH.test(entry.outputConclusionHash) || entry.outputConclusionHash !== sha256(entry.outputConclusion)) {
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
  if (
    !HASH.test(normalized.finalConclusionHash)
    || normalized.finalConclusionHash !== sha256(normalized.finalConclusion)
    || normalized.finalConclusionHash !== priorHash
  ) {
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
  const hardeningHash = hashText(hardeningReceipt.hardeningHash);
  if (!HASH.test(hardeningHash)) {
    errors.push('Recursive hardening hardeningHash must be sha256');
  } else if (promptOSRecursiveHardeningHash(normalized) !== hardeningHash) {
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
    hardeningHash: hashText(hardeningReceipt.hardeningHash),
    decisionHash: hashText(hardeningReceipt.decisionHash),
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
