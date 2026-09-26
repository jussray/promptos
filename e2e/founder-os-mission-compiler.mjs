import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_FOUNDER_OS_PROOF_DIR || 'artifacts/promptos-founder-os-proof';
const FOUNDER_INTENT = 'Repair production Cloudflare routing, improve the user-facing recovery flow, and measure successful completion.';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function prove(browser, viewport) {
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});

  const runtime = await page.evaluate(() => ({
    version: window.PROMPTOS_FOUNDER_OS_VERSION,
    compiler: typeof window.compilePromptOSMission,
    promptIds: Array.isArray(PROMPTS)
      ? PROMPTS.filter((prompt) => [92, 93, 94].includes(prompt?.id)).map((prompt) => prompt.id)
      : [],
  }));
  assert(runtime.version === 'founder-os-mission-v1', `unexpected compiler version: ${runtime.version}`);
  assert(runtime.compiler === 'function', 'compiler runtime export is missing');
  assert(runtime.promptIds.length === 3, `expected 3 Founder OS prompts, got ${runtime.promptIds.length}`);

  const missionNav = page.locator('[data-page="mission"]:visible').first();
  await missionNav.click();
  await page.locator('#page-mission.on').waitFor({state: 'visible'});
  await page.locator('#foMake').waitFor({state: 'visible'});

  const makeRuntime = await page.evaluate(() => ({
    version: window.PROMPTOS_WORKFLOW_MAKER_UI_VERSION,
  }));
  assert(makeRuntime.version === 'promptos-make-ui-v1', `unexpected /MAKE UI version: ${makeRuntime.version}`);

  await page.locator('#foProject').fill('jussray/Sekret-Bip');
  await page.locator('#foIntent').fill(FOUNDER_INTENT);
  await page.locator('#foConstraints').fill('Audit current main first. Preserve unrelated behavior. Playwright proof required for UI claims.');
  await page.locator('#foProviders').fill('github, cloudflare, openai');
  await page.locator('#foCompile').click();

  await page.locator('#foOutput').waitFor({state: 'visible'});
  const outputText = await page.locator('#foOutput').innerText();
  for (const required of [
    'L6',
    'critical',
    'product-design',
    'data-analytics',
    'Playwright proof is mandatory',
    'Baseline + comparable post-change measurement required',
    'Chief AI:',
    'PromptOS:',
    'FCR:',
    'provider-readback',
    'rollback-path',
  ]) {
    assert(outputText.includes(required), `compiled mission UI missing: ${required}`);
  }

  const compiled = await page.locator('#foCompiled').innerText();
  assert(compiled.includes('Authority ceiling: L6'), 'compiled instruction did not preserve L6 ceiling');
  assert(compiled.includes('The system may exercise granted authority but may never expand its own authority.'), 'compiled instruction lost authority boundary');

  await page.locator('#foWorkflowId').fill('repair-production-recovery');
  await page.locator('#foWorkflowAliases').fill('/repair-recovery, recovery-flow');
  await page.locator('#foWorkflowLineage').fill('ultrathink, goalfix');
  await page.locator('#foModelProfile').selectOption('chatgpt-sol');
  await page.locator('#foObservedProvider').selectOption('openai');
  await page.locator('#foRuntimeModel').fill('gpt-5.6-sol');
  await page.locator('#foObservedCapabilities').fill('github, playwright');
  await page.locator('#foTruthRefs').fill('repo:jussray/promptos@exact-head, fcr:shared-evidence-spine');
  await page.locator('#foContinuityFingerprint').fill('promptos:e2e:model-native:exact-head');
  await page.locator('#foMake').click();
  await page.locator('#foWorkflowDraft').waitFor({state: 'visible'});

  const workflow = JSON.parse(await page.locator('#foWorkflowDraft').innerText());
  assert(workflow.artifactType === 'promptos-workflow', 'workflow preview used the wrong artifact type');
  assert(workflow.id === 'repair-production-recovery', `workflow id drifted: ${workflow.id}`);
  assert(workflow.status === 'draft', `workflow preview must remain draft, got ${workflow.status}`);
  assert(workflow.registrationAuthority === false, 'workflow preview crossed the registration authority gate');
  assert(workflow.intent === FOUNDER_INTENT, 'workflow preview changed founder intent');
  assert(workflow.sourceMission?.authorityCeiling === 'L6', 'workflow preview changed the mission authority ceiling');
  assert(workflow.lineage?.includes('ultrathink') && workflow.lineage?.includes('goalfix'), 'workflow preview lost declared lineage');
  assert(workflow.verification?.playwrightRequired === true, 'workflow preview lost Playwright proof requirement');
  assert(workflow.verification?.providerReadbackRequired === true, 'workflow preview lost provider readback requirement');

  const modelExecution = workflow.modelExecution;
  assert(modelExecution?.modelProfileId === 'chatgpt-sol', 'workflow UI did not compile the selected Sol profile');
  assert(modelExecution?.observedProvider === 'openai', 'workflow UI lost observed provider binding');
  assert(modelExecution?.observedRuntimeModel === 'gpt-5.6-sol', 'workflow UI lost observed runtime model');
  assert(modelExecution?.observedCapabilities?.includes('github'), 'workflow UI lost observed GitHub capability');
  assert(modelExecution?.observedCapabilities?.includes('playwright'), 'workflow UI lost observed Playwright capability');
  assert(modelExecution?.toolUseRule === 'observed-only-no-simulation', 'workflow UI lost no-simulation rule');
  assert(modelExecution?.proofRequired?.includes('playwright'), 'model handoff weakened mission Playwright proof');
  assert(modelExecution?.proofRequired?.includes('provider-readback'), 'model handoff weakened provider-readback proof');
  assert(modelExecution?.executionAuthorized === false, 'model handoff authorized execution');
  assert(modelExecution?.authorityTransferred === false, 'model handoff transferred authority');
  assert(modelExecution?.founderApprovalCarriedForward === false, 'model handoff carried founder approval');

  const workflowGate = await page.locator('#foWorkflowGate').innerText();
  assert(workflowGate.includes('Founder approval required before registry promotion'), 'workflow UI did not preserve founder registration gate');
  assert(workflowGate.includes('cannot self-register or widen authority'), 'workflow UI did not expose the no-self-expansion rule');

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  await mkdir(OUTPUT_DIR, {recursive: true});
  const name = viewport.width < 600 ? 'mobile' : 'desktop';
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  await context.close();
  return {
    name,
    viewport,
    runtime,
    makeRuntime,
    authority: 'L6',
    productDesignGate: true,
    dataAnalyticsGate: true,
    workflowDraft: true,
    workflowRegistrationAuthority: false,
    workflowLineage: workflow.lineage,
    modelProfileId: modelExecution.modelProfileId,
    observedProvider: modelExecution.observedProvider,
    observedRuntimeModel: modelExecution.observedRuntimeModel,
    observedCapabilities: modelExecution.observedCapabilities,
    modelProofRequired: modelExecution.proofRequired,
    pageErrors,
    consoleErrors,
    screenshot,
  };
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const viewports = [
    await prove(browser, {width: 1440, height: 1000}),
    await prove(browser, {width: 390, height: 844}),
  ];
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    result: 'passed',
    version: 'founder-os-mission-v1',
    makeUiVersion: 'promptos-make-ui-v1',
    viewports,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
