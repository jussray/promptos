const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_BATCH_RESULTS_BYTES = 1024 * 1024;
const MAX_BATCH_RESULTS_ITEMS = 100;
const TIMEOUT_MS = 60_000;
const ANTHROPIC_ADVISOR_BETA = 'advisor-tool-2026-03-01';
const ANTHROPIC_FAST_BETA = 'fast-mode-2026-02-01';
const ANTHROPIC_BATCH_URL = 'https://api.anthropic.com/v1/messages/batches';
const DEFAULT_ANTHROPIC_ADVISOR_MODEL = 'claude-fable-5';
const ANTHROPIC_FAST_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-opus-4-8']);
const SAFE_MUSE_MODEL = /^muse-spark-1\.(?:1|2|3)$/;
const ANTHROPIC_ADVISOR_SYSTEM = 'You have access to an advisor tool backed by a stronger reviewer model. Call advisor before substantive implementation work, give the advice serious weight, then implement. Orientation and reading are not substantive work. Advisor guidance does not grant execution authority.';

const PROVIDERS = Object.freeze({
  openai: {key: 'OPENAI_API_KEY', model: 'PROMPTOS_OPENAI_MODEL', defaultModel: 'gpt-5.6-sol', url: 'https://api.openai.com/v1/responses'},
  anthropic: {key: 'ANTHROPIC_API_KEY', model: 'PROMPTOS_ANTHROPIC_MODEL', defaultModel: 'claude-sonnet-5', url: 'https://api.anthropic.com/v1/messages'},
  muse: {key: 'MODEL_API_KEY', model: 'PROMPTOS_MUSE_MODEL', defaultModel: 'muse-spark-1.3', url: 'https://api.meta.ai/v1/responses'},
});

function configFor(env, provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('unsupported provider');
  const configuredModel = String(env?.[config.model] || '').trim();
  // Muse (FCR semantics): no default fallback — the model must be explicitly
  // configured AND allow-listed, otherwise the provider is not configured.
  const modelName = provider === 'muse'
    ? (SAFE_MUSE_MODEL.test(configuredModel) ? configuredModel : '')
    : (configuredModel || config.defaultModel);
  return {
    ...config,
    keyValue: provider === 'muse' && !modelName ? '' : String(env?.[config.key] || '').trim(),
    modelName,
  };
}

function enabled(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function cacheTtl(value) {
  const normalized = String(value || '').trim();
  return normalized === '5m' || normalized === '1h' ? normalized : null;
}

function appendAnthropicBeta(headers, beta) {
  const existing = String(headers['anthropic-beta'] || '').trim();
  const values = new Set(
    [existing, beta]
      .filter(Boolean)
      .flatMap((value) => value.split(',').map((entry) => entry.trim()).filter(Boolean)),
  );
  return { ...headers, 'anthropic-beta': [...values].join(',') };
}

function fastModeRequested(env, input, modelName) {
  const requested = enabled(env.PROMPTOS_ANTHROPIC_FAST_MODE_ENABLED) && input?.useFast === true;
  if (!requested) return false;
  if (!ANTHROPIC_FAST_MODELS.has(modelName)) {
    throw new Error('Anthropic fast mode requires Claude Opus 5.5, Opus 5, or Opus 4.8');
  }
  return true;
}

function advisorTool(env, input, ttl) {
  const requested = enabled(env.PROMPTOS_ANTHROPIC_ADVISOR_ENABLED) && input?.useAdvisor === true;
  if (!requested) return { requested: false, tool: null };
  const advisorCacheEnabled = enabled(env.PROMPTOS_ANTHROPIC_ADVISOR_CACHE_ENABLED);
  return {
    requested: true,
    tool: {
      type: 'advisor_20260301',
      name: 'advisor',
      model: String(env.PROMPTOS_ANTHROPIC_ADVISOR_MODEL || '').trim() || DEFAULT_ANTHROPIC_ADVISOR_MODEL,
      max_uses: 2,
      max_tokens: 2_048,
      ...(advisorCacheEnabled ? { caching: { type: 'ephemeral', ttl: ttl || '5m' } } : {}),
    },
  };
}

function usageNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function optimizationReceipt(body, { advisorRequested, cacheTtl, fastRequested }) {
  const usage = body && typeof body.usage === 'object' && body.usage ? body.usage : {};
  const content = Array.isArray(body?.content) ? body.content : [];
  const iterations = Array.isArray(usage.iterations) ? usage.iterations : [];
  const advisorIterations = iterations.filter((entry) => entry?.type === 'advisor_message');
  return {
    advisorRequested,
    advisorObserved: content.some((block) => block?.type === 'advisor_tool_result'),
    advisorCalls: advisorIterations.length,
    advisorInputTokens: advisorIterations.reduce((sum, entry) => sum + usageNumber(entry?.input_tokens), 0),
    advisorOutputTokens: advisorIterations.reduce((sum, entry) => sum + usageNumber(entry?.output_tokens), 0),
    cacheTtl,
    fastRequested,
    speedObserved: typeof usage.speed === 'string' ? usage.speed : 'unknown',
    cacheReadInputTokens: usageNumber(usage.cache_read_input_tokens),
    cacheCreationInputTokens: usageNumber(usage.cache_creation_input_tokens),
    uncachedInputTokens: usageNumber(usage.input_tokens),
  };
}

function validBatchId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return id && id.length <= 200 && /^[A-Za-z0-9._:-]+$/.test(id) ? id : null;
}

