#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

/**
 * Classify a GitHub Pages readback. Pure so it can be tested offline.
 *
 * Default is fail-closed: only build_type=workflow passes.
 *
 * `absentOk` is an explicit, caller-supplied opt-in for NON-DEPLOYING checks
 * (the PR candidate-lease contract). It lets "Pages is not enabled" pass, but
 * only when two independent readbacks agree: GET /pages returned 404 AND
 * GET /repos/{repo} reports has_pages === false. With Pages off there is no
 * branch-based publication path to bypass the founder-gated deploy workflow.
 * Any other status, a missing/non-boolean has_pages, or has_pages === true
 * with a 404 on /pages still fails. pages-deploy.yml never sets absentOk.
 */
export function classifyPagesReadback({ pagesStatus, pages, repoHasPages, absentOk = false }) {
  if (pagesStatus === 200) {
    const buildType = pages?.build_type ?? null;
    if (buildType === 'workflow') return { ok: true, reason: 'build_type=workflow' };
    return {
      ok: false,
      reason:
        `Unsafe GitHub Pages publication source: expected build_type=workflow, got ${String(buildType)}. ` +
        'Branch-based Pages publication can bypass the founder-gated PromptOS deploy workflow.',
    };
  }
  if (pagesStatus === 404 && absentOk) {
    if (repoHasPages === false) {
      return { ok: true, reason: 'pages-not-enabled (/pages 404 and repo.has_pages=false): no publication surface exists' };
    }
    return {
      ok: false,
      reason: `Pages readback returned 404 but repo.has_pages is ${String(repoHasPages)}; refusing to treat as "Pages not enabled".`,
    };
  }
  return { ok: false, reason: `Pages authority readback failed: HTTP ${String(pagesStatus)}` };
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY || 'jussray/promptos';
  const token = process.env.GITHUB_TOKEN || '';
  const absentOk = process.env.PROMPTOS_PAGES_ABSENT_OK === '1';
  const apiVersion = '2026-03-10';

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': apiVersion,
    'User-Agent': 'promptos-pages-authority-check',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com/repos/${repository}/pages`, { headers });
  let pages = null;
  let message = '';
  try {
    pages = await response.json();
    message = typeof pages?.message === 'string' ? pages.message : '';
  } catch {
    pages = null;
  }

  let repoHasPages = null;
  if (response.status === 404 && absentOk) {
    const repoResponse = await fetch(`https://api.github.com/repos/${repository}`, { headers });
    if (repoResponse.ok) {
      const repoBody = await repoResponse.json();
      repoHasPages = typeof repoBody?.has_pages === 'boolean' ? repoBody.has_pages : null;
    }
  }

  const verdict = classifyPagesReadback({ pagesStatus: response.status, pages, repoHasPages, absentOk });

  console.log(JSON.stringify({
    repository,
    absentOk,
    pagesStatus: response.status,
    pagesMessage: message || null,
    repoHasPages,
    buildType: pages?.build_type ?? null,
    source: pages?.source ?? null,
    htmlUrl: pages?.html_url ?? null,
    status: pages?.status ?? null,
    verdict: verdict.reason,
  }));

  if (!verdict.ok) {
    // Surface the real reason as a workflow annotation so it is readable without the raw log.
    console.log(`::error title=Pages publication source::${verdict.reason}${message ? ` (GitHub: ${message})` : ''}`);
    throw new Error(verdict.reason);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
