import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const CONTRACT_PATH = '.control-room/creative-studio.contract.json';
const LIBRARY_PATH = 'parts/p09-cont-design.js';
const EXPECTED_IDS = [300,301,302,303,304,305,306,307,308,309];
const EXPECTED_PROVIDERS = ['chatgpt-image','midjourney','leonardo','ideogram','flux'];
const errors = [];

const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf8'));
const source = await readFile(LIBRARY_PATH, 'utf8');
const sandbox = {PROMPTS: []};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, {filename: LIBRARY_PATH});

function fail(condition, message) {
  if (!condition) errors.push(message);
}

fail(contract.contractId === 'promptos/creative-studio@v1', 'creative studio contract id drifted');
fail(contract.authority?.mode === 'advisory-only', 'creative studio must remain advisory-only');
fail(contract.authority?.publication === 'separate-founder-gate', 'publication must remain separately founder-gated');
fail(contract.authority?.brandTruth === 'project-local-canon-wins', 'project-local brand canon must remain stronger authority');

const modes = Array.isArray(contract.modes) ? contract.modes : [];
fail(modes.length === EXPECTED_IDS.length, 'contract must declare exactly ten creative modes');
fail(modes.map((mode) => mode.promptId).join(',') === EXPECTED_IDS.join(','), 'creative mode prompt ids drifted');
fail(modes.find((mode) => mode.id === 'image-edit')?.inputImageRequired === true, 'image-edit must require a source image');

const providerKeys = Object.keys(contract.providers || {});
fail(providerKeys.join(',') === EXPECTED_PROVIDERS.join(','), 'provider adapter set or order drifted');

for (const variable of ['audience','platform','aspectRatio','mood','style','referenceMode','outputUse']) {
  fail(Array.isArray(contract.variables?.[variable]?.options) && contract.variables[variable].options.length > 1, `dropdown variable ${variable} is missing options`);
}

const limitations = (contract.limitations || []).map((item) => String(item));
fail(limitations.some((item) => item.includes('Click-through rate') || item.includes('CTR')), 'limitations must disclose click-through/CTR boundary');
for (const marker of ['vector','trademark','typeset','Provider capabilities and syntax can change']) {
  fail(limitations.some((item) => item.includes(marker)), `limitations must disclose ${marker} boundary`);
}

const creativePrompts = sandbox.PROMPTS.filter((prompt) => EXPECTED_IDS.includes(prompt?.id));
fail(creativePrompts.length === EXPECTED_IDS.length, 'runtime library must expose all ten creative prompts');
fail(new Set(creativePrompts.map((prompt) => prompt.id)).size === EXPECTED_IDS.length, 'creative prompt ids must be unique');

for (const id of EXPECTED_IDS) {
  const prompt = creativePrompts.find((entry) => entry.id === id);
  fail(Boolean(prompt), `missing creative prompt ${id}`);
  if (!prompt) continue;
  fail(prompt.cat === 'design', `creative prompt ${id} must remain in design category`);
  fail(Array.isArray(prompt.platforms) && prompt.platforms.join(',') === EXPECTED_PROVIDERS.join(','), `creative prompt ${id} provider tabs drifted`);
  for (const provider of EXPECTED_PROVIDERS) {
    const body = prompt.versions?.[provider];
    fail(typeof body === 'string' && body.length > 180, `creative prompt ${id} missing substantive ${provider} adapter`);
  }
  fail(String(prompt.notes || '').includes('creative-studio.contract.json'), `creative prompt ${id} must point back to canonical contract`);
}

const social = creativePrompts.find((prompt) => prompt.id === 300);
fail(social?.versions?.['chatgpt-image']?.includes('Create the final visual now'), 'ChatGPT image adapter must request actual visual generation');
fail(social?.versions?.midjourney?.endsWith('--ar [ASPECT_RATIO] [OPTIONAL_MJ_PARAMETERS]'), 'Midjourney adapter must keep parameters at the end');
fail(social?.versions?.ideogram?.includes('EXACT VISIBLE TEXT'), 'Ideogram adapter must prioritize exact short display copy');
fail(social?.versions?.leonardo?.includes('NEGATIVE CONSTRAINTS:'), 'Leonardo adapter must expose negative constraints');
fail(social?.versions?.flux?.includes('reserve a clean typesetting zone'), 'Flux adapter must expose text fallback');

const thumbnail = creativePrompts.find((prompt) => prompt.id === 302);
fail(thumbnail?.versions?.['chatgpt-image']?.includes('Do not claim or imply a guaranteed CTR'), 'thumbnail prompt must reject guaranteed CTR claims');

const edit = creativePrompts.find((prompt) => prompt.id === 304);
fail(edit?.versions?.['chatgpt-image']?.includes('BLOCKED if the actual source image is not supplied'), 'image edit must fail closed without source image');
fail(edit?.versions?.leonardo?.includes('preserve identity and geometry'), 'image edit must preserve identity/geometry');

const logo = creativePrompts.find((prompt) => prompt.id === 308);
fail(logo?.versions?.['chatgpt-image']?.includes('trademark-cleared'), 'logo concept prompt must disclose trademark boundary');

const master = creativePrompts.find((prompt) => prompt.id === 309);
for (const route of ['social-graphic','poster','thumbnail','brand-identity','image-edit','product-ad','infographic','presentation-slide','logo-concepts']) {
  fail(master?.versions?.['chatgpt-image']?.includes(route), `master router missing ${route}`);
}
fail(master?.versions?.['chatgpt-image']?.includes('Never let a provider become brand or publication authority'), 'master router must preserve provider-neutral authority');

for (const forbidden of ['15+ years','10%+ CTR','consistently hit','globally recognized brands']) {
  fail(!source.includes(forbidden), `creative studio must not rely on unverifiable persona/performance claim: ${forbidden}`);
}

if (errors.length) {
  console.error('Creative Studio contract verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  schemaVersion: 1,
  contractId: contract.contractId,
  promptIds: EXPECTED_IDS,
  providers: EXPECTED_PROVIDERS,
  status: 'passed'
}));
