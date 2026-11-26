import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const BASE_URL=process.env.PROMPTOS_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 for(const view of [{name:'desktop',viewport:{width:1440,height:960}},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
  const page=await browser.newPage({viewport:view.viewport,isMobile:Boolean(view.isMobile),hasTouch:Boolean(view.hasTouch)});
  const errors=[],failures=[],origin=new URL(BASE_URL).origin;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&r.status()>=400)failures.push(r.status()+' '+u.pathname);});
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded'});await page.locator('#welcomeScreen').waitFor({state:'visible'});
  await page.locator('[data-start-onboarding]').click();await page.locator('[data-continue-as-guest]').click();await page.locator('#appShell').waitFor({state:'visible'});
  await page.locator('.mobile-nav [data-page="capabilities"]:visible,.sidebar [data-page="capabilities"]:visible').first().click();
  await page.locator('#page-capabilities.on').waitFor({state:'visible'});await page.locator('#capabilityStatus[data-state="ready"]').waitFor({state:'visible'});
  const raw=await page.evaluate(async()=>{const r=await fetch('./parts/capabilities.v1.json',{cache:'no-store'});return{status:r.status,text:await r.text()};});
  assert.equal(raw.status,200,view.name+': capability catalog request failed');
  for(const name of ['jussray/jbh-private','jussray/Juss-beautiful-hair-','jussray/chatQuest','jussray/jussray-bip-and-seek','jussray/LUMORA'])assert(!raw.text.includes(name),view.name+': private repository identifier leaked '+name);
  assert(!raw.text.includes('apiKey')&&!raw.text.includes('accessToken')&&!raw.text.includes('refreshToken'));
  assert.equal(await page.locator('#capabilityApp option').count(),18);assert.equal(await page.locator('#capabilityApp').inputValue(),'promptos');
  assert.equal(await page.locator('#capabilityAppSkillCount').getAttribute('data-count'),'27');
  assert((await page.locator('#capabilitySkills').innerText()).includes('local-build'));
  assert((await page.locator('#capabilityRetired').innerText()).includes('local-devil'));
  assert.equal((await page.locator('#capabilitySharedCount').textContent()).trim(),'8');
  assert(Number((await page.locator('#capabilityIntegrationCount').textContent()).trim())>0);
  assert((await page.locator('#capabilityStatus').textContent()).includes('not checked'));
  await page.locator('#capabilityApp').selectOption('sekret-bip');assert.equal(await page.locator('#capabilityAppSkillCount').getAttribute('data-count'),'29');
  await page.locator('#capabilityApp').selectOption('games-hub');assert.equal(await page.locator('#capabilityAppSkillCount').getAttribute('data-count'),'0');
  assert.equal((await page.locator('#capabilityExcludedCount').textContent()).trim(),'43');
  assert((await page.locator('#capabilityExcludedNote').textContent()).includes('not game-specific'));
  await page.locator('#capabilityApp').selectOption('juss-beautiful-hair');
  assert((await page.locator('#page-capabilities').innerText()).includes('Private repository'));
  assert(!(await page.locator('#page-capabilities').innerText()).includes('jbh-private'));
  await page.locator('[data-cap-filter="plugins"]').click();assert.equal(await page.locator('[data-cap-section="integrations"]').isVisible(),true);
  assert.equal(await page.locator('[data-cap-section="skills"]').isVisible(),false);
  await page.locator('[data-cap-filter="all"]').click();await page.locator('#capabilitySearch').fill('Shopify');
  assert((await page.locator('#capabilityIntegrations').innerText()).includes('Shopify'));await page.locator('#capabilitySearch').fill('');
  if(view.isMobile){const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);assert.equal(overflow,false,'mobile horizontal overflow');}
  assert.deepEqual(failures,[],view.name+': local asset failures '+failures.join(' | '));assert.deepEqual(errors,[],view.name+': browser errors '+errors.join(' | '));
  await page.close();console.log('capability-library '+view.name+': passed');
 }
}finally{await browser.close();}
