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
  providerStateDeclaredRuntimeTruth: true,
  mainProtectionDeclaredProviderTruth: true,
}));
