export const PROMPT_MEMORY_VERSION = 'prompt-memory-v1';
export const PROMPT_MEMORY_DB = 'promptos-prompt-memory-v1';

const STATUS = Object.freeze({
  GENERATED: 'generated',
  OUTCOME_PENDING: 'outcome_pending',
  PROVEN: 'proven',
  REVISION_REQUIRED: 'revision_required',
});

const VISIBILITY = Object.freeze({
  VISUAL: 'visual',
  REVISION: 'revision',
});

function freezeLane(value) {
  return Object.freeze({
    ...value,
    metrics: Object.freeze([...value.metrics]),
    recommendedExecutors: Object.freeze([...value.recommendedExecutors]),
  });
}

export const LANE_REGISTRY = Object.freeze({
  'content.creation': freezeLane({
    id: 'content.creation',
    title: 'Content Creation',
    northStar: 'founder_intent_outcome',
    metrics: ['founder_intent_outcome', 'meaningful_engagement', 'qualified_replies', 'click_through', 'conversion', 'revenue', 'saves_shares'],
    recommendedExecutors: ['sol', 'chief', 'fcr'],
  }),
  'repo.engineering': freezeLane({
    id: 'repo.engineering',
    title: 'Repo Engineering',
    northStar: 'verified_real_path',
    metrics: ['verified_real_path', 'focused_tests_passing', 'runtime_behavior_restored', 'regression_free', 'time_to_resolution'],
    recommendedExecutors: ['chief', 'fcr', 'sol'],
  }),
  'co.production': freezeLane({
    id: 'co.production',
    title: 'Co-production',
    northStar: 'accepted_artifact',
    metrics: ['accepted_artifact', 'revision_count', 'time_to_accepted_artifact', 'downstream_use'],
    recommendedExecutors: ['sol', 'chief', 'fcr'],
  }),
  'research.strategy': freezeLane({
    id: 'research.strategy',
    title: 'Research & Strategy',
    northStar: 'decision_usefulness',
    metrics: ['decision_usefulness', 'source_quality', 'falsification_coverage', 'decision_reached', 'revenue_opportunity'],
    recommendedExecutors: ['sol', 'chief', 'fcr'],
  }),
  'product.design': freezeLane({
    id: 'product.design',
    title: 'Product Design',
    northStar: 'target_flow_completion',
    metrics: ['target_flow_completion', 'usability_issue_resolution', 'conversion', 'retention', 'revision_count'],
    recommendedExecutors: ['chief', 'sol', 'fcr'],
  }),
  commerce: freezeLane({
    id: 'commerce',
    title: 'Commerce',
    northStar: 'qualified_conversion',
    metrics: ['qualified_conversion', 'checkout_completion', 'revenue', 'average_order_value', 'repeat_purchase'],
    recommendedExecutors: ['chief', 'fcr', 'sol'],
  }),
  'growth.strategy': freezeLane({
    id: 'growth.strategy',
    title: 'Growth',
    northStar: 'qualified_growth_outcome',
    metrics: ['qualified_growth_outcome', 'conversion', 'qualified_leads', 'retention', 'revenue'],
    recommendedExecutors: ['sol', 'chief', 'fcr'],
  }),
  'system.reasoning': freezeLane({
    id: 'system.reasoning',
    title: 'System Reasoning',
    northStar: 'decision_quality',
    metrics: ['decision_quality', 'falsification_resistance', 'evidence_coverage', 'rework_avoided'],
    recommendedExecutors: ['chief', 'sol', 'fcr'],
  }),
  general: freezeLane({
    id: 'general',
    title: 'General',
    northStar: 'founder_intent_outcome',
    metrics: ['founder_intent_outcome', 'task_completion', 'revision_count'],
    recommendedExecutors: ['sol', 'chief', 'fcr'],
  }),
});

const FAMILY_LANES = Object.freeze({
  'brand.voice.and.content': 'content.creation',
  'repo.audit.first': 'repo.engineering',
  'debug.without.thrashing': 'repo.engineering',
  'migration.and.release.planner': 'repo.engineering',
  'compliance.and.security.sentinel': 'repo.engineering',
  'application.builder': 'co.production',
  'market.and.pricing.strategist': 'research.strategy',
  'ux.design.system.auditor': 'product.design',
  'ecommerce.storefront.operator': 'commerce',
  'reasoning.deep.systems': 'system.reasoning',
  'reasoning.adversarial.challenge': 'system.reasoning',
});

function normalizeText(value) {
  return String(value ?? '').trim();
}

function stableHash(value) {
  const text = String(value ?? '');
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    a ^= code;
    a = Math.imul(a, 16777619);
    b = ((b << 5) + b) ^ code;
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeToken(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '') || 'general';
}

