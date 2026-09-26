# PromptOS Main Authority Contract Receipt — 2026-09-26

## Authority fingerprint

- Repository: `jussray/promptos`
- Pre-change authoritative main: `048d47704292024daf5a189d0e718d38a9a1cce8`
- Review branch: `fix/main-authority-contract`
- Provider readback at review time:
  - `main.protected = false`
  - classic required status checks = false
  - active main-applicable rulesets = none
  - provider-enforced required checks = false
- Source of truth: current repository state plus live GitHub provider readback.

## Finding

PromptOS had strong exact-head CI and deployment authority gates, but GitHub still accepted direct `main` mutations without provider-enforced required checks. Repository-side workflows could prove a mutation after GitHub accepted it, but could not prevent an unverified or force-pushed commit from becoming `main`.

This is distinct from the separate GitHub Pages blocker. Pages publication authority and repository mutation authority are now tracked independently.

## Fixes implanted

1. `scripts/verify-main-push-authority.mjs`
   - Requires `jussray/promptos` and `refs/heads/main`.
   - Requires actor and triggering actor to be `jussray`.
   - Rejects forced pushes.
   - Requires real, changing before/after commit fingerprints.

2. `scripts/verify-main-provider-protection.mjs`
   - Reads live `main` branch protection.
   - Reads repository rulesets and resolves active branch rulesets that apply to `main`.
   - Requires provider-enforced required status checks before reporting protected merge authority.
   - Supports report-only mode for pre-merge branch proof without weakening the `main` enforcement path.

3. `.github/workflows/main-authority-contract.yml`
   - Exact-head checkout.
   - Founder/non-force push verification on `main`.
   - Git ancestry proof using `git merge-base --is-ancestor`.
   - Report-only provider readback on the review branch.
   - Fail-closed provider required-check enforcement on `main`.

4. `README.md` and `scripts/verify-current-truth-surface.mjs`
   - Branch protection and ruleset state are explicitly provider/runtime truth.
   - PromptOS does not claim provider-enforced merge authority from repository CI alone.
   - Current truth checks require the main-authority verifiers to remain documented.

5. `.github/workflows/truth-surface-proof.yml`
   - Verifies the main-authority workflow is structurally wired to both verifiers and the ancestry gate.

6. `.github/workflows/control-room-tests.yml`
   - Main-authority files are part of the full Control Room trigger surface.

## Proof before merge

Focused branch proof on `fix/main-authority-contract`:

- Main Authority Contract run `36280748338` on `de3a9084cd94b872c5afa60981e3db75fa5f70f9`: **SUCCESS**.
- Live provider report from that run:
  - `branchProtected: false`
  - `classicRequiredChecks: false`
  - `activeMainRulesets: []`
  - `protectedByRequiredChecks: false`
- Truth Surface Proof run `36280844045` on `5fba0023d8ff2ca78c5f787655f78413f5093aae`: **SUCCESS**.
- Main Authority Contract also passed report-mode on `5fba0023d8ff2ca78c5f787655f78413f5093aae`.
- Latest branch-only authority proof remained green after the Control Room trigger update.

## Merge review

Comparison against pre-change `main` before this receipt:

- branch was ahead and 0 behind
- intended authority/truth files only
- no PromptOS recipes added or removed
- no user-facing runtime rendering code changed
- no Chief AI Machine files touched
- no force push planned

## Expected post-merge split

After fast-forward to `main`:

- PromptOS core and browser/staged-public tests should remain green.
- Truth Surface Proof should remain green.
- Main Authority Contract should verify founder/non-force/ancestry integrity, then intentionally fail at provider protection until GitHub enforces required checks on `main`.
- Deployment Candidate Contract remains independently blocked while Pages uses legacy branch publication.

A red Main Authority Contract in that state is truthful evidence of an external provider configuration blocker, not a source-code regression.

## External next gate

Configure GitHub so `main` has provider-enforced required status checks, using classic branch protection or an active branch ruleset that applies to `main`. The preferred shape preserves the existing evidence-first direct fast-forward workflow: prove the exact commit on its review branch, then allow only commits whose required checks are already green.

After configuration, rerun provider readback and require `protectedByRequiredChecks: true` before declaring repository mutation authority `VERIFIED`.

## Rollback

If the contract itself must be reversed, revert these authority commits in reverse order. Do not force-reset shared `main`. Pre-change baseline: `048d47704292024daf5a189d0e718d38a9a1cce8`.
