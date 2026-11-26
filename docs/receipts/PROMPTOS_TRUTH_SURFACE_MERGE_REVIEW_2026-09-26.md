# PromptOS Truth Surface Merge Review Receipt — 2026-09-26

## Authority

- Repository: `jussray/promptos`
- Pre-review authoritative main: `776bb83f5dfa65b4fb6712ccca2d6eea2600823c`
- Reviewed merge head: `443d3c511784074c702faab6cf3793330a7f44cd`
- Source of truth: executable repository state and provider/runtime readback, not old chats or repository profile metadata.

## Goal

Implant the truth-surface and deployment-authority fixes discovered during the PromptOS 150-prompt expansion follow-through, review them against current `main`, and merge only the smallest evidence-bound changes.

## Findings

### VERIFIED

1. PromptOS runtime exposes **398 curated prompts inside 5,000 selected recipes**.
2. The prior README still led with the historical 159-prompt identity and did not expose the current canonical counts.
3. The prior README claimed the manual Pages workflow was the only publication path, while live provider readback proved GitHub Pages remained in `legacy` branch mode and could publish `main` automatically.
4. The founder-gated deploy workflow checked provider Pages mode before build, but did not re-read that provider authority immediately before `actions/deploy-pages`, leaving a time-of-check/time-of-use gap.
5. `fix/pages-publication-authority` was already identical to `main`; no unique fix was stranded there.
6. `fix/research-expansion-150` was behind `main` with no unique commits to recover.

### BLOCKED EXTERNAL STATE

GitHub Pages provider configuration still reports `build_type=legacy` with source `main:/`. Repository code cannot mutate that administration setting through the connected GitHub interface. The fail-closed authority gates intentionally remain red until Pages is switched to GitHub Actions / workflow mode.

GitHub repository profile description also still contains the historical `159-prompt library` wording. That metadata is outside the available repository-content write surface and is non-authoritative.

## Fixes implanted

1. Added `scripts/verify-current-truth-surface.mjs`.
   - Derives selected and curated counts from the canonical runtime.
   - Requires README current-state claims to match executable truth.
   - Requires publication state to be described as provider/runtime truth.
   - Rejects stale 159/248 claims when presented as the current catalog.

2. Reconciled `README.md`.
   - Current catalog: **398 curated / 5,000 selected**.
   - Historical 159 count is clearly historical.
   - Publication authority now distinguishes repository intent from provider state.
   - Merge is explicitly not publication authority.

3. Updated `.github/workflows/control-room-tests.yml`.
   - README and the truth-surface verifier are now part of the exact-head Control Room trigger surface.
   - The truth-surface verifier runs after the canonical catalog verifier.

4. Hardened `.github/workflows/pages-deploy.yml`.
   - Removed the false unconditional "sole path" claim.
   - Retains the pre-build provider authority readback.
   - Adds a second provider readback immediately before Pages mutation.
   - Deployment remains fail-closed unless `build_type=workflow`.

5. Added `.github/workflows/truth-surface-proof.yml`.
   - Fast exact-head gate for catalog truth, README truth, and double provider-authority readback.

## Proof

Focused exact-head branch proof:

- Workflow: `PromptOS Truth Surface Proof`
- Run: `36278865902`
- Exact head: `443d3c511784074c702faab6cf3793330a7f44cd`
- Result: **SUCCESS**
- Verified:
  - exact checkout SHA
  - canonical catalog runtime
  - README truth surface
  - two provider-authority readbacks in the deploy workflow
  - verifier syntax

Pre-review full Control Room proof on `776bb83f5dfa65b4fb6712ccca2d6eea2600823c` remained green, including source and staged desktop/mobile Playwright. This review did not modify UI/runtime rendering code.

## Merge review

Comparison of pre-review `main` to reviewed branch:

- Status: ahead, 0 behind
- Intended files only:
  - `.github/workflows/control-room-tests.yml`
  - `.github/workflows/pages-deploy.yml`
  - `.github/workflows/truth-surface-proof.yml`
  - `README.md`
  - `scripts/verify-current-truth-surface.mjs`
- No PromptOS catalog recipes were removed or added in this review.
- No Chief AI Machine files were touched.
- No force push was used.

## Rollback

If these truth/authority changes must be reversed, revert the review commits in reverse order. Do not force-reset shared `main`. The pre-review baseline is `776bb83f5dfa65b4fb6712ccca2d6eea2600823c`.

## Next gate

1. Change GitHub Pages source from legacy branch publication to GitHub Actions / workflow mode.
2. Confirm `scripts/verify-pages-publication-source.mjs` reports `buildType=workflow`.
3. Run the founder-gated exact-SHA deployment workflow.
4. Require public desktop/mobile Playwright identity proof before declaring `RUNTIME VERIFIED`.
