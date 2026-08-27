/**
 * Proves that the deployed public PromptOS URL is:
 *   1. reachable anonymously, with no Access/login/provider wall in front of it;
 *   2. rendering the real guest-boot PromptOS UI (not a placeholder or error page);
 *   3. serving the exact authorized source commit (runtime identity == source SHA);
 *   4. exercising the primary product action (open a prompt, copy a version).
 *
 * Run against the live URL produced by .github/workflows/pages-deploy.yml, not localhost.
 * Required env:
 *   PROMPTOS_BASE_URL      - the deployed public URL to prove
 *   PROMPTOS_EXPECTED_SHA  - the exact 40-char commit SHA that was deployed
 * Optional env:
 *   PROMPTOS_EXPECTED_HOST - hostname the page must be served from (defaults to
 *                            the host embedded in PROMPTOS_BASE_URL)
 *   PROMPTOS_PROOF_DIR     - output dir for screenshots + receipt.json
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

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const response = await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  assert(response, `${name}: navigation produced no response`);
  assert(response.status() === 200, `${name}: expected 200, got ${response.status()} (possible Access/login wall)`);

  const finalUrl = new URL(page.url());
  assert(
    finalUrl.host === EXPECTED_HOST,
    `${name}: navigation redirected off the public host to ${finalUrl.host} (possible provider/login wall)`,
  );

  /* Anonymous, no wall: the app shell renders immediately, onboarding stays hidden. */
  await page.locator('#appShell').waitFor({state: 'visible', timeout: 15000});
  assert(await page.locator('#onboarding').isHidden(), `${name}: onboarding/login wall is visible on anonymous load`);

  const guestChipText = (await page.locator('#userChip').textContent()) || '';
  assert(/guest/i.test(guestChipText), `${name}: anonymous visitor was not booted as guest (chip: "${guestChipText.trim()}")`);
  assert(!/sign in required|access denied|unauthorized/i.test((await page.content())), `${name}: page contains an access-denial marker`);

  /* Runtime identity: the served page must be the authorized source commit, not "close enough". */
  const deployedSha = await page.locator('meta[name="promptos-deploy-sha"]').getAttribute('content');
  assert(deployedSha === EXPECTED_SHA, `${name}: deployed runtime identity ${deployedSha} does not equal authorized source SHA ${EXPECTED_SHA}`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts > 0, `${name}: prompt registry did not render`);

  /* Primary CTA/product action: open a prompt, copy a version. */
  const firstCard = page.locator('.pcard [data-open]').first();
  await firstCard.waitFor({state: 'visible'});
  await firstCard.click();
  await page.locator('#modalWrap.open').waitFor({state: 'visible'});
  assert((await page.locator('#mTitle').textContent())?.trim().length > 0, `${name}: opened prompt modal has no title`);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.locator('#mCopy').click();
  /* #toast keeps a non-empty box even when dismissed (opacity-driven, not display:none),
     so poll its text directly rather than trusting a "visible" locator wait. */
  await page.waitForFunction(
    () => (document.getElementById('toast')?.textContent || '').toLowerCase().includes('copied'),
    {timeout: 5000},
  );
  const toastText = (await page.locator('#toast').textContent()) || '';
  assert(/copied/i.test(toastText), `${name}: primary CTA (copy prompt) did not confirm ("${toastText.trim()}")`);

  await page.locator('#mClose, #mClose2').first().click();
  await page.locator('#modalWrap.open').waitFor({state: 'detached', timeout: 5000}).catch(() => {});

  await mkdir(OUTPUT_DIR, {recursive: true});
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

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
