import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const EXPECTED_CHAIN = 'DISCOVER -> GOAL -> AUTHORITY -> BATNA -> VALUE -> EVIDENCE -> STRUCTURE -> TERMS -> RECEIPT';
const TARGET_ID = 180;
const TARGET_TITLE = 'Cold Message Forge';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#appShell').waitFor({ state: 'visible' });

  const prompt = await page.evaluate((id) => {
    const registry = typeof PROMPTS !== 'undefined' && Array.isArray(PROMPTS) ? PROMPTS : [];
    const item = registry.find((candidate) => candidate?.id === id);
    return item ? {
      title: item.title,
      notes: item.notes,
      chatgpt: item.versions?.chatgpt,
      claude: item.versions?.claude,
    } : null;
  }, TARGET_ID);

  assert(prompt, 'Cold Message Forge prompt is missing from the runtime registry');
  assert.equal(prompt.title, TARGET_TITLE, 'Cold Message Forge public identity drifted');
  assert.match(prompt.chatgpt || '', /DISCOVER -> GOAL -> AUTHORITY -> BATNA -> VALUE -> EVIDENCE -> STRUCTURE -> TERMS -> RECEIPT/);
  assert.match(prompt.claude || '', /DISCOVER -> GOAL -> AUTHORITY -> BATNA -> VALUE -> EVIDENCE -> STRUCTURE -> TERMS -> RECEIPT/);
  assert.match(prompt.chatgpt || '', /Never lie, bluff, omit a required disclosure, or create a false impression/);
  assert.match(prompt.chatgpt || '', /smaller reversible structure/);
  assert.match(prompt.notes || '', /Never manufacture scarcity, authority, competing offers, or pressure/);

  const quickLibraryNav = page.locator('.mobile-nav [data-page="library"]');
  await quickLibraryNav.waitFor({ state: 'visible' });
  await quickLibraryNav.click();
  await page.locator('#page-library.on').waitFor({ state: 'visible' });
  await page.locator('#search').fill(TARGET_TITLE);
  await page.locator(`[data-open="${TARGET_ID}"]`).click();
  await page.locator('#modalWrap.open').waitFor({ state: 'visible' });

  const modalText = await page.locator('#modalWrap').innerText();
  assert.match(modalText, /Cold Message Forge/);
  assert.match(modalText, /DISCOVER -> GOAL -> AUTHORITY -> BATNA -> VALUE -> EVIDENCE -> STRUCTURE -> TERMS -> RECEIPT/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

  console.log(JSON.stringify({
    ok: true,
    promptId: TARGET_ID,
    title: TARGET_TITLE,
    negotiationChain: EXPECTED_CHAIN,
    mobileRendered: true,
  }, null, 2));
} finally {
  await browser.close();
}
