import { readFileSync } from 'node:fs';

const registryUrl = new URL('./host-connectors.v1.json', import.meta.url);

export function loadIntegrationRegistry() {
  return JSON.parse(readFileSync(registryUrl, 'utf8'));
}

export function validateIntegrationRegistry(registry, portfolioManifest) {
  const errors = [];
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) return ['integration registry must be an object'];
  if (registry.schemaVersion !== '1.0') errors.push('integration registry schemaVersion must be 1.0');
  if (registry.registry !== 'promptos/host-integration-catalog') errors.push('unexpected integration registry identity');
  if (registry.authority !== 'catalog-and-routing-only') errors.push('integration registry authority must remain catalog-and-routing-only');
  if (registry.runtimeDiscoveryRequired !== true || registry.connectionStateSource !== 'host-runtime') errors.push('host runtime discovery must remain authoritative');
  if (registry.liveConnectionStateStored !== false || registry.credentialsStored !== false || registry.autoConnect !== false || registry.executionAllowed !== false) {
    errors.push('integration registry must not store live state, credentials, auto-connect, or execution authority');
  }
  if (!Array.isArray(registry.integrations)) return [...errors, 'integration registry integrations must be an array'];
  const appIds = new Set((portfolioManifest?.apps ?? []).map((app) => app.id));
  const ids = new Set();
  const forbiddenKeys = new Set(['apiKey', 'api_key', 'secret', 'token', 'credentials', 'accessToken', 'refreshToken', 'authorization', 'connected', 'installed', 'permissionState']);
  const inspect = (value, path = 'registry') => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) errors.push(`forbidden credential or live-state field: ${path}.${key}`);
      inspect(child, `${path}.${key}`);
    }
  };
  inspect(registry);
  for (const integration of registry.integrations) {
    if (!integration.id || ids.has(integration.id)) errors.push(`missing or duplicate integration id: ${integration.id}`);
    ids.add(integration.id);
    if (!integration.name || !integration.role) errors.push(`integration identity incomplete: ${integration.id}`);
    if (!['plugin-reference', 'skill-reference'].includes(integration.kind)) errors.push(`invalid integration kind: ${integration.id}`);
    if (!Array.isArray(integration.appTargets) || integration.appTargets.length === 0) errors.push(`integration appTargets must be non-empty: ${integration.id}`);
    for (const appId of integration.appTargets ?? []) if (!appIds.has(appId)) errors.push(`unknown app target ${appId}: ${integration.id}`);
    if (integration.runtimeDiscoveryRequired !== true || integration.availability !== 'host-runtime-discovery-required') errors.push(`runtime discovery must be required: ${integration.id}`);
    if (integration.connectionState !== 'unknown' || integration.executionAllowed !== false || integration.credentialStorage !== 'none' || integration.executionAuthority !== 'host-runtime-only') {
      errors.push(`integration must remain non-connected and non-executable in PromptOS: ${integration.id}`);
    }
    if (integration.defaultMode !== 'read-first') errors.push(`integration default mode must be read-first: ${integration.id}`);
    if (integration.kind === 'plugin-reference' && integration.status !== 'catalog-only') errors.push(`plugin references must remain catalog-only: ${integration.id}`);
    if (integration.kind === 'skill-reference' && integration.status !== 'requested-not-source-verified') errors.push(`unverified skill references must remain unverified: ${integration.id}`);
    if (integration.lifecycle === 'legacy' && integration.migrationReviewRequired !== true) errors.push(`legacy integration requires migration review: ${integration.id}`);
  }
  return errors;
}

export function resolveAppIntegrations(registry, portfolioManifest, appId) {
  const errors = validateIntegrationRegistry(registry, portfolioManifest);
  if (errors.length) throw new Error(`Invalid integration registry: ${errors.join('; ')}`);
  if (!portfolioManifest.apps.some((app) => app.id === appId)) throw new Error(`Unknown PromptOS app profile: ${appId}`);
  return {
    appId,
    authority: registry.authority,
    executionAllowed: false,
    integrations: registry.integrations
      .filter((integration) => integration.appTargets.includes(appId))
      .map((integration) => ({
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        category: integration.category,
        role: integration.role,
        status: integration.status,
        lifecycle: integration.lifecycle ?? 'current-reference',
        aliases: integration.aliases ?? [],
        connectionState: 'unknown',
        runtimeDiscoveryRequired: true,
        executionAllowed: false,
        credentialStorage: 'none',
        executionAuthority: 'host-runtime-only',
        appTargets: [...integration.appTargets],
      })),
  };
}
