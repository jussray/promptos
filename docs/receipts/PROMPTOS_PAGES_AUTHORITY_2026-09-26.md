# PromptOS Pages Publication Authority Receipt — 2026-09-26

## Goal

Keep PromptOS publication founder-gated: repository pushes may change source, but only the manual `PromptOS Public Pages Deploy` workflow may publish the public Pages artifact.

## Authority and fingerprint

- Repository: `jussray/promptos`
- Default branch: `main`
- Last fully verified research-expansion runtime before this authority audit: `3d53c1da48c9fc5ff32605803ff9b8e4df63ecb5`
- Provider-guard commit already on `main`: `f7d02f9f301146e299b019ae4cf0848869c6c62d`
- Authority repair branch: `fix/pages-publication-authority`
- Provider readback proof head: `9d4f746eee8c91f566d6047aead4435da197d2d1`
- Manual deploy hardening head before this receipt: `0159537c573e764177f4a9e4c4ae62d21838d750`

## VERIFIED provider state

Exact-head GitHub Actions readback from `GET /repos/jussray/promptos/pages` returned:

```json
{
  "repository": "jussray/promptos",
  "buildType": "legacy",
  "source": {
    "branch": "main",
    "path": "/"
  },
  "htmlUrl": "https://jussray.github.io/promptos/",
  "status": "built"
}
```

This means GitHub Pages is currently configured to publish from branch source. A push to `main` can therefore cause a Pages publication without passing through PromptOS's founder-gated manual deployment workflow.

## Contradiction found

Repository policy says `.github/workflows/pages-deploy.yml` is manual-only and the sole permitted public publication path. Provider/runtime behavior disproved that claim because GitHub Pages automatically built and deployed `main` after the research-expansion merge.

Authority order applied:

```text
live provider/runtime evidence > repository policy claim > documentation
```

## Fixes implemented

1. Added `scripts/verify-pages-publication-source.mjs`.
   - Reads the current GitHub Pages provider configuration.
   - Requires `build_type === "workflow"`.
   - Fails closed when branch/legacy publication can bypass founder authority.

2. Added `.github/workflows/pages-authority-proof.yml`.
   - Uses exact-head checkout.
   - Grants only `contents: read` and `pages: read`.
   - Runs the provider readback on relevant publication-authority changes.

3. Hardened `.github/workflows/deployment-authority-contract.yml`.
   - Deployment candidates now require live provider proof that Pages uses workflow publication.
   - A candidate cannot be reported ready while Pages remains in legacy branch mode.

4. Hardened `.github/workflows/pages-deploy.yml`.
   - Manual founder deployment now performs the same provider readback before staging or publication.
   - It refuses to publish while the external Pages source is not `workflow`.

## Proof

The new provider readback executed at exact branch head `9d4f746eee8c91f566d6047aead4435da197d2d1` and intentionally failed with:

```text
Unsafe GitHub Pages publication source: expected build_type=workflow, got legacy.
Branch-based Pages publication can bypass the founder-gated PromptOS deploy workflow.
```

That failure is a correct safety result, not a code regression.

## Current state

- SOURCE IMPLEMENTED: **YES**
- MERGED TO MAIN: **NOT YET for branch hardening**
- PROVIDER CONFIG SAFE: **NO**
- DEPLOYMENT CANDIDATE: **BLOCKED**
- FOUNDER-GATED PUBLICATION ENFORCED END TO END: **BLOCKED by GitHub Pages repository setting**
- EXISTING PUBLIC PAGE: **DEPLOYED from legacy branch source**
- CURRENT PUBLIC RUNTIME CONTENT: **not reclassified as founder-gated until provider source is changed and public proof reruns**

## External admin next gate

In GitHub repository settings for `jussray/promptos`:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

This must change the provider's Pages `build_type` from `legacy` to `workflow`.

Do not disable the fail-closed guard to get green CI. The provider setting is the bug.

## Verification after provider fix

1. Re-run `PromptOS Pages Authority Proof` and require green on exact current `main`.
2. Re-run `Deployment Candidate Contract` and require green on the same SHA.
3. Founder-dispatch `PromptOS Public Pages Deploy` with the exact candidate SHA.
4. Require the workflow's Playwright `public-deploy-proof.mjs` to verify the deployed URL, exact published SHA, no login wall, desktop/mobile rendering, and Catalog compilation.
5. Only then classify the public surface as `RUNTIME VERIFIED` under founder-gated publication authority.

## Rollback

If the new source guard itself proves defective, revert only the authority-guard commits. Do not revert the 150-prompt research expansion. Do not switch back to branch publication as a shortcut.
