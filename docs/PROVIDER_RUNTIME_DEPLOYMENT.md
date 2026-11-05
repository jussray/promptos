# Protected provider runtime deployment

`wrangler.provider.jsonc` targets the dedicated `promptos-provider` Worker with entry point `cloudflare-worker/analytics.js`. It does not change the public Pages artifact or the public front-door Worker. The runtime requires `OPENAI_API_KEY` and `PROMPTOS_AI_OPERATOR_KEY`. Both must be existing PromptOS-specific credentials; no key creation or rotation is part of this path. Other installed provider secrets are preserved.

The existing **Runtime Provider Proof** workflow now accepts a manual `workflow_dispatch` with `expected_head_sha`. Deployment runs only for founder `jussray` on current `main`, in the `production` GitHub environment, after the provider contract tests pass. The workflow rechecks current main immediately before deployment. Pull requests only run credential-free contract tests; pushes retain the existing live-witness behavior and do not deploy.

Required project settings:

| Setting | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` GitHub secret | Intended Cloudflare account, 32 lowercase hexadecimal characters. |
| `CLOUDFLARE_API_TOKEN` GitHub secret | Existing deployment credential, raw printable ASCII without whitespace or a Bearer prefix. |
| `PROMPTOS_OPENAI_MODEL` GitHub variable | Explicit approved OpenAI model identifier. |
| `OPENAI_API_KEY` GitHub secret | Existing project key, needed only if absent on the target Worker. |
| `PROMPTOS_AI_OPERATOR_KEY` GitHub secret | Existing project caller credential, needed for bootstrap and the existing live-witness job. |
| `PROMPTOS_PUBLIC_URL`, `PROMPTOS_PROVIDER_URL` GitHub variables | HTTPS public site and intended protected provider origin for runtime proof. |

`scripts/prepare-provider-deploy.mjs` observes Cloudflare secret names. A 404 permits first-time deployment only when both existing project credentials are available. Authentication, network, invalid-receipt, and server failures stop deployment rather than being interpreted as missing secrets. Installed names are preserved without reading their values. Only absent required names are populated from the same project's GitHub secrets, through a mode-0600 runner-temporary file and Wrangler's `--secrets-file`. The file is removed when the step exits. No values enter the repository, workflow outputs, receipts, or logs.

The deployment binds `PROMPTOS_RELEASE_SHA` to the exact source and `PROMPTOS_OPENAI_MODEL` to the approved repository setting. Wrangler validates required secrets and preserves unrelated installed secrets. After deployment, the existing Playwright witness checks the public UI, protected exact release identity, and one bounded provider response with provenance. Operator credentials stay in Playwright's runner HTTP client, outside public-page JavaScript. This source change is not a claim that a runtime, key, model permission, or provider response is already live.

Before dispatch, merge approval must satisfy the repository's exact repository/PR/base/head rule, then re-read main and supply its exact SHA. Deployment is separately founder-gated and subject to the GitHub production environment. This change does not relax those gates. FCR and Chief credentials are outside this deployment scope.

Verification: `node --test cloudflare-worker/runtime-proof.test.mjs cloudflare-worker/providers.test.mjs scripts/prepare-provider-deploy.test.mjs`; bundle with `npx wrangler@4.110.0 deploy --dry-run --config wrangler.provider.jsonc` without sending live API requests. Production proof requires the live witness, not mocked tests.

Rollback uses the same approved provider release path and a verified prior version. Preserve installed secrets; do not remove a Worker or rotate keys as a rollback shortcut. No rollback from a successful source check is implied.
