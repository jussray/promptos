import fs from 'node:fs';

const ALLOWED_SKILL_AUTHORITY = new Set(['advisory']);
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePortfolioManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest must be an object'];
  }
  if (manifest.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (manifest.registry !== 'promptos/app-aligned-skills') errors.push('unexpected registry identity');
  if (manifest.authority !== 'catalog-and-compatibility-only') errors.push('registry authority must remain catalog-and-compatibility-only');
  if (manifest.sharedSkillDistribution !== 'repository-operator-only') errors.push('shared skills must remain repository-operator-only');
  if (manifest.governanceAuthority !== 'jussray/founder-control-room' || manifest.governanceContract !== 'config/founder-intelligence.inheritance.json') errors.push('FCR governance authority reference is required');
  if (!Array.isArray(manifest.sharedSkills) || !Array.isArray(manifest.apps)) {
    return [...errors, 'sharedSkills and apps must be arrays'];
  }

  const sharedIds = new Set();
  for (const skill of manifest.sharedSkills) {
    if (!SAFE_ID.test(skill.id ?? '')) errors.push(`invalid shared skill id: ${skill.id}`);
    if (sharedIds.has(skill.id)) errors.push(`duplicate shared skill id: ${skill.id}`);
    sharedIds.add(skill.id);
    if (skill.source !== manifest.sharedSkillSource) errors.push(`shared skill source mismatch: ${skill.id}`);
    if (skill.resolution !== 'source-path-verified') errors.push(`shared skill source path must be verified: ${skill.id}`);
    if (typeof skill.sourcePath !== 'string' || !skill.sourcePath.startsWith('.claude/skills/') || !skill.sourcePath.endsWith('/SKILL.md') || skill.sourcePath.includes('..')) errors.push(`invalid shared skill source path: ${skill.id}`);
    if (!/^[0-9a-f]{40}$/.test(skill.sourceRevision ?? '')) errors.push(`shared skill source revision must be pinned: ${skill.id}`);
    if (!ALLOWED_SKILL_AUTHORITY.has(skill.authority)) errors.push(`shared skill exceeds advisory authority: ${skill.id}`);
    if (skill.audience !== 'founder-operator' || skill.distribution !== 'reference-only') errors.push(`shared skill distribution boundary invalid: ${skill.id}`);
  }

  const appIds = new Set();
  const repositories = new Set();
  for (const app of manifest.apps) {
    if (!SAFE_ID.test(app.id ?? '')) errors.push(`invalid app id: ${app.id}`);
    if (appIds.has(app.id)) errors.push(`duplicate app id: ${app.id}`);
    appIds.add(app.id);
    if (app.repository) {
      if (repositories.has(app.repository)) errors.push(`duplicate repository ownership: ${app.repository}`);
      repositories.add(app.repository);
      if (app.repositoryStatus === 'unresolved') errors.push(`repository cannot be unresolved when supplied: ${app.id}`);
    } else if (app.repositoryStatus !== 'unresolved') {
      errors.push(`missing repository must be explicitly marked unresolved: ${app.id}`);
    }
    if (!app.name || !app.role) errors.push(`app identity incomplete: ${app.id}`);
    if (app.sharedSkillContext !== 'repository-operator-only') errors.push(`shared skill context must be repository-operator-only: ${app.id}`);
    if (app.sourceAuditRecord !== app.id || !['partial', 'unresolved'].includes(app.sourceAuditStatus) || !Array.isArray(app.sourceAuditRepositories)) errors.push(`source audit pointer/status invalid: ${app.id}`);
    if (app.catalogStatus !== 'proposed-awaiting-source-audit') errors.push(`app catalog status must remain explicit until source audit: ${app.id}`);
    if (!Array.isArray(app.ownedSkills) || app.ownedSkillsStatus !== 'proposed-awaiting-source-audit') {
      errors.push(`owned skills must remain marked proposed until source audit: ${app.id}`);
    }
    if (app.authorityOwner !== app.id) errors.push(`app authority owner mismatch: ${app.id}`);
    if (!Array.isArray(app.sharedSkills) || !Array.isArray(app.ownedSkills)) {
      errors.push(`skill lists must be arrays: ${app.id}`);
      continue;
    }
    if (new Set(app.sharedSkills).size !== app.sharedSkills.length) errors.push(`duplicate shared skill reference: ${app.id}`);
    if (new Set(app.ownedSkills).size !== app.ownedSkills.length) errors.push(`duplicate owned skill: ${app.id}`);
    for (const skillId of app.sharedSkills) {
      if (!sharedIds.has(skillId)) errors.push(`unknown shared skill ${skillId} referenced by ${app.id}`);
    }
    for (const skillId of app.ownedSkills) {
      if (!SAFE_ID.test(skillId)) errors.push(`invalid owned skill id ${skillId} in ${app.id}`);
      if (sharedIds.has(skillId)) errors.push(`app-owned skill shadows shared skill ${skillId} in ${app.id}`);
    }
    if (!Array.isArray(app.compatibility?.surfaces) || app.compatibility.surfaces.length === 0) {
      errors.push(`compatibility surfaces missing: ${app.id}`);
    }
    if (typeof app.compatibility?.requiresPlaywrightForUi !== 'boolean') {
      errors.push(`requiresPlaywrightForUi must be boolean: ${app.id}`);
    }
  }
  return errors;
}

