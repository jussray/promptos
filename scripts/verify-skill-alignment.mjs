import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPortfolioManifest, resolveAppSkillSet, validatePortfolioManifest } from '../src/skill-registry/index.mjs';

const manifest = loadPortfolioManifest();
const audit = JSON.parse(await readFile(new URL('../src/skill-registry/repository-skill-audit.v1.json', import.meta.url), 'utf8'));
assert.deepEqual(validatePortfolioManifest(manifest), [], 'portfolio skill manifest must satisfy its contract');
assert.equal(manifest.apps.length, 18, 'registry must cover the currently declared 18 standalone app profiles');

for (const app of manifest.apps) {
  const resolved = resolveAppSkillSet(manifest, app.id);
  assert.equal(resolved.authorityOwner, app.id, `${app.id} must retain its own authority`);
  assert.equal(resolved.app.repository, app.repository);
  assert.equal(app.catalogStatus, 'proposed-awaiting-source-audit');
  assert.equal(app.ownedSkillsStatus, 'proposed-awaiting-source-audit');
  if (app.repository === null) assert.equal(app.repositoryStatus, 'unresolved');
  assert.equal(resolved.authority, 'catalog-and-compatibility-only');
  assert.equal(resolved.governanceAuthority, 'jussray/founder-control-room');
  assert.equal(resolved.skillContext, 'repository-operator-only');
  assert.equal(resolved.sourceAudit.record, app.id);
  assert.ok(['partial', 'unresolved'].includes(resolved.sourceAudit.status));
  assert.ok(resolved.sharedSkills.every((skill) => skill.audience === 'founder-operator' && skill.distribution === 'reference-only' && skill.scope === 'repository-operator-shared-reference'));
  assert.ok(resolved.ownedSkills.every((skill) => skill.scope === 'proposed-app-owned' && skill.status === 'proposed-awaiting-source-audit'));
  assert.equal(resolved.sharedSkills.length, 8, `${app.id} must resolve all declared shared references`);
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


assert.equal(audit.schemaVersion, '1.0');
assert.equal(audit.registry, 'promptos/repository-skill-audit');
assert.equal(audit.governance.authorityRepository, 'jussray/founder-control-room');
assert.equal(audit.governance.promptosBoundary, 'PromptOS owns catalog and compatibility resolution only. It must not create a competing approval, installation, execution, or distribution authority.');
assert.equal(audit.coverageStatus, 'partial', 'an initial search pass must not be mislabeled complete');
assert.ok(Array.isArray(audit.records) && audit.records.length >= 20);
assert.equal(audit.recursiveTreeRepositoryCount, 19);
assert.equal(audit.totalSkillFileInstances, 311);
for (const record of audit.records) {
  assert.ok(record.profile && record.inventoryStatus);
  if (record.repository === null) assert.equal(record.inventoryStatus, 'unresolved-repository');
  for (const skill of record.skillSources ?? []) {
    assert.ok(skill.id && skill.path && /^[0-9a-f]{40}$/.test(skill.blobSha), `source evidence must be pinned: ${record.repository}`);
  }
}
assert.equal(audit.retirementReview.localDevil.status, 'retired-as-a-separate-shared-operating-skill');
assert.equal(audit.retirementReview.localLeanBuildOrchestrator.status, 'retired-as-a-separate-shared-operating-skill');
const fcrAudit = audit.records.find((record) => record.repository === 'jussray/founder-control-room');
assert.ok(fcrAudit.skillSources.some((skill) => skill.id === 'devil' && skill.status === 'active'));
const promptosAudit = audit.records.find((record) => record.repository === 'jussray/promptos');
assert.ok(promptosAudit.skillSources.some((skill) => skill.id === 'local-socrates' && skill.status === 'question-led-only'));
assert.ok(promptosAudit.skillSources.some((skill) => skill.id === 'local-build'));
assert.ok(promptosAudit.skillSources.some((skill) => skill.id === 'local-minimal-token-protocol'));
assert.ok(audit.knownGaps.some((gap) => gap.includes('Full recursive tree inventory')));
assert.ok(audit.knownGaps.some((gap) => gap.includes('22 while local-cortex says twenty-seven')));
assert.ok(audit.records.some((record) => record.profile === 'drift' && record.repository === null));
const protectOne = resolveAppSkillSet(manifest, 'protect-me-model-one');
assert.equal(protectOne.app.repository, 'jussray/juss-protect-me');
assert.ok(protectOne.sourceAudit.repositories.includes('jussray/juss-protect-me'));
const protectTwo = resolveAppSkillSet(manifest, 'protect-me-model-two');
assert.equal(protectTwo.app.repository, 'jussray/juss-protect-me-2');
assert.ok(protectTwo.sourceAudit.repositories.includes('jussray/juss-protect-me-2'));
for (const record of audit.records.filter((entry) => entry.treeSnapshot)) {
  assert.equal(record.treeSnapshot.truncated, false, `tree snapshot must be complete: ${record.repository}`);
  assert.equal(record.treeSnapshot.skillCount, record.treeSnapshot.skillFiles.length, `tree skill count mismatch: ${record.repository}`);
  assert.ok(record.treeSnapshot.skillFiles.every((entry) => entry.path.endsWith('/SKILL.md') && /^[0-9a-f]{40}$/.test(entry.blobSha)));
}
assert.equal(audit.records.find((record) => record.profile === 'protect-me-model-one').treeSnapshot.skillCount, 1);
assert.equal(audit.records.find((record) => record.profile === 'protect-me-model-two').treeSnapshot.skillCount, 3);
for (const id of ['sekret-bip-parent-side','untold-stories-storefront','makevideo','steel-city-game']) {
  const resolved = resolveAppSkillSet(manifest, id);
  assert.equal(resolved.app.id, id);
  assert.equal(resolved.sourceAudit.status, 'partial');
}
assert.equal(resolveAppSkillSet(manifest, 'sekret-bip-parent-side').app.repository, 'jussray/Sekret-Bip-Parents');
assert.equal(resolveAppSkillSet(manifest, 'untold-stories-storefront').app.repository, 'jussray/untold-stories-storefront');
assert.equal(resolveAppSkillSet(manifest, 'makevideo').app.repository, 'jussray/make-video-');
assert.equal(resolveAppSkillSet(manifest, 'steel-city-game').app.repository, 'jussray/steel-city');
assert.ok(manifest.sharedSkillMirrors.some((mirror) => mirror.repository === 'jussray/jussray' && mirror.authority === 'export-mirror-not-canonical'));
assert.ok(manifest.additionalSkillLibraries.every((library) => library.executionAllowed === false && library.autoFetch === false && library.autoHandoff === false));
assert.ok(audit.records.find((record) => record.repository === 'jussray/Sekret-Bip-Parents').skillSources.some((skill) => skill.status === 'legacy-archive-only'));
assert.ok(audit.records.find((record) => record.repository === 'jussray/Bip-Jr').notes.some((note) => note.includes('investigate-only')));
assert.equal(audit.canonicalSharedSkillReconciliationSummary.total, 8);
assert.equal(audit.canonicalSharedSkillReconciliationSummary.exactCopies, 3);
assert.equal(audit.canonicalSharedSkillReconciliationSummary.byteDifferent, 5);
assert.ok(audit.devilCommandReconciliation.activeProviders.some((skill) => skill.repository === 'jussray/ULTRATHINK-' && skill.trigger === '/devil'));
assert.ok(audit.devilCommandReconciliation.activeProviders.some((skill) => skill.repository === 'jussray/founder-control-room' && skill.status === 'active'));
assert.ok(audit.devilCommandReconciliation.localSocratesEvidence.classification.includes('question-led'));
assert.ok(audit.devilCommandReconciliation.separateMedusaBoundary.note.includes('does not claim bare /devil'));
assert.ok(audit.governance.externalSkillIntake.behavior.includes('QUARANTINED'));
assert.ok(audit.governance.skillSourceManifest.behavior.includes('tool exposure remains false'));
console.log(`Repository skill audit loaded: ${audit.records.length} repository records; coverage remains explicitly partial.`);
