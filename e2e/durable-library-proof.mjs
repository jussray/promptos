import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installBillingFixture,signInFixture} from './workspace-entry.mjs';

const base=process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try {
  for(const viewport of [{width:1440,height:960},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const state={paid:true,durable:true,library:new Map()};
    await page.goto(base);
    await installBillingFixture(page,state);
    const enter=async (subject)=>{
      await signInFixture(page,subject);
      await page.locator('#appShell').waitFor({state:'visible'});
      await page.waitForFunction(()=>document.querySelector('#customList')?.dataset.libraryState==='ready');
      await page.locator('.mobile-nav [data-page="custom"]:visible, .sidebar [data-page="custom"]:visible').first().click();
    };
    await enter('test-owner');
    await page.locator('#cTitle').fill('Durable test prompt');
    await page.locator('#cBody').fill('Keep this across a reload.');
    state.libraryOutage=true;
    await Promise.all([page.waitForResponse(r=>r.url().endsWith('/prompts/library')&&r.request().method()==='POST'),page.locator('#saveCustom').click()]);
    await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('not saved'));
    assert.equal(await page.locator('#cBody').inputValue(),'Keep this across a reload.');
    assert.equal(await page.locator('#customList .citem').count(),0);
    state.libraryOutage=false;
    await page.locator('#saveCustom').click();
    await page.locator('#customList .citem').waitFor({state:'visible'});
    await page.reload({waitUntil:'domcontentloaded'});
    await enter('test-owner');
    assert.equal(await page.locator('#customList .citem').count(),1);
    await page.locator('[data-open-custom]').click();
    assert.equal(await page.locator('#mBody').textContent(),'Keep this across a reload.');
    await page.evaluate(()=>window.PromptOSAuth.signOut());
    await enter('other-owner');
    assert.equal(await page.locator('#customList .citem').count(),0);
    assert.equal(await page.locator('#mBody').textContent(),'');
    await page.evaluate(()=>window.PromptOSAuth.signOut());
    await enter('test-owner');
    assert.equal(await page.locator('#customList .citem').count(),1);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('Mock private-library storage: save, reload, reauthentication, account isolation and outage proof passed.');
} finally {await browser.close();}