export function validateRepositorySkillAudit(audit) {
  const errors = [];
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) return ['repository skill audit must be an object'];
  if (audit.schemaVersion !== '1.0') errors.push('repository skill audit schemaVersion must be 1.0');
  if (audit.registry !== 'promptos/repository-skill-audit') errors.push('unexpected repository skill audit identity');
  if (!Array.isArray(audit.records)) return [...errors, 'repository skill audit records must be an array'];

  const profiles = new Set();
  const repositories = new Set();
  for (const record of audit.records) {
    if (!record.profile || profiles.has(record.profile)) errors.push(`missing or duplicate audit profile: ${record.profile}`);
    profiles.add(record.profile);
    if (record.repository === null) {
      if (record.inventoryStatus !== 'unresolved-repository') errors.push(`null repository must be explicitly unresolved: ${record.profile}`);
    } else {
      if (typeof record.repository !== 'string' || !record.repository.includes('/')) errors.push(`invalid repository identity: ${record.profile}`);
      if (repositories.has(record.repository)) errors.push(`duplicate repository inventory: ${record.repository}`);
      repositories.add(record.repository);
    }
    if (!record.inventoryStatus || !Array.isArray(record.skillSources)) errors.push(`audit inventory metadata incomplete: ${record.profile}`);
    const sourcePaths = new Set();
    for (const source of record.skillSources ?? []) {
      if (!source.id || !source.status || !source.classification) errors.push(`skill source classification incomplete: ${record.profile}`);
      if (typeof source.path !== 'string' || !source.path.endsWith('/SKILL.md') || source.path.startsWith('/') || source.path.includes('..')) errors.push(`invalid skill source path: ${record.profile}/${source.id}`);
      if (!/^[0-9a-f]{40}$/.test(source.blobSha ?? '')) errors.push(`skill source blob SHA must be pinned: ${record.profile}/${source.id}`);
      if (sourcePaths.has(source.path)) errors.push(`duplicate skill source path: ${record.profile}/${source.path}`);
      sourcePaths.add(source.path);
    }
  }
  return errors;
}

export function resolveAppSourceInventory(audit, app) {
  const errors = validateRepositorySkillAudit(audit);
  if (errors.length) throw new Error(`Invalid repository skill audit: ${errors.join('; ')}`);
  const expectedRepositories = new Set(app.sourceAuditRepositories ?? []);
  const records = audit.records.filter((record) => record.repository && expectedRepositories.has(record.repository));
  const representedRepositories = new Set(records.map((record) => record.repository));
  const skills = records.flatMap((record) => record.skillSources.map((source) => ({
    id: source.id,
    sourceRepository: record.repository,
    sourceProfile: record.profile,
    sourcePath: source.path,
    blobSha: source.blobSha,
    status: source.status,
    classification: source.classification,
  })));
  return {
    records: records.map((record) => ({
      profile: record.profile,
      repository: record.repository,
      inventoryStatus: record.inventoryStatus,
      skillCount: record.skillSources.length,
    })),
    skills,
    repositoriesWithoutInventoryRecord: [...expectedRepositories].filter((repository) => !representedRepositories.has(repository)),
  };
}

export function loadRepositorySkillAudit(path = new URL('./repository-skill-audit.v1.json', import.meta.url)) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export function resolveAppSkillSet(manifest, appId, audit = loadRepositorySkillAudit()) {
  const errors = validatePortfolioManifest(manifest);
  if (errors.length) throw new Error(`Invalid skill manifest: ${errors.join('; ')}`);
  const app = manifest.apps.find((entry) => entry.id === appId);
  if (!app) throw new Error(`Unknown app: ${appId}`);
  const sharedById = new Map(manifest.sharedSkills.map((skill) => [skill.id, skill]));
  const sourceInventory = resolveAppSourceInventory(audit, app);
  return {
    app: { id: app.id, name: app.name, repository: app.repository, role: app.role, catalogStatus: app.catalogStatus, ownedSkillsStatus: app.ownedSkillsStatus },
    authorityOwner: app.authorityOwner,
    sharedSkills: app.sharedSkills.map((id) => ({ ...sharedById.get(id), scope: 'repository-operator-shared-reference' })),
    ownedSkills: app.ownedSkills.map((id) => ({ id, scope: 'proposed-app-owned', owner: app.id, status: app.ownedSkillsStatus })),
    sourceInventory,
    skillContext: app.sharedSkillContext,
    sourceAudit: { record: app.sourceAuditRecord, status: app.sourceAuditStatus, repositories: [...app.sourceAuditRepositories] },
    compatibility: { ...app.compatibility },
    governanceAuthority: manifest.governanceAuthority,
    authority: 'catalog-and-compatibility-only',
  };
}

export function loadPortfolioManifest(path = new URL('./portfolio.manifest.json', import.meta.url)) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
