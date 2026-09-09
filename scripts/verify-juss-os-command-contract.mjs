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
  '/make',
  '/loop',
  '/resume',
  '/compact',
  '/btw',
  '/effort',
  '/lens',
  '/pack',
];

const requiredPortableContracts = [
  {
    id: 'plan',
    semantics: 'Produce a bounded plan with dependencies, proof, rollback, stop conditions, and next gate without executing it.',
    documentation: '- `/plan`: produce a bounded plan with dependencies, proof, rollback, stop conditions, and a next gate. Planning is not execution.',
  },
  {
    id: 'goal',
    semantics: 'Normalize intent into a goal, constraints, definition of done, evidence requirements, and authority ceiling.',
    documentation: '- `/goal`: normalize intent into a goal, constraints, definition of done, evidence requirements, and an authority ceiling.',
  },
  {
    id: 'make',
    semantics: 'Compile a current founder intent or repeated approved pattern into a reusable versioned workflow draft using the current mission contract; preserve the intent and authority ceiling, preview before registration, and require explicit founder approval before registry promotion.',
    documentation: '- `/make`: compile a current founder intent or repeated approved pattern into a reusable versioned workflow draft using the current mission contract; preserve the intent and authority ceiling, preview before registration, and require explicit founder approval before registry promotion.',
  },
  {
    id: 'loop',
    semantics: 'Re-observe current state, compare it with the expected state, adapt the next bounded move, and invalidate stale evidence after state movement.',
    documentation: '- `/loop`: re-observe current state, compare expected and observed state, adapt the next bounded move, and invalidate stale evidence after state movement.',
  },
  {
    id: 'resume',
    semantics: 'Reacquire current fingerprints and continuity evidence before continuing prior work; prior proof never carries across changed state.',
    documentation: '- `/resume`: reacquire current fingerprints and continuity evidence before continuing prior work. Prior proof never carries across changed state.',
  },
  {
    id: 'compact',
    semantics: 'Compress working context while preserving decisions, exact fingerprints, evidence, blockers, authority boundaries, rollback, and unresolved unknowns.',
    documentation: '- `/compact`: compress working context while preserving decisions, exact fingerprints, evidence, blockers, authority boundaries, rollback, and unresolved unknowns.',
  },
  {
    id: 'btw',
    semantics: 'Answer a side question in isolation without silently changing the active goal, plan, authority, or continuity state.',
    documentation: '- `/btw`: answer a side question in isolation. It cannot silently change the active goal, plan, authority, or continuity state.',
  },
  {
    id: 'effort',
    semantics: 'Declare requested reasoning depth, time, or cost budget as planning metadata; effort may change analysis depth but never authority.',
    documentation: '- `/effort`: declare requested reasoning depth, time, or cost budget as planning metadata. More effort may deepen analysis but cannot widen authority.',
  },
  {
    id: 'lens',
    semantics: 'Request a named reasoning lens as advisory metadata and return conclusions, evidence, tradeoffs, and decisions without requiring private chain-of-thought or impersonating a named person.',
    documentation: '- `/lens`: request a named reasoning lens as advisory metadata. Return conclusions, evidence, tradeoffs, and decisions; do not require private chain-of-thought and do not impersonate a named person.',
  },
  {
    id: 'pack',
    semantics: 'Invoke a declared versioned prompt pack by identifier; a pack cannot widen authority and cannot be claimed as installed or executed until its runtime availability is observed.',
    documentation: '- `/pack`: invoke a declared, versioned prompt pack by identifier. A pack cannot widen authority and cannot be described as installed or executed until runtime availability is observed.',
  },
];

