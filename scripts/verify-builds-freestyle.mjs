#!/usr/bin/env node
// Static gate for builds/*.html Freestyle key-gating.
// Runs in .github/workflows/builds-freestyle-gate.yml on PRs that touch builds/**.
// Usage:
//   node scripts/verify-builds-freestyle.mjs [file-or-dir ...]   (default: builds/)
//   node scripts/verify-builds-freestyle.mjs --self-test
import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {join, extname} from 'node:path';

export const RULES = [
  {id: 'endpoint', desc: 'calls only https://api.anthropic.com/v1/messages', test: s => {
    const urls = s.match(/https:\/\/api\.anthropic\.com[^\s'"`)]*/g) || [];
    return urls.length > 0 && urls.every(u => u === 'https://api.anthropic.com/v1/messages');
  }},
  {id: 'x-api-key', desc: 'sends the key as x-api-key', test: s => /["']x-api-key["']\s*:/.test(s)},
  {id: 'anthropic-version', desc: 'sends anthropic-version 2023-06-01', test: s => /["']anthropic-version["']\s*:\s*["']2023-06-01["']/.test(s)},
  {id: 'browser-access', desc: 'declares anthropic-dangerous-direct-browser-access true', test: s => /["']anthropic-dangerous-direct-browser-access["']\s*:\s*["']true["']/.test(s)},
  {id: 'model', desc: 'every model value is claude-sonnet-5-5', test: s => {
    const models = [...s.matchAll(/model:\s*["']([^"']+)["']/g)].map(m => m[1]);
    return models.length > 0 && models.every(m => m === 'claude-sonnet-5-5');
  }},
  {id: 'per-tab-key', desc: 'reads the key from the per-tab #fsKey field', test: s => /#fsKey/.test(s)},
  {id: 'no-key-no-call', desc: 'refuses to call when no key is entered', test: s => /if\s*\(\s*!apiKey\s*\)/.test(s)},
  {id: 'no-hardcoded-key', desc: 'contains no Anthropic key literal', test: s => !/sk-ant-[A-Za-z0-9_-]{8,}/.test(s)},
  {id: 'key-not-persisted', desc: 'never writes the key to storage', test: s => !/(localStorage|sessionStorage)\.setItem\([^)]*apiKey/.test(s)},
];

function check(src) {
  return RULES.map(r => ({id: r.id, desc: r.desc, ok: !!r.test(src)}));
}

const GOOD = [
  "const apiKey = (qs('#fsKey')?.value || '').trim();",
  "if(!apiKey){ fsSetPlaceholder('Paste your Anthropic API key next to Generate.'); return; }",
  'const response = await fetch("https://api.anthropic.com/v1/messages", {',
  '  method: "POST",',
  '  headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },',
  '  body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1000 })',
  '});',
].join('\n');

const MUTANTS = [
  ['no-key-no-call', s => s.replace('if(!apiKey){', 'if(false){')],
  ['no-hardcoded-key', s => s + '\nconst k = "sk-ant-api03-TESTKEY0000000000";'],
  ['model', s => s.replace('claude-sonnet-5-5', 'claude-sonnet-4-6')],
  ['endpoint', s => s + '\nawait fetch("https://api.anthropic.com/v1/complete");'],
  ['key-not-persisted', s => s + "\nlocalStorage.setItem('k', apiKey);"],
  ['x-api-key', s => s.replace('"x-api-key": apiKey, ', '')],
];

function selfTest() {
  let bad = 0;
  for (const r of check(GOOD)) if (!r.ok) { console.log(`SELF-TEST FAIL good fixture fails ${r.id}`); bad++; }
  for (const [id, mutate] of MUTANTS) {
    const m = mutate(GOOD);
    if (m === GOOD) { console.log(`SELF-TEST FAIL mutant ${id} did not apply`); bad++; continue; }
    const failedIds = check(m).filter(r => !r.ok).map(r => r.id);
    if (failedIds.includes(id)) console.log(`SELF-TEST PASS mutant ${id} caught`);
    else { console.log(`SELF-TEST FAIL mutant ${id} not caught (failed: ${failedIds.join(',') || 'none'})`); bad++; }
  }
  return bad;
}

function listTargets(args) {
  const targets = args.length ? args : ['builds'];
  const files = [];
  for (const t of targets) {
    if (!existsSync(t)) continue;
    if (statSync(t).isDirectory()) files.push(...readdirSync(t).filter(f => extname(f) === '.html').sort().map(f => join(t, f)));
    else files.push(t);
  }
  return files;
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  const bad = selfTest();
  console.log(bad ? `self-test: ${bad} failure(s)` : 'self-test: all checks behave');
  process.exit(bad ? 1 : 0);
}
const files = listTargets(args.filter(a => !a.startsWith('--')));
if (!files.length) { console.log('no builds/*.html to verify'); process.exit(0); }
let failed = 0;
for (const f of files) {
  console.log(`\n${f}`);
  for (const r of check(readFileSync(f, 'utf8'))) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.desc}`);
    if (!r.ok) failed++;
  }
}
console.log(`\n${failed ? `FAILED: ${failed} check(s)` : 'PASSED'} across ${files.length} file(s)`);
process.exit(failed ? 1 : 0);
