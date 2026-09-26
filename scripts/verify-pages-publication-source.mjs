#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY || 'jussray/promptos';
const token = process.env.GITHUB_TOKEN || '';
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
if (!response.ok) {
  throw new Error(`Pages authority readback failed: HTTP ${response.status}`);
}

const pages = await response.json();
const buildType = pages.build_type ?? null;
const source = pages.source ?? null;
const htmlUrl = pages.html_url ?? null;

console.log(JSON.stringify({
  repository,
  buildType,
  source,
  htmlUrl,
  status: pages.status ?? null,
}));

if (buildType !== 'workflow') {
  throw new Error(
    `Unsafe GitHub Pages publication source: expected build_type=workflow, got ${String(buildType)}. ` +
    'Branch-based Pages publication can bypass the founder-gated PromptOS deploy workflow.'
  );
}
