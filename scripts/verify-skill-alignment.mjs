import assert from 'node:assert/strict';
import { loadPortfolioManifest, resolveAppSkillSet, validatePortfolioManifest } from '../src/skill-registry/index.mjs';

const manifest = loadPortfolioManifest();
assert.deepEqual(validatePortfolioManifest(manifest), [], 'portfolio skill manifest must satisfy its contract');
assert.equal(manifest.apps.length, 12, 'registry must cover the currently declared 12 standalone apps');

for (const app of manifest.apps) {
  const resolved = resolveAppSkillSet(manifest, app.id);
  assert.equal(resolved.authorityOwner, app.id, `${app.id} must retain its own authority`);
  assert.equal(resolved.app.repository, app.repository);
  assert.equal(app.catalogStatus, 'proposed-awaiting-source-audit');
  assert.equal(app.ownedSkillsStatus, 'proposed-awaiting-source-audit');
  if (app.repository === null) assert.equal(app.repositoryStatus, 'unresolved');
  assert.equal(resolved.authority, 'catalog-and-compatibility-only');
  assert.equal(resolved.sharedSkills.length, 8, `${app.id} must resolve all six shared references`);
  assert.ok(resolved.sharedSkills.every((skill) => skill.resolution === 'source-path-verified' && /^[0-9a-f]{40}$/.test(skill.sourceRevision)), `${app.id} shared source refs must be pinned`);
  assert.ok(resolved.ownedSkills.length > 0, `${app.id} must declare app-specific skills`);
  assert.ok(resolved.compatibility.surfaces.length > 0);
}

assert.equal(manifest.apps.find((app) => app.id === 'juss-beautiful-hair').repository, 'jussray/Juss-beautiful-hair-');
assert.equal(manifest.apps.find((app) => app.id === 'games-hub').repository, null, 'unverified Games Hub repository must not be invented');
assert.equal(manifest.apps.find((app) => app.id === 'drift').repository, null, 'unverified DRIFT repository must not be invented');

const chief = resolveAppSkillSet(manifest, 'chief-ai-machine');
assert.ok(chief.ownedSkills.some((skill) => skill.id === 'agent-orchestration'));
assert.ok(!chief.ownedSkills.some((skill) => skill.id === 'founder-authorization'));

const fcr = resolveAppSkillSet(manifest, 'founder-control-room');
assert.ok(fcr.ownedSkills.some((skill) => skill.id === 'founder-authorization'));
assert.ok(!fcr.ownedSkills.some((skill) => skill.id === 'agent-orchestration'));

const bip = resolveAppSkillSet(manifest, 'sekret-bip');
assert.ok(bip.ownedSkills.some((skill) => skill.id === 'teen-privacy'));
assert.ok(bip.ownedSkills.some((skill) => skill.id === 'guardian-consent'));

const mutated = structuredClone(manifest);
mutated.apps[1].authorityOwner = 'founder-control-room';
assert.ok(validatePortfolioManifest(mutated).some((error) => error.includes('authority owner mismatch')));

const duplicate = structuredClone(manifest);
duplicate.apps.push(structuredClone(duplicate.apps[0]));
assert.ok(validatePortfolioManifest(duplicate).some((error) => error.includes('duplicate app id')));

const escalation = structuredClone(manifest);
escalation.sharedSkills[0].authority = 'execute';
assert.ok(validatePortfolioManifest(escalation).some((error) => error.includes('exceeds advisory authority')));

const unknownReference = structuredClone(manifest);
unknownReference.apps[0].sharedSkills.push('not-a-real-shared-skill');
assert.ok(validatePortfolioManifest(unknownReference).some((error) => error.includes('unknown shared skill')));

assert.throws(() => resolveAppSkillSet(manifest, 'unknown-app'), /Unknown app/);
console.log(`Skill alignment verified: ${manifest.apps.length} apps, ${manifest.sharedSkills.length} shared skill references, app-specific ownership and authority boundaries.`);
