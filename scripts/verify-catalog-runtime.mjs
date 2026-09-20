import assert from 'node:assert/strict';
import { buildCatalogRecipes, canonicalFamilies, compilePrompt, openPromptCard } from '../src/catalog-runtime/index.js';

function inputsFor(recipe) { return Object.fromEntries(recipe.inputs.map((key) => [key, `sample-${key}`])); }
const built = buildCatalogRecipes();
assert.equal(built.recipes.length, 5000, 'PromptOS catalog must contain exactly 5,000 selected recipes');
assert.ok(built.candidateCount > 5000, 'catalog must select from a larger valid candidate pool');
assert.equal(built.rejected.length, 0, 'canonical catalog candidates must not be rejected');
assert.equal(new Set(built.recipes.map((r) => r.id)).size, 5000, 'catalog recipe ids must be unique');

const familyCounts = new Map();
for (const recipe of built.recipes) {
  familyCounts.set(recipe.familyId, (familyCounts.get(recipe.familyId) ?? 0) + 1);
  const inputs = inputsFor(recipe);
  const compiled = compilePrompt(recipe, inputs);
  assert.equal(compiled.ok, true, `recipe failed compilation: ${recipe.id}`);
  assert.equal(compiled.readyToCopy, true, `recipe has missing inputs after complete input: ${recipe.id}`);
  assert.equal(compiled.provenance?.canonicalFamilyId, recipe.familyId, `provenance drift: ${recipe.id}`);
}
for (const familyId of Object.keys(canonicalFamilies)) assert.ok((familyCounts.get(familyId) ?? 0) >= 400, `family starved: ${familyId}`);

const repoRecipe = built.recipes.find((r) => r.familyId === 'repo.audit.first');
assert.ok(repoRecipe, 'repo.audit.first recipe missing');
const invalid = compilePrompt({ ...repoRecipe, platform: 'shopify' }, inputsFor(repoRecipe));
assert.equal(invalid.ok, false, 'invalid family/platform combination must fail closed');

const card = openPromptCard(repoRecipe, inputsFor(repoRecipe), {});
assert.equal(card.ok, true);
assert.equal(card.readyToCopy, true);
assert.equal(card.provenance?.canonicalFamilyId, 'repo.audit.first');

console.log(JSON.stringify({ status:'passed', owner:'jussray/promptos', runtime:'src/catalog-runtime', selected:built.recipes.length, candidates:built.candidateCount, families:Object.keys(canonicalFamilies).length, chiefEmbeddedCopyRequired:false }));
