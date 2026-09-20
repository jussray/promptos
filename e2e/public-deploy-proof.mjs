/**
 * Proves that the deployed public PromptOS URL is:
 *   1. reachable anonymously, with no Access/login/provider wall in front of it;
 *   2. rendering the real guest-boot PromptOS UI (not a placeholder or error page);
 *   3. serving the exact authorized source commit (runtime identity == source SHA);
 *   4. exercising both the legacy library CTA and the canonical 5,000-recipe Catalog compile path.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL;
const EXPECTED_SHA = process.env.PROMPTOS_EXPECTED_SHA;
const OUTPUT_DIR = process.env.PROMPTOS_PROOF_DIR || 'artifacts/promptos-public-deploy-proof';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(typeof BASE_URL === 'string' && BASE_URL.length > 0, 'PROMPTOS_BASE_URL is required');
assert(/^[0-9a-f]{40}$/.test(EXPECTED_SHA || ''), 'PROMPTOS_EXPECTED_SHA must be an exact 40-character commit SHA');

const EXPECTED_HOST = process.env.PROMPTOS_EXPECTED_HOST || new URL(BASE_URL).host;

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

  const response = await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  assert(response, `${name}: navigation produced no response`);
  assert(response.status() === 200, `${name}: expected 200, got ${response.status()} (possible Access/login wall)`);

  const finalUrl = new URL(page.url());
  assert(finalUrl.host === EXPECTED_HOST, `${name}: navigation redirected off the public host to ${finalUrl.host} (possible provider/login wall)`);

  await page.locator('#appShell').waitFor({state: 'visible', timeout: 15000});
  assert(await page.locator('#onboarding').isHidden(), `${name}: onboarding/login wall is visible on anonymous load`);

  const guestChipText = (await page.locator('#userChip').textContent()) || '';
  assert(/guest/i.test(guestChipText), `${name}: anonymous visitor was not booted as guest (chip: "${guestChipText.trim()}")`);
  assert(!/sign in required|access denied|unauthorized/i.test(await page.content()), `${name}: page contains an access-denial marker`);

  const deployedSha = await page.locator('meta[name="promptos-deploy-sha"]').getAttribute('content');
  assert(deployedSha === EXPECTED_SHA, `${name}: deployed runtime identity ${deployedSha} does not equal authorized source SHA ${EXPECTED_SHA}`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts > 0, `${name}: prompt registry did not render`);

  const firstCard = page.locator('.pcard [data-open]').first();
  await firstCard.waitFor({state: 'visible'});
  await firstCard.click();
  await page.locator('#modalWrap.open').waitFor({state: 'visible'});
  assert((await page.locator('#mTitle').textContent())?.trim().length > 0, `${name}: opened prompt modal has no title`);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.locator('#mCopy').click();
  await page.waitForFunction(
    () => (document.getElementById('toast')?.textContent || '').toLowerCase().includes('copied'),
    {timeout: 5000},
  );
  const toastText = (await page.locator('#toast').textContent()) || '';
  assert(/copied/i.test(toastText), `${name}: primary CTA (copy prompt) did not confirm ("${toastText.trim()}")`);
  await page.locator('#mClose, #mClose2').first().click();

  const catalogNav = width <= 900 ? page.locator('.mobile-nav [data-page="catalog"]') : page.locator('.sidebar [data-page="catalog"]');
  await catalogNav.waitFor({state: 'visible'});
  await catalogNav.click();
  await page.locator('#page-catalog.on').waitFor({state: 'visible'});

  const selectedRecipes = Number((await page.locator('#catalogTotal').textContent())?.replace(/,/g, ''));
  const candidateRecipes = Number((await page.locator('#catalogCandidateTotal').textContent())?.replace(/,/g, ''));
  assert(selectedRecipes === 5000, `${name}: deployed catalog selected recipe count drifted: ${selectedRecipes}`);
  assert(candidateRecipes === 5400, `${name}: deployed catalog candidate count drifted: ${candidateRecipes}`);

  await page.locator('#catalogFamily').selectOption('repo.audit.first');
  await page.locator('#catalogPlatform').selectOption('chatgpt');
  await page.locator('#catalogStage').selectOption('audit');
  const cards = page.locator('#catalogGrid .promptos-card');
  await cards.first().waitFor({state: 'visible'});
  await cards.first().click();
  await page.locator('#catalogDialog').waitFor({state: 'visible'});
  assert((await page.locator('#catalogDialogFamily').textContent())?.trim() === 'repo.audit.first', `${name}: deployed catalog opened the wrong family`);

  const inputs = page.locator('#catalogInputs [data-catalog-input]');
  const inputCount = await inputs.count();
  assert(inputCount > 0, `${name}: deployed catalog recipe rendered no task inputs`);
  for (let i = 0; i < inputCount; i += 1) {
    const input = inputs.nth(i);
    const key = await input.getAttribute('data-catalog-input');
    await input.fill(`public-proof-${key}`);
  }
  await page.locator('#catalogCompile').click();
  await page.locator('#catalogReadiness[data-state="ready"]').waitFor({state: 'visible'});
  const catalogOutput = (await page.locator('#catalogOutput').textContent()) || '';
  assert(catalogOutput.includes('FOUNDER INPUT CONTEXT'), `${name}: deployed catalog did not compile the canonical prompt`);
  assert(catalogOutput.includes('public-proof-repoName'), `${name}: deployed catalog did not bind supplied context`);
  await page.keyboard.press('Escape');

  await mkdir(OUTPUT_DIR, {recursive: true});
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  assert(localFailures.length === 0, `${name}: deployed local asset failures: ${localFailures.join(' | ')}`);
  assert(pageErrors.length === 0, `${name}: page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);

  const result = {
    name,
    viewport: {width, height},
    finalUrl: page.url(),
    httpStatus: response.status(),
    deployedSha,
    totalPrompts,
    guestBoot: true,
    onboardingWallHidden: true,
    primaryCtaWorked: true,
    catalog: {selectedRecipes, candidateRecipes, familyId: 'repo.audit.first', concreteInputCount: inputCount, compiledReady: true},
    localFailures,
    pageErrors,
    consoleErrors,
    screenshot,
  };
  await context.close();
  return result;
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const results = [];
  results.push(await proveViewport(browser, {name: 'public-desktop', width: 1440, height: 1000}));
  results.push(await proveViewport(browser, {name: 'public-mobile', width: 390, height: 844}));
  const receipt = {
    schemaVersion: 1,
    baseUrl: BASE_URL,
    expectedHost: EXPECTED_HOST,
    expectedSha: EXPECTED_SHA,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    viewports: results,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
