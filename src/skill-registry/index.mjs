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
  if (!Array.isArray(manifest.sharedSkills) || !Array.isArray(manifest.apps)) {
    return [...errors, 'sharedSkills and apps must be arrays'];
  }

  const sharedIds = new Set();
  for (const skill of manifest.sharedSkills) {
    if (!SAFE_ID.test(skill.id ?? '')) errors.push(`invalid shared skill id: ${skill.id}`);
    if (sharedIds.has(skill.id)) errors.push(`duplicate shared skill id: ${skill.id}`);
    sharedIds.add(skill.id);
    if (skill.source !== manifest.sharedSkillSource) errors.push(`shared skill source mismatch: ${skill.id}`);
    if (!ALLOWED_SKILL_AUTHORITY.has(skill.authority)) errors.push(`shared skill exceeds advisory authority: ${skill.id}`);
  }

  const appIds = new Set();
  const repositories = new Set();
  for (const app of manifest.apps) {
    if (!SAFE_ID.test(app.id ?? '')) errors.push(`invalid app id: ${app.id}`);
    if (appIds.has(app.id)) errors.push(`duplicate app id: ${app.id}`);
    appIds.add(app.id);
    if (repositories.has(app.repository)) errors.push(`duplicate repository ownership: ${app.repository}`);
    repositories.add(app.repository);
    if (!app.name || !app.repository || !app.role) errors.push(`app identity incomplete: ${app.id}`);
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

export function resolveAppSkillSet(manifest, appId) {
  const errors = validatePortfolioManifest(manifest);
  if (errors.length) throw new Error(`Invalid skill manifest: ${errors.join('; ')}`);
  const app = manifest.apps.find((entry) => entry.id === appId);
  if (!app) throw new Error(`Unknown app: ${appId}`);
  const sharedById = new Map(manifest.sharedSkills.map((skill) => [skill.id, skill]));
  return {
    app: { id: app.id, name: app.name, repository: app.repository, role: app.role },
    authorityOwner: app.authorityOwner,
    sharedSkills: app.sharedSkills.map((id) => ({ ...sharedById.get(id), scope: 'shared-reference' })),
    ownedSkills: app.ownedSkills.map((id) => ({ id, scope: 'app-owned', owner: app.id })),
    compatibility: { ...app.compatibility },
    authority: 'catalog-and-compatibility-only',
  };
}

export function loadPortfolioManifest(path = new URL('./portfolio.manifest.json', import.meta.url)) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