export function inferLane({ familyId = '', pack = '', category = '', workflowId = '' } = {}) {
  if (FAMILY_LANES[familyId]) return FAMILY_LANES[familyId];
  const haystack = `${pack} ${category} ${workflowId}`.toLowerCase();
  if (/(content|copy|post|social|brand|video|caption)/.test(haystack)) return 'content.creation';
  if (/(debug|coding|repo|security|ops|deploy|migration|release|test)/.test(haystack)) return 'repo.engineering';
  if (/(builder|co.?production|artifact|create)/.test(haystack)) return 'co.production';
  if (/(research|market|pricing|strategy|competitor|analysis)/.test(haystack)) return 'research.strategy';
  if (/(design|ux|ui|figma|canva)/.test(haystack)) return 'product.design';
  if (/(ecom|shopify|commerce|store|checkout)/.test(haystack)) return 'commerce';
  if (/(growth|funnel|retention|acquisition|conversion)/.test(haystack)) return 'growth.strategy';
  if (/(reason|redteam|system|audit)/.test(haystack)) return 'system.reasoning';
  return 'general';
}

export function laneContract(laneId) {
  return LANE_REGISTRY[laneId] || LANE_REGISTRY.general;
}

export function resolveNorthStar(laneId, requestedMetric = '') {
  const lane = laneContract(laneId);
  const requested = safeToken(requestedMetric);
  return lane.metrics.includes(requested) ? requested : lane.northStar;
}

export function recommendedRoute(laneId, channel = '') {
  const lane = laneContract(laneId);
  return Object.freeze({
    recommendedExecutors: [...lane.recommendedExecutors],
    channel: normalizeText(channel) || null,
    executionAuthority: 'advisory-only',
    publicationRequiresApproval: true,
  });
}

const memoryFallback = new Map();
let dbPromise = null;

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function';
}

function openDb() {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(PROMPT_MEMORY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('prompts')) {
        const store = db.createObjectStore('prompts', { keyPath: 'id' });
        store.createIndex('lineageId', 'lineageId', { unique: false });
        store.createIndex('libraryVisibility', 'libraryVisibility', { unique: false });
        store.createIndex('laneId', 'laneId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Prompt Memory database failed to open.'));
  });
  return dbPromise;
}

async function getRecord(id) {
  const db = await openDb();
  if (!db) return clone(memoryFallback.get(id) || null);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readonly');
    const request = tx.objectStore('prompts').get(id);
    request.onsuccess = () => resolve(clone(request.result || null));
    request.onerror = () => reject(request.error || new Error('Prompt Memory read failed.'));
  });
}

async function putRecord(record) {
  const db = await openDb();
  if (!db) {
    memoryFallback.set(record.id, clone(record));
    return clone(record);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    tx.objectStore('prompts').put(clone(record));
    tx.oncomplete = () => resolve(clone(record));
    tx.onerror = () => reject(tx.error || new Error('Prompt Memory write failed.'));
  });
}

async function allRecords() {
  const db = await openDb();
  if (!db) return [...memoryFallback.values()].map(clone);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readonly');
    const request = tx.objectStore('prompts').getAll();
    request.onsuccess = () => resolve((request.result || []).map(clone));
    request.onerror = () => reject(request.error || new Error('Prompt Memory list failed.'));
  });
}

function emitChanged(record = null) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent('promptos:prompt-memory-changed', {
    detail: { version: PROMPT_MEMORY_VERSION, promptId: record?.id || null },
  }));
}

function normalizeSource(source = {}) {
  return {
    surface: safeToken(source.surface || 'unknown'),
    familyId: normalizeText(source.familyId) || null,
    platform: normalizeText(source.platform) || null,
    stage: normalizeText(source.stage) || null,
    recipeId: normalizeText(source.recipeId) || null,
  };
}

export async function recordGeneratedPrompt(input = {}) {
  const promptText = normalizeText(input.promptText);
  if (!promptText) throw new Error('Prompt Memory requires non-empty promptText.');

  const source = normalizeSource(input.source);
  const laneId = LANE_REGISTRY[input.laneId] ? input.laneId : inferLane({
    familyId: source.familyId || '',
    pack: input.pack || '',
    category: input.category || '',
    workflowId: input.workflowId || '',
  });
  const workflowId = safeToken(input.workflowId || source.familyId || `${source.surface}.prompt`);
  const title = normalizeText(input.title) || 'Untitled prompt';
  const founderIntent = normalizeText(input.founderIntent) || title;
  const ownerScope = normalizeText(input.ownerScope) || 'browser-local';
  const northStarMetric = resolveNorthStar(laneId, input.northStar?.metric || input.successMetric || '');
  const lineageId = `lineage_${stableHash(`${ownerScope}|${laneId}|${workflowId}|${title.toLowerCase()}`)}`;
  const promptHash = stableHash(promptText);
  const id = `pm_${stableHash(`${ownerScope}|${lineageId}|${promptHash}`)}`;
  const existing = await getRecord(id);
  const now = new Date().toISOString();

  if (existing) {
    existing.observations = Number(existing.observations || 1) + 1;
    existing.lastSeenAt = now;
    existing.updatedAt = now;
    const saved = await putRecord(existing);
    emitChanged(saved);
    return saved;
  }

  const lineage = (await allRecords())
    .filter((record) => record.lineageId === lineageId)
    .sort((a, b) => Number(a.version || 0) - Number(b.version || 0));
  const previous = lineage[lineage.length - 1] || null;
  const version = previous ? Number(previous.version || 1) + 1 : 1;
  const route = recommendedRoute(laneId, input.channel || input.route?.channel || '');

  const record = {
    schemaVersion: 1,
    memoryVersion: PROMPT_MEMORY_VERSION,
    id,
    lineageId,
    supersedesId: previous?.id || null,
    version,
    promptHash,
    title,
    promptText,
    laneId,
    workflowId,
    founderIntent,
    northStar: {
      metric: northStarMetric,
      target: normalizeText(input.northStar?.target || input.successTarget || '') || null,
      direction: normalizeText(input.northStar?.direction || '') || null,
      source: normalizeText(input.northStar?.source || '') || 'lane-default',
    },
    route: {
      ...route,
      ...(input.route && typeof input.route === 'object' ? clone(input.route) : {}),
      recommendedExecutors: [...(input.route?.recommendedExecutors || route.recommendedExecutors)],
      publicationRequiresApproval: true,
      executionAuthority: 'advisory-only',
    },
    source,
    ownerScope,
    status: STATUS.GENERATED,
    libraryVisibility: VISIBILITY.REVISION,
    observations: 1,
    executions: [],
    outcomes: [],
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };

  const saved = await putRecord(record);
  emitChanged(saved);
  return saved;
}

