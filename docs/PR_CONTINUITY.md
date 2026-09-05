# PR Continuity Law

<!-- pr-continuity-law:v1 -->

This repository treats pull-request continuity as a machine-enforced proof contract, not a manual cleanup habit.

```text
main moves -> trusted main reacquires open PR graph -> same-repo branches roll forward conflict-free -> successor head is a new proof subject -> predecessor CI/review/runtime/Playwright proof expires -> exact-head gates rerun -> merge/deploy authority remains separate
```

## Rules

1. `main` is the root authority; stacked PRs are followed through live base branches.
2. Rollover uses GitHub `update-branch` with `expected_head_sha`. Never force-push, reset, rebase, delete, or guess through conflicts.
3. Forks, conflicts, races, malformed managed metadata, and provider uncertainty fail closed.
4. Every head movement expires predecessor CI, review, runtime, provider, artifact, and browser proof.
5. `CURRENT` ancestry is not completion; ordinary exact-head and real-path gates still apply.
6. The machine-managed PR body block may change only between continuity markers; human prose is preserved.
7. Continuity receipts never authorize merge, deploy, publish, provider mutation, spend, deletion, or authority expansion.
8. Write authority runs only from trusted provider-side events; PR-head code receives read-only continuity verification.
9. Trust domains are split across workflows: `.github/workflows/pr-continuity.yml` handles read-only exact-head PR audit, `.github/workflows/pr-continuity-metadata.yml` handles `pull_request_target` metadata mutation, and `.github/workflows/pr-continuity-rollover.yml` handles trusted `main` rollover.
10. An inapplicable trust domain must not appear as a zero-step skipped job inside another domain's run. Absence from that run means not applicable, not passed. Evidence claims count only workflows/jobs that actually execute their contract.

## Attack 20

`test/pr-continuity.attack20.test.mjs` attacks ancestry, divergence, unknown state, TOCTOU, forks, body preservation, malformed markers, proof-subject binding, authority leakage, stacked propagation, unrelated stacks, cycles, and workflow trust-domain isolation before any write step.
