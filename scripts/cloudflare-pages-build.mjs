#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Cloudflare Pages must not publish a changing branch tip as if it were a
 * founder-approved release. The exact approved SHA is configured separately
 * as PROMPTOS_APPROVED_SHA in the Pages project settings.
 */
export function resolvePagesBuildContext(env) {
  const branch = env.CF_PAGES_BRANCH ?? '';
  const candidate = env.CF_PAGES_COMMIT_SHA ?? '';
  const approved = env.PROMPTOS_APPROVED_SHA ?? '';
  if (branch !== 'main') {
    throw new Error('PromptOS Cloudflare Pages publication requires main; previews are not authorized by this script');
  }
  if (!/^[0-9a-f]{40}$/.test(candidate)) {
    throw new Error('CF_PAGES_COMMIT_SHA must identify the exact lowercase 40-character release');
  }
  if (approved !== candidate) {
    throw new Error('PromptOS public publication blocked: PROMPTOS_APPROVED_SHA must match the exact release commit');
  }
  if (env.EXPECTED_HEAD_SHA && env.EXPECTED_HEAD_SHA !== candidate) {
    throw new Error('EXPECTED_HEAD_SHA conflicts with Cloudflare Pages source commit');
  }
  return { expectedHeadSha: candidate };
}

function main() {
  const { expectedHeadSha } = resolvePagesBuildContext(process.env);
  const stageScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stage-public-site.mjs');
  const result = spawnSync(process.execPath, [stageScript], {
    env: { ...process.env, EXPECTED_HEAD_SHA: expectedHeadSha },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('PromptOS public allowlist staging failed');
  }
  console.log(JSON.stringify({
    releaseSha: expectedHeadSha,
    outputDir: '_site',
    result: 'staged-for-cloudflare-pages',
    liveDeploymentVerified: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