function validCustomId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

export function providerStates(env = {}) {
  return Object.fromEntries(Object.keys(PROVIDERS).map((provider) => {
    const config = configFor(env, provider);
    return [provider, {state: config.keyValue ? 'INTEGRATED' : 'ABSENT', model: config.modelName}];
  }));
}

function validId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return id && id.length <= 200 && /^[A-Za-z0-9._:-]+$/.test(id) ? id : null;
}

function outputText(provider, body) {
  if (provider === 'openai' && body?.status !== 'completed') {
    throw new Error('openai provider returned a non-completed response');
  }
  if (provider === 'anthropic') {
    return (Array.isArray(body?.content) ? body.content : [])
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text.trim()).filter(Boolean).join('\n');
  }
  if (typeof body?.output_text === 'string' && body.output_text.trim()) return body.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const block of Array.isArray(item?.content) ? item.content : []) {
      if (typeof block?.text === 'string' && block.text.trim()) parts.push(block.text.trim());
    }
  }
  return parts.join('\n');
}

async function readBoundedBatchResults(response) {
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BATCH_RESULTS_BYTES) {
    throw new Error('anthropic batch results exceeded bounded response size');
  }
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > MAX_BATCH_RESULTS_ITEMS) {
    throw new Error('anthropic batch results exceeded bounded item count');
  }
  return lines.map((line) => {
    let item;
    try { item = JSON.parse(line); } catch { throw new Error('anthropic batch results returned invalid JSONL'); }
    if (!validCustomId(item?.custom_id)) throw new Error('anthropic batch result returned invalid custom_id');
    if (!['succeeded', 'errored', 'canceled', 'expired'].includes(item?.result?.type)) {
      throw new Error('anthropic batch result returned invalid result type');
    }
    return item;
  });
}


