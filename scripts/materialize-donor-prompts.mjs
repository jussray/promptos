import vm from 'node:vm';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const DONOR_PATH = 'archive/promptos-donor-175.html';
export const OUTPUT_PATH = 'parts/p04-donor-missing.js';
export const MISSING_DONOR_IDS = Object.freeze([
  ...Array.from({length: 63}, (_, index) => index + 1),
  ...Array.from({length: 24}, (_, index) => index + 95),
  ...Array.from({length: 39}, (_, index) => index + 121),
]);

const EXPECTED_COUNT = 126;
const SOURCE_START = 'const PROMPTS = [';
const SOURCE_END = 'const BENCHMARKS = [';

function assert(condition, message) {
  if (!condition) throw new Error(`PromptOS donor materializer: ${message}`);
}

export function extractMissingDonorPrompts(source) {
  assert(typeof source === 'string' && source.length > 0, 'donor source is empty');
  const start = source.indexOf(SOURCE_START);
  const end = source.indexOf(SOURCE_END, start);
  assert(start >= 0, `missing source marker ${SOURCE_START}`);
  assert(end > start, `missing source marker ${SOURCE_END}`);

  const dataProgram = `${source.slice(start, end)}\nglobalThis.__PROMPTOS_DONOR__ = PROMPTS;`;
  const sandbox = Object.create(null);
  const context = vm.createContext(sandbox, {
    name: 'promptos-donor-data',
    codeGeneration: {strings: false, wasm: false},
  });
  const script = new vm.Script(dataProgram, {filename: DONOR_PATH});
  script.runInContext(context, {timeout: 1000});

  const donor = sandbox.__PROMPTOS_DONOR__;
  assert(Array.isArray(donor), 'historical PROMPTS array was not materialized');
  const byId = new Map();
  for (const prompt of donor) {
    assert(prompt && Number.isInteger(prompt.id), 'historical prompt has invalid id');
    assert(!byId.has(prompt.id), `historical donor has duplicate id ${prompt.id}`);
    byId.set(prompt.id, prompt);
  }

  const additions = MISSING_DONOR_IDS.map((id) => {
    assert(byId.has(id), `historical donor is missing required id ${id}`);
    return byId.get(id);
  });
  assert(additions.length === EXPECTED_COUNT, `expected ${EXPECTED_COUNT} additions, got ${additions.length}`);
  assert(new Set(additions.map((prompt) => prompt.id)).size === EXPECTED_COUNT, 'selected donor ids are not unique');
  assert(!additions.some((prompt) => prompt.id === 119 || prompt.id === 120), 'historical gaps 119/120 must remain gaps');
  assert(!additions.some((prompt) => (prompt.id >= 64 && prompt.id <= 94) || (prompt.id >= 160 && prompt.id <= 206)), 'materializer selected an already-canonical donor id');
  return additions;
}

export function renderMissingPromptModule(additions) {
  assert(Array.isArray(additions) && additions.length === EXPECTED_COUNT, 'render requires the exact missing donor set');
  return `/* GENERATED from ${DONOR_PATH}; do not hand-edit.\n   Missing donor IDs only: 1-63, 95-118, 121-159.\n*/\n(function(){\n'use strict';\nif (!Array.isArray(window.PROMPTS)) throw new Error('PromptOS donor module requires window.PROMPTS');\nvar additions = ${JSON.stringify(additions, null, 2)};\nvar existing = new Set(window.PROMPTS.map(function(prompt){ return prompt && prompt.id; }));\nfor (var index = 0; index < additions.length; index += 1) {\n  var prompt = additions[index];\n  if (existing.has(prompt.id)) throw new Error('PromptOS donor duplicate id ' + prompt.id);\n  window.PROMPTS.push(prompt);\n  existing.add(prompt.id);\n}\n})();\n`;
}

export async function materializeMissingDonorPrompts({write = false} = {}) {
  const source = await readFile(DONOR_PATH, 'utf8');
  const additions = extractMissingDonorPrompts(source);
  const moduleSource = renderMissingPromptModule(additions);
  if (write) await writeFile(OUTPUT_PATH, moduleSource, 'utf8');
  return Object.freeze({
    donorPath: DONOR_PATH,
    outputPath: OUTPUT_PATH,
    count: additions.length,
    ids: additions.map((prompt) => prompt.id),
    moduleSource,
  });
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const write = process.argv.includes('--write');
  const result = await materializeMissingDonorPrompts({write});
  console.log(JSON.stringify({
    donorPath: result.donorPath,
    outputPath: result.outputPath,
    count: result.count,
    firstId: result.ids[0],
    lastId: result.ids[result.ids.length - 1],
    wroteOutput: write,
  }));
}
