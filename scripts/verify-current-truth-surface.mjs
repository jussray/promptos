import { readFile } from 'node:fs/promises';
import { buildCatalogRecipes } from '../src/catalog-runtime/index.js';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const built = buildCatalogRecipes();

const selected = built.recipes.length;
const curated = built.curatedCount;
const selectedLabel = selected.toLocaleString('en-US');
const curatedLabel = curated.toLocaleString('en-US');

const requiredClaims = [
  `**Current catalog:** ${curatedLabel} curated prompts inside ${selectedLabel} selected recipes.`,
  'PromptOS is Juss Ray\'s **standalone governed prompt, skill, instruction, and founder-intent system**.',
  'PromptOS, Chief AI Machine, SolContinuity, and Founder Control Room are complementary standalone peers',
  '**Permanent identity invariant:** PromptOS is one distinct, standalone product.',
  'PromptOS is not Chief AI Machine and is not Founder Control Room.',
  '**Independent operation:** PromptOS owns its own product name, source, catalog, instruction governance, workflow composition, interface, lifecycle, evidence, and failure state.',
  'Chief AI Machine and Founder Control Room are optional, contract-bound peers',
  '## Sauce Guard — public-safe by default',
  '**Current permission for the exact content, destination, and scope is required before sharing protected material.**',
  'Sauce Guard neither makes PromptOS a Chief subsystem nor places it inside FCR.',
  'Bundling with Founder Control Room does not collapse PromptOS product identity, runtime, authority, receipts, pricing truth, or evidence.',
  'Provider publication state is runtime truth, not repository inference.',
  'Provider branch-protection and ruleset state is runtime truth, not repository inference.',
  '`scripts/verify-pages-publication-source.mjs`',
  '`scripts/verify-main-push-authority.mjs`',
  '`scripts/verify-main-provider-protection.mjs`',
  'Merging `main` is not authorization to publish.',
];

const missing = requiredClaims.filter((claim) => !readme.includes(claim));
if (missing.length) {
  console.error('PromptOS current-truth surface verification failed:');
  for (const claim of missing) console.error(`- missing README claim: ${claim}`);
  process.exit(1);
}

const forbiddenHierarchyClaims = [
  'PromptOS is Juss Ray\'s governed prompt, skill, instruction, and founder-intent layer inside Founder Control Room.',
  '**Founder Control Room is the single founder operating system and product shell.**',
  '**PromptOS is the human-AI instruction governance layer inside FCR.**',
  '**Chief AI Machine is the governed cognition and proposal layer inside FCR.**',
  'PromptOS must compound FCR by default',
  'included-in-fcr',
];
const staleHierarchyClaims = forbiddenHierarchyClaims.filter((claim) => readme.includes(claim));
if (staleHierarchyClaims.length) {
  console.error('PromptOS current-truth surface verification failed: stale parent-product hierarchy returned.');
  for (const claim of staleHierarchyClaims) console.error(`- forbidden README claim: ${claim}`);
  process.exit(1);
}

const forbiddenIdentityPatterns = [
  /\bPromptOS\s+is\s+(?:a|an|the)\s+(?:Chief AI Machine|Founder Control Room|FCR)\s+(?:module|subsystem|feature|shell|layer)\b/i,
  /\b(?:Chief AI Machine|Founder Control Room|FCR)\s+(?:owns|contains|absorbs|hosts)\s+PromptOS\b/i,
  /\bPromptOS\s+(?:requires|depends on)\s+(?:Chief AI Machine|Founder Control Room|FCR)\s+(?:to|for)\s+(?:run|operate|function|its core capabilities)\b/i,
];
const invalidIdentityClaims = forbiddenIdentityPatterns.filter((pattern) => pattern.test(readme));
if (invalidIdentityClaims.length) {
  console.error('PromptOS current-truth surface verification failed: PromptOS identity became subordinate to Chief or FCR.');
  for (const pattern of invalidIdentityClaims) console.error(`- forbidden README pattern: ${pattern}`);
  process.exit(1);
}

if (/\bcurrent\s+catalog\b[^\n]*(?:159|248)\b/i.test(readme)) {
  console.error('PromptOS current-truth surface verification failed: README exposes a stale current catalog count.');
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  owner: 'jussray/promptos',
  selectedCatalog: selected,
  curatedCatalog: curated,
  readmeTruthBound: true,
  standaloneProductIdentityBound: true,
  independentIdentityAndSauceGuardBound: true,
  providerStateDeclaredRuntimeTruth: true,
  mainProtectionDeclaredProviderTruth: true,
}));
