import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {enterGuestWorkspace} from './workspace-entry.mjs';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_V6_PROOF_DIR || 'artifacts/promptos-v6-proof';

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
  await enterGuestWorkspace(page);
  await page.waitForFunction(() => window.PROMPTOS_AI_MASTERY_V6_UI_VERSION === 'promptos-ai-mastery-v6-ui-v1');
  const nav = page.locator(`[data-page="mastery"]:visible`).first();
  await nav.click();
  await page.locator('#page-mastery.on').waitFor({state: 'visible'});
  assert(await page.locator('#v6Mode option').count() === 8, 'V6 UI must expose all eight specialist modes');

  await page.locator('#v6Mode').selectOption('workflow-optimizer');
  await page.locator('#v6Intent').fill('repair verify workflow');
  await page.locator('#v6Goal').fill('Connect the existing V6 compiler to the actual PromptOS UI without granting authority.');
  await page.locator('#v6Project').fill('promptos');
  await page.locator('#v6Compile').click();
  const prompt = await page.locator('#v6PromptOutput').innerText();
  for (const required of ['AI MASTERY V6 :: workflow-optimizer', 'TRUTHMODE', 'CONFESS', 'GARYVEE', 'REDTEAM I', 'REDTEAM II', 'L99', 'OODA', 'ATTACK TEN', 'separate receipts', 'never creates or renews authority']) {
    assert(prompt.includes(required), `compiled prompt missing ${required}`);
  }

  await page.locator('#v6BuildSignal').click();
  const request = JSON.parse(await page.locator('#v6SignalOutput').innerText());
  const intent = request.intent;
  assert(intent.schema === 'promptos/public-command-intent@v1', 'outbound request must use the existing FCR command-intake contract');
  assert(intent.project === 'promptos' && intent.route.specialistProduct === 'promptos', 'outbound project scope mismatch');
  assert(intent.route.owner === 'promptos' && intent.route.reasoningPlane === 'chief-ai-machine' && intent.route.authorityPlane === 'founder-control-room', 'outbound routing mismatch');
  assert(intent.authorityCeiling === 'advisory-only' && intent.execution.mutationAuthorized === false, 'outbound request must remain advisory and unexecuted');
  assert(intent.evidence.staleOnStateChange === true && intent.evidence.contract === 'current-authority', 'outbound request evidence invalidation contract missing');

  const fcrResponse = {
    intake: {
      contract: 'juss/fcr-public-command-intake@v1',
      receivedFrom: 'chief-ai-machine',
      sourceIntentFingerprint: 'a'.repeat(64),
      chiefHandoffFingerprint: 'b'.repeat(64),
      project: 'promptos',
      commandId: 'ai-mastery-v6',
      capabilityId: 'ai-mastery-v6',
      specialistProduct: 'promptos',
      requestedOutcome: 'Mode: workflow-optimizer. Outcome: Connect the existing V6 compiler to the actual PromptOS UI without granting authority.',
      acceptedForCapabilityPlanning: true,
      acceptedForAuthorityResolution: false,
      authorityState: 'unresolved',
      actionAuthority: false,
      executionAuthorized: false,
      nextRequiredContract: 'juss-v10/capability-plan@v1',
      chiefReleaseSha: 'c'.repeat(40),
    },
    proposalOnly: true,
    acceptedForAuthorityResolution: false,
    executionAuthorized: false,
    nextRequiredContract: 'juss-v10/capability-plan@v1',
  };
  await page.locator('#v6Mode').selectOption('task-prioritizer');
  await page.locator('#v6Inbound').fill(JSON.stringify(fcrResponse));
  await page.locator('#v6Receive').click();
  const received = JSON.parse(await page.locator('#v6InboundOutput').innerText());
  assert(received.valid === true && received.selectedMode === 'workflow-optimizer', 'FCR/Chief intake did not preserve the original specialist mode');
  assert(received.goal === 'Connect the existing V6 compiler to the actual PromptOS UI without granting authority.', 'FCR/Chief intake did not recover the original goal');
  assert(received.senderAuthenticated === false && received.signalFingerprintVerified === false, 'pasted FCR receipt must not be treated as authenticated');
  assert(received.approvalVerified === false && received.executionAuthorized === false && received.authorityState === 'unresolved', 'FCR/Chief intake crossed an authority boundary');

  await page.locator('#v6Inbound').fill(JSON.stringify({...fcrResponse, intake: {...fcrResponse.intake, authorityState: 'approved'}}));
  await page.locator('#v6Receive').click();
  const invalidAuthority = JSON.parse(await page.locator('#v6InboundOutput').innerText());
  assert(invalidAuthority.valid === false, 'inbound FCR response with a forged authority state was not rejected');

  await page.locator('#v6Inbound').fill(JSON.stringify({...fcrResponse, intake: {...fcrResponse.intake, chiefHandoffFingerprint: 'not-a-hash'}}));
  await page.locator('#v6Receive').click();
  const invalidFingerprint = JSON.parse(await page.locator('#v6InboundOutput').innerText());
  assert(invalidFingerprint.valid === false, 'malformed FCR fingerprints were not rejected');

  await page.locator('#v6Inbound').fill('{not-json');
  await page.locator('#v6Receive').click();
  const rejected = JSON.parse(await page.locator('#v6InboundOutput').innerText());
  assert(rejected.valid === false, 'malformed inbound JSON was not rejected');

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  await mkdir(OUTPUT_DIR, {recursive: true});
  await page.screenshot({path: `${OUTPUT_DIR}/v6-${viewport.width}.png`, fullPage: true});
  await writeFile(`${OUTPUT_DIR}/v6-${viewport.width}.json`, JSON.stringify({
    baseUrl: BASE_URL,
    viewport,
    uiVersion: await page.evaluate(() => window.PROMPTOS_AI_MASTERY_V6_UI_VERSION),
    specialistModes: await page.locator('#v6Mode option').count(),
    promptCompiled: true,
    outboundContract: intent.schema,
    outboundAuthority: intent.authorityCeiling,
    inboundSenderAuthenticated: received.senderAuthenticated,
    inboundApprovalVerified: received.approvalVerified,
    forgedAuthorityRejected: invalidAuthority.valid === false,
    invalidFingerprintRejected: invalidFingerprint.valid === false,
    malformedInboundRejected: rejected.valid === false,
    pageErrors,
    consoleErrors,
  }, null, 2));
  await context.close();
}

const browser = await chromium.launch({headless: true});
try {
  await prove(browser, {width: 1440, height: 1000});
  await prove(browser, {width: 390, height: 844});
  console.log(JSON.stringify({status: 'passed', baseUrl: BASE_URL, viewports: [1440, 390], proofDir: OUTPUT_DIR}));
} finally {
  await browser.close();
}
