import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED = ['OPENAI_API_KEY', 'PROMPTOS_AI_OPERATOR_KEY'];

// A manual trusted-main workflow may reuse project-local GitHub secrets only
// when their names are absent on this project's provider Worker.
export async function prepareProviderDeploy(env, fetchImpl = fetch) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!/^[0-9a-f]{32}$/.test(account || '') || !/^[!-~]+$/.test(token || '') || token.startsWith('Bearer ')) {
    throw new Error('Cloudflare deployment credentials are missing or malformed');
  }
  if (!env.RUNNER_TEMP || !/^[A-Za-z0-9._/-]{1,160}$/.test(env.PROMPTOS_OPENAI_MODEL || '')) {
    throw new Error('Runner temporary directory and explicit OpenAI model are required');
  }
  let response;
  try {
    response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/promptos-provider/secrets`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new Error('Cloudflare secret-name observation failed'); }
  let names = [];
  if (response.status !== 404) {
    if (!response.ok) throw new Error('Cloudflare secret-name observation failed');
    let body;
    try { body = await response.json(); } catch { throw new Error('Invalid Cloudflare secret-name receipt'); }
    if (body.success !== true || !Array.isArray(body.result) || body.result.some((entry) => typeof entry?.name !== 'string')) {
      throw new Error('Invalid Cloudflare secret-name receipt');
    }
    names = body.result.map((entry) => entry.name);
  }
  const missing = REQUIRED.filter((name) => !names.includes(name));
  if (missing.some((name) => !/^[!-~]+$/.test(env[name] || ''))) {
    throw new Error(`Existing project secrets unavailable: ${missing.filter((name) => !/^[!-~]+$/.test(env[name] || '')).join(', ')}`);
  }
  const path = join(env.RUNNER_TEMP, 'promptos-existing-provider-secrets.json');
  await writeFile(path, JSON.stringify(Object.fromEntries(missing.map((name) => [name, env[name]]))), { mode: 0o600, flag: 'wx' });
  return { path, preservedNames: REQUIRED.filter((name) => names.includes(name)), reusedNames: missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await prepareProviderDeploy(process.env);
    console.log(`Provider preflight passed; preserved names: ${result.preservedNames.join(', ') || 'none'}; reused project secret names: ${result.reusedNames.join(', ') || 'none'}.`);
  } catch (error) {
    // Only application-owned messages; never print provider exceptions or bodies.
    console.error(error instanceof Error ? error.message : 'Provider preflight failed');
    process.exitCode = 1;
  }
}
