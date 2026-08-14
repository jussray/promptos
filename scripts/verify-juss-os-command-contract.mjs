import { readFile } from 'node:fs/promises';

const entrypoint = await readFile('AGENTS_FOUNDER_INTELLIGENCE.md', 'utf8');
const rootAgents = await readFile('AGENTS.md', 'utf8');

const commands = [
  '/goalfix',
  '/ultrathink',
  '/truthmode',
  '/confess',
  '/redteam',
  '/lindymode',
  '/ooda',
  '/visualize',
];

const checks = [
  ...commands.map((command) => [`canonical command ${command} is documented`, entrypoint.includes(command)]),
  ['portable commands are reasoning/planning/routing only', /reasoning, planning, and routing modes only/.test(entrypoint)],
  ['portable commands cannot grant privileged execution', /do not grant authority to execute, merge, deploy, publish, send externally/.test(entrypoint)],
  ['visualize remains non-mutating', /\/visualize[\s\S]+does not mutate PromptOS, providers, infrastructure, or production state/.test(entrypoint)],
  ['stricter PromptOS authority wins', /If a portable command conflicts with a stricter PromptOS rule, the stricter rule wins/.test(entrypoint)],
  ['remembrance loop remains intact', /\/human[\s\S]+\/futureyou[\s\S]+\/truthmode[\s\S]+\/confess[\s\S]+\/billgates[\s\S]+\/elonmusk/.test(entrypoint)],
  ['root agent entrypoint still requires Founder Intelligence', /AGENTS_FOUNDER_INTELLIGENCE\.md/.test(rootAgents)],
  ['root merge authority remains exact-head gated', /exact head SHA/.test(rootAgents)],
  ['separate privileged gates remain explicit', /Do not deploy, roll back production, run destructive migrations, alter auth\/RLS, rotate or expose secrets/.test(rootAgents)],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('PromptOS Juss OS command contract verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`PromptOS Juss OS command contract verification passed (${checks.length} checks).`);
