import assert from 'node:assert/strict';
import { executeOptimizerExperiment } from '../cloudflare-worker/optimizer-executor.js';

const calls = [];
const fakeFetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  calls.push(body);
  const isEvaluator = String(body.input || body.messages?.[0]?.content || '').includes('Score the candidate output');
  const providerBody = isEvaluator
    ? { id: 'eval-1', output_text: JSON.stringify({metrics:{quality:0.9,correctness:0.9}}) }
    : { id: 'run-1', output_text: 'bounded candidate answer' };
  return new Response(JSON.stringify(providerBody), {status: 200});
};

const result = await executeOptimizerExperiment({
  OPENAI_API_KEY: 'test',
  PROMPTOS_OPENAI_MODEL: 'test-model',
}, {
  experiment: {id:'exp-runtime', intentFingerprint:'intent-proof'},
  cases: [{id:'case-1', input:'Explain the proof.', rubric:'Prefer correct, concise answers.'}],
  candidates: [
    {id:'baseline', provider:'openai', instruction:'Answer carefully.'},
    {id:'challenger', provider:'openai', instruction:'Answer carefully and cite the supplied proof.'},
  ],
  evaluator: {provider:'openai', instruction:'Score quality and correctness.'},
  metricWeights: {quality:1, correctness:2},
  baselineCandidateId:'baseline',
}, fakeFetch);

assert.equal(calls.length, 4);
assert.equal(result.authority.promotion, false);
assert.equal(result.authority.catalogMutation, false);
assert.equal(result.executionEvidence.length, 2);
assert.match(result.receipt.receiptFingerprint, /^[a-f0-9]{24}$/);
console.log(JSON.stringify({status:'passed', receipt:result.receipt.receiptFingerprint, calls:calls.length}));
