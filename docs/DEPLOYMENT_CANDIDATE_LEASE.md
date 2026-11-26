# PromptOS Deployment Candidate Lease

## Purpose

Keep exact-SHA deployment authority without invalidating a proven PromptOS release merely because `main` later gained evidence-only receipts or artifacts.

## Law

The deployment candidate SHA is immutable. The public artifact is always built from and identified by that exact candidate.

When `main` advances after the candidate was proven:

- the candidate must remain an ancestor of current `main`;
- every exact path touched by every intervening commit must match `.deployment-authority.json`'s explicit evidence-only non-deploying allowlist;
- any staged-site source, workflow, proof code, build/staging code, dependency/configuration, governance or authority document, or unknown path revokes the lease;
- later reverting a sensitive change does not restore the old lease because the sensitive path was still touched after proof;
- production never silently swaps the candidate for moving `main`.

## Evidence for the PromptOS safe-drift policy

`scripts/stage-public-site.mjs` creates the public Pages artifact from an explicit source-file allowlist. The lease policy is deliberately stricter than that build allowlist: it permits only receipt/artifact evidence paths and issue-template metadata. It does not blanket-allow `docs/**`, README, SECURITY, CONTRIBUTING, or other prose because those locations can carry governance or operating authority.

Unknown paths fail closed. Path matching uses Git's NUL-delimited path records without trimming or quote rewriting, so Unicode and whitespace-bearing filenames are evaluated exactly as stored.

## Proof

`scripts/test_deploy_candidate_guard.py` creates temporary Git histories and proves:

1. evidence-only Unicode receipt drift preserves an older exact candidate;
2. governance-document drift revokes that candidate;
3. a runtime change followed by a revert still revokes that candidate; and
4. a leading-whitespace unknown path cannot be normalized into the safe allowlist.

The deploy workflow reruns `scripts/deploy_candidate_guard.py` against live current `main` before build and immediately before the GitHub Pages mutation.
