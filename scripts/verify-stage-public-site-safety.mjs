import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repositoryRoot = process.cwd();
const stageScript = path.join(repositoryRoot, 'scripts/stage-public-site.mjs');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'promptos-stage-safety-'));
const fixtureChild = path.join(fixtureRoot, 'child');
const marker = path.join(fixtureRoot, 'must-survive.txt');

await mkdir(fixtureChild, { recursive: true });
await writeFile(marker, 'preserve me\n', 'utf8');

try {
  for (const unsafeOutput of ['.', '..', 'src', path.parse(fixtureRoot).root]) {
    const result = spawnSync(process.execPath, [stageScript], {
      cwd: fixtureChild,
      env: {
        ...process.env,
        PROMPTOS_PUBLIC_SITE_DIR: unsafeOutput,
        EXPECTED_HEAD_SHA: 'a'.repeat(40),
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    assert.notEqual(result.status, 0, `unsafe staging path unexpectedly succeeded: ${unsafeOutput}`);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /unsafe public staging directory/i,
      `unsafe staging path was not rejected by the path guard: ${unsafeOutput}`,
    );
    await access(marker);
  }

  console.log(JSON.stringify({
    status: 'passed',
    unsafePathsRejected: 4,
    protectedMarkerSurvived: true,
    canonicalOutput: '_site',
  }));
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
