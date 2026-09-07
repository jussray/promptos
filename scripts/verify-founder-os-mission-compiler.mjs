import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {compileWorkflowArtifact, validateWorkflowArtifact} from '../src/workflow-artifact.mjs';

const source = await readFile('parts/p10-cont-ops-growth.js', 'utf8');
const workflowRegistry = JSON.parse(await readFile('workflows/registry.json', 'utf8'));
const ultrathinkWorkflow = JSON.parse(await readFile('workflows/ultrathink.workflow.json', 'utf8'));
const failures = [];

for (const required of [
  "FOUNDER_OS_VERSION = 'founder-os-mission-v1'",
  'compilePromptOSMission',
  'Product Design Mission Gate',
  'Data Analytics Mission Gate',
  'product-design',
  'data-analytics',
  'playwright',
  'metric-baseline',
  'post-change-metric',
  'provider-readback',
  'rollback-path',
  'may never expand its own authority',
]) {
  if (!source.includes(required)) failures.push(`missing contract token: ${required}`);
}

const prompts = [];
const sandbox = {
  PROMPTS: prompts,
  window: {},
  document: {
    getElementById() { return null; },
    querySelector() { return null; },
    createElement() { return {className:'', id:'', innerHTML:'', appendChild(){}, addEventListener(){}}; },
    body: {appendChild(){}, removeChild(){}},
    execCommand() { return true; },
  },
  navigator: {},
  setTimeout,
  clearTimeout,
  console,
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, {filename: 'parts/p10-cont-ops-growth.js'});

if (typeof sandbox.window.compilePromptOSMission !== 'function') {
  failures.push('compilePromptOSMission was not exported to the runtime');
} else {
  const uiMission = sandbox.window.compilePromptOSMission({
    project: 'jussray/Sekret-Bip',
    intent: 'Improve onboarding UX and measure dashboard completion rate',
    constraints: 'Preserve auth behavior, audit current main first',
  });

  if (uiMission.version !== 'founder-os-mission-v1') failures.push('unexpected compiler version');
  if (uiMission.authorityCeiling !== 'L4') failures.push(`main-audit UI mission authority should stay L4, got ${uiMission.authorityCeiling}`);
  for (const protocol of ['product-design', 'data-analytics']) {
    if (!uiMission.protocols.includes(protocol)) failures.push(`UI mission missing ${protocol}`);
  }
  for (const proof of ['playwright', 'metric-baseline', 'post-change-metric']) {
    if (!uiMission.requiredEvidence.includes(proof)) failures.push(`UI mission missing proof ${proof}`);
  }
  if (uiMission.analytics.proofCoverageTargetPercent !== 100) failures.push('proof coverage target must be 100');
  if (!uiMission.productDesign.playwrightRequired) failures.push('UI mission must require Playwright');

  const reusableWorkflow = compileWorkflowArtifact(uiMission, {
    id: 'onboarding-completion-repair',
    title: 'Onboarding completion repair',
    aliases: ['/goalfix onboarding'],
    inputs: ['CURRENT STATE', 'TARGET OUTCOME'],
    lineage: ['ultrathink', 'goalfix'],
  });
  const workflowValidation = validateWorkflowArtifact(reusableWorkflow);
  if (!workflowValidation.valid) failures.push(`compiled workflow invalid: ${workflowValidation.errors.join(' | ')}`);
  if (reusableWorkflow.intent !== uiMission.intent) failures.push('workflow compiler changed founder intent');
  if (reusableWorkflow.sourceMission.authorityCeiling !== uiMission.authorityCeiling) failures.push('workflow compiler changed mission authority ceiling');
  if (reusableWorkflow.status !== 'draft') failures.push('new workflow must remain draft');
  if (reusableWorkflow.registrationAuthority !== false) failures.push('new workflow must not self-register');
  for (const proof of uiMission.requiredEvidence) {
    if (!reusableWorkflow.requiredEvidence.includes(proof)) failures.push(`workflow lost mission proof ${proof}`);
  }
  if (!reusableWorkflow.lineage.includes('ultrathink') || !reusableWorkflow.lineage.includes('goalfix')) {
    failures.push('workflow lineage did not preserve declared operating parents');
  }

  try {
    const cliOutput = execFileSync(process.execPath, [
      'scripts/make-workflow.mjs',
      '--intent', 'Improve onboarding UX and measure dashboard completion rate',
      '--project', 'jussray/Sekret-Bip',
      '--id', 'onboarding-completion-repair',
      '--constraints', 'Preserve auth behavior,audit current main first',
      '--lineage', 'ultrathink,goalfix',
    ], {encoding: 'utf8'});
    const cliWorkflow = JSON.parse(cliOutput);
    if (cliWorkflow.id !== 'onboarding-completion-repair') failures.push('workflow maker CLI changed requested workflow id');
    if (cliWorkflow.intent !== uiMission.intent) failures.push('workflow maker CLI changed founder intent');
    if (cliWorkflow.status !== 'draft' || cliWorkflow.registrationAuthority !== false) failures.push('workflow maker CLI crossed the registration gate');
    if (!cliWorkflow.lineage.includes('ultrathink') || !cliWorkflow.lineage.includes('goalfix')) failures.push('workflow maker CLI lost lineage');
  } catch (error) {
    failures.push(`workflow maker CLI failed: ${error.message}`);
  }

  const mergeMission = sandbox.window.compilePromptOSMission({
    project: 'jussray/Sekret-Bip',
    intent: 'Merge the verified focused fix after exact-head proof',
  });
  if (mergeMission.authorityCeiling !== 'L5') failures.push(`merge mission authority should be L5, got ${mergeMission.authorityCeiling}`);

  const prodMission = sandbox.window.compilePromptOSMission({
    project: 'jussray/Sekret-Bip',
    intent: 'Repair production Cloudflare routing and deploy the verified release',
    providers: 'cloudflare, github',
  });
  if (prodMission.authorityCeiling !== 'L6') failures.push(`production mission authority should be L6, got ${prodMission.authorityCeiling}`);
  for (const proof of ['provider-readback', 'rollback-path', 'production-readback']) {
    if (!prodMission.requiredEvidence.includes(proof)) failures.push(`production mission missing proof ${proof}`);
  }
  if (!prodMission.stopConditions.some((item) => /never expand its own authority/i.test(item))) {
    failures.push('production mission does not preserve no-self-expansion rule');
  }
}

