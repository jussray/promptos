import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPortfolioManifest, resolveAppSkillSet, validatePortfolioManifest, validateRepositorySkillAudit } from '../src/skill-registry/index.mjs';

const manifest = loadPortfolioManifest();
const audit = JSON.parse(await readFile(new URL('../src/skill-registry/repository-skill-audit.v1.json', import.meta.url), 'utf8'));
assert.deepEqual(validatePortfolioManifest(manifest), [], 'portfolio skill manifest must satisfy its contract');
assert.deepEqual(validateRepositorySkillAudit(audit), [], 'repository skill inventory must have pinned, classified source evidence');
assert.equal(manifest.apps.length, 14, 'registry must cover the currently declared 14 standalone apps');

for (const app of manifest.apps) {
  const resolved = resolveAppSkillSet(manifest, app.id, audit);
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
  assert.ok(Array.isArray(resolved.sourceInventory.records));
  assert.ok(Array.isArray(resolved.sourceInventory.skills));
  assert.ok(resolved.sourceInventory.skills.every((skill) =>
    app.sourceAuditRepositories.includes(skill.sourceRepository) &&
    skill.sourcePath.endsWith('/SKILL.md') &&
    /^[0-9a-f]{40}$/.test(skill.blobSha) &&
    skill.status &&
    skill.classification
  ), `${app.id} source inventory must retain repository, path, blob SHA, status and classification`);
  assert.ok(resolved.sourceInventory.records.every((record) => app.sourceAuditRepositories.includes(record.repository)));
}

assert.equal(manifest.apps.find((app) => app.id === 'juss-beautiful-hair').repository, 'jussray/Juss-beautiful-hair-');
assert.equal(manifest.apps.find((app) => app.id === 'games-hub').repository, 'jussray/jussray', 'Games Hub belongs to the canonical Juss & Co. workspace');
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

const protectOne = resolveAppSkillSet(manifest, 'protect-me-model-one');
assert.ok(protectOne.ownedSkills.some((skill) => skill.id === 'medusa'));
assert.equal(protectOne.authorityOwner, 'protect-me-model-one');
assert.ok(!protectOne.ownedSkills.some((skill) => skill.id === 'protect-me-contract'));

const protectTwo = resolveAppSkillSet(manifest, 'protect-me-model-two');
assert.ok(protectTwo.ownedSkills.some((skill) => skill.id === 'medusa'));
assert.ok(protectTwo.ownedSkills.some((skill) => skill.id === 'protect-me-contract'));
assert.ok(protectTwo.ownedSkills.some((skill) => skill.id === 'protect-me-juss-os-profile'));
assert.equal(protectTwo.authorityOwner, 'protect-me-model-two');

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
assert.ok(Array.isArray(audit.records) && audit.records.length >= 12);
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
assert.ok(audit.knownGaps.some((gap) => gap.includes('canonical workspace\'s 27 logical dispatch roles')));
assert.ok(audit.knownGaps.some((gap) => gap.includes('different counting scopes')));
assert.ok(audit.records.some((record) => record.profile === 'drift' && record.repository === null));
assert.ok(audit.governance.externalSkillIntake.behavior.includes('QUARANTINED'));
assert.ok(audit.governance.skillSourceManifest.behavior.includes('tool exposure remains false'));
console.log(`Repository skill audit loaded: ${audit.records.length} repository records; coverage remains explicitly partial.`);


const fcrInventory = resolveAppSkillSet(manifest, 'founder-control-room', audit).sourceInventory.skills;
assert.ok(fcrInventory.some((skill) => skill.id === 'devil' && skill.status === 'active' && skill.classification === 'fcr-native-founder-skill'));
assert.ok(fcrInventory.some((skill) => skill.id === 'local-devil' && skill.status === 'retired-export-copy'));
assert.ok(!fcrInventory.some((skill) => skill.id === 'chief-ai-operator'), 'FCR inventory must not absorb Chief-native skills');

const chiefInventory = resolveAppSkillSet(manifest, 'chief-ai-machine', audit).sourceInventory.skills;
assert.ok(chiefInventory.some((skill) => skill.id === 'chief-ai-operator'));
assert.ok(!chiefInventory.some((skill) => skill.id === 'portfolio-control-plane'), 'Chief inventory must not absorb FCR-native skills');

const promptosInventory = resolveAppSkillSet(manifest, 'promptos', audit).sourceInventory.skills;
assert.ok(promptosInventory.some((skill) => skill.id === 'local-build' && skill.status === 'active-export'));
assert.ok(promptosInventory.some((skill) => skill.id === 'local-devil' && skill.status === 'retired-export-copy'));
assert.ok(!promptosInventory.some((skill) => skill.id === 'local-devil' && skill.status === 'active-export'), 'retired exports must never be promoted to active');

const gamesInventory = resolveAppSkillSet(manifest, 'games-hub', audit).sourceInventory;
assert.equal(gamesInventory.records.length, 5, 'Games Hub must include its canonical Juss & Co. workspace and all four related game repositories');
assert.equal(gamesInventory.skills.length, 0, 'a repository search with no skill matches must not fabricate skills');
assert.equal(gamesInventory.repositoriesWithoutInventoryRecord.length, 0, 'every Games Hub source repository must have an audit record');
assert.equal(gamesInventory.records.find((record) => record.repository === 'jussray/jussray').inventoryStatus, 'verified-canonical-hub-workspace-no-native-skill-package-confirmed');

const driftInventory = resolveAppSkillSet(manifest, 'drift', audit).sourceInventory;
assert.equal(driftInventory.records.length, 0);
assert.equal(driftInventory.skills.length, 0);

const invalidAudit = structuredClone(audit);
invalidAudit.records[0].skillSources[0].blobSha = 'not-a-blob-sha';
assert.ok(validateRepositorySkillAudit(invalidAudit).some((error) => error.includes('blob SHA must be pinned')));
assert.throws(() => resolveAppSkillSet(manifest, 'founder-control-room', invalidAudit), /Invalid repository skill audit/);
console.log('Source-bound app skill inventories verified: ownership, provenance, retired status, and unresolved repositories remain explicit.');
