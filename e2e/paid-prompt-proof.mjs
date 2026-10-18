import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const views = [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }];
const failures = [];
const nav = (width, name) => (width <= 900 ? '.mobile-nav' : '.sidebar') + ' [data-page="' + name + '"]';

try {
  for (const view of views) {
    const page = await browser.newPage({ viewport: { width: view.width, height: view.height } });
    page.on('pageerror', error => failures.push(view.name + ': ' + error.message));
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#appShell').waitFor({ state: 'visible' });

    // Every save entry point must fail closed while the paid endpoint is unconfigured.
    await page.locator(nav(view.width, 'custom')).click();
    await page.locator('#cTitle').fill('Should remain a draft');
    await page.locator('#cBody').fill('This must never be added to the free account.');
    await page.locator('#saveCustom').click();
    assert.equal(await page.locator('#customList .citem').count(), 0, view.name + ': custom save bypassed paywall');
    assert.equal(await page.locator('#cTitle').inputValue(), 'Should remain a draft', 'Denied save discarded draft');

    await page.locator(nav(view.width, 'builder')).click();
    await page.locator('#saveBuilder').click();
    assert.equal(await page.locator('#customList .citem').count(), 0, view.name + ': builder save bypassed paywall');

    await page.locator(nav(view.width, 'freestyle')).click();
    await page.locator('#fsAsk').fill('Write a governance prompt with a rollback path');
    await page.locator('#fsGenerate').click();
    await page.locator('#fsSave').click();
    assert.equal(await page.locator('#customList .citem').count(), 0, view.name + ': freestyle save bypassed paywall');

    await page.locator('#importFile').setInputFiles({
      name: 'import.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ custom: [{
        id: 'imported', title: 'Free import bypass', body: 'not admitted',
        cat: 'custom', platforms: ['chatgpt']
      }] }))
    });
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#customList .citem').count(), 0, view.name + ': import bypassed paywall');
    await page.locator(nav(view.width, 'library')).click();
    assert(await page.locator('#page-library').isVisible(), view.name + ': free library blocked');

    console.log('Paywall free-account browser proof: ' + view.name + ' PASS');
    await page.close();
  }

  // Positive-path UI test uses an explicitly mocked billing server.
  // This is NOT a claim of production Stripe configuration or entitlement.
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const writes = [];
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === 'billing.test') {
      if (req.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: {
          'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization'
        } });
        return;
      }
      writes.push({ url: url.pathname, auth: req.headers().authorization });
      await route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(url.pathname === '/prompts/admit' ? { admitted: true } : { paid: true }) });
      return;
    }
    if (req.isNavigationRequest() && url.origin === new URL(BASE_URL).origin) {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<meta name="promptos-billing-api" content="">',
        '<meta name="promptos-billing-api" content="https://billing.test">'
      );
      await route.fulfill({ response, body: html });
      return;
    }
    await route.continue();
  });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#appShell').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    window.PromptOSAuth.getIdToken = () => 'test-id-token';
  });
  await page.locator('.sidebar [data-page="custom"]').click();
  await page.locator('#cTitle').fill('Paid user prompt');
  await page.locator('#cBody').fill('Only admitted after authenticated billing request');
  await page.locator('#saveCustom').click();
  await page.waitForFunction(() => document.querySelectorAll('#customList .citem').length === 1);
  assert(writes.some(x => x.url === '/prompts/admit' && x.auth === 'Bearer test-id-token'), 'Paid save never called backend');
  console.log('Paywall mocked paid-account UI proof: PASS (backend independently tested)');
  await page.close();

  assert.deepEqual(failures, [], 'Unexpected browser errors');
} finally {
  await browser.close();
}