const grammar = productBoundary?.portableGrammar;
const grammarCommands = Array.isArray(grammar?.commands) ? grammar.commands : [];
const grammarIds = grammarCommands.map((command) => command?.id);
const requiredPortableIds = requiredPortableContracts.map(({id}) => id);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExactCommandToken(text, command) {
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegex(command)}(?![A-Za-z0-9_-])`, 'm').test(text);
}

const checks = [
  ...commands.map((command) => [`canonical command ${command} is documented as a complete token`, hasExactCommandToken(entrypoint, command)]),
  ['portable grammar contract is v1', grammar?.contract === 'promptos/portable-grammar@v1'],
  ['portable grammar is advisory only', grammar?.authority === 'advisory-only'],
  ['portable grammar is provider neutral', grammar?.providerNeutral === true],
  ['portable grammar has exactly the required workflow semantics',
    grammarIds.length === requiredPortableIds.length
      && new Set(grammarIds).size === grammarIds.length
      && grammarIds.every((id, index) => id === requiredPortableIds[index])],
  ['machine-readable portable semantics match the canonical definitions',
    requiredPortableContracts.every(({id, semantics}) => grammarCommands.find((command) => command?.id === id)?.semantics === semantics)],
  ['documented portable semantics match the canonical definitions',
    requiredPortableContracts.every(({documentation}) => entrypoint.includes(documentation))],
  ['reasoning lenses are declared as examples',
    Array.isArray(grammar?.reasoningLensExamples) && grammar.reasoningLensExamples.includes('ultrathink') && grammar.reasoningLensExamples.includes('ooda')],
  ['prompt pack classes are data declarations',
    Array.isArray(grammar?.promptPackClasses) && grammar.promptPackClasses.includes('social-strategy') && grammar.promptPackClasses.includes('website-workflow')],
  ['portable commands are reasoning/planning/routing only', /reasoning, planning, and routing modes only/.test(entrypoint)],
  ['portable commands cannot grant privileged execution', /do not grant authority to execute, merge, deploy, publish, send externally/.test(entrypoint)],
  ['provider-neutral semantics do not claim vendor-native slash commands', /do not claim that Anthropic, OpenAI, or another provider implements a native slash command/.test(entrypoint)],
  ['visualize remains non-mutating', /\/visualize[\s\S]+does not mutate PromptOS, providers, infrastructure, or production state/.test(entrypoint)],
  ['make preserves founder intent and approval gate', /\/make[\s\S]+preserve the intent and authority ceiling[\s\S]+explicit founder approval before registry promotion/.test(entrypoint)],
  ['make cannot self-register', /newly compiled workflow remains `draft`, cannot self-register/.test(entrypoint)],
  ['machine-readable grammar blocks workflow self-registration',
    Array.isArray(grammar?.rules) && grammar.rules.some((rule) => /cannot self-register/.test(rule) && /explicit founder approval/.test(rule))],
  ['btw preserves the active goal and authority', /\/btw[\s\S]+cannot silently change the active goal, plan, authority, or continuity state/.test(entrypoint)],
  ['effort cannot widen authority', /\/effort[\s\S]+cannot widen authority/.test(entrypoint)],
  ['resume requires current fingerprints', /\/resume[\s\S]+reacquire current fingerprints/.test(entrypoint)],
  ['lens forbids private chain-of-thought requirements', /\/lens[\s\S]+do not require private chain-of-thought/.test(entrypoint)],
  ['pack requires observed runtime availability', /\/pack[\s\S]+until runtime availability is observed/.test(entrypoint)],
  ['state movement invalidates predecessor proof', /changed repository head, provider state, proposal fingerprint[\s\S]+invalidates predecessor proof/.test(entrypoint)],
  ['PromptOS does not persist private chain-of-thought', /does not persist or require private chain-of-thought/.test(entrypoint)],
  ['human voice audit is density based', entrypoint.includes('Use a density-based voice audit:')],
  ['human voice audit does not infer authorship from style', entrypoint.includes('density signal, never as proof of AI authorship')],
  ['human voice audit forbids blacklist heuristics', entrypoint.includes('Do not use banned-word or banned-punctuation lists.')],
  ['human voice audit requires epistemic cleanup', entrypoint.includes('Vague authority must receive a real source, be explicitly qualified, or be removed.')],
  ['human voice audit forbids fabricated humanity', entrypoint.includes('Do not invent personal experience, personal opinion, certainty, or emotional texture')],
  ['human voice audit preserves unaffected voice', entrypoint.includes('rewrite only the spans that create a synthetic cluster or weaken truth')],
  ['human voice audit is explicitly not a detector', entrypoint.includes('This audit is a writing-quality control, not an AI detector.')],
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
