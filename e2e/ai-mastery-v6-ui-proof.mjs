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
  await page.locator('#v6Compile').click();
  const prompt = await page.locator('#v6PromptOutput').innerText();
  for (const required of ['AI MASTERY V6 :: workflow-optimizer', 'TRUTHMODE', 'CONFESS', 'REDTEAM I', 'REDTEAM II', 'L99', 'OODA', 'ATTACK TEN', 'separate receipts', 'never creates or renews authority']) {
    assert(prompt.includes(required), `compiled prompt missing ${required}`);
  }

  await page.locator('#v6Target').selectOption('fcr');
  await page.locator('#v6BuildSignal').click();
  const signal = JSON.parse(await page.locator('#v6SignalOutput').innerText());
  assert(signal.contract === 'juss/founder-signal@v1', 'outbound signal contract mismatch');
  assert(signal.source === 'promptos' && signal.target === 'fcr', 'outbound signal routing mismatch');
  assert(signal.approved === false && signal.authority === 'none', 'outbound signal must not transport approval or authority');
  assert(signal.evidenceClass === 'unknown', 'outbound signal must not invent evidence');
  assert(/^[a-f0-9]{64}$/.test(signal.signalHash), 'outbound signal SHA-256 fingerprint missing');

  const inbound = {
    contract: 'juss/founder-signal@v1',
    source: 'chief',
    target: 'promptos',
    intent: 'plan',
    goal: 'Produce a founder-approved next-step proposal.',
    evidenceClass: 'unknown',
    evidenceRefs: [],
    authority: 'none',
    approved: false,
    requestedMode: 'goal-to-action',
    fingerprint: 'test-fingerprint',
    proofCookie: 'test-cookie',
    correlationId: 'e2e-chief-proposal',
  };
  await page.locator('#v6Inbound').fill(JSON.stringify(inbound));
  await page.locator('#v6Receive').click();
  const received = JSON.parse(await page.locator('#v6InboundOutput').innerText());
  assert(received.valid === true && received.selectedMode === 'goal-to-action', 'inbound Chief proposal did not compile');
  assert(received.senderAuthenticated === false, 'inbound sender must remain unauthenticated');
  assert(received.approvalVerified === false && received.executionAuthorized === false, 'inbound proposal crossed an authority boundary');

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
    outboundTarget: signal.target,
    outboundAuthority: signal.authority,
    inboundSenderAuthenticated: received.senderAuthenticated,
    inboundApprovalVerified: received.approvalVerified,
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
