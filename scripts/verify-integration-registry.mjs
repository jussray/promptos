import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPortfolioManifest } from '../src/skill-registry/index.mjs';
import { loadIntegrationRegistry, resolveAppIntegrations, validateIntegrationRegistry } from '../src/integration-registry/index.mjs';

const portfolio = loadPortfolioManifest();
const registry = loadIntegrationRegistry();
const pluginManagement = JSON.parse(await readFile(new URL('../.control-room/plugin-management.json', import.meta.url), 'utf8'));

assert.deepEqual(validateIntegrationRegistry(registry, portfolio), [], 'integration references must satisfy the host-runtime boundary');
assert.equal(registry.integrations.length, 18);
assert.deepEqual(registry.managementContractPlugins, pluginManagement.plugins.map((plugin) => plugin.name));
assert.equal(registry.executionAllowed, false);
assert.equal(registry.credentialsStored, false);
assert.equal(registry.liveConnectionStateStored, false);
assert.equal(registry.autoConnect, false);

for (const app of portfolio.apps) {
  const resolved = resolveAppIntegrations(registry, portfolio, app.id);
  assert.equal(resolved.authority, 'catalog-and-routing-only');
  assert.equal(resolved.executionAllowed, false);
  assert.ok(resolved.integrations.every((integration) =>
    integration.appTargets.includes(app.id) &&
    integration.connectionState === 'unknown' &&
    integration.runtimeDiscoveryRequired === true &&
    integration.executionAllowed === false &&
    integration.credentialStorage === 'none' &&
    integration.executionAuthority === 'host-runtime-only'
  ), `${app.id} integrations must not imply connection or execution`);
}

const promptos = resolveAppIntegrations(registry, portfolio, 'promptos').integrations;
assert.ok(promptos.some((integration) => integration.id === 'neura-relay-mcp'));
assert.ok(promptos.some((integration) => integration.id === 'codex-security' && integration.kind === 'skill-reference'));
assert.ok(promptos.some((integration) => integration.id === 'plugin-management' && integration.aliases.includes('Plugin Autopilot')));
assert.equal(promptos.find((integration) => integration.id === 'atlassian-rovo-legacy').lifecycle, 'legacy');

const jbh = resolveAppIntegrations(registry, portfolio, 'juss-beautiful-hair').integrations;
assert.ok(jbh.some((integration) => integration.id === 'shopify'));
assert.ok(jbh.some((integration) => integration.id === 'cloudflare'));

const invalidExecution = structuredClone(registry);
invalidExecution.integrations[0].executionAllowed = true;
assert.ok(validateIntegrationRegistry(invalidExecution, portfolio).some((error) => error.includes('non-connected and non-executable')));

const invalidCredential = structuredClone(registry);
invalidCredential.integrations[0].apiKey = 'must-never-be-stored';
assert.ok(validateIntegrationRegistry(invalidCredential, portfolio).some((error) => error.includes('forbidden credential or live-state field')));

assert.throws(() => resolveAppIntegrations(registry, portfolio, 'not-an-app'), /Unknown PromptOS app profile/);
console.log(`Host integration catalog verified: ${registry.integrations.length} reference adapters across ${portfolio.apps.length} apps; no connection, credential, or execution state is claimed.`);
