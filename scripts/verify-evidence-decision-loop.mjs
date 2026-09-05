import fs from 'node:fs';

const contractPath = '.control-room/evidence-decision-loop.contract.json';
const skillPath = 'skills/evidence-decision-loop/SKILL.md';
const entryPath = 'AGENTS_FOUNDER_INTELLIGENCE.md';

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const skill = fs.readFileSync(skillPath, 'utf8');
const entry = fs.readFileSync(entryPath, 'utf8');

const fail = (message) => {
  console.error(`evidence-decision-loop contract failed: ${message}`);
  process.exit(1);
};

if (contract.contract !== 'juss/evidence-decision-loop@v1') fail('unexpected contract id');
if (contract.authority !== 'decision_support_only') fail('workflow must remain decision support only');

for (const plane of ['source', 'execution', 'outcome']) {
  if (!contract.truth_planes.includes(plane)) fail(`missing truth plane ${plane}`);
}
for (const state of ['VERIFIED', 'OBSERVED', 'INFERRED', 'UNKNOWN', 'BLOCKED']) {
  if (!contract.claim_states.includes(state)) fail(`missing claim state ${state}`);
}
for (const stage of ['observe', 'orient', 'redteam', 'decide', 'act', 'verify', 'report']) {
  if (!contract.stages.includes(stage)) fail(`missing stage ${stage}`);
}

const requiredInvariants = [
  'execution_is_not_outcome',
  'secondary_signal_cannot_win_alone',
  'changed_fingerprint_invalidates_prior_proof',
  'analysis_never_widens_authority',
  'provider_acceptance_is_not_user_outcome',
  'historical_receipts_do_not_become_fresh_proof',
];
for (const invariant of requiredInvariants) {
  if (contract.invariants[invariant] !== true) fail(`invariant ${invariant} must be true`);
}

for (const field of ['reality', 'bound', 'decision', 'proof', 'risk', 'rollback', 'next_gate']) {
  if (!contract.required_report_fields.includes(field)) fail(`missing report field ${field}`);
}

const requiredSkillText = [
  'Execution truth is not outcome truth',
  'Secondary or vanity signals',
  'If it changes, predecessor proof becomes historical',
  'execute merge only when founder authority is explicit',
];
for (const phrase of requiredSkillText) {
  if (!skill.includes(phrase)) fail(`skill missing required boundary: ${phrase}`);
}

if (!entry.includes('evidence-decision-loop')) fail('founder intelligence entrypoint does not register the skill');

console.log('evidence-decision-loop contract verified');
