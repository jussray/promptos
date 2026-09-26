import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_MEMORY_PROOF_DIR || 'artifacts/promptos-prompt-memory-proof';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForApi(page) {
  await page.waitForFunction(() => Boolean(window.PromptOSPromptMemory?.recordGeneratedPrompt));
}

async function memoryCount(page, visibility = '') {
  return page.evaluate(async (requested) => {
    const rows = await window.PromptOSPromptMemory.listPrompts(requested ? {libraryVisibility: requested} : {});
    return rows.length;
  }, visibility);
}

async function proveViewport(browser, {name, width, height}) {
  const context = await browser.newContext({viewport: {width, height}});
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const localFailures = [];
  const origin = new URL(BASE_URL).origin;

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) localFailures.push(`${response.status()} ${url.pathname}`);
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  await waitForApi(page);
  await page.evaluate(async () => window.PromptOSPromptMemory.clearPromptMemory());
  await page.waitForFunction(async () => (await window.PromptOSPromptMemory.listPrompts()).length === 0);

  const catalogNav = width <= 900 ? page.locator('.mobile-nav [data-page="catalog"]') : page.locator('.sidebar [data-page="catalog"]');
  await catalogNav.waitFor({state: 'visible'});
  await catalogNav.click();
  await page.locator('#page-catalog.on').waitFor({state: 'visible'});
  await page.locator('#catalogFamily').selectOption('brand.voice.and.content');
  await page.locator('#catalogPlatform').selectOption('chatgpt');
  await page.locator('#catalogStage').selectOption('build');

  const catalogCards = page.locator('#catalogGrid .promptos-card');
  await catalogCards.first().waitFor({state: 'visible'});
  await catalogCards.first().click();
  await page.locator('#catalogDialog').waitFor({state: 'visible'});

  const inputs = page.locator('#catalogInputs [data-catalog-input]');
  const inputCount = await inputs.count();
  assert(inputCount === 4, `${name}: content family expected four inputs, got ${inputCount}`);
  const values = {
    brandVoice: 'Direct founder voice with concrete proof.',
    audience: 'Builders evaluating PromptOS.',
    channel: 'LinkedIn',
    goal: 'Earn qualified replies from builders who understand PromptOS prompt memory.',
  };
  for (let i = 0; i < inputCount; i += 1) {
    const control = inputs.nth(i);
    const key = await control.getAttribute('data-catalog-input');
    await control.fill(values[key] || `proof-${key}`);
  }
  await page.locator('#catalogCompile').click();
  await page.locator('#catalogReadiness[data-state="ready"]').waitFor({state: 'visible'});
  await page.waitForFunction(async () => (await window.PromptOSPromptMemory.listPrompts()).length === 1);
  assert(await memoryCount(page, 'visual') === 0, `${name}: generated prompt was promoted before outcome evidence`);
  assert(await memoryCount(page, 'revision') === 1, `${name}: generated prompt did not enter revision memory`);
  await page.keyboard.press('Escape');

  const memoryNav = width <= 900 ? page.locator('.mobile-nav [data-page="prompt-memory"]') : page.locator('.sidebar [data-page="prompt-memory"]');
  await memoryNav.waitFor({state: 'visible'});
  await memoryNav.click();
  await page.locator('#page-prompt-memory.on').waitFor({state: 'visible'});
  const revisionCard = page.locator('#pmRevisionGrid [data-prompt-memory-id]');
  await revisionCard.waitFor({state: 'visible'});
  assert(await revisionCard.count() === 1, `${name}: revision memory did not render captured prompt`);
  const notice = (await page.locator('.pm-note').textContent()) || '';
  assert(notice.includes('FCR sync is') && notice.includes('not connected'), `${name}: local-first/FCR sync truth is missing`);

  await revisionCard.locator('.pm-outcome').click();
  await page.locator('#pmOutcomeDialog').waitFor({state: 'visible'});
  await page.locator('#pmOutcomeResult').selectOption('success');
  await page.locator('#pmOutcomeMetric').selectOption('qualified_replies');
  await page.locator('#pmOutcomeValue').fill('6 qualified replies');
  await page.locator('#pmOutcomeAttribution').selectOption('prompt');
  await page.locator('#pmOutcomeExecutor').fill('Sol');
  await page.locator('#pmOutcomeChannel').fill('LinkedIn');
  await page.locator('#pmOutcomeArtifact').fill('https://example.test/posts/prompt-memory-proof');
  await page.locator('#pmOutcomeEvidence').fill('analytics://qualified-replies/6');
  await page.locator('#pmOutcomeNote').fill('Founder intent satisfied with a verified qualified-reply outcome.');
  await page.locator('#pmOutcomeSave').click();

  await page.waitForFunction(async () => (await window.PromptOSPromptMemory.listPrompts({libraryVisibility: 'visual'})).length === 1);
  const provenCard = page.locator('#pmProvenGrid [data-prompt-memory-id]');
  await provenCard.waitFor({state: 'visible'});
  assert(await provenCard.count() === 1, `${name}: successful prompt did not enter proven visual library`);
  assert(await page.locator('#pmRevisionGrid [data-prompt-memory-id]').count() === 0, `${name}: promoted prompt remained in revision memory`);

  // The proven card is the visual library surface; revision records remain outside it.

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  await waitForApi(page);
  await page.waitForFunction(async () => (await window.PromptOSPromptMemory.listPrompts({libraryVisibility: 'visual'})).length === 1);
  assert(await memoryCount(page, 'visual') === 1, `${name}: IndexedDB prompt memory did not survive reload`);
  assert(await memoryCount(page, 'revision') === 0, `${name}: reload changed library visibility`);

  const afterReload = await page.evaluate(async () => (await window.PromptOSPromptMemory.listPrompts())[0]);
  assert(afterReload.laneId === 'content.creation', `${name}: lane drifted after reload`);
  assert(afterReload.northStar.metric === 'founder_intent_outcome', `${name}: content lane North Star drifted`);
  assert(afterReload.executions?.length === 1, `${name}: publication/execution receipt was not retained`);
  assert(afterReload.outcomes?.[0]?.founderIntentSatisfied === true, `${name}: founder outcome was not retained`);

  await mkdir(OUTPUT_DIR, {recursive: true});
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  const reloadMemoryNav = width <= 900 ? page.locator('.mobile-nav [data-page="prompt-memory"]') : page.locator('.sidebar [data-page="prompt-memory"]');
  await reloadMemoryNav.click();
  await page.locator('#page-prompt-memory.on').waitFor({state: 'visible'});
  await page.screenshot({path: screenshot, fullPage: true});

  assert(pageErrors.length === 0, `${name}: page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
  assert(localFailures.length === 0, `${name}: local resource failures: ${localFailures.join(' | ')}`);

  const result = {
    name,
    viewport: {width, height},
    capturedAsRevision: true,
    promotedAfterFounderOutcome: true,
    visualLibraryPromotion: true,
    persistedAcrossReload: true,
    laneId: afterReload.laneId,
    northStar: afterReload.northStar.metric,
    executionReceiptCount: afterReload.executions.length,
    outcomeCount: afterReload.outcomes.length,
    screenshot,
    pageErrors,
    consoleErrors,
    localFailures,
  };
  await context.close();
  return result;
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const viewports = [];
  viewports.push(await proveViewport(browser, {name: 'desktop', width: 1440, height: 1000}));
  viewports.push(await proveViewport(browser, {name: 'mobile', width: 390, height: 844}));
  const receipt = {
    schemaVersion: 1,
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    viewports,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
