import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_IMPLICIT_PROOF_DIR || 'artifacts/promptos-implicit-workflow-proof';
const FORBIDDEN_INTERNAL_NAMES = /\bultrathink\b|\battack[- ]?ten\b|\battack6000\b/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openCatalog(page, width) {
  const nav = width <= 900 ? page.locator('.mobile-nav [data-page="catalog"]') : page.locator('.sidebar [data-page="catalog"]');
  await nav.waitFor({ state: 'visible' });
  await nav.click();
  await page.locator('#page-catalog.on').waitFor({ state: 'visible' });
}

async function proveFamily(page, { name, familyId, expectedCount, expectedMarker }) {
  await page.locator('#catalogReset').click();
  await page.locator('#catalogFamily').selectOption(familyId);

  const resultText = (await page.locator('#catalogResultCount').textContent()) || '';
  const recipeCount = Number(resultText.replace(/[^0-9]/g, ''));
  assert(recipeCount === expectedCount, `${name}: ${familyId} count drifted: ${recipeCount}`);

  const cards = page.locator('#catalogGrid .promptos-card');
  await cards.first().waitFor({ state: 'visible' });
  assert(await cards.count() === expectedCount, `${name}: ${familyId} rendered card count drifted`);

  const title = ((await cards.first().locator('h3').textContent()) || '').trim();
  assert(title.length > 0, `${name}: ${familyId} first card has no title`);
  assert(!FORBIDDEN_INTERNAL_NAMES.test(title), `${name}: ${familyId} exposed an internal workflow name in its title`);

  await cards.first().click();
  await page.locator('#catalogDialog').waitFor({ state: 'visible' });
  const openedFamily = ((await page.locator('#catalogDialogFamily').textContent()) || '').trim();
  assert(openedFamily === familyId, `${name}: opened ${openedFamily} instead of ${familyId}`);

  const controls = page.locator('#catalogInputs [data-catalog-input]');
  const controlCount = await controls.count();
  assert(controlCount === 2, `${name}: ${familyId} should request subject + goal, got ${controlCount} controls`);
  for (let i = 0; i < controlCount; i += 1) {
    const control = controls.nth(i);
    const key = await control.getAttribute('data-catalog-input');
    await control.fill(`implicit-proof-${key}`);
  }

  await page.locator('#catalogCompile').click();
  await page.locator('#catalogReadiness[data-state="ready"]').waitFor({ state: 'visible' });
  const compiled = (await page.locator('#catalogOutput').textContent()) || '';
  assert(compiled.includes('RECIPE BUILD BRIEF'), `${name}: ${familyId} omitted its curated workflow brief`);
  assert(compiled.includes(expectedMarker), `${name}: ${familyId} omitted expected workflow behavior marker ${expectedMarker}`);
  assert(!FORBIDDEN_INTERNAL_NAMES.test(compiled), `${name}: ${familyId} leaked an internal workflow nickname into copied prompt text`);
  assert(compiled.includes('implicit-proof-subject') && compiled.includes('implicit-proof-goal'), `${name}: ${familyId} did not bind concrete inputs`);

  await page.keyboard.press('Escape');
  return { familyId, recipeCount, title, controlCount, compiledReady: true, internalNameLeak: false };
}

async function proveViewport(browser, { name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#appShell').waitFor({ state: 'visible' });
  await openCatalog(page, width);

  const deep = await proveFamily(page, {
    name,
    familyId: 'reasoning.deep.systems',
    expectedCount: 24,
    expectedMarker: 'VERIFIED',
  });
  const adversarial = await proveFamily(page, {
    name,
    familyId: 'reasoning.adversarial.challenge',
    expectedCount: 24,
    expectedMarker: 'SURVIVED',
  });

  assert(pageErrors.length === 0, `${name}: page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
  await mkdir(OUTPUT_DIR, { recursive: true });
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  await context.close();

  return { name, viewport: { width, height }, deep, adversarial, pageErrors, consoleErrors, screenshot };
}

await mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const viewports = [
    await proveViewport(browser, { name: 'desktop', width: 1440, height: 1000 }),
    await proveViewport(browser, { name: 'mobile', width: 390, height: 844 }),
  ];
  const receipt = {
    schemaVersion: 1,
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    visibleWorkflowNameLeaks: 0,
    viewports,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
