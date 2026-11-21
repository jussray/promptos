// Self-test for scripts/staged-reference-check.mjs.
//
// 1. A faithful copy of the real public allowlist must have zero dangling
//    local references.
// 2. Mutants: deleting any one of several staged files that other staged
//    files load (the class of defect that previously shipped as 404s) must be
//    reported.
// 3. Synthetic fixtures prove external, fragment, data:, bare-specifier and
//    interpolated references are ignored while each resolution rule fires.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PUBLIC_SITE_FILES } from './public-site-files.mjs';
import { findDanglingReferences } from './staged-reference-check.mjs';

const repositoryRoot = process.cwd();
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'promptos-staged-refs-'));

async function stageCopy(name, omit = null) {
  const dir = path.join(tmpRoot, name);
  for (const file of PUBLIC_SITE_FILES) {
    if (file === omit) continue;
    const destination = path.join(dir, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(repositoryRoot, file), destination);
  }
  return dir;
}

async function fixture(name, files) {
  const dir = path.join(tmpRoot, name);
  for (const [file, text] of Object.entries(files)) {
    const destination = path.join(dir, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, text, 'utf8');
  }
  return dir;
}

try {
  // 1. Real allowlist is internally consistent.
  const clean = await findDanglingReferences(await stageCopy('clean'));
  assert.deepEqual(clean.dangling, [], `real public allowlist has dangling references: ${JSON.stringify(clean.dangling)}`);
  assert.ok(clean.checked >= 20, `too few references checked (${clean.checked}); extraction likely regressed`);

  // 2. Mutants: one per resolution rule that loads a real staged file.
  const mutants = [
    ['styles/cinematic-direction.css', 'index.html'], // HTML <link href>
    ['parts/app.js', 'index.html'], // HTML <script src>
    ['src/catalog-ui.js', 'parts/app.js'], // classic-script dynamic import()
    ['parts/p11-make-ui.mjs', 'parts/p09-cont-design.js'], // DOM script.src assignment (document-relative)
    ['src/workflow-artifact.mjs', 'parts/p11-make-ui.mjs'], // static ES import
    ['styles/catalog.css', 'src/catalog-ui.js'], // new URL(x, import.meta.url)
    ['src/catalog-runtime/compiler/platformAdapters.js', 'src/catalog-runtime/compiler/compilePrompt.js'], // nested static import
  ];
  for (const [omit, expectedFrom] of mutants) {
    assert.ok(PUBLIC_SITE_FILES.includes(omit), `mutant target is not in the allowlist: ${omit}`);
    const result = await findDanglingReferences(await stageCopy(`omit-${omit.replace(/\W+/g, '-')}`, omit));
    const hit = result.dangling.find((entry) => entry.resolved === omit && entry.from === expectedFrom);
    assert.ok(hit, `removing ${omit} was not detected from ${expectedFrom}: ${JSON.stringify(result.dangling)}`);
  }

  // 3. Synthetic ignore/resolve rules.
  const synthetic = await findDanglingReferences(await fixture('synthetic', {
    'index.html': [
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">',
      '<a href="#top">top</a><a href="mailto:a@example.com">m</a>',
      '<img src="data:image/png;base64,AAAA">',
      '<script src="//cdn.example.com/x.js"></script>',
      '<script src="./present.js?v=1"></script>',
      '<script src="./missing-from-html.js"></script>',
    ].join('\n'),
    'present.js': [
      "import x from 'bare-package';",
      "const t = `./${name}.js`;",
      "import('./missing-dynamic.js');",
      "el.src = './missing-document-relative.js';",
    ].join('\n'),
    'sub/mod.mjs': "export { a } from '../missing-reexport.js';\nconst u = new URL('./missing-meta.css', import.meta.url);",
    'sub/page.css': "body{background:url('../missing-bg.png')} .x{background:url(data:image/png;base64,AAAA)}",
  }));
  const resolved = synthetic.dangling.map((entry) => entry.resolved).sort();
  assert.deepEqual(resolved, [
    'missing-bg.png',
    'missing-document-relative.js',
    'missing-dynamic.js',
    'missing-from-html.js',
    'missing-reexport.js',
    'sub/missing-meta.css',
  ], `synthetic resolution mismatch: ${JSON.stringify(synthetic.dangling)}`);

  console.log(JSON.stringify({
    status: 'passed',
    realAllowlistReferencesChecked: clean.checked,
    realAllowlistDangling: 0,
    mutantsDetected: mutants.length,
    syntheticDanglingDetected: resolved.length,
  }));
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
