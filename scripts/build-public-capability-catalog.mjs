import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadPortfolioManifest, loadRepositorySkillAudit, validatePortfolioManifest, validateRepositorySkillAudit } from '../src/skill-registry/index.mjs';
import { loadIntegrationRegistry, validateIntegrationRegistry } from '../src/integration-registry/index.mjs';

const output = new URL('../parts/capabilities.v1.json', import.meta.url);
const manifest = loadPortfolioManifest(), audit = loadRepositorySkillAudit(), registry = loadIntegrationRegistry();
assert.deepEqual(validatePortfolioManifest(manifest), []);
assert.deepEqual(validateRepositorySkillAudit(audit), []);
assert.deepEqual(validateIntegrationRegistry(registry, manifest), []);
const shared = new Map(manifest.sharedSkills.map((skill) => [skill.id, skill]));
const gameGeneric = new Set(['jussco-workspace-repository-operator','workspace-security-assessment-not-codex-discovered','jussco-shared-founder-operator','fcr-owned-export-not-games-hub-owned']);
const isRetired = (status) => /retired/i.test(status || '');
const catalog = {
  schemaVersion:'1.0', registry:'promptos/public-app-capability-catalog', authority:'public-catalog-only',
  generatedFrom:['src/skill-registry/portfolio.manifest.json','src/skill-registry/repository-skill-audit.v1.json','src/integration-registry/host-connectors.v1.json'],
  truthBoundary:'This public view lists source-pinned public skill files, proposed capability areas, and catalog references only. It does not prove plugin installation, connection, permissions, execution, or complete source coverage.',
  connectionBoundary:'Live connection and permission state belong to the host runtime. PromptOS stores no credentials and grants no plugin execution authority.',
  apps:manifest.apps.map((app) => {
    const records = audit.records.filter((r) => app.sourceAuditRepositories.includes(r.repository) || (r.repository === null && r.profile === app.id));
    const local = records.filter((r) => r.visibility === 'public').flatMap((r) => r.skillSources.map((s) => ({
      id:s.id, sourceRepository:r.repository, sourceProfile:r.profile, sourcePath:s.path, blobSha:s.blobSha,
      sourceRevision:r.evidence?.treeInventory?.commitSha ?? r.evidence?.treeInventory?.commit ?? null,
      status:s.status, classification:s.classification
    }))).filter((s) => s.sourceRepository !== manifest.sharedSkillSource);
    const excluded = app.id === 'games-hub' ? local.filter((s) => gameGeneric.has(s.classification)) : [];
    const product = app.id === 'games-hub' ? local.filter((s) => !gameGeneric.has(s.classification)) : local;
    const retiredSkills = product.filter((s) => isRetired(s.status)), skills = product.filter((s) => !isRetired(s.status));
    const sharedSkills = app.sharedSkills.map((id) => {
      const s = shared.get(id); assert(s, 'missing shared reference ' + id);
      return {id:s.id,purpose:s.purpose,sourceRepository:s.source,sourcePath:s.sourcePath,sourceRevision:s.sourceRevision,authority:s.authority,scope:'repository-operator-only',distribution:'reference-only'};
    });
    const sourceRecords = records.map((r) => r.visibility === 'public'
      ? {profile:r.profile,label:r.repository,visibility:'public',inventoryStatus:r.inventoryStatus,skillCount:r.skillSources.length,detailsRedacted:false}
      : r.visibility === 'private'
        ? {profile:r.profile,label:'Private repository',visibility:'private',inventoryStatus:r.inventoryStatus,skillCount:r.privateSkillSourceCount ?? r.skillSources.length,detailsRedacted:true}
        : {profile:r.profile,label:r.repository === null ? 'Repository unresolved' : 'Repository visibility unverified',visibility:r.visibility,inventoryStatus:r.inventoryStatus,skillCount:null,detailsRedacted:true});
    const primary = app.repository ? records.find((r) => r.repository === app.repository) : null;
    const repositoryLabel = !app.repository ? 'Repository unresolved' : primary?.visibility === 'public' ? app.repository : primary?.visibility === 'private' ? 'Private repository' : 'Repository visibility unverified';
    const integrations = registry.integrations.filter((i) => i.appTargets.includes(app.id)).map((i) => ({
      id:i.id,name:i.name,kind:i.kind,category:i.category,role:i.role,status:i.status,lifecycle:i.lifecycle ?? 'current-reference',
      aliases:i.aliases ?? [],connectionState:'unknown',runtimeDiscoveryRequired:true,executionAllowed:false,credentialStorage:'none',executionAuthority:'host-runtime-only'
    }));
    return {id:app.id,name:app.name,role:app.role,repositoryLabel,auditCoverage:app.sourceAuditStatus,
      appSkillFileCount:product.length,activeSkillCount:skills.length,skills,retiredSkills,sharedSkills,
      proposedCapabilities:app.ownedSkills.map((id) => ({id,status:app.ownedSkillsStatus,scope:'proposed-capability-area-not-source-verified'})),
      integrations,sourceRecords,
      privateSkillSourceCount:sourceRecords.filter((r) => r.visibility === 'private').reduce((n,r) => n + (r.skillCount || 0),0),
      excludedWorkspaceSkillCount:excluded.length,
      excludedWorkspaceSkillReason:excluded.length ? 'Workspace-level and founder-operator skill exports are not game-specific product skills.' : null};
  })
};
const byId = (id) => catalog.apps.find((app) => app.id === id);
assert.equal(catalog.apps.length,18);
assert.equal(byId('promptos').appSkillFileCount,27);
assert.equal(byId('sekret-bip').appSkillFileCount,29);
assert.equal(byId('storyengine').appSkillFileCount,28);
assert.equal(byId('solcontinuity').appSkillFileCount,14);
assert.equal(byId('games-hub').appSkillFileCount,0);
assert.equal(byId('games-hub').excludedWorkspaceSkillCount,43);
assert.equal(byId('juss-beautiful-hair').privateSkillSourceCount,6);
const serialized = JSON.stringify(catalog);
for (const record of audit.records.filter((r) => r.repository && r.visibility !== 'public')) {
  assert(!serialized.includes(record.repository), 'private/unverified repository identity leaked: ' + record.profile);
}
for (const app of catalog.apps) assert(app.integrations.every((i) =>
  i.connectionState === 'unknown' && i.runtimeDiscoveryRequired === true && i.executionAllowed === false &&
  i.credentialStorage === 'none' && i.executionAuthority === 'host-runtime-only'
), 'host runtime boundary drifted: ' + app.id);
const expected = JSON.stringify(catalog,null,2) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(await readFile(output,'utf8'),expected,'public capability catalog is stale; regenerate it');
  console.log('Public capability catalog verified: 18 apps, provenance, private redaction, retired exports, and host-runtime boundaries.');
} else {
  await writeFile(output,expected,'utf8');
  console.log('Generated public capability catalog from authoritative registries.');
}
