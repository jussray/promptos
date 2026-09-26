import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const requestedOutputDir = process.env.PROMPTOS_PUBLIC_SITE_DIR || '_site';
const repositoryRoot = path.resolve(process.cwd());
const outputDir = path.resolve(repositoryRoot, requestedOutputDir);
const canonicalOutputDir = path.join(repositoryRoot, '_site');
const expectedHead = process.env.EXPECTED_HEAD_SHA || '';

if (outputDir !== canonicalOutputDir) {
  throw new Error('unsafe public staging directory: PromptOS public staging may only use the repository-local _site directory');
}
if (!/^[0-9a-f]{40}$/.test(expectedHead)) {
  throw new Error('EXPECTED_HEAD_SHA must be an exact lowercase 40-character SHA');
}

const publicFiles = [
  'index.html',
  'parts/auth.js',
  'parts/p05-new-prompts.js',
  'parts/p06-gap-prompts.js',
  'parts/p07-ship-ultrathink-skills.js',
  'parts/p08-cont-redteam.js',
  'parts/p09-cont-design.js',
  'parts/p10-cont-ops-growth.js',
  'parts/p11-make-ui.mjs',
  'parts/app.js',
  'src/workflow-artifact.mjs',
  'src/prompt-memory.js',
  'src/prompt-memory-ui.js',
  'src/catalog-ui.js',
  'src/catalog-runtime/index.js',
  'src/catalog-runtime/openPromptCard.js',
  'src/catalog-runtime/catalog/buildCatalog.js',
  'src/catalog-runtime/catalog/builderPrompts.js',
  'src/catalog-runtime/catalog/workflowPrompts.js',
  'src/catalog-runtime/catalog/clauses.js',
  'src/catalog-runtime/catalog/compatibility.js',
  'src/catalog-runtime/catalog/families.js',
  'src/catalog-runtime/compiler/compilePrompt.js',
  'src/catalog-runtime/compiler/platformAdapters.js',
  'styles/catalog.css',
];

await rm(outputDir, { recursive: true, force: true });
for (const file of publicFiles) {
  const destination = path.join(outputDir, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(file, destination);
}

const stagedIndexPath = path.join(outputDir, 'index.html');
let index = await readFile(stagedIndexPath, 'utf8');
if (index.includes('name="promptos-deploy-sha"')) {
  throw new Error('checked-in index.html must not contain a deployed SHA marker');
}
if (!index.includes('</head>')) throw new Error('index.html is missing </head>');
index = index.replace(
  '</head>',
  `  <meta name="promptos-deploy-sha" content="${expectedHead}">\n</head>`,
);
await writeFile(stagedIndexPath, index, 'utf8');

async function walk(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, relative));
    else if (entry.isFile()) out.push(relative);
    else throw new Error(`unsupported staged filesystem entry: ${relative}`);
  }
  return out;
}

const actualFiles = (await walk(outputDir)).sort();
const expectedFiles = [...publicFiles].sort();
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`public staging allowlist drift: expected=${JSON.stringify(expectedFiles)} actual=${JSON.stringify(actualFiles)}`);
}

const forbiddenNamePatterns = [
  /(^|\/)\.git(?:\/|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)\.npmrc$/i,
  /\.(?:pem|key|p12|pfx)$/i,
  /(^|\/)(?:credentials?|secrets?)(?:\.|\/|$)/i,
];
for (const file of actualFiles) {
  for (const pattern of forbiddenNamePatterns) {
    if (pattern.test(file)) throw new Error(`forbidden public artifact path: ${file}`);
  }
}

const forbiddenContentPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i,
];
for (const file of actualFiles) {
  if (!/\.(?:html|js|mjs|css)$/i.test(file)) continue;
  const text = await readFile(path.join(outputDir, file), 'utf8');
  for (const pattern of forbiddenContentPatterns) {
    if (pattern.test(text)) throw new Error(`secret-like material detected in staged public file: ${file}`);
  }
}

console.log(JSON.stringify({
  status: 'passed',
  outputDir: '_site',
  expectedHead,
  fileCount: actualFiles.length,
  files: actualFiles,
  exactAllowlist: true,
  secretLikeMaterialDetected: false,
}));
