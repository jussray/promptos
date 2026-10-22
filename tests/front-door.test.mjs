import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../front-door/worker.mjs';
const home='https://promptos.foundercontrolroom.org';
test('PromptOS homepage displays its own public-safe presentation', async()=>{
 for(const url of [home+'/',home+'/?utm_source=review']){
  const r=await worker.fetch(new Request(url));
  assert.equal(r.status,200);
  assert.match(await r.text(),/Intent in. Governed workflow out/);
  assert.match(r.headers.get('Content-Security-Policy'),/script-src 'none'/);
 }
});
test('private and unrelated endpoints are not served by the public worker',async()=>{
 for(const path of ['/admin','/api/private','/api/overview','/dashboard','/index.html','/assets/private.json']){
  assert.equal((await worker.fetch(new Request(home+path))).status,404,path);
 }
 assert.equal((await worker.fetch(new Request(home+'/',{method:'POST'}))).status,404);
 assert.equal((await worker.fetch(new Request('https://foundercontrolroom.org/'))).status,404);
});
test('front-door routes cannot override Founder Control Room or PromptOS private origin',()=>{
 const config=JSON.parse(readFileSync(new URL('../wrangler.front-door.jsonc',import.meta.url),'utf8'));
 assert.deepEqual(config.routes.map(x=>x.pattern),['promptos.foundercontrolroom.org/*']);
 assert.equal(config.preview_urls,false);
});
