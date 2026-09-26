import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_RESEARCH_PROOF_DIR || 'artifacts/promptos-research-expansion-proof';
const EXPECTED = [
  ['Review Dependency Diff Before Merge', 'migration.and.release.planner'],
  ['Test for Excessive Agency', 'compliance.and.security.sentinel'],
  ['Profile Checkout Extension Cost', 'ecommerce.storefront.operator'],
  ['Prove the Keyboard-Only Critical Path', 'ux.design.system.auditor'],
  ['Grade End-to-End Agent Traces', 'repo.audit.first'],
  ['Lock a Visual Canon Before Generation', 'brand.voice.and.content'],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function proveViewport(browser, { name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#appShell').waitFor({ state: 'visible' });

  const catalogNav = width <= 900
    ? page.locator('.mobile-nav [data-page="catalog"]')
    : page.locator('.sidebar [data-page="catalog"]');
  await catalogNav.waitFor({ state: 'visible' });
  await catalogNav.click();
  await page.locator('#page-catalog.on').waitFor({ state: 'visible' });

  const selected = Number((await page.locator('#catalogTotal').textContent())?.replace(/,/g, ''));
  assert(selected === 5000, `${name}: selected catalog must remain 5000, got ${selected}`);

  const search = page.locator('#catalogSearch');
  const cards = page.locator('#catalogGrid .promptos-card');
  const proven = [];

  for (const [title, expectedFamily] of EXPECTED) {
    await page.locator('#catalogReset').click();
    await search.fill(title);
    await cards.first().waitFor({ state: 'visible' });
    assert(await cards.count() === 1, `${name}: expected one card for ${title}, got ${await cards.count()}`);
    const renderedTitle = (await cards.first().locator('h3').textContent())?.trim();
    assert(renderedTitle === title, `${name}: wrong title for ${title}: ${renderedTitle}`);
    await cards.first().click();
    await page.locator('#catalogDialog').waitFor({ state: 'visible' });
    const family = (await page.locator('#catalogDialogFamily').textContent())?.trim();
    assert(family === expectedFamily, `${name}: ${title} opened wrong family ${family}`);

    if (title === 'Test for Excessive Agency') {
      const controls = page.locator('#catalogInputs [data-catalog-input]');
      const count = await controls.count();
      assert(count > 0, `${name}: research recipe rendered no concrete inputs`);
      for (let i = 0; i < count; i += 1) {
        const control = controls.nth(i);
        const key = await control.getAttribute('data-catalog-input');
        await control.fill(`research-proof-${key}`);
      }
      await page.locator('#catalogCompile').click();
      await page.locator('#catalogReadiness[data-state="ready"]').waitFor({ state: 'visible' });
      const compiled = (await page.locator('#catalogOutput').textContent()) || '';
      assert(compiled.includes('RECIPE BUILD BRIEF'), `${name}: compiled research recipe omitted build brief`);
      assert(compiled.includes('VERIFIED, INFERRED, UNKNOWN, and BLOCKED'), `${name}: compiled research recipe omitted evidence states`);
      assert(compiled.includes('smallest reversible next action'), `${name}: compiled research recipe omitted reversible-action gate`);
    }

    proven.push({ title, family });
    await page.keyboard.press('Escape');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  assert(pageErrors.length === 0, `${name}: page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);

  const result = { name, viewport: { width, height }, selected, proven, pageErrors, consoleErrors, screenshot };
  await context.close();
  return result;
}

await mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const viewports = [];
  viewports.push(await proveViewport(browser, { name: 'desktop', width: 1440, height: 1000 }));
  viewports.push(await proveViewport(browser, { name: 'mobile', width: 390, height: 844 }));
  const receipt = {
    schemaVersion: 1,
    owner: 'jussray/promptos',
    result: 'passed',
    selectedCatalog: 5000,
    expectedCuratedAfterExpansion: 398,
    addedResearchPrompts: 150,
    generatedAt: new Date().toISOString(),
    viewports,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
