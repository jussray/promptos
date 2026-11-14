import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Proves the mockup pieces added to the home view (10 Established Prompts, status strip, wide two-column
// layout) at desktop and mobile: every card opens the real prompt it names, counts come from the running
// app, chips route through the real nav, the account card moves to the right column only for guests on
// wide screens, and none of the mockup's placeholder statistics render.
const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const FIRST_CARD = { id: 206, title: 'Decision Ultrathink' };
const PLACEHOLDER_CLAIMS = [/98\.7%/, /Upgrade to Pro/i, /120 active/i, /8 connected/i, /5,000\+ private/i];

const browser = await chromium.launch({ headless: true });
try {
  for (const view of [
    { name: 'desktop', viewport: { width: 1536, height: 1024 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const page = await browser.newPage({ viewport: view.viewport, isMobile: view.isMobile, hasTouch: view.hasTouch });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const nav = (name) => page.locator(`.mobile-nav [data-page="${name}"]:visible, .sidebar [data-page="${name}"]:visible`).first();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#welcomeScreen').waitFor({ state: 'visible' });
    await page.locator('[data-start-onboarding]').click();
    await page.locator('[data-continue-as-guest]').click();
    await page.locator('#appShell').waitFor({ state: 'visible' });
    await page.locator('#page-catalog.on').waitFor({ state: 'attached' });
    await page.locator('#homeEstablished').waitFor({ state: 'visible' });

    // every card resolves to a real prompt and shows that prompt's own description
    const cards = await page.evaluate(() => [...document.querySelectorAll('.est-row[data-est]')].map((b) => {
      const p = PROMPTS.find((x) => x.id === Number(b.dataset.est));
      return { id: Number(b.dataset.est), disabled: b.disabled, shown: b.querySelector('.est-text small')?.textContent, sub: p?.sub ?? null };
    }));
    assert.equal(cards.length, 10, `${view.name}: expected 10 established prompt cards`);
    for (const c of cards) {
      assert(c.sub !== null, `${view.name}: card ${c.id} names a prompt missing from the registry`);
      assert.equal(c.disabled, false, `${view.name}: card ${c.id} is disabled`);
      assert.equal(c.shown, c.sub, `${view.name}: card ${c.id} description drifted from the prompt`);
    }
    await page.locator(`.est-row[data-est="${FIRST_CARD.id}"]`).click();
    await page.locator('#modalWrap.open').waitFor({ state: 'visible' });
    const modalTitle = (await page.locator('#mTitle').textContent())?.trim() || '';
    assert(modalTitle === FIRST_CARD.title || modalTitle.endsWith(` ${FIRST_CARD.title}`), `${view.name}: card 1 opened "${modalTitle}", expected ${FIRST_CARD.title}`);
    await page.keyboard.press('Escape');
    await page.locator('#modalWrap.open').waitFor({ state: 'detached' });

    // the catalog count mirrors the canonical count pill
    await page.waitForFunction(() => /[\d,]+ recipes/.test(document.querySelector('#ssCatalog')?.textContent || ''));
    const counts = await page.evaluate(() => ({
      strip: document.querySelector('#ssCatalog').textContent,
      pill: document.querySelector('#countPill').textContent,
    }));
    assert(counts.pill.includes(counts.strip.replace(' recipes', '')), `${view.name}: strip count "${counts.strip}" not in count pill "${counts.pill}"`);

    // wide screens: the guest account card sits in the right column beside the prompts
    const est = await page.locator('#homeEstablished').boundingBox();
    const card = await page.locator('.signup-card').boundingBox();
    assert(est && card, `${view.name}: established section or account card not rendered`);
    if (view.name === 'desktop') assert(card.x >= est.x + est.width, 'desktop: account card is not in the right column');
    else assert(card.y < est.y, 'mobile: account card should stay above the established prompts');

    // no mockup placeholder statistics
    const body = await page.locator('body').innerText();
    for (const claim of PLACEHOLDER_CLAIMS) assert(!claim.test(body), `${view.name}: placeholder claim ${claim} rendered`);
    if (view.name === 'mobile') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, 'mobile: horizontal overflow');
    }

    // strip chips route through the real nav
    await page.locator('.status-strip [data-go="mission"]').click();
    await page.locator('#page-mission.on').waitFor({ state: 'attached' });
    await nav('catalog').click();
    await page.locator('#page-catalog.on').waitFor({ state: 'attached' });
    await page.locator('.status-strip [data-go="library"][data-q="agent"]').click();
    await page.locator('#page-library.on').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#search').inputValue(), 'agent', `${view.name}: Agents chip did not search the library`);

    // light theme keeps its own layout: the added blocks are hidden there
    await page.locator('#themeBtn').click();
    for (const sel of ['#homeEstablished', '.status-strip']) {
      assert.equal(await page.locator(sel).isVisible(), false, `${view.name}: ${sel} visible in light theme`);
    }
    await page.locator('#themeBtn').click();

    assert.deepEqual(errors, [], `${view.name}: console errors: ${errors.join(' | ')}`);
    await page.close();
    console.log(`home-v2 ${view.name}: ok`);
  }
} finally {
  await browser.close();
}
