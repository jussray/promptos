# PromptOS Deployment Candidate Lease

## Purpose

Keep exact-SHA deployment authority without invalidating a proven PromptOS release merely because `main` later gained evidence-only documentation or receipts.

## Law

The deployment candidate SHA is immutable. The public artifact is always built from and identified by that exact candidate.

When `main` advances after the candidate was proven:

- the candidate must remain an ancestor of current `main`;
- every intervening path must match `.deployment-authority.json`'s explicit non-deploying allowlist;
- any staged-site source, workflow, proof code, build/staging code, dependency/configuration, authority policy, or unknown path revokes the lease;
- production never silently swaps the candidate for moving `main`.

## Evidence for the PromptOS safe-drift policy

`scripts/stage-public-site.mjs` creates the public Pages artifact from an explicit source-file allowlist. `docs/**`, `receipts/**`, ordinary evidence under `artifacts/**`, and the named repository prose files in `.deployment-authority.json` are not copied into that public artifact.

The policy intentionally remains narrower than "non-code is safe." Unknown paths fail closed.

## Proof

`scripts/test_deploy_candidate_guard.py` creates a temporary Git history and proves:

1. docs-only drift preserves an older exact candidate; and
2. drift in `parts/app.js`, a staged runtime source, revokes that same candidate.

The deploy workflow reruns `scripts/deploy_candidate_guard.py` against live current `main` before build and immediately before the GitHub Pages mutation.
