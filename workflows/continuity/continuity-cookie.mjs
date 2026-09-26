import {
  createAssistantContinuityReceipt,
  createMainContinuityReceipt,
} from './continuity-fingerprint.mjs';

function parse(argv) {
  const out = { _: [], main: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    if (key === 'main') out.main.push(value);
    else out[key] = value;
  }
  return out;
}

function parseMainSpec(spec) {
  const match = String(spec).match(/^([^@]+)@([0-9a-fA-F]{40})$/);
  if (!match) throw new Error(`invalid --main value: ${spec}; expected owner/repo@40-char-sha`);
  return { repository: match[1], branch: 'main', sha: match[2] };
}

const input = parse(process.argv.slice(2));
const mode = input._[0];

if (mode === 'main') {
  console.log(JSON.stringify(createMainContinuityReceipt({
    repository: input.repository,
    branch: input.branch || 'main',
    sha: input.sha,
    observedAt: input['observed-at'],
  }), null, 2));
  process.exit(0);
}

if (mode === 'assistant') {
  console.log(JSON.stringify(createAssistantContinuityReceipt({
    source: input.source || 'chatgpt',
    operator: input.operator,
    mains: input.main.map(parseMainSpec),
  }), null, 2));
  process.exit(0);
}

console.error('Usage:\n  node workflows/continuity/continuity-cookie.mjs main --repository owner/repo --sha <40-char-sha> [--branch main]\n  node workflows/continuity/continuity-cookie.mjs assistant --operator gpt-5.6-sol --main owner/repo@<sha> [--main owner/repo@<sha> ...]');
process.exit(2);
