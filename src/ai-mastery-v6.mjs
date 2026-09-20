import { createHash } from 'node:crypto';

export const AI_MASTERY_V6_CONTRACT = 'promptos/ai-mastery-v6@6.0.0';
export const SIGNAL_CONTRACT = 'juss/founder-signal@v1';

export const MODES = Object.freeze([
  'mission-sprint',
  'goal-to-action',
  'task-prioritizer',
  'meeting-to-action',
  'learning-accelerator',
  'email-efficiency',
  'workflow-optimizer',
  'daily-progress-review',
]);

export const AI_MASTERY_V6_PROTOCOL_STACK = Object.freeze([
  'truthmode',
  'confess',
  '5w1h',
  'billgates',
  'elonmusk',
  'garyvee',
  'ultrathink',
  'redteam-1',
  'redteam-twin',
  'lindymode',
  'l99',
  'redteam-2',
  'ooda',
  'goalfix',
  'attack-ten',
  'proofmode',
  'continuity',
]);

export const REPAIR_OS_SEQUENCE = Object.freeze([
  'lindymode',
  'redteam-1',
  'attack-ten',
  'ooda-observe',
  'ooda-orient',
  'ooda-decide',
  'l99-authority',
  'act',
  'redteam-2',
  'recursive-hardening',
  'verify',
  'loop',
]);

export const ATTACK_WORKFLOWS = Object.freeze({
  premise: 'attack-ten',
  implementation: 'recursive-hardening',
  recursiveContract: 'juss-v10/recursive-hardening@v1',
  requiredCycles: 10,
  modes: Object.freeze([
    'authority-inversion',
    'evidence-falsification',
    'human-outcome',
    'temporal-race',
  ]),
  authorityEffect: 'none',
});

const MODE_SET = new Set(MODES);
const TRUST = new Set(['verified', 'inferred', 'unknown', 'blocked']);
const SOURCES = new Set(['fcr', 'chief', 'promptos', 'founder']);
const INTENT_TO_MODE = Object.freeze({
  focus: 'mission-sprint', execute: 'mission-sprint', ship: 'mission-sprint',
  plan: 'goal-to-action', goal: 'goal-to-action', roadmap: 'goal-to-action',
  prioritize: 'task-prioritizer', triage: 'task-prioritizer', delegate: 'task-prioritizer',
  meeting: 'meeting-to-action', decisions: 'meeting-to-action', notes: 'meeting-to-action',
  learn: 'learning-accelerator', study: 'learning-accelerator', practice: 'learning-accelerator',
  email: 'email-efficiency', message: 'email-efficiency', communicate: 'email-efficiency',
  workflow: 'workflow-optimizer', automate: 'workflow-optimizer', optimize: 'workflow-optimizer', fix: 'workflow-optimizer',
  review: 'daily-progress-review', progress: 'daily-progress-review', retrospective: 'daily-progress-review',
});

const PROTOCOL_LABELS = Object.freeze({
  truthmode: 'TRUTHMODE',
  confess: 'CONFESS',
  '5w1h': '5W1H',
  billgates: 'BILLGATES',
  elonmusk: 'ELONMUSK',
  garyvee: 'GARYVEE',
  ultrathink: 'ULTRATHINK',
  'redteam-1': 'REDTEAM I',
  'redteam-twin': 'REDTEAM TWIN',
  lindymode: 'LINDY',
  l99: 'L99',
  'redteam-2': 'REDTEAM II',
  ooda: 'OODA',
  goalfix: 'GOALFIX',
  'attack-ten': 'ATTACK TEN',
  proofmode: 'PROOF',
  continuity: 'CONTINUITY',
});

const REPAIR_OS_LABELS = Object.freeze({
  lindymode: 'LINDY',
  'redteam-1': 'REDTEAM I',
  'attack-ten': 'ATTACK TEN',
  'ooda-observe': 'OODA OBSERVE',
  'ooda-orient': 'OODA ORIENT',
  'ooda-decide': 'OODA DECIDE',
  'l99-authority': 'L99 AUTHORITY',
  act: 'ACT',
  'redteam-2': 'REDTEAM II',
  'recursive-hardening': 'RECURSIVE HARDENING',
  verify: 'VERIFY',
  loop: 'LOOP',
});

