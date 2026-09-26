import assert from 'node:assert/strict';
import {
  adversarialChallengePrompts,
  buildCatalogRecipes,
  builderPrompts,
  canonicalFamilies,
  compilePrompt,
  deepReasoningPrompts,
  openPromptCard,
  workflowPrompts,
} from '../src/catalog-runtime/index.js';

function inputsFor(recipe) { return Object.fromEntries(recipe.inputs.map((key) => [key, `sample-${key}`])); }
function normalized(value) { return value.toLowerCase().replace(/\s+/g, ' ').trim(); }

const built = buildCatalogRecipes();
assert.equal(built.recipes.length, 5000, 'PromptOS catalog must contain exactly 5,000 selected recipes');
assert.ok(built.candidateCount > 5000, 'catalog must select from a larger valid candidate pool');
assert.equal(built.rejected.length, 0, 'canonical catalog candidates must not be rejected');
assert.equal(new Set(built.recipes.map((r) => r.id)).size, 5000, 'catalog recipe ids must be unique');

assert.equal(builderPrompts.length, 200, 'PromptOS must expose exactly 200 curated builder prompts');
assert.equal(workflowPrompts.length, 48, 'PromptOS must expose exactly 48 implicit workflow prompts');
assert.equal(deepReasoningPrompts.length, 24, 'PromptOS must expose exactly 24 deep reasoning triggers');
assert.equal(adversarialChallengePrompts.length, 24, 'PromptOS must expose exactly 24 adversarial challenge triggers');
assert.equal(built.curatedCount, 248, 'all curated prompts must be pinned into the selected catalog');
assert.equal(built.curatedBuilderCount, 200, 'builder curated count drifted');
assert.equal(built.curatedWorkflowCount, 48, 'workflow curated count drifted');
assert.equal(new Set(builderPrompts.map((recipe) => recipe.id)).size, 200, 'builder prompt ids must be unique');
assert.equal(new Set(builderPrompts.map((recipe) => normalized(recipe.instructions))).size, 200, 'builder prompt instructions must be semantically distinct at the normalized text level');
assert.equal(new Set(workflowPrompts.map((recipe) => recipe.id)).size, 48, 'workflow prompt ids must be unique');
assert.equal(new Set(workflowPrompts.map((recipe) => normalized(recipe.instructions))).size, 48, 'workflow prompt instructions must be semantically distinct at the normalized text level');

const bannedBuilderPhrases = [
  'disable auth',
  'skip tests',
  'ignore errors',
  'hardcode secret',
  'fake proof',
  'pretend it works',
];
for (const recipe of builderPrompts) {
  assert.ok(recipe.instructions.length >= 500, `builder recipe is too thin: ${recipe.id}`);
  assert.match(recipe.instructions, /Done when:/, `builder recipe lacks explicit done condition: ${recipe.id}`);
  assert.match(recipe.instructions, /local-first behavior/, `builder recipe lacks local-first default: ${recipe.id}`);
  for (const phrase of bannedBuilderPhrases) assert.ok(!normalized(recipe.instructions).includes(phrase), `unsafe builder phrase "${phrase}" in ${recipe.id}`);
}

const hiddenWorkflowNames = ['ultrathink','attack-ten','attack ten','attack6000','attack 6000'];
for (const recipe of workflowPrompts) {
  assert.ok(recipe.instructions.length >= 700, `workflow recipe is too thin: ${recipe.id}`);
  const publicSurface = normalized(`${recipe.title} ${recipe.description} ${recipe.instructions}`);
  for (const hiddenName of hiddenWorkflowNames) {
    assert.ok(!publicSurface.includes(hiddenName), `workflow nickname leaked into visible prompt surface: ${recipe.id} -> ${hiddenName}`);
  }
  assert.ok(Array.isArray(recipe.workflowLineage) && recipe.workflowLineage.length > 0, `workflow lineage missing: ${recipe.id}`);
}
for (const recipe of deepReasoningPrompts) assert.deepEqual(recipe.workflowLineage, ['ultrathink@1.6'], `deep lineage drift: ${recipe.id}`);
for (const recipe of adversarialChallengePrompts) assert.deepEqual(recipe.workflowLineage, ['attack-ten','attack6000'], `adversarial lineage drift: ${recipe.id}`);

