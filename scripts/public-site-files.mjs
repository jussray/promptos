// Exact allowlist of files copied into the public PromptOS artifact (_site).
// Kept as data so the staging script and its self-tests share one source.
// scripts/staged-reference-check.mjs fails staging if any staged file
// references a local path that is missing from this list.
export const PUBLIC_SITE_FILES = Object.freeze([
  'index.html',
  'parts/auth.js',
  'parts/billing.js',
  'parts/p05-new-prompts.js',
  'parts/p06-gap-prompts.js',
  'parts/p07-ship-ultrathink-skills.js',
  'parts/p08-cont-redteam.js',
  'parts/p09-cont-design.js',
  'parts/p10-cont-ops-growth.js',
  'parts/p11-make-ui.mjs',
  'parts/app.js',
  'src/workflow-artifact.mjs',
  'src/prompt-memory.js',
  'src/prompt-memory-ui.js',
  'src/catalog-ui.js',
  'src/catalog-runtime/index.js',
  'src/catalog-runtime/openPromptCard.js',
  'src/catalog-runtime/catalog/buildCatalog.js',
  'src/catalog-runtime/catalog/builderPrompts.js',
  'src/catalog-runtime/catalog/workflowPrompts.js',
  'src/catalog-runtime/catalog/researchExpansionPrompts.js',
  'src/catalog-runtime/catalog/clauses.js',
  'src/catalog-runtime/catalog/compatibility.js',
  'src/catalog-runtime/catalog/families.js',
  'src/catalog-runtime/compiler/compilePrompt.js',
  'src/catalog-runtime/compiler/platformAdapters.js',
  'styles/catalog.css',
  'styles/cinematic-direction.css',
]);
