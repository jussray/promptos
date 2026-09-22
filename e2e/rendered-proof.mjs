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
  const gistRequests = [];
  const origin = new URL(BASE_URL).origin;

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === 'https://api.github.com' && (url.pathname === '/gists' || url.pathname.startsWith('/gists/'))) {
      gistRequests.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) localFailures.push(`${response.status()} ${url.pathname}`);
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  assert(await page.locator('#onboarding').isHidden(), `${name}: guest boot left onboarding visible`);

  const persistenceSelector = width <= 900 ? '#persistenceAuthorityMobileStatus' : '#persistenceAuthorityStatus';
  const persistenceStatus = page.locator(persistenceSelector);
  if (width > 900) await persistenceStatus.scrollIntoViewIfNeeded();
  await persistenceStatus.waitFor({state: 'visible'});
  const persistenceText = (await persistenceStatus.textContent())?.trim() || '';
  assert(persistenceText.includes('Session only'), `${name}: persistence status did not disclose session-only state`);
  assert(persistenceText.includes('FCR') && persistenceText.includes('not connected'), `${name}: persistence status overstated FCR runtime persistence`);

  for (const selector of ['#syncToken', '#syncConnect', '#syncPush', '#syncPull']) {
    assert(await page.locator(selector).count() === 0, `${name}: legacy browser Gist control remains: ${selector}`);
  }
  const bodyText = await page.locator('body').innerText();
  assert(!bodyText.includes('Token needs gist scope'), `${name}: legacy Gist credential guidance is still visible`);
  assert(!bodyText.includes('GitHub Token'), `${name}: browser GitHub token collection copy is still visible`);
  assert(!bodyText.includes('persist across sessions'), `${name}: stale cross-session persistence claim is still visible`);

  const persistenceAuthority = await page.evaluate(() => window.__PROMPTOS_PERSISTENCE_AUTHORITY__);
  assert(persistenceAuthority?.canonicalAuthority === 'Founder Control Room', `${name}: FCR is not declared as canonical persistence authority`);
  assert(persistenceAuthority?.runtimePersistence === 'not-connected', `${name}: runtime persistence should remain not-connected until a real FCR path exists`);
  assert(persistenceAuthority?.browserState === 'session-only', `${name}: browser state is not truthfully marked session-only`);
  assert(persistenceAuthority?.browserGitHubTokenAccepted === false, `${name}: browser GitHub token acceptance is not explicitly disabled`);
  assert(Array.isArray(persistenceAuthority?.recovery) && persistenceAuthority.recovery.join(',') === 'export,import', `${name}: explicit export/import recovery contract is missing`);

  const initialTheme = await page.locator('html').getAttribute('data-theme');
  assert(initialTheme === 'dark', `${name}: expected dark initial theme, got ${initialTheme}`);

  const registry = await page.evaluate(({targetId, targetTitle}) => {
    const prompts = typeof PROMPTS !== 'undefined' && Array.isArray(PROMPTS) ? PROMPTS : [];
    const ids = prompts.map((prompt) => prompt?.id);
    const target = prompts.find((prompt) => prompt?.id === targetId);
    return {count: prompts.length, uniqueIds: new Set(ids).size, targetTitle: target?.title ?? null, targetPresent: target?.title === targetTitle};
  }, {targetId: TARGET_PROMPT_ID, targetTitle: TARGET_PROMPT});
  assert(registry.count > 0, `${name}: prompt registry is empty`);
  assert(registry.uniqueIds === registry.count, `${name}: prompt registry contains duplicate IDs`);
  assert(registry.targetPresent, `${name}: canonical p08 prompt is absent from the runtime registry`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts === registry.count, `${name}: rendered prompt count does not match runtime registry`);

  const scriptPaths = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src).filter(Boolean).map((src) => new URL(src).pathname).filter((pathname) => pathname.startsWith('/parts/')));
  for (const required of ['/parts/auth.js','/parts/p05-new-prompts.js','/parts/p06-gap-prompts.js','/parts/p07-ship-ultrathink-skills.js','/parts/p08-cont-redteam.js','/parts/p09-cont-design.js','/parts/p10-cont-ops-growth.js','/parts/app.js']) {
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
  await page.keyboard.press('Escape');

  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'light', `${name}: theme toggle did not switch to light`);
  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'dark', `${name}: theme toggle did not return to dark`);

  const catalogNav = width <= 900 ? page.locator('.mobile-nav [data-page="catalog"]') : page.locator('.sidebar [data-page="catalog"]');
  await catalogNav.waitFor({state: 'visible'});
  await catalogNav.click();
  await page.locator('#page-catalog.on').waitFor({state: 'visible'});
  const selectedRecipes = Number((await page.locator('#catalogTotal').textContent())?.replace(/,/g, ''));
  const candidateRecipes = Number((await page.locator('#catalogCandidateTotal').textContent())?.replace(/,/g, ''));
  const renderedFamilyTotal = Number((await page.locator('#catalogFamilyTotal').textContent())?.replace(/,/g, ''));
  const familyOptionCount = await page.locator('#catalogFamily option').count() - 1;
  assert(selectedRecipes === 5000, `${name}: catalog selected recipe count drifted: ${selectedRecipes}`);
  assert(candidateRecipes > selectedRecipes, `${name}: catalog candidate pool must exceed selected recipes: ${candidateRecipes}`);
  assert(renderedFamilyTotal === familyOptionCount, `${name}: rendered canonical family count drifted: ${renderedFamilyTotal} vs ${familyOptionCount}`);

  await page.locator('#catalogFamily').selectOption('repo.audit.first');
  await page.locator('#catalogPlatform').selectOption('chatgpt');
  await page.locator('#catalogStage').selectOption('audit');
  const catalogCards = page.locator('#catalogGrid .promptos-card');
  await catalogCards.first().waitFor({state: 'visible'});
  assert(await catalogCards.count() > 0, `${name}: canonical repo audit filter returned no recipes`);
  await catalogCards.first().click();
  await page.locator('#catalogDialog').waitFor({state: 'visible'});
  const familyId = (await page.locator('#catalogDialogFamily').textContent())?.trim();
  assert(familyId === 'repo.audit.first', `${name}: wrong catalog family opened: ${familyId}`);

  const controls = page.locator('#catalogInputs [data-catalog-input]');
  const controlCount = await controls.count();
  assert(controlCount > 0, `${name}: catalog recipe rendered no concrete inputs`);
  for (let i = 0; i < controlCount; i += 1) {
    const control = controls.nth(i);
    const key = await control.getAttribute('data-catalog-input');
    await control.fill(`proof-${key}`);
  }
  await page.locator('#catalogCompile').click();
  await page.locator('#catalogReadiness[data-state="ready"]').waitFor({state: 'visible'});
  const compiledOutput = (await page.locator('#catalogOutput').textContent()) || '';
  assert(compiledOutput.includes('FOUNDER INPUT CONTEXT'), `${name}: compiled catalog output omitted founder input context`);
  assert(compiledOutput.includes('proof-repoName'), `${name}: compiled catalog output did not bind supplied context`);
  await page.keyboard.press('Escape');

  await page.locator('#catalogReset').click();
  await page.locator('#catalogFamily').selectOption('application.builder');
  const builderResultText = (await page.locator('#catalogResultCount').textContent()) || '';
  const builderRecipeCount = Number(builderResultText.replace(/[^0-9]/g, ''));
  assert(builderRecipeCount === 200, `${name}: curated builder family count drifted: ${builderRecipeCount}`);
  await catalogCards.first().waitFor({state: 'visible'});
  assert((await catalogCards.first().locator('h3').textContent())?.startsWith('Builder · '), `${name}: builder family did not render builder-titled cards`);
  await catalogCards.first().click();
  await page.locator('#catalogDialog').waitFor({state: 'visible'});
  const builderFamilyId = (await page.locator('#catalogDialogFamily').textContent())?.trim();
  assert(builderFamilyId === 'application.builder', `${name}: wrong builder family opened: ${builderFamilyId}`);
  const builderControls = page.locator('#catalogInputs [data-catalog-input]');
  const builderControlCount = await builderControls.count();
  assert(builderControlCount === 4, `${name}: builder recipe should request four concrete inputs, got ${builderControlCount}`);
  for (let i = 0; i < builderControlCount; i += 1) {
    const control = builderControls.nth(i);
    const key = await control.getAttribute('data-catalog-input');
    await control.fill(`builder-proof-${key}`);
  }
  await page.locator('#catalogCompile').click();
  await page.locator('#catalogReadiness[data-state="ready"]').waitFor({state: 'visible'});
  const builderCompiledOutput = (await page.locator('#catalogOutput').textContent()) || '';
  assert(builderCompiledOutput.includes('RECIPE BUILD BRIEF'), `${name}: builder compilation omitted recipe build brief`);
  assert(builderCompiledOutput.includes('local-first behavior'), `${name}: builder compilation omitted local-first default`);
  assert(builderCompiledOutput.includes('Playwright'), `${name}: UI builder compilation omitted Playwright proof requirement`);
  await page.keyboard.press('Escape');

  await mkdir(OUTPUT_DIR, {recursive: true});
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  assert(gistRequests.length === 0, `${name}: browser emitted forbidden Gist requests: ${gistRequests.join(' | ')}`);
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
    catalog: {
      selectedRecipes,
      candidateRecipes,
      renderedFamilyTotal,
      familyId,
      concreteInputCount: controlCount,
      compiledReady: true,
      builderFamilyId,
      builderRecipeCount,
      builderControlCount,
      builderCompiledReady: true,
    },
    persistenceAuthority,
    persistenceText,
    gistRequests,
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
  const receipt = {schemaVersion: 1, baseUrl: BASE_URL, generatedAt: new Date().toISOString(), result: 'passed', viewports: results};
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