const ids = prompts.map((prompt) => prompt.id);
if (new Set(ids).size !== ids.length) failures.push('prompt registry contains duplicate IDs after Founder OS additions');
for (const id of [92, 93, 94]) {
  if (!ids.includes(id)) failures.push(`Founder OS prompt ${id} missing from registry`);
}

if (workflowRegistry.schemaVersion !== 1) failures.push('workflow registry schemaVersion must equal 1');
if (!/explicit founder approval/i.test(workflowRegistry.registrationRule || '')) failures.push('workflow registry must preserve founder approval gate');
const ultrathinkEntry = Array.isArray(workflowRegistry.workflows)
  ? workflowRegistry.workflows.find((entry) => entry?.id === 'ultrathink')
  : null;
if (!ultrathinkEntry) failures.push('ULTRATHINK workflow missing from registry');
if (ultrathinkEntry?.status !== 'approved') failures.push('ULTRATHINK registry state must be approved');
if (ultrathinkEntry?.path !== 'workflows/ultrathink.workflow.json') failures.push('ULTRATHINK registry path drifted');

if (ultrathinkWorkflow.id !== 'ultrathink' || ultrathinkWorkflow.status !== 'approved') failures.push('ULTRATHINK workflow identity/status invalid');
if (ultrathinkWorkflow.registrationAuthority !== 'founder-approved') failures.push('ULTRATHINK approval provenance is missing');
for (const token of [
  'Reacquire reality first',
  'Understand the founder\'s actual intention',
  'Challenge the premise',
  'Use existing work',
  'Find the root cause',
  'smallest reversible implementation',
  'Red-team the result',
  'UI or runtime work requires Playwright proof',
  'Separate truth planes',
  'Never inherit stale green',
  'Do not fake completion',
  'Preserve founder authority',
  'Stop when the goal is proven',
]) {
  if (!ultrathinkWorkflow.operatingPrinciples?.some((principle) => principle.includes(token))) {
    failures.push(`ULTRATHINK workflow missing principle: ${token}`);
  }
}
for (const stage of ['OBSERVE', 'ORIENT', 'CHALLENGE', 'DECIDE', 'ACT', 'VERIFY', 'RED-TEAM', 'REACQUIRE', 'STOP']) {
  if (!ultrathinkWorkflow.executionLoop?.includes(stage)) failures.push(`ULTRATHINK execution loop missing ${stage}`);
}
for (const section of ['REALITY', 'FIX', 'PROOF', 'RISK', 'ROLLBACK', 'NEXT GATE']) {
  if (!ultrathinkWorkflow.report?.includes(section)) failures.push(`ULTRATHINK report missing ${section}`);
}
for (const component of ['goalfix', 'lindymode', 'redteam-1', 'l99', 'redteam-2', 'ooda', 'proofmode']) {
  if (!ultrathinkWorkflow.engineeringStack?.includes(component)) failures.push(`ULTRATHINK engineering stack missing ${component}`);
}

if (failures.length) {
  console.error('Founder OS mission compiler verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  version: sandbox.window.PROMPTOS_FOUNDER_OS_VERSION,
  promptIds: [92, 93, 94],
  compilerExported: true,
  workflowArtifactCompiler: true,
  registeredWorkflows: workflowRegistry.workflows.map((entry) => `${entry.id}@${entry.version}`),
  productDesignGate: true,
  dataAnalyticsGate: true,
  mainAuditDoesNotEscalateAuthority: true,
  mergeEscalatesToL5: true,
}));
