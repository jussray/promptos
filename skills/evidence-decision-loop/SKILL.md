---
name: evidence-decision-loop
description: Convert mixed evidence into a bounded conclusion or next gate without confusing source claims, execution receipts, provider acceptance, vanity signals, or stale proof with verified outcome. Use for experiment conclusions, performance decisions, merge/release review, and cross-repository evidence reconciliation.
---

# Evidence Decision Loop v1

This skill is provider-neutral decision support. It never grants authority.

## Workflow

1. **Observe** the exact subject, current fingerprint, evidence sources, and current state.
2. **Orient** around the human goal, primary success signal, secondary signals, proof planes, consequence, and authority ceiling.
3. **Redteam** stale evidence, selection bias, vanity metrics, provider-only acceptance, missing witnesses, hidden costs, irreversible actions, and rollback gaps.
4. **Decide** the smallest next gate with explicit success and stop conditions.
5. **Act** only within separately granted authority. Analysis does not authorize merge, deploy, publish, send, spend, delete, permission changes, or production mutation.
6. **Verify** execution and outcome independently. An accepted request, green workflow, or founder-confirmed action can prove execution state without proving the human/business outcome.
7. **Report** Reality, Bound, Decision, Proof, Risk, Rollback, and Next Gate.

## Truth model

Use only these claim states: `VERIFIED`, `OBSERVED`, `INFERRED`, `UNKNOWN`, `BLOCKED`.

Bind every material item to one proof plane:

- `source`: inspected source/configuration or a direct human/provider statement.
- `execution`: evidence that an action, workflow, request, build, test, or mutation actually ran.
- `outcome`: independent evidence that the intended external or human result occurred.

Execution truth is not outcome truth. Provider acceptance is not outcome proof. Founder confirmation is valid source/observation evidence, but it is not an independent platform witness unless that witness is also present.

## Fingerprint rule

Bind the conclusion to the exact relevant fingerprint: commit SHA, runtime identity, proposal hash, experiment subject, post fingerprint, configuration digest, or equivalent. If it changes, predecessor proof becomes historical and the changed subject returns to `UNKNOWN` until re-observed.

## Signal rule

Name the primary success signal before judging the result. Secondary or vanity signals may inform the decision, but they cannot declare the primary goal successful by themselves.

Default interpretation:

- execution verified + outcome unknown => `MEASURE`
- secondary improved + primary unknown => `MEASURE`
- verified outcome + primary improved => `PROPOSE_KEEP`
- verified outcome + primary degraded => `PROPOSE_TUNE_OR_STOP`
- stale/mismatched fingerprint => `REOBSERVE`
- missing authority => `HOLD_OR_REVIEW`

A proposal is not self-execution.

## Merge/release adapter

For a merge or release conclusion:

1. reacquire the current PR/head SHA and base;
2. inspect the current diff and changed scope;
3. inspect executed CI/Playwright logs, not just check labels;
4. distinguish infrastructure/no-job failures from code/test failures;
5. require repository-configured independent review when applicable;
6. invalidate predecessor proof after any head movement;
7. recommend merge only for the exact reviewed head;
8. execute merge only when founder authority is explicit and still current.

Do not reveal or require private chain-of-thought. Preserve only conclusions, evidence, tradeoffs, decisions, fingerprints, blockers, rollback, and next gates.