function clean(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function sha(value) { return createHash('sha256').update(value).digest('hex'); }
function uniq(values = []) { return [...new Set(Array.isArray(values) ? values.map(v => clean(v, 200)).filter(Boolean) : [])]; }

function kernelOrderText() {
  const labels = [];
  for (const step of AI_MASTERY_V6_PROTOCOL_STACK) {
    if (step === 'proofmode') labels.push('ACTION');
    labels.push(PROTOCOL_LABELS[step] ?? step.toUpperCase());
  }
  labels.push('NEXT GATE');
  return labels.join(' -> ');
}

function repairOSOrderText() {
  return REPAIR_OS_SEQUENCE.map((step) => REPAIR_OS_LABELS[step] ?? step.toUpperCase()).join(' -> ');
}

export function normalizeFounderSignal(input = {}) {
  const signal = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return {
    contract: SIGNAL_CONTRACT,
    source: clean(signal.source, 40).toLowerCase(),
    target: clean(signal.target, 40).toLowerCase() || 'promptos',
    intent: clean(signal.intent, 120).toLowerCase(),
    goal: clean(signal.goal, 2000),
    evidenceClass: clean(signal.evidenceClass, 40).toLowerCase() || 'unknown',
    evidenceRefs: uniq(signal.evidenceRefs),
    authority: clean(signal.authority, 120).toLowerCase() || 'none',
    approved: signal.approved === true,
    requestedMode: clean(signal.requestedMode, 80).toLowerCase(),
    fingerprint: clean(signal.fingerprint, 256),
    proofCookie: clean(signal.proofCookie, 512),
    correlationId: clean(signal.correlationId, 160),
  };
}

export function validateFounderSignal(input) {
  const signal = normalizeFounderSignal(input);
  const errors = [];
  if (!SOURCES.has(signal.source)) errors.push('source must be fcr, chief, promptos, or founder');
  if (signal.target !== 'promptos') errors.push('target must be promptos for inbound routing');
  if (!signal.intent) errors.push('intent is required');
  if (!TRUST.has(signal.evidenceClass)) errors.push('invalid evidenceClass');
  if (signal.requestedMode && !MODE_SET.has(signal.requestedMode)) errors.push('unknown requestedMode');
  if (signal.approved && signal.authority === 'none') errors.push('approval requires an explicit authority reference');
  return { valid: errors.length === 0, errors, signal };
}

export function selectPromptMode(input) {
  const { valid, errors, signal } = validateFounderSignal(input);
  if (!valid) return { selected: false, mode: null, reason: 'invalid-signal', errors, signal };
  if (signal.requestedMode) return { selected: true, mode: signal.requestedMode, reason: 'explicit-mode', errors: [], signal };
  const tokens = signal.intent.split(/[^a-z0-9-]+/).filter(Boolean);
  for (const token of tokens) {
    if (INTENT_TO_MODE[token]) return { selected: true, mode: INTENT_TO_MODE[token], reason: `intent:${token}`, errors: [], signal };
  }
  return { selected: false, mode: null, reason: 'no-safe-match', errors: [], signal };
}

export function buildPromptOSSignal({ target, intent, goal, evidenceClass = 'unknown', evidenceRefs = [], authority = 'none', approved = false, mode = '', fingerprint = '', proofCookie = '', correlationId = '' } = {}) {
  if (!['fcr', 'chief'].includes(target)) throw new Error('PromptOS outbound target must be fcr or chief');
  const body = {
    contract: SIGNAL_CONTRACT,
    source: 'promptos', target, intent: clean(intent, 120).toLowerCase(), goal: clean(goal),
    evidenceClass: clean(evidenceClass, 40).toLowerCase(), evidenceRefs: uniq(evidenceRefs),
    authority: clean(authority, 120).toLowerCase() || 'none', approved: approved === true,
    selectedMode: MODE_SET.has(mode) ? mode : '', fingerprint: clean(fingerprint, 256),
    proofCookie: clean(proofCookie, 512), correlationId: clean(correlationId, 160),
  };
  body.signalHash = sha(JSON.stringify(body));
  return body;
}

export function compileV6Prompt(input) {
  const route = selectPromptMode(input);
  if (!route.selected) return { ...route, prompt: null };
  const { signal, mode } = route;
  const prompt = [
    `AI MASTERY V6 :: ${mode}`,
    `Goal: ${signal.goal || signal.intent}`,
    `Kernel order: ${kernelOrderText()}.`,
    `Repair OS: ${repairOSOrderText()}.`,
    `Attack workflows: ATTACK TEN challenges the premise before action; ${ATTACK_WORKFLOWS.requiredCycles}-cycle RECURSIVE HARDENING attacks authority inversion, evidence falsification, human-outcome failure, and temporal races after implementation.`,
    'Lindy chooses the durable carrier; Red Team I attacks whether the repair should exist; OODA reacquires current reality before deciding; L99 verifies subject, authority, evidence, rollback, and consequence before ACT.',
    'Red Team II and recursive hardening attack the implemented result. Verification must use the highest relevant truth plane, then LOOP only if the goal is still unproven and authority remains valid.',
    'Attack, OODA, Lindy, Red Team, and L99 outputs are reasoning/evidence only. They never create, renew, widen, or transport execution authority.',
    'Classify material claims VERIFIED / INFERRED / UNKNOWN / BLOCKED. Keep independent failures as separate receipts.',
    'Evidence may update or invalidate fingerprints/proof cookies but never creates or renews authority.',
    'Do not claim execution, outcome, verification, merge, publication, or external mutation without matching evidence and authority.',
    'Prefer the smallest reversible action. Stop when acceptance is verified or a distinct blocker prevents valid continuation.',
    'Return REALITY / DECISION / ACTION / PROOF / RISK / ROLLBACK / NEXT GATE.',
  ].join('\n');
  return { ...route, prompt, contract: AI_MASTERY_V6_CONTRACT };
}
