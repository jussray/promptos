const MAX_RESPONSE_BYTES = 64 * 1024;
const TIMEOUT_MS = 60_000;

const PROVIDERS = Object.freeze({
  openai: {key: 'OPENAI_API_KEY', model: 'PROMPTOS_OPENAI_MODEL', defaultModel: 'gpt-5.6-sol', url: 'https://api.openai.com/v1/responses'},
  anthropic: {key: 'ANTHROPIC_API_KEY', model: 'PROMPTOS_ANTHROPIC_MODEL', defaultModel: 'claude-sonnet-5', url: 'https://api.anthropic.com/v1/messages'},
  muse: {key: 'MODEL_API_KEY', model: 'PROMPTOS_MUSE_MODEL', defaultModel: 'muse-spark-1.3', url: 'https://api.meta.ai/v1/responses'},
});

function configFor(env, provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('unsupported provider');
  return {
    ...config,
    keyValue: String(env?.[config.key] || '').trim(),
    modelName: String(env?.[config.model] || '').trim() || config.defaultModel,
  };
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

export async function invokeProvider(env, input, fetchImpl = fetch) {
  const provider = String(input?.provider || '').trim().toLowerCase();
  const prompt = String(input?.prompt || '').trim();
  if (!prompt || prompt.length > 24_000) throw new Error('invalid prompt');
  if (String(input?.sensitivity || 'standard').trim().toLowerCase() === 'restricted') {
    throw new Error('restricted context is not authorized for external providers');
  }
  const config = configFor(env, provider);
  if (!config.keyValue) throw new Error(`${provider} provider is not configured`);

  const headers = provider === 'anthropic'
    ? {'x-api-key': config.keyValue, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}
    : {authorization: `Bearer ${config.keyValue}`, 'content-type': 'application/json'};
  const body = provider === 'anthropic'
    ? {model: config.modelName, max_tokens: 2000, messages: [{role: 'user', content: prompt}]}
    : {model: config.modelName, input: prompt, store: false, max_output_tokens: 2000};

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
  };
}
