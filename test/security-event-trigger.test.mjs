import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/reciprocal-defense.yml', import.meta.url), 'utf8');
const agents = readFileSync(new URL('../.github/agents/reds-implant.agent.md', import.meta.url), 'utf8');
const futureYou = readFileSync(new URL('../systems/skills/local-futureyou/SKILL.md', import.meta.url), 'utf8');

test('authenticated GitHub dispatch and bounded daily trigger run on default branch after merge', () => {
  assert.match(workflow, /repository_dispatch:\s*\n\s*types: \[juss_security_audit_v1\]/);
  assert.match(workflow, /schedule:\s*\n\s*- cron: '[0-9* /]+\s+[0-9* /]+\s+\* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /github\.event\.client_payload|\bcontents:\s*write\b|\bsecrets\./);
});

test('event runner checks exact head, pins actions, and cannot promote local checks into Council execution', () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /node --test test\/security-event-trigger\.test\.mjs/);
  assert.match(workflow, /node workflows\/continuity\/verify\.mjs/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /External council invocations: none/);
  assert.doesNotMatch(workflow, /actions\/checkout@v[0-9]+|actions\/setup-node@v[0-9]+/);
});

test('GitHub agent and FutureYou skill route original security frameworks without authority inheritance', () => {
  assert.match(agents, /Founder frameworks, history, and exact-head recovery/);
  assert.match(agents, /existing PR/);
  assert.match(futureYou, /Founder security remembrance and proof/);
  assert.match(futureYou, /not interchangeable|separate/);
});