export async function recordExecution(promptId, execution = {}) {
  const record = await getRecord(promptId);
  if (!record) throw new Error(`Prompt Memory record not found: ${promptId}`);
  const now = new Date().toISOString();
  const normalized = {
    id: normalizeText(execution.id) || `exec_${stableHash(`${promptId}|${now}|${execution.executor || ''}|${execution.channel || ''}|${execution.artifactRef || ''}`)}`,
    at: normalizeText(execution.at) || now,
    executor: safeToken(execution.executor || 'unknown'),
    channel: normalizeText(execution.channel) || record.route?.channel || null,
    status: ['produced', 'published', 'failed', 'unknown'].includes(execution.status) ? execution.status : 'unknown',
    artifactRef: normalizeText(execution.artifactRef) || null,
    contentHash: normalizeText(execution.contentHash) || null,
    note: normalizeText(execution.note) || null,
  };
  record.executions = [...(record.executions || []), normalized];
  if (normalized.channel && !record.route?.channel) record.route.channel = normalized.channel;
  record.updatedAt = now;
  const saved = await putRecord(record);
  emitChanged(saved);
  return saved;
}

export async function recordOutcome(promptId, outcome = {}) {
  const record = await getRecord(promptId);
  if (!record) throw new Error(`Prompt Memory record not found: ${promptId}`);
  const now = new Date().toISOString();
  const satisfied = outcome.founderIntentSatisfied;
  const normalized = {
    at: normalizeText(outcome.at) || now,
    metric: resolveNorthStar(record.laneId, outcome.metric || record.northStar?.metric || ''),
    value: outcome.value == null || outcome.value === '' ? null : String(outcome.value),
    founderIntentSatisfied: satisfied === true ? true : satisfied === false ? false : null,
    evidenceRef: normalizeText(outcome.evidenceRef) || null,
    executionRef: normalizeText(outcome.executionRef) || null,
    channel: normalizeText(outcome.channel) || record.route?.channel || null,
    attribution: ['prompt', 'executor', 'channel', 'timing', 'audience', 'unknown'].includes(outcome.attribution) ? outcome.attribution : 'unknown',
    note: normalizeText(outcome.note) || null,
  };
  record.outcomes = [...(record.outcomes || []), normalized];
  record.updatedAt = now;

  if (normalized.founderIntentSatisfied === true) {
    record.status = STATUS.PROVEN;
    record.libraryVisibility = VISIBILITY.VISUAL;
  } else if (normalized.founderIntentSatisfied === false) {
    record.status = STATUS.REVISION_REQUIRED;
    record.libraryVisibility = VISIBILITY.REVISION;
  } else {
    record.status = STATUS.OUTCOME_PENDING;
    record.libraryVisibility = VISIBILITY.REVISION;
  }

  const saved = await putRecord(record);
  emitChanged(saved);
  return saved;
}

export async function listPrompts({ libraryVisibility = '', laneId = '', status = '' } = {}) {
  const records = await allRecords();
  return records
    .filter((record) => !libraryVisibility || record.libraryVisibility === libraryVisibility)
    .filter((record) => !laneId || record.laneId === laneId)
    .filter((record) => !status || record.status === status)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function exportPromptMemory() {
  const prompts = await listPrompts();
  return {
    schemaVersion: 1,
    memoryVersion: PROMPT_MEMORY_VERSION,
    exportedAt: new Date().toISOString(),
    persistence: 'browser-local-indexeddb-with-memory-fallback',
    canonicalSyncAuthority: 'Founder Control Room',
    fcrSync: 'not-connected',
    prompts,
  };
}

export async function clearPromptMemory() {
  const db = await openDb();
  if (!db) {
    memoryFallback.clear();
    emitChanged();
    return;
  }
  await new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    tx.objectStore('prompts').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Prompt Memory clear failed.'));
  });
  emitChanged();
}

export const promptMemoryStatus = Object.freeze({ STATUS, VISIBILITY });
