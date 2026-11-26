export type Surface = string;
export interface SkillCompatibility { apps: string[]; surfaces: string[] }
export interface SkillReference { id: string; sourceRepository?: string; sourcePath?: string; sourceRevision?: string; sourceRef?: string; status: string; lifecycle: string; mode: "reference-only" | "app-native" | "proposal"; authority: "advisory"; owner: string; compatibility: SkillCompatibility }
export interface PluginReference { id: string; kind: "chatgpt-plugin" | "connector" | "platform-capability"; canonicalPluginId: string | null; displayName: string; catalogStatus: "listed" | "namespace-only" | "platform-native"; resolutionNote?: string; provider: string; purpose: string; mode: "operator-tooling"; status: "declared"; connectionState: "runtime-discovery-required"; authority: "none"; compatibleApps: string[]; capabilities: string[]; writePolicy: "explicit-action-approval-required"; secretsPolicy: "never-store-in-manifest"; safetyMode?: string; liveActions?: string }
export interface AppIdentity { id: string; name: string; repository: string; defaultBranch: string; sourceHeadAtAudit: string; identityStatus: "source-verified"; role: string; authorityOwner: string; authorityScope: string; surfaces: Surface[]; localManifestPaths: string[] }
export interface AppManifest { schemaVersion: "1.0"; registryVersion: "2.0.0"; app: AppIdentity; skills: { shared: SkillReference[]; owned: SkillReference[]; ownedSkillsStatus: string }; plugins: PluginReference[]; compatibility: { surfaces: Surface[]; requiresPlaywrightForUi: boolean; observedSkillDirectories: string[] }; authority: "catalog-and-compatibility-only"; installationState: "not-asserted"; executionAuthority: "none" }
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA = /^[0-9a-f]{40}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export function validateAppManifest(value: unknown): string[] {
 const errors: string[] = [];
 if (!isRecord(value)) return ["manifest must be an object"];
 if (value.schemaVersion !== "1.0" || value.registryVersion !== "2.0.0") errors.push("unsupported manifest or registry version");
 if (value.authority !== "catalog-and-compatibility-only") errors.push("registry authority must remain catalog-and-compatibility-only");
 if (value.installationState !== "not-asserted") errors.push("installation state must not be inferred from a manifest");
 if (value.executionAuthority !== "none") errors.push("a manifest must never grant execution authority");
 const app = value.app;
 if (!isRecord(app)) return [...errors, "app identity is missing"];
 for (const key of ["id","name","repository","role","authorityScope"] as const) if (typeof app[key] !== "string" || !app[key]) errors.push(`app.${key} is required`);
 if (!SAFE_ID.test(String(app.id ?? ""))) errors.push("app id is invalid"); if (typeof app.repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(app.repository)) errors.push("app repository must use owner/name form");
 if (app.authorityOwner !== app.id) errors.push("app authority owner mismatch");
 if (app.identityStatus !== "source-verified" || !SHA.test(String(app.sourceHeadAtAudit ?? ""))) errors.push("app source identity must be pinned to an inspected head");
 if (!Array.isArray(app.surfaces) || app.surfaces.length === 0) errors.push("app surfaces are required");
 if (!Array.isArray(app.localManifestPaths) || !app.localManifestPaths.includes(".juss/app.manifest.json") || !app.localManifestPaths.includes(".juss/skills.manifest.json")) errors.push("local .juss manifest paths are required");
 const skills = value.skills;
 if (!isRecord(skills) || !Array.isArray(skills.shared) || !Array.isArray(skills.owned)) return [...errors, "skills.shared and skills.owned must be arrays"];
 const ids = new Set<string>();
 for (const skill of [...skills.shared, ...skills.owned]) {
  if (!isRecord(skill)) { errors.push("skill entry must be an object"); continue; }
  const id = String(skill.id ?? "");
  if (!SAFE_ID.test(id)) errors.push(`invalid skill id: ${id}`);
  if (ids.has(id)) errors.push(`duplicate skill id: ${id}`);
  ids.add(id);
  if (skill.authority !== "advisory") errors.push(`skill authority must be advisory: ${id}`);
  if (!isRecord(skill.compatibility) || !Array.isArray(skill.compatibility.apps) || !Array.isArray(skill.compatibility.surfaces)) errors.push(`skill compatibility is incomplete: ${id}`);
  if (skill.mode === "proposal") { if (skill.status !== "proposed-awaiting-source-audit" || skill.sourcePath !== undefined || skill.sourceRevision !== undefined) errors.push(`proposed skill must not claim a source: ${id}`); }
  else { if (typeof skill.sourceRepository !== "string" || typeof skill.sourcePath !== "string" || !skill.sourcePath.endsWith(".md") || skill.sourcePath.includes("..")) errors.push(`skill source path is invalid: ${id}`); if (!SHA.test(String(skill.sourceRevision ?? ""))) errors.push(`skill source revision must be pinned: ${id}`); if (skill.mode === "app-native" && skill.sourceRevision !== app.sourceHeadAtAudit) errors.push(`app skill source revision does not match inspected app head: ${id}`); if (skill.mode === "app-native" && skill.sourceRepository !== app.repository) errors.push(`app skill source repository mismatch: ${id}`); if (skill.mode === "app-native" && skill.owner !== app.id) errors.push(`app skill owner mismatch: ${id}`); if (skill.status !== "source-path-verified") errors.push(`skill source path is not verified: ${id}`); }
 }
 if (skills.ownedSkillsStatus !== "source-path-verified" && skills.ownedSkillsStatus !== "proposed-awaiting-source-audit" && skills.ownedSkillsStatus !== "mixed-source-verified-and-proposed") errors.push("ownedSkillsStatus is invalid");
 if (!Array.isArray(value.plugins) || value.plugins.length === 0) errors.push("at least one plugin reference is required");
 else for (const plugin of value.plugins) { if (!isRecord(plugin)) { errors.push("plugin entry must be an object"); continue; } if (!SAFE_ID.test(String(plugin.id ?? "")) || typeof plugin.provider !== "string" || !plugin.provider) errors.push("plugin identity is invalid"); if (plugin.mode !== "operator-tooling" || plugin.status !== "declared") errors.push(`plugin must remain a declared operator-tooling reference: ${String(plugin.id)}`); if (typeof plugin.displayName !== "string" || !plugin.displayName) errors.push(`plugin display name is required: ${String(plugin.id)}`); if (plugin.kind === "chatgpt-plugin") { if (typeof plugin.canonicalPluginId !== "string" || !plugin.canonicalPluginId.startsWith("plugin_") || plugin.catalogStatus !== "listed") errors.push(`canonical plugin identity is invalid: ${String(plugin.id)}`); } else if (plugin.kind === "connector") { if (plugin.canonicalPluginId !== null || plugin.catalogStatus !== "namespace-only") errors.push(`connector identity must not invent a plugin id: ${String(plugin.id)}`); } else if (plugin.kind === "platform-capability") { if (plugin.canonicalPluginId !== null || plugin.catalogStatus !== "platform-native") errors.push(`platform capability must not invent a plugin id: ${String(plugin.id)}`); } else errors.push(`plugin kind is invalid: ${String(plugin.id)}`); if (plugin.connectionState !== "runtime-discovery-required") errors.push(`plugin connection state must be discovered at runtime: ${String(plugin.id)}`); if (plugin.authority !== "none") errors.push(`plugin must not grant authority: ${String(plugin.id)}`); if (plugin.writePolicy !== "explicit-action-approval-required" || plugin.secretsPolicy !== "never-store-in-manifest") errors.push(`plugin safety policy is incomplete: ${String(plugin.id)}`); if (!Array.isArray(plugin.compatibleApps) || !plugin.compatibleApps.includes(String(app.id))) errors.push(`plugin is not scoped to this app: ${String(plugin.id)}`); }
 if (!isRecord(value.compatibility) || !Array.isArray(value.compatibility.surfaces) || typeof value.compatibility.requiresPlaywrightForUi !== "boolean" || !Array.isArray(value.compatibility.observedSkillDirectories)) errors.push("app compatibility contract is incomplete");
 return errors;
}
export function validateAppManifests(manifests: unknown[]): string[] {
 const errors: string[] = [], ids = new Set<string>(), repositories = new Set<string>();
 for (const manifest of manifests) { errors.push(...validateAppManifest(manifest).map(error => `${isRecord(manifest) && isRecord(manifest.app) ? String(manifest.app.id) : "unknown"}: ${error}`)); if (!isRecord(manifest) || !isRecord(manifest.app)) continue; const id=String(manifest.app.id ?? ""), repo=String(manifest.app.repository ?? ""); if (ids.has(id)) errors.push(`duplicate app id: ${id}`); ids.add(id); if (repositories.has(repo)) errors.push(`duplicate repository owner: ${repo}`); repositories.add(repo); }
 return errors;
}
