---
name: evidence-decision-loop
description: Convert mixed evidence into a bounded conclusion or next gate without confusing source claims, execution receipts, provider acceptance, refusal behavior, vanity signals, or stale proof with verified outcome. Use for experiment conclusions, performance decisions, merge/release review, AppSec workflows, runtime-stop diagnosis, and cross-repository evidence reconciliation.
---

# Evidence Decision Loop v1

This skill is provider-neutral decision support. It never grants authority.

## Workflow

1. **Observe** the exact subject, current fingerprint, evidence sources, and current state.
2. **Orient** around the human goal, primary success signal, secondary signals, proof planes, consequence, and authority ceiling.
3. **Redteam** stale evidence, selection bias, vanity metrics, provider-only acceptance, missing witnesses, hidden costs, irreversible actions, rollback gaps, and signals that could be mistaken for authorization.
4. **Decide** the smallest next gate with explicit success and stop conditions.
5. **Act** only within separately granted authority. Analysis does not authorize merge, deploy, publish, send, spend, delete, permission changes, or production mutation.
6. **Verify** execution and outcome independently. An accepted request, refusal, monitor stop, green workflow, or founder-confirmed action can prove or describe execution state without proving the human/business outcome or authorization state.
7. **Report** Reality, Bound, Decision, Proof, Risk, Rollback, and Next Gate.

## Truth model

Use only these claim states: `VERIFIED`, `OBSERVED`, `INFERRED`, `UNKNOWN`, `BLOCKED`.

Bind every material item to one proof plane:

- `source`: inspected source/configuration or a direct human/provider statement.
- `execution`: evidence that an action, workflow, request, build, test, or mutation actually ran.
- `outcome`: independent evidence that the intended external or human result occurred.
- `authority`: separate authenticated evidence that a consequential action was allowed for the exact scope and subject.

Execution truth is not outcome truth. Provider acceptance is not outcome proof. Refusal behavior is not authorization proof. Founder confirmation is valid source/observation evidence, but it is not an independent platform witness unless that witness is also present.

## Runtime stop/refusal adapter

When a request ends in an error, refusal, monitor stop, or tool failure, preserve evidence before interpreting the outcome.

Preserve internally when available:

- exact request;
- selected model;
- product surface;
- organization and user references;
- intended defensive outcome;
- actual notice/error/response, never a remembered template;
- request/trace IDs and timing;
- which execution boundaries received and forwarded the request;
- which tools ran;
- what changed;
- rollback evidence;
- completed work; and
- incomplete work.

Diagnose the last execution boundary proven to have received the request and the first transition whose successful forward progress is not proven. Do not attribute a refusal-looking customer message to the model unless model execution and the completion itself are independently evidenced.

A monitored stop after a write does not undo the write, complete the review, or authorize a retry. Reconcile side effects first. Do not blind-resubmit a blocked workflow after mutation.

### Authorization remains separate

None of these signals establishes whether the work was authorized:

- refusal;
- service error;
- successful completion;
- provider acceptance;
- tool execution;
- monitor stop;
- HTTP status; or
- customer-visible wording.

Diagnose what happened, review what changed, then evaluate authorization from the separate authority plane. Keep `AUTHORIZED`, `UNAUTHORIZED`, `UNKNOWN`, and `NOT_EVALUATED` representable independently from runtime outcome.

### Review sharing

Raw request/response evidence may contain credentials or sensitive context. Share a redacted record through the approved review route instead of copying raw payloads. Exclude credentials, unnecessary identifiers, unrelated private content, and hidden internal instructions.

## Secure SDLC / AppSec adapter

Treat security as part of software delivery before production. Representative workflows:

1. **continuous code scanning** — bind findings to the exact repository, candidate head, and scope;
2. **test-environment scanning** — preserve runtime/test-environment evidence separately from source evidence;
3. **security-finding validation** — independently classify findings as reproduced, not reproduced, stale, false-positive, blocked, or unknown;
4. **security patch automation** — propose/apply only the smallest bounded repair through separate write authority, then reacquire exact-head, test, rollback, and runtime proof.

A scan, finding, or patch proposal is evidence or advice. It does not grant merge, deploy, provider-write, remediation, or production authority.

## Fingerprint rule

Bind the conclusion to the exact relevant fingerprint: commit SHA, runtime identity, proposal hash, experiment subject, post fingerprint, configuration digest, request digest, response digest, or equivalent. If it changes, predecessor proof becomes historical and the changed subject returns to `UNKNOWN` until re-observed.

## Signal rule

Name the primary success signal before judging the result. Secondary or vanity signals may inform the decision, but they cannot declare the primary goal successful by themselves.

Default interpretation:

- execution verified + outcome unknown => `MEASURE`
- secondary improved + primary unknown => `MEASURE`
- verified outcome + primary improved => `PROPOSE_KEEP`
- verified outcome + primary degraded => `PROPOSE_TUNE_OR_STOP`
- stale/mismatched fingerprint => `REOBSERVE`
- missing authority => `HOLD_OR_REVIEW`
- refusal/error + producer unknown => `PRESERVE_AND_DIAGNOSE`
- monitored stop after mutation => `RECONCILE_BEFORE_RETRY`

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
