import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_PROOF_DIR || 'artifacts/promptos-rendered-proof';
const TARGET_PROMPT = 'Jailbreak Pack Review';
const TARGET_PROMPT_ID = 64;
const CLOUDFLARE_PROMPT = 'Cloudflare Agent Setup';
const CLOUDFLARE_PROMPT_ID = 220;
const CLOUDFLARE_AGENT_SETUP_URL = 'https://developers.cloudflare.com/agent-setup/prompt.md';

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
    if (url.origin === origin && response.status() >= 400) {
      localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  assert(await page.locator('#onboarding').isHidden(), `${name}: guest boot left onboarding visible`);

  const persistenceSelector = width <= 900
    ? '#persistenceAuthorityMobileStatus'
    : '#persistenceAuthorityStatus';
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

  const registry = await page.evaluate(({targetId, targetTitle, cloudflareId, cloudflareTitle}) => {
    const prompts = typeof PROMPTS !== 'undefined' && Array.isArray(PROMPTS) ? PROMPTS : [];
    const ids = prompts.map((prompt) => prompt?.id);
    const target = prompts.find((prompt) => prompt?.id === targetId);
    const cloudflare = prompts.find((prompt) => prompt?.id === cloudflareId);
    return {
      count: prompts.length,
      uniqueIds: new Set(ids).size,
      targetTitle: target?.title ?? null,
      targetPresent: target?.title === targetTitle,
      cloudflareTitle: cloudflare?.title ?? null,
      cloudflarePresent: cloudflare?.title === cloudflareTitle,
      cloudflareCategory: cloudflare?.cat ?? null,
      cloudflareChatgpt: cloudflare?.versions?.chatgpt ?? null,
    };
  }, {
    targetId: TARGET_PROMPT_ID,
    targetTitle: TARGET_PROMPT,
    cloudflareId: CLOUDFLARE_PROMPT_ID,
    cloudflareTitle: CLOUDFLARE_PROMPT,
  });
  assert(registry.count > 0, `${name}: prompt registry is empty`);
  assert(registry.uniqueIds === registry.count, `${name}: prompt registry contains duplicate IDs`);
  assert(registry.targetPresent, `${name}: canonical p08 prompt is absent from the runtime registry`);
  assert(registry.cloudflarePresent, `${name}: Cloudflare Agent Setup prompt is absent from the runtime registry`);
  assert(registry.cloudflareCategory === 'cloudflare', `${name}: Cloudflare Agent Setup prompt has the wrong category`);
  assert(registry.cloudflareChatgpt?.includes(CLOUDFLARE_AGENT_SETUP_URL), `${name}: Cloudflare Agent Setup prompt is not bound to the official discovery source reference`);
  assert(registry.cloudflareChatgpt?.includes('bounded concrete plan'), `${name}: Cloudflare Agent Setup prompt omitted the bounded concrete plan gate`);
  assert(registry.cloudflareChatgpt?.includes('fresh explicit authorization'), `${name}: Cloudflare Agent Setup prompt omitted fresh explicit authorization`);
  assert(registry.cloudflareChatgpt?.includes('guidance'), `${name}: Cloudflare Agent Setup prompt did not bound the remote document as guidance`);

  const totalPrompts = Number(await page.locator('#statTotal').textContent());
  assert(Number.isFinite(totalPrompts) && totalPrompts === registry.count, `${name}: rendered prompt count does not match runtime registry`);

  const scriptPaths = await page.evaluate(() => Array.from(document.scripts)
    .map((script) => script.src)
    .filter(Boolean)
    .map((src) => new URL(src).pathname)
    .filter((pathname) => pathname.startsWith('/parts/')));
  for (const required of [
    '/parts/auth.js',
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
  await page.keyboard.press('Escape');

  await search.fill(CLOUDFLARE_PROMPT);
  await matchingCards.first().waitFor({state: 'visible'});
  assert(await matchingCards.count() === 1, `${name}: Cloudflare setup search did not narrow to exactly one prompt`);
  assert((await matchingCards.locator('h3').textContent())?.trim() === CLOUDFLARE_PROMPT, `${name}: Cloudflare Agent Setup card did not render`);
  await page.locator(`[data-open="${CLOUDFLARE_PROMPT_ID}"]`).click();
  await page.locator('#modalWrap.open').waitFor({state: 'visible'});
  assert((await page.locator('#modalWrap h3').textContent())?.includes(CLOUDFLARE_PROMPT), `${name}: Cloudflare Agent Setup modal did not open`);
  const cloudflareModalText = (await page.locator('#mBody').textContent()) || '';
  assert(cloudflareModalText.includes(CLOUDFLARE_AGENT_SETUP_URL), `${name}: Cloudflare Agent Setup modal omitted the official discovery URL`);
  assert(cloudflareModalText.includes('provider readback verified'), `${name}: Cloudflare Agent Setup modal omitted the provider-readback proof state`);
  assert(cloudflareModalText.includes('bounded concrete plan'), `${name}: Cloudflare Agent Setup modal omitted bounded planning`);
  assert(cloudflareModalText.includes('fresh explicit authorization'), `${name}: Cloudflare Agent Setup modal omitted the fresh authorization gate`);
  await page.keyboard.press('Escape');

  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'light', `${name}: theme toggle did not switch to light`);
  await page.locator('#themeBtn').click();
  assert(await page.locator('html').getAttribute('data-theme') === 'dark', `${name}: theme toggle did not return to dark`);

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
    cloudflarePrompt: CLOUDFLARE_PROMPT,
    cloudflarePromptId: CLOUDFLARE_PROMPT_ID,
    cloudflareProofScope: 'rendering-only',
    cloudflareOfficialSourceReferenceRendered: true,
    cloudflareModalOpened: true,
    cloudflareProviderAuthorizationVerified: false,
    cloudflareProviderToolsCallableVerified: false,
    cloudflareProviderReadbackVerified: false,
    modalOpened: true,
    themeRoundTrip: true,
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
  const receipt = {
    schemaVersion: 1,
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    proofScope: 'rendering-only',
    providerVerification: 'unverified',
    viewports: results,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
