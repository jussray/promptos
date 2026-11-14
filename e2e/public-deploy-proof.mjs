/**
 * Proves that the deployed public PromptOS URL is:
 *   1. reachable anonymously, with no Access/login/provider wall in front of it;
 *   2. rendering the real PromptOS welcome-to-onboarding-to-guest journey;
 *   3. serving the exact authorized source commit (runtime identity == source SHA);
 *   4. exercising both the legacy library CTA and the canonical 5,000-recipe Catalog compile path.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {enterGuestWorkspace} from './workspace-entry.mjs';

const BASE_URL = process.env.PROMPTOS_BASE_URL;
const EXPECTED_SHA = process.env.PROMPTOS_EXPECTED_SHA;
const OUTPUT_DIR = process.env.PROMPTOS_PROOF_DIR || 'artifacts/promptos-public-deploy-proof';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(typeof BASE_URL === 'string' && BASE_URL.length > 0, 'PROMPTOS_BASE_URL is required');
assert(/^[0-9a-f]{40}$/.test(EXPECTED_SHA || ''), 'PROMPTOS_EXPECTED_SHA must be an exact 40-character commit SHA');

const EXPECTED_HOST = process.env.PROMPTOS_EXPECTED_HOST || new URL(BASE_URL).host;

async function proveViewport(browser, {name, width, height}, evidence = {}) {
  const context = await browser.newContext({viewport: {width, height}});
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const localFailures = [];
  const requestFailures = [];
  const origin = new URL(BASE_URL).origin;

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) localFailures.push(`${response.status()} ${url.pathname}`);
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.origin === origin) requestFailures.push(`${request.failure()?.errorText || 'request failed'} ${url.pathname}`);
  });
  // Cycle 33: hand the caller live references to everything this attempt
  // collected, so a failure can print its own evidence (see the retry loop).
  // Diagnostics only — the assertions at the end of this function are
  // unchanged and still govern the verdict.
  evidence.pageErrors = pageErrors;
  evidence.consoleErrors = consoleErrors;
  evidence.localFailures = localFailures;
  evidence.requestFailures = requestFailures;

  const response = await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  assert(response, `${name}: navigation produced no response`);
  assert(response.status() === 200, `${name}: expected 200, got ${response.status()} (possible Access/login wall)`);

  const finalUrl = new URL(page.url());
  assert(finalUrl.host === EXPECTED_HOST, `${name}: navigation redirected off the public host to ${finalUrl.host} (possible provider/login wall)`);

  await enterGuestWorkspace(page);

  const guestChipText = (await page.locator('#userChip').textContent()) || '';
  assert(/guest/i.test(guestChipText), `${name}: anonymous visitor was not booted as guest (chip: "${guestChipText.trim()}")`);
  assert(!/sign in required|access denied|unauthorized/i.test(await page.content()), `${name}: page contains an access-denial marker`);

  const deployedSha = await page.locator('meta[name="promptos-deploy-sha"]').getAttribute('content');
  assert(deployedSha === EXPECTED_SHA, `${name}: deployed runtime identity ${deployedSha} does not equal authorized source SHA ${EXPECTED_SHA}`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts > 0, `${name}: prompt registry did not render`);

  // The app mounts its catalog UI from a deferred dynamic import, and that
  // one-time mount activates the Catalog page whenever the module lands.
  // Over real network latency it can land after the navigation below and
  // steal the active page back mid-click, hiding the card button under a
  // display:none page. The catalog summary is bound in the same mount
  // sequence (bindGlobalCatalogTruth), so wait for it before interacting:
  // once it exists, the mount has settled and page state is stable.
  await page.waitForFunction(() => typeof window.__PROMPTOS_CATALOG_SUMMARY__ !== 'undefined');

  const libraryNav = page.locator('.mobile-nav [data-page="library"]:visible, .sidebar [data-page="library"]:visible').first();
  await libraryNav.waitFor({state: 'visible'});
  await libraryNav.click();
  await page.locator('#page-library.on').waitFor({state: 'visible'});

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

  const catalogNav = page.locator('.mobile-nav [data-page="catalog"]:visible, .sidebar [data-page="catalog"]:visible').first();
  await catalogNav.waitFor({state: 'visible'});
  await catalogNav.click();
  await page.locator('#page-catalog.on').waitFor({state: 'visible'});

  const selectedRecipes = Number((await page.locator('#catalogTotal').textContent())?.replace(/,/g, ''));
  const candidateRecipes = Number((await page.locator('#catalogCandidateTotal').textContent())?.replace(/,/g, ''));
  assert(selectedRecipes === 5000, `${name}: deployed catalog selected recipe count drifted: ${selectedRecipes}`);
  // Candidates = 5,400 generated-valid + 398 curated (catalog candidateCount
  // definition changed in ed2bc3f; verify-catalog-runtime.mjs reports 5,798).
  assert(candidateRecipes === 5798, `${name}: deployed catalog candidate count drifted: ${candidateRecipes}`);

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
    welcomeOnboardingSequence: true,
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

// Bounded retry for transient live-network slowness (cycle 28): on a fresh
// Pages deploy the deferred catalog import (or any single wait) can exceed
// Playwright's 30s default on the first attempt. A retry re-runs the FULL
// viewport — every assertion still runs and must pass — so a persistent
// defect still fails, only slower. Max 2 attempts; no timeout is extended,
// no assertion is weakened. A failed attempt's browser context is reaped
// by the outer browser.close().
// Cycle 33: a failed attempt also prints the page errors, console errors,
// HTTP failures, and network failures it collected before throwing. Until
// now that evidence was asserted only at the very end of proveViewport, so
// any mid-proof failure (e.g. the catalog-settle wait) discarded it and the
// run log named no cause.
async function proveViewportWithRetry(browser, viewport) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const evidence = {};
    try {
      return await proveViewport(browser, viewport, evidence);
    } catch (error) {
      lastError = error;
      console.log(`[${viewport.name}] attempt ${attempt} failed: ${error.message}`);
      console.log(`[${viewport.name}] attempt ${attempt} diagnostics: pageErrors=${JSON.stringify(evidence.pageErrors || [])} consoleErrors=${JSON.stringify(evidence.consoleErrors || [])} localFailures=${JSON.stringify(evidence.localFailures || [])} requestFailures=${JSON.stringify(evidence.requestFailures || [])}`);
      if (attempt === 2) throw error;
    }
  }
  throw lastError;
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const results = [];
  results.push(await proveViewportWithRetry(browser, {name: 'public-desktop', width: 1440, height: 1000}));
  results.push(await proveViewportWithRetry(browser, {name: 'public-mobile', width: 390, height: 844}));
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