export async function createAnthropicBatch(env, input, fetchImpl = fetch) {
  if (!enabled(env.PROMPTOS_ANTHROPIC_BATCH_ENABLED)) throw new Error('Anthropic batch processing is disabled');
  const config = configFor(env, 'anthropic');
  if (!config.keyValue) throw new Error('anthropic provider is not configured');
  const requests = Array.isArray(input?.requests) ? input.requests : [];
  if (requests.length === 0 || requests.length > 100) throw new Error('batch requests must contain 1..100 items');

  let includeAdvisorBeta = false;
  const compiled = requests.map((request) => {
    if (request?.useFast === true) throw new Error('Anthropic batch processing does not support fast mode');
    const customId = validCustomId(request?.customId);
    if (!customId) throw new Error('batch customId must match ^[a-zA-Z0-9_-]{1,64}$');
    const prompt = String(request?.prompt || '').trim();
    const stableContext = String(request?.stableContext || '').trim();
    if (!prompt || prompt.length > 24_000) throw new Error('batch prompt must be 1..24000 characters');
    if (stableContext.length > 120_000) throw new Error('batch stableContext must be <=120000 characters');

    const ttl = cacheTtl(request?.cacheTtl || env.PROMPTOS_ANTHROPIC_BATCH_CACHE_TTL || '1h');
    const advisor = advisorTool(env, request, ttl);
    includeAdvisorBeta = includeAdvisorBeta || advisor.requested;
    const system = [];
    if (advisor.requested) system.push({ type: 'text', text: ANTHROPIC_ADVISOR_SYSTEM });
    if (stableContext) {
      system.push({
        type: 'text',
        text: stableContext,
        ...(ttl ? { cache_control: { type: 'ephemeral', ttl } } : {}),
      });
    }
    return {
      custom_id: customId,
      params: {
        model: config.modelName,
        max_tokens: Number.isInteger(request?.maxTokens) && request.maxTokens >= 1
          ? Math.min(request.maxTokens, 128_000)
          : 2_000,
        ...(system.length ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
        ...(advisor.tool ? { tools: [advisor.tool] } : {}),
      },
    };
  });

  let headers = {
    'x-api-key': config.keyValue,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  if (includeAdvisorBeta) headers = appendAnthropicBeta(headers, ANTHROPIC_ADVISOR_BETA);

  let response;
  try {
    response = await fetchImpl(ANTHROPIC_BATCH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requests: compiled }),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('anthropic batch request failed');
  }
  if (!response.ok) throw new Error(`anthropic batch failed with HTTP ${response.status}`);
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) throw new Error('anthropic batch response too large');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('anthropic batch returned invalid JSON'); }
  const id = validBatchId(parsed?.id);
  if (!id || parsed?.type !== 'message_batch') throw new Error('anthropic batch returned invalid identity');
  return {
    state: 'INTEGRATED',
    provider: 'anthropic',
    mode: 'batch',
    batchId: id,
    status: String(parsed.processing_status || 'unknown'),
    requestCounts: parsed.request_counts || null,
    evidenceRef: `provider:anthropic-batch:${id}`,
    authority: 'none',
  };
}

export async function getAnthropicBatch(env, batchId, fetchImpl = fetch) {
  const config = configFor(env, 'anthropic');
  if (!config.keyValue) throw new Error('anthropic provider is not configured');
  const id = validBatchId(batchId);
  if (!id) throw new Error('invalid Anthropic batch id');
  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_BATCH_URL}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'x-api-key': config.keyValue, 'anthropic-version': '2023-06-01' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('anthropic batch status request failed');
  }
  if (!response.ok) throw new Error(`anthropic batch status failed with HTTP ${response.status}`);
  const parsed = await response.json();
  if (validBatchId(parsed?.id) !== id || parsed?.type !== 'message_batch') throw new Error('anthropic batch status returned invalid identity');
  return {
    state: 'INTEGRATED',
    provider: 'anthropic',
    mode: 'batch',
    batchId: id,
    status: String(parsed.processing_status || 'unknown'),
    requestCounts: parsed.request_counts || null,
    resultsUrlPresent: typeof parsed.results_url === 'string' && Boolean(parsed.results_url),
    evidenceRef: `provider:anthropic-batch:${id}`,
    authority: 'none',
  };
}

