# PromptOS Deployment Candidate Lease

## Purpose

Keep exact-SHA deployment authority without invalidating a proven PromptOS release merely because `main` later gained evidence-only receipts or artifacts.

## Law

The deployment candidate SHA is immutable. The public artifact is always built from and identified by that exact candidate.

When `main` advances after the candidate was proven:

- the candidate must remain an ancestor of current `main`;
- every intervening path must match `.deployment-authority.json`'s explicit evidence-only non-deploying allowlist;
- any staged-site source, workflow, proof code, build/staging code, dependency/configuration, governance or authority document, or unknown path revokes the lease;
- production never silently swaps the candidate for moving `main`.

## Evidence for the PromptOS safe-drift policy

`scripts/stage-public-site.mjs` creates the public Pages artifact from an explicit source-file allowlist. The lease policy is deliberately stricter than that build allowlist: it permits only receipt/artifact evidence paths and issue-template metadata. It does not blanket-allow `docs/**`, README, SECURITY, CONTRIBUTING, or other prose because those locations can carry governance or operating authority.

Unknown paths fail closed.

## Proof

`scripts/test_deploy_candidate_guard.py` creates temporary Git histories and proves:

1. evidence-only receipt drift preserves an older exact candidate;
2. governance-document drift revokes that candidate; and
3. drift in `parts/app.js`, a staged runtime source, revokes that candidate.

The deploy workflow reruns `scripts/deploy_candidate_guard.py` against live current `main` before build and immediately before the GitHub Pages mutation.
