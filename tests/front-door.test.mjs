import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../front-door/worker.mjs';

const home='https://promptos.jussco.company';

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
 assert.equal((await worker.fetch(new Request('https://promptos.foundercontrolroom.org/'))).status,404);
 assert.equal((await worker.fetch(new Request('https://foundercontrolroom.org/'))).status,404);
});

test('front-door routes cannot override Founder Control Room or PromptOS private origin',()=>{
 const config=JSON.parse(readFileSync(new URL('../wrangler.front-door.jsonc',import.meta.url),'utf8'));
 assert.deepEqual(config.routes.map(x=>x.pattern),['promptos.jussco.company/*']);
 assert.deepEqual(config.routes.map(x=>x.zone_name),['jussco.company']);
 assert.equal(config.preview_urls,false);
});

test('PromptOS crawl files expose only the canonical public URL', async()=>{
  for(const [path,contentType,pattern] of [
    ['/robots.txt', 'text/plain', /^User-agent: \*\nAllow: \/\n/m],
    ['/sitemap.xml', 'application/xml', /<loc>https:\/\/promptos\.jussco\.company\/<\/loc>/]
  ]) {
    const response=await worker.fetch(new Request(home+path));
    assert.equal(response.status,200,path);
    assert.match(response.headers.get('Content-Type'),new RegExp('^'+contentType),path);
    const body=await response.text();
    assert.match(body,pattern,path);
    assert.doesNotMatch(body,/\/admin|\/api\/private|checkout\.promptos/,path);
    const head=await worker.fetch(new Request(home+path,{method:'HEAD'}));
    assert.equal(head.status,200,path+' HEAD');
    assert.equal(await head.text(),'',path+' HEAD body');
    assert.equal((await worker.fetch(new Request('https://promptos.foundercontrolroom.org'+path))).status,404,path+' FCR host');
  }
  const robots=(await(await worker.fetch(new Request(home+'/robots.txt'))).text());
  assert.match(robots,/Sitemap: https:\/\/promptos\.jussco\.company\/sitemap\.xml/);
});

test('homepage identifies PromptOS by Juss & Co consistently with the public reference',async()=>{
  const response=await worker.fetch(new Request(home+'/'));
  const page=await response.text();
  const reference=readFileSync(new URL('../public-face.html',import.meta.url),'utf8');
  assert.equal(page.trim(),reference.trim());
  assert.match(page,/<link rel="canonical" href="https:\/\/promptos\.jussco\.company\/"\s*\/>/);
  assert.match(page,/<meta property="og:url" content="https:\/\/promptos\.jussco\.company\/"\s*\/>/);
  assert.match(page,/<title>PromptOS by Juss &amp; Co|<title>PromptOS by Juss & Co/);
  const match=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const schema=JSON.parse(match[1]);
  assert.equal(schema['@type'],'SoftwareApplication');
  assert.equal(schema.url,home+'/');
  assert.equal(schema.publisher.name,'Juss & Co');
  assert.equal(schema.publisher.url,'https://www.jussco.company/');
});
