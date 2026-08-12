import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_PROOF_DIR || 'artifacts/promptos-rendered-proof';
const TARGET_PROMPT = 'Jailbreak Pack Review';
const TARGET_PROMPT_ID = 64;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    if (url.origin === origin && response.status() >= 400) {
      localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  assert(await page.locator('#onboarding').isHidden(), `${name}: guest boot left onboarding visible`);

  const initialTheme = await page.locator('html').getAttribute('data-theme');
  assert(initialTheme === 'dark', `${name}: expected dark initial theme, got ${initialTheme}`);

  const registry = await page.evaluate(({targetId, targetTitle}) => {
    const prompts = typeof PROMPTS !== 'undefined' && Array.isArray(PROMPTS) ? PROMPTS : [];
    const ids = prompts.map((prompt) => prompt?.id);
    const target = prompts.find((prompt) => prompt?.id === targetId);
    return {
      count: prompts.length,
      uniqueIds: new Set(ids).size,
      targetTitle: target?.title ?? null,
      targetPresent: target?.title === targetTitle,
    };
  }, {targetId: TARGET_PROMPT_ID, targetTitle: TARGET_PROMPT});
  assert(registry.count > 0, `${name}: prompt registry is empty`);
  assert(registry.uniqueIds === registry.count, `${name}: prompt registry contains duplicate IDs`);
  assert(registry.targetPresent, `${name}: canonical p08 prompt is absent from the runtime registry`);

  const stateBoundary = await page.evaluate(() => {
    const state = window.PromptOSState;
    const malformed = JSON.parse('{"custom":[],"theme":"dark","__proto__":{"polluted":true}}');
    const secret = state ? state.validateState({
      custom: [{id: 'c_secret', title: 'Token', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'ghp_12345678901234567890'}],
      theme: 'dark'
    }) : {findings: []};
    return {
      loaded: Boolean(state),
      schemaVersion: state?.SCHEMA_VERSION ?? null,
      prototypeRejected: state ? !state.validateState(malformed).ok : false,
      secretFound: Boolean(secret?.findings?.length),
    };
  });
  assert(stateBoundary.loaded && stateBoundary.schemaVersion === 1, `${name}: versioned state boundary did not load`);
  assert(stateBoundary.prototypeRejected, `${name}: prototype-bearing import was not rejected`);
  assert(stateBoundary.secretFound, `${name}: secret scanner did not flag a token-like prompt`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts === registry.count, `${name}: rendered prompt count does not match runtime registry`);

  const scriptPaths = await page.evaluate(() => Array.from(document.scripts)
    .map((script) => script.src)
    .filter(Boolean)
    .map((src) => new URL(src).pathname)
    .filter((pathname) => pathname.startsWith('/parts/')));
  for (const required of [
    '/parts/auth.js',
    '/parts/state.js',
    '/parts/p05-new-prompts.js',
    '/parts/p06-gap-prompts.js',
    '/parts/p07-ship-ultrathink-skills.js',
    '/parts/p08-cont-redteam.js',
    '/parts/p09-cont-design.js',
    '/parts/p10-cont-ops-growth.js',
    '/parts/app.js',
  ]) {
    assert(scriptPaths.includes(required), `${name}: missing rendered script ${required}`);
  }

  const search = page.locator('#search');
  await search.fill(TARGET_PROMPT);
  const matchingCards = page.locator('.pcard');
  await matchingCards.first().waitFor({state: 'visible'});
  assert(await matchingCards.count() === 1, `${name}: search did not narrow to exactly one prompt`);
  assert((await matchingCards.locator('h3').textContent())?.trim() === TARGET_PROMPT, `${name}: p08 prompt did not render`);

  await page.locator(`[data-open="${TARGET_PROMPT_ID}"]`).click();
  await page.locator('#modalWrap.open').waitFor({state: 'visible'});
  assert((await page.locator('#modalWrap h3').textContent())?.includes(TARGET_PROMPT), `${name}: prompt modal did not open the searched item`);
  assert(await page.locator('#modalWrap').getAttribute('aria-labelledby') === 'mTitle', `${name}: modal is not labelled by its title`);
  assert(await page.locator('#modalWrap').getAttribute('aria-describedby') === 'mSub', `${name}: modal is not described by its subtitle`);
  assert(await page.locator('#mStar').getAttribute('aria-pressed') === 'false', `${name}: modal star is missing its toggle state`);

  await page.keyboard.press('Escape');
  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'light', `${name}: theme toggle did not switch to light`);
  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'dark', `${name}: theme toggle did not return to dark`);

  const navRoot = width <= 900 ? '#mobileNav' : '.sidebar';
  const customNav = page.locator(`${navRoot} [data-page="custom"]`);
  await customNav.click();
  await page.locator('#cTitle').fill('Secret test');
  await page.locator('#cBody').fill('OPENAI_API_KEY=sk-12345678901234567890');
  await page.locator('#saveCustom').click();
  assert(await page.locator('#customList .citem').count() === 0, `${name}: secret-looking prompt was saved`);
  await page.locator('#cTitle').fill('Valid test');
  await page.locator('#cBody').fill('Use current repository evidence and return a bounded answer.');
  await page.locator('#saveCustom').click();
  assert(await page.locator('#customList .citem').count() === 1, `${name}: valid custom prompt was not saved`);
  await page.locator(`${navRoot} [data-page="library"]`).click();
  await page.waitForTimeout(2400);

  await mkdir(OUTPUT_DIR, {recursive: true});
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  assert(pageErrors.length === 0, `${name}: page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `${name}: console errors: ${consoleErrors.join(' | ')}`);
  assert(localFailures.length === 0, `${name}: local resource failures: ${localFailures.join(' | ')}`);

  const result = {
    name,
    viewport: {width, height},
    totalPrompts,
    registryUniqueIds: registry.uniqueIds,
    searchedPrompt: TARGET_PROMPT,
    searchedPromptId: TARGET_PROMPT_ID,
    modalOpened: true,
    themeRoundTrip: true,
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
  results.push(await proveViewport(browser, {name: 'desktop', width: 1440, height: 1000}));
  results.push(await proveViewport(browser, {name: 'mobile', width: 390, height: 844}));
  const receipt = {
    schemaVersion: 1,
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    viewports: results,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
