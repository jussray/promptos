import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('parts/p10-cont-ops-growth.js', 'utf8');
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
  productDesignGate: true,
  dataAnalyticsGate: true,
  mainAuditDoesNotEscalateAuthority: true,
  mergeEscalatesToL5: true,
}));