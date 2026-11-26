import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppManifest } from "./schema.ts";
import { validateAppManifests } from "./schema.ts";
import { appCompatibilityIssues } from "./compatibility.ts";
const DEFAULT_MANIFEST_DIR=fileURLToPath(new URL("../../manifests/apps/",import.meta.url));
export function loadAppManifests(directory=DEFAULT_MANIFEST_DIR): AppManifest[] { return readdirSync(directory).filter(name=>name.endsWith(".json")).sort().map(name=>JSON.parse(readFileSync(join(directory,name),"utf8")) as AppManifest); }
export function validateRegistry(manifests: unknown[]=loadAppManifests()): string[] { return validateAppManifests(manifests); }
export function resolveAppSkillSet(appId: string, manifests: AppManifest[]=loadAppManifests()) { const errors=validateRegistry(manifests); if(errors.length) throw new Error(`Invalid app skill registry: ${errors.join("; ")}`); const manifest=manifests.find(entry=>entry.app.id===appId); if(!manifest) throw new Error(`Unknown app: ${appId}`); const issues=appCompatibilityIssues(manifest.app,[...manifest.skills.shared,...manifest.skills.owned],manifest.plugins); if(issues.length) throw new Error(`Incompatible app manifest: ${issues.join("; ")}`); return {app:manifest.app,sharedSkills:manifest.skills.shared.map(skill=>({...skill,scope:"shared-reference" as const})),ownedSkills:manifest.skills.owned.map(skill=>({...skill,scope:skill.mode==="proposal"?"proposed-app-skill" as const:"app-owned" as const})),plugins:manifest.plugins.map(plugin=>({...plugin,scope:"operator-tooling-reference" as const})),compatibility:{...manifest.compatibility,issues},authority:manifest.authority,installationState:manifest.installationState,executionAuthority:manifest.executionAuthority}; }
