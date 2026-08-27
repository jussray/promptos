import { readFile } from 'node:fs/promises';

const entrypoint = await readFile('AGENTS_FOUNDER_INTELLIGENCE.md', 'utf8');
const rootAgents = await readFile('AGENTS.md', 'utf8');
const productBoundary = JSON.parse(await readFile('.control-room/product-boundary.json', 'utf8'));

const commands = [
  '/goalfix',
  '/ultrathink',
  '/truthmode',
  '/confess',
  '/redteam',
  '/lindymode',
  '/ooda',
  '/visualize',
  '/plan',
  '/goal',
  '/loop',
  '/resume',
  '/compact',
  '/btw',
  '/effort',
  '/lens',
  '/pack',
];

const requiredPortableIds = [
  'plan',
  'goal',
  'loop',
  'resume',
  'compact',
  'btw',
  'effort',
  'lens',
  'pack',
];

const grammar = productBoundary?.portableGrammar;
const grammarCommands = Array.isArray(grammar?.commands) ? grammar.commands : [];
const grammarIds = grammarCommands.map((command) => command?.id);

const checks = [
  ...commands.map((command) => [`canonical command ${command} is documented`, entrypoint.includes(command)]),
  ['portable grammar contract is v1', grammar?.contract === 'promptos/portable-grammar@v1'],
  ['portable grammar is advisory only', grammar?.authority === 'advisory-only'],
  ['portable grammar is provider neutral', grammar?.providerNeutral === true],
  ['portable grammar has exactly the required workflow semantics',
    grammarIds.length === requiredPortableIds.length
      && new Set(grammarIds).size === grammarIds.length
      && requiredPortableIds.every((id) => grammarIds.includes(id))],
  ['every portable semantic has a non-empty definition',
    grammarCommands.every((command) => typeof command?.semantics === 'string' && command.semantics.trim().length > 20)],
  ['reasoning lenses are declared as examples',
    Array.isArray(grammar?.reasoningLensExamples) && grammar.reasoningLensExamples.includes('ultrathink') && grammar.reasoningLensExamples.includes('ooda')],
  ['prompt pack classes are data declarations',
    Array.isArray(grammar?.promptPackClasses) && grammar.promptPackClasses.includes('social-strategy') && grammar.promptPackClasses.includes('website-workflow')],
  ['portable commands are reasoning/planning/routing only', /reasoning, planning, and routing modes only/.test(entrypoint)],
  ['portable commands cannot grant privileged execution', /do not grant authority to execute, merge, deploy, publish, send externally/.test(entrypoint)],
  ['provider-neutral semantics do not claim vendor-native slash commands', /do not claim that Anthropic, OpenAI, or another provider implements a native slash command/.test(entrypoint)],
  ['visualize remains non-mutating', /\/visualize[\s\S]+does not mutate PromptOS, providers, infrastructure, or production state/.test(entrypoint)],
  ['btw preserves the active goal and authority', /\/btw[\s\S]+cannot silently change the active goal, plan, authority, or continuity state/.test(entrypoint)],
  ['effort cannot widen authority', /\/effort[\s\S]+cannot widen authority/.test(entrypoint)],
  ['resume requires current fingerprints', /\/resume[\s\S]+reacquire current fingerprints/.test(entrypoint)],
  ['lens forbids private chain-of-thought requirements', /\/lens[\s\S]+do not require private chain-of-thought/.test(entrypoint)],
  ['pack requires observed runtime availability', /\/pack[\s\S]+until runtime availability is observed/.test(entrypoint)],
  ['state movement invalidates predecessor proof', /changed repository head, provider state, proposal fingerprint[\s\S]+invalidates predecessor proof/.test(entrypoint)],
  ['PromptOS does not persist private chain-of-thought', /does not persist or require private chain-of-thought/.test(entrypoint)],
  ['grammar rules forbid authority widening',
    Array.isArray(grammar?.rules) && grammar.rules.some((rule) => /No command, lens, or prompt pack grants execution/.test(rule))],
  ['grammar rules require observed runtime availability',
    Array.isArray(grammar?.rules) && grammar.rules.some((rule) => /availability must be observed before execution is claimed/.test(rule))],
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
