import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {compileWorkflowArtifact, validateWorkflowArtifact} from '../src/workflow-artifact.mjs';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function list(value) {
  return typeof value === 'string'
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

function missionCompilerFromSource(source) {
  const sandbox = {
    PROMPTS: [],
    window: {},
    document: {
      getElementById() { return null; },
      querySelector() { return null; },
      createElement() { return {className:'', id:'', innerHTML:'', appendChild(){}, addEventListener(){}}; },
      body: {appendChild(){}, removeChild(){}},
      execCommand() { return true; },
    },
    navigator: {},
    setTimeout,
    clearTimeout,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {filename: 'parts/p10-cont-ops-growth.js'});
  if (typeof sandbox.window.compilePromptOSMission !== 'function') {
    throw new Error('Founder OS mission compiler is unavailable.');
  }
  return sandbox.window.compilePromptOSMission;
}

const input = args(process.argv.slice(2));
if (input.help === 'true') {
  console.log('Usage: node scripts/make-workflow.mjs --intent "..." [--project owner/repo] [--id workflow-id] [--title "..."] [--constraints "a,b"] [--providers "github,cloudflare"] [--risk low|medium|high|critical] [--aliases "/alias"] [--lineage "ultrathink,goalfix"]');
  process.exit(0);
}
if (!input.intent?.trim()) {
  console.error('Missing required --intent.');
  process.exit(2);
}

const source = await readFile('parts/p10-cont-ops-growth.js', 'utf8');
const compileMission = missionCompilerFromSource(source);
const mission = compileMission({
  intent: input.intent,
  project: input.project,
  constraints: list(input.constraints),
  providers: list(input.providers),
  risk: input.risk,
});
const workflow = compileWorkflowArtifact(mission, {
  id: input.id,
  title: input.title,
  aliases: list(input.aliases),
  inputs: list(input.inputs),
  lineage: list(input.lineage),
  desiredOutcome: input['desired-outcome'],
  rollback: input.rollback,
});
const validation = validateWorkflowArtifact(workflow);
if (!validation.valid) {
  console.error(`Compiled workflow failed validation: ${validation.errors.join(' | ')}`);
  process.exit(3);
}

console.log(JSON.stringify(workflow, null, 2));