const selectedIds = new Set(built.recipes.map((recipe) => recipe.id));
for (const recipe of builderPrompts) assert.ok(selectedIds.has(recipe.id), `curated builder recipe was dropped: ${recipe.id}`);
for (const recipe of workflowPrompts) assert.ok(selectedIds.has(recipe.id), `curated workflow recipe was dropped: ${recipe.id}`);

const familyCounts = new Map();
for (const recipe of built.recipes) {
  familyCounts.set(recipe.familyId, (familyCounts.get(recipe.familyId) ?? 0) + 1);
  const inputs = inputsFor(recipe);
  const compiled = compilePrompt(recipe, inputs);
  assert.equal(compiled.ok, true, `recipe failed compilation: ${recipe.id}`);
  assert.equal(compiled.readyToCopy, true, `recipe has missing inputs after complete input: ${recipe.id}`);
  assert.equal(compiled.provenance?.canonicalFamilyId, recipe.familyId, `provenance drift: ${recipe.id}`);
  if (recipe.familyId === 'application.builder') {
    assert.match(compiled.prompt, /RECIPE BUILD BRIEF/, `builder instructions were not compiled: ${recipe.id}`);
    if (recipe.requiresUiProof) assert.ok(compiled.provenance.appliedClauseIds.includes('verification.playwright-if-ui'), `UI builder recipe lacks Playwright proof: ${recipe.id}`);
  }
  if (recipe.workflowLineage?.length) {
    assert.deepEqual(compiled.provenance.workflowLineage, recipe.workflowLineage, `compiled workflow lineage drift: ${recipe.id}`);
    const compiledVisible = normalized(compiled.prompt);
    for (const hiddenName of hiddenWorkflowNames) assert.ok(!compiledVisible.includes(hiddenName), `workflow nickname leaked into compiled prompt: ${recipe.id} -> ${hiddenName}`);
  }
}
for (const [familyId, family] of Object.entries(canonicalFamilies)) {
  const count = familyCounts.get(familyId) ?? 0;
  if (family.seedOnly) assert.equal(count, family.seedCount, `seed-only family count drift: ${familyId}`);
  else assert.ok(count >= 400, `family starved: ${familyId}`);
}

const repoRecipe = built.recipes.find((r) => r.familyId === 'repo.audit.first');
assert.ok(repoRecipe, 'repo.audit.first recipe missing');
const invalid = compilePrompt({ ...repoRecipe, platform: 'shopify' }, inputsFor(repoRecipe));
assert.equal(invalid.ok, false, 'invalid family/platform combination must fail closed');

const card = openPromptCard(repoRecipe, inputsFor(repoRecipe), {});
assert.equal(card.ok, true);
assert.equal(card.readyToCopy, true);
assert.equal(card.provenance?.canonicalFamilyId, 'repo.audit.first');

const builderCard = openPromptCard(builderPrompts[0], inputsFor(builderPrompts[0]), {});
assert.equal(builderCard.ok, true);
assert.equal(builderCard.readyToCopy, true);
assert.match(builderCard.preview, /RECIPE BUILD BRIEF/);

const deepCard = openPromptCard(deepReasoningPrompts[0], inputsFor(deepReasoningPrompts[0]), {});
assert.equal(deepCard.ok, true);
assert.equal(deepCard.readyToCopy, true);
assert.deepEqual(deepCard.provenance?.workflowLineage, ['ultrathink@1.6']);

const challengeCard = openPromptCard(adversarialChallengePrompts[0], inputsFor(adversarialChallengePrompts[0]), {});
assert.equal(challengeCard.ok, true);
assert.equal(challengeCard.readyToCopy, true);
assert.deepEqual(challengeCard.provenance?.workflowLineage, ['attack-ten','attack6000']);

console.log(JSON.stringify({
  status:'passed',
  owner:'jussray/promptos',
  runtime:'src/catalog-runtime',
  selected:built.recipes.length,
  candidates:built.candidateCount,
  families:Object.keys(canonicalFamilies).length,
  curatedBuilders:builderPrompts.length,
  implicitDeepReasoningTriggers:deepReasoningPrompts.length,
  implicitAdversarialTriggers:adversarialChallengePrompts.length,
  visibleWorkflowNameLeaks:0,
  chiefEmbeddedCopyRequired:false
}));