export async function getAnthropicBatchResults(env, batchId, fetchImpl = fetch) {
  const config = configFor(env, 'anthropic');
  if (!config.keyValue) throw new Error('anthropic provider is not configured');
  const id = validBatchId(batchId);
  if (!id) throw new Error('invalid Anthropic batch id');
  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_BATCH_URL}/${encodeURIComponent(id)}/results`, {
      method: 'GET',
      headers: { 'x-api-key': config.keyValue, 'anthropic-version': '2023-06-01' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('anthropic batch results request failed');
  }
  if (!response.ok) throw new Error(`anthropic batch results failed with HTTP ${response.status}`);
  const results = await readBoundedBatchResults(response);
  return {
    state: 'INTEGRATED',
    provider: 'anthropic',
    mode: 'batch',
    batchId: id,
    results,
    evidenceRef: `provider:anthropic-batch:${id}`,
    authority: 'none',
  };
}

export async function cancelAnthropicBatch(env, batchId, fetchImpl = fetch) {
  const config = configFor(env, 'anthropic');
  if (!config.keyValue) throw new Error('anthropic provider is not configured');
  const id = validBatchId(batchId);
  if (!id) throw new Error('invalid Anthropic batch id');
  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_BATCH_URL}/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'x-api-key': config.keyValue, 'anthropic-version': '2023-06-01' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('anthropic batch cancel request failed');
  }
  if (!response.ok) throw new Error(`anthropic batch cancel failed with HTTP ${response.status}`);
  const parsed = await response.json();
  if (validBatchId(parsed?.id) !== id || parsed?.type !== 'message_batch') throw new Error('anthropic batch cancel returned invalid identity');
  return {
    state: 'INTEGRATED',
    provider: 'anthropic',
    mode: 'batch',
    batchId: id,
    status: String(parsed.processing_status || 'unknown'),
    evidenceRef: `provider:anthropic-batch:${id}`,
    authority: 'none',
  };
}

export async function invokeProvider(env, input, fetchImpl = fetch) {
  const provider = String(input?.provider || '').trim().toLowerCase();
  const prompt = String(input?.prompt || '').trim();
  const stableContext = String(input?.stableContext || '').trim();
  if (!prompt || prompt.length > 24_000) throw new Error('invalid prompt');
  if (stableContext.length > 120_000) throw new Error('stableContext must be <=120000 characters');
  if (String(input?.sensitivity || 'standard').trim().toLowerCase() !== 'standard') {
    throw new Error('sensitive_context_not_authorized');
  }
  const source = String(input?.source || 'founder').trim().toLowerCase();
  if (!['founder', 'repository', 'system'].includes(source)) {
    throw new Error('user_content_not_authorized');
  }
  const config = configFor(env, provider);
  if (!config.keyValue) throw new Error(`${provider} provider is not configured`);

  let headers;
  let body;
  let anthropicOptions = null;
  if (provider === 'anthropic') {
    const ttl = cacheTtl(env.PROMPTOS_ANTHROPIC_CACHE_TTL);
    const advisor = advisorTool(env, input, ttl);
    const fastRequested = fastModeRequested(env, input, config.modelName);
    const system = [];
    if (advisor.requested) system.push({ type: 'text', text: ANTHROPIC_ADVISOR_SYSTEM });
    if (stableContext) {
      system.push({
        type: 'text',
        text: stableContext,
        ...(ttl ? { cache_control: { type: 'ephemeral', ttl } } : {}),
      });
    } else if (ttl && system.length) {
      system[system.length - 1] = {
        ...system[system.length - 1],
        cache_control: { type: 'ephemeral', ttl },
      };
    }
    headers = {'x-api-key': config.keyValue, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'};
    if (advisor.requested) headers = appendAnthropicBeta(headers, ANTHROPIC_ADVISOR_BETA);
    if (fastRequested) headers = appendAnthropicBeta(headers, ANTHROPIC_FAST_BETA);
    body = {
      model: config.modelName,
      max_tokens: 2000,
      ...(fastRequested ? { speed: 'fast' } : {}),
      ...(system.length ? { system } : {}),
      messages: [{role: 'user', content: prompt}],
      ...(advisor.tool ? { tools: [advisor.tool] } : {}),
    };
    anthropicOptions = { advisorRequested: advisor.requested, cacheTtl: ttl, fastRequested };
  } else {
    headers = {authorization: `Bearer ${config.keyValue}`, 'content-type': 'application/json'};
    body = {model: config.modelName, input: prompt, store: false, max_output_tokens: 2000};
  }

  let response;
  try {
    response = await fetchImpl(config.url, {method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS)});
  } catch {
    throw new Error(`${provider} provider request failed`);
  }
  if (!response.ok) throw new Error(`${provider} provider failed with HTTP ${response.status}`);
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) throw new Error(`${provider} response too large`);
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`${provider} returned invalid JSON`); }
  const id = validId(parsed?.id);
  if (!id) throw new Error(`${provider} provider returned invalid response identity`);
  const text = outputText(provider, parsed);
  if (!text) throw new Error(`${provider} provider returned no usable text`);
  return {
    state: 'INTEGRATED',
    provider,
    model: config.modelName,
    responseId: id,
    evidenceRef: `provider:${provider === 'muse' ? 'meta' : provider}:${id}`,
    authority: 'none',
    text,
    ...(provider === 'anthropic' && anthropicOptions
      ? { optimization: optimizationReceipt(parsed, anthropicOptions) }
      : {}),
  };
}
