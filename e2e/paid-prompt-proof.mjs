import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {installBillingFixture, signInFixture} from './workspace-entry.mjs';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless:true});
try {
  for (const viewport of [{width:1440,height:960},{width:390,height:844}]) {
    const page = await browser.newPage({viewport});
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(BASE_URL,{waitUntil:'domcontentloaded'});
    const state = {paid:false};
    await installBillingFixture(page,state);
    assert(await page.locator('#welcomeScreen').isVisible());
    assert(await page.locator('#appShell').isHidden());
    assert(await page.locator('#beginnerLibrary').isHidden());
    assert.equal(await page.locator('[data-continue-as-guest]').count(),0);
    await page.locator('[data-start-onboarding]').click();
    assert(await page.locator('#appShell').isHidden());
    await page.locator('#beginnerLibrary').waitFor({state:'visible'});
    assert.equal(await page.locator('#beginnerLibrary details').count(),5);
    assert.equal(await page.locator('#guestPromptTemplate option').count(),5);
    for (let i=0;i<5;i++) {
      await page.locator('#guestPromptTemplate').selectOption(String(i));
      await page.locator('#guestPromptContext').fill('Beginner example ' + i);
      await page.locator('#guestPromptCompile').click();
      assert.match(await page.locator('#guestPromptOutput').textContent(),new RegExp('Beginner example '+i));
    }
    assert(await page.locator('#saveCustom').isHidden());
    assert(await page.locator('#importBtn').isHidden());
    await signInFixture(page);
    await page.locator('#beginnerLibrary').waitFor({state:'visible'});
    assert.equal(await page.locator('#beginnerLibrary details').count(),5);
    assert(await page.locator('#appShell').isHidden());
    assert(await page.locator('#billingUpgrade').isEnabled());
    await page.locator('#billingUpgrade').click();
    await page.locator('#billingConsent').waitFor({state:'visible'});
    assert.match(await page.locator('#billingOfferSummary').textContent(),/USD \$1\.00.*USD \$9\.99/);
    assert(await page.locator('#billingCheckout').isDisabled());
    state.paid=true;
    await page.locator('#billingRecheck').click();
    await page.locator('#appShell').waitFor({state:'visible'});
    assert(await page.locator('#beginnerLibrary').isHidden());
    const nav = page.locator('.mobile-nav [data-page="custom"]:visible, .sidebar [data-page="custom"]:visible').first();
    await nav.click();
    await page.locator('#cTitle').fill('Account-bound draft');
    await page.locator('#cBody').fill('Save only after server admission.');
    state.admit=false;
    await Promise.all([page.waitForResponse(r=>r.url().endsWith('/prompts/admit')),page.locator('#saveCustom').click()]);
    assert.equal(await page.locator('#customList .citem').count(),0);
    assert.equal(await page.locator('#cTitle').inputValue(),'Account-bound draft');
    state.admit=true;
    await page.locator('#saveCustom').click();
    await page.waitForFunction(()=>document.querySelectorAll('#customList .citem').length===1);
    state.paid=false;
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.locator('#beginnerLibrary').waitFor({state:'visible'});
    assert(await page.locator('#appShell').isHidden());
    assert.equal(await page.locator('#customList .citem').count(),0);
    await page.locator('#onboardingSignOut').click();
    await page.locator('#welcomeScreen').waitFor({state:'visible'});
    assert(await page.locator('#beginnerLibrary').isHidden());
    assert(await page.locator('#appShell').isHidden());
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('Mocked verified free/paid access, revocation and sign-out: PASS. No provider transaction.');
} finally { await browser.close(); }
