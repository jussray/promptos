import { loadAppManifests, resolveAppSkillSet as resolveById, validateRegistry } from "./index.ts";
// Backward-compatible API. Per-app JSON files are the canonical registry source.
export function loadPortfolioManifest() { return { schemaVersion:"2.0", registry:"promptos/app-aligned-skills", sourceOfTruth:"manifests/apps/*.json", apps:loadAppManifests() }; }
export function validatePortfolioManifest(manifest=loadPortfolioManifest()) { return validateRegistry(manifest.apps ?? []); }
export function resolveAppSkillSet(manifest,appId) { return resolveById(appId,manifest?.apps ?? loadAppManifests()); }
