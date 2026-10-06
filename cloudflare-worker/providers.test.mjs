import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAnthropicBatch,
  getAnthropicBatchResults,
  invokeProvider,
} from './providers.js';
import worker from './analytics.js';

const env = {OPENAI_API_KEY: 'test-key'};
const input = {provider: 'openai', prompt: 'Compile a bounded workflow.'};
const jsonResponse = (body) => new Response(JSON.stringify(body), {status: 200});

test('completed OpenAI output returns evidence with no authority', async () => {
  const result = await invokeProvider(env, input, async () => jsonResponse({
    id: 'resp_complete', status: 'completed', output_text: 'finished answer',
  }));
  assert.equal(result.text, 'finished answer');
  assert.equal(result.evidenceRef, 'provider:openai:resp_complete');
  assert.equal(result.authority, 'none');
});

for (const status of ['incomplete', 'failed', 'cancelled', 'queued', 'in_progress', undefined]) {
  test(`OpenAI status ${status} rejects partial text without retrying`, async () => {
    let calls = 0;
    await assert.rejects(() => invokeProvider(env, input, async () => {
      calls += 1;
      return jsonResponse({id: 'resp_partial', status, output_text: 'unfinished answer',
        error: {message: 'untrusted-provider-detail'}});
    }), {message: 'openai provider returned a non-completed response'});
    assert.equal(calls, 1);
  });
}


test('Anthropic advisor is bounded and advisor caching is opt-in', async () => {
  const fetchMock = async (_url, init) => {
    const payload = JSON.parse(String(init.body));
    assert.match(init.headers['anthropic-beta'], /advisor-tool-2026-03-01/);
    assert.equal(payload.tools[0].max_uses, 2);
    assert.equal(payload.tools[0].max_tokens, 2048);
    assert.equal(payload.tools[0].caching, undefined);
    return jsonResponse({
      id: 'msg_promptos_advisor_1',
      type: 'message',
      role: 'assistant',
      content: [
        {type: 'advisor_tool_result', tool_use_id: 'advisor_1', content: {type: 'advisor_redacted_result', encrypted_content: 'opaque'}},
        {type: 'text', text: 'result'},
      ],
      usage: {
        input_tokens: 20,
        output_tokens: 10,
        iterations: [
          {type: 'advisor_message', model: 'claude-fable-5', input_tokens: 200, output_tokens: 500},
        ],
      },
    });
  };

  const result = await invokeProvider({
    ANTHROPIC_API_KEY: 'key',
    PROMPTOS_ANTHROPIC_MODEL: 'claude-sonnet-5-5',
    PROMPTOS_ANTHROPIC_ADVISOR_ENABLED: 'true',
  }, {
    provider: 'anthropic',
    prompt: 'Implement a focused improvement.',
    useAdvisor: true,
  }, fetchMock);

  assert.equal(result.optimization.advisorRequested, true);
  assert.equal(result.optimization.advisorObserved, true);
  assert.equal(result.optimization.advisorCalls, 1);
  assert.equal(result.optimization.advisorOutputTokens, 500);
});

test('Anthropic fast mode is explicit, Opus-only, and observable', async () => {
  const fetchMock = async (_url, init) => {
    const payload = JSON.parse(String(init.body));
    assert.equal(payload.speed, 'fast');
    assert.match(init.headers['anthropic-beta'], /fast-mode-2026-02-01/);
    return jsonResponse({
      id: 'msg_promptos_fast_1',
      type: 'message',
      role: 'assistant',
      content: [{type: 'text', text: 'fast'}],
      usage: {input_tokens: 10, output_tokens: 5, speed: 'fast'},
    });
  };

  const result = await invokeProvider({
    ANTHROPIC_API_KEY: 'key',
    PROMPTOS_ANTHROPIC_MODEL: 'claude-opus-5-5',
    PROMPTOS_ANTHROPIC_FAST_MODE_ENABLED: 'true',
  }, {
    provider: 'anthropic',
    prompt: 'Latency-sensitive work.',
    useFast: true,
  }, fetchMock);

  assert.equal(result.optimization.fastRequested, true);
  assert.equal(result.optimization.speedObserved, 'fast');
});

test('Anthropic batch uses stable 1h cache context and rejects fast mode', async () => {
  const fetchMock = async (url, init) => {
    assert.equal(String(url), 'https://api.anthropic.com/v1/messages/batches');
    const payload = JSON.parse(String(init.body));
    assert.equal(payload.requests.length, 2);
    assert.deepEqual(payload.requests[0].params.system[0].cache_control, {type: 'ephemeral', ttl: '1h'});
    return jsonResponse({
      id: 'msgbatch_promptos_1',
      type: 'message_batch',
      processing_status: 'in_progress',
      request_counts: {processing: 2, succeeded: 0, errored: 0, canceled: 0, expired: 0},
    });
  };

  const result = await createAnthropicBatch({
    ANTHROPIC_API_KEY: 'key',
    PROMPTOS_ANTHROPIC_BATCH_ENABLED: 'true',
  }, {
    requests: [
      {customId: 'case_1', prompt: 'One', stableContext: 'shared'},
      {customId: 'case_2', prompt: 'Two', stableContext: 'shared'},
    ],
  }, fetchMock);

  assert.equal(result.batchId, 'msgbatch_promptos_1');
  assert.equal(result.mode, 'batch');

  await assert.rejects(
    () => createAnthropicBatch({
      ANTHROPIC_API_KEY: 'key',
      PROMPTOS_ANTHROPIC_BATCH_ENABLED: 'true',
    }, {
      requests: [{customId: 'fast_case', prompt: 'No', useFast: true}],
    }, fetchMock),
    /does not support fast mode/,
  );
});

test('Anthropic batch results preserve custom_id rather than input ordering', async () => {
  const lines = [
    JSON.stringify({custom_id: 'case_2', result: {type: 'succeeded', message: {id: 'msg_2'}}}),
    JSON.stringify({custom_id: 'case_1', result: {type: 'errored', error: {type: 'invalid_request_error'}}}),
  ].join('\n');
  const result = await getAnthropicBatchResults({
    ANTHROPIC_API_KEY: 'key',
  }, 'msgbatch_promptos_1', async () => new Response(lines, {
    status: 200,
    headers: {'content-type': 'application/jsonl'},
  }));

  assert.deepEqual(result.results.map((item) => item.custom_id), ['case_2', 'case_1']);
});

test('protected /providers route dispatches batch mode without widening authority', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    id: 'msgbatch_route_1',
    type: 'message_batch',
    processing_status: 'in_progress',
    request_counts: {processing: 1, succeeded: 0, errored: 0, canceled: 0, expired: 0},
  });
  try {
    const response = await worker.fetch(new Request('https://promptos.example/providers', {
      method: 'POST',
      headers: {
        authorization: 'Bearer operator-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'batch',
        operation: 'create',
        requests: [{customId: 'route_1', prompt: 'Analyze this.'}],
      }),
    }), {
      PROMPTOS_AI_OPERATOR_KEY: 'operator-key',
      PROMPTOS_ANTHROPIC_BATCH_ENABLED: 'true',
      ANTHROPIC_API_KEY: 'key',
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.result.mode, 'batch');
    assert.equal(body.result.authority, 'none');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
