# External Agent Execution Substrate Contract

## Purpose

Managed agent runtimes such as OpenAI Frontier may be evaluated as bounded execution infrastructure underneath Founder Control Room. They do not become a second operating system, a replacement control plane, or an independent source of founder authority or outcome truth.

This contract is provider-neutral. Naming a provider here records an eligible architectural role, not live availability, configuration, permission, production readiness, or endorsement.

## Canonical responsibility split

```text
Founder
  -> Founder Control Room
     -> exact mission + authority + consequence + proof contract
        -> external agent execution substrate
           -> authorized tools / business systems
              -> execution evidence
                 -> independent outcome verification
                    -> Founder Control Room truth + next gate
```

- **Founder Control Room** owns canonical founder intent, project/current-state coordination, scoped authority, approval records, evidence interpretation, outcome verification, recovery state, and the founder-facing next gate.
- **Chief AI** owns reasoning, synthesis, capability selection, routing, and executive recommendation. A Chief plan is not execution authority.
- **PromptOS** owns portable prompt, skill, instruction, and agent-behavior governance. PromptOS rules cannot grant themselves runtime authority.
- **External agent runtimes** may provide agent identity, scoped permissions, business-context access, tool execution, execution events, observability, evaluation, and runtime state only to the extent those capabilities are actually observed and authorized.
- **Connected providers/tools** remain bounded execution or evidence surfaces. Their own success language does not redefine FCR truth.

## Mission admission contract

Before a consequential mission may be delegated to an external agent runtime, the bounded mission must identify at least:

1. exact founder intent and definition of done;
2. exact project/target identity and, when repository-bound, the expected Git head or equivalent immutable fingerprint;
3. allowed actions and explicit authority ceiling;
4. forbidden actions and protected resources;
5. consequence classification;
6. durable mutation identity/idempotency key for consequential external writes;
7. evidence required from the executor/provider;
8. independent outcome evidence required before `VERIFIED`;
9. recovery checkpoint and rollback or safe-continuation behavior;
10. stop conditions and the next founder gate.

A runtime that cannot accept or preserve those boundaries is not eligible for consequential delegation.

## Execution truth is not outcome truth

Provider/runtime acceptance, completion, logs, events, or receipts are execution evidence. They may prove that a provider accepted or performed an operation. They do not by themselves prove that the founder's intended external outcome exists.

```text
provider accepted/performed action
!=
founder outcome independently verified
```

FCR may classify execution evidence as useful, current, stale, conflicting, or insufficient, but the executor never promotes its own receipt into final outcome truth.

## Ambiguous external mutation

If a consequential write is submitted and the executor loses the response or cannot prove whether the provider committed the mutation, classify the execution state as `UNKNOWN` / `RECONCILE_REQUIRED`.

Do not automatically retry an ambiguous mutation. Re-observe the authoritative provider state using the durable mutation identity first:

```text
submitted
  -> response/receipt ambiguous
     -> reconcile provider state
        -> performed: verify outcome
        -> not performed: retry may be eligible
        -> still unknown: stop and preserve ambiguity
```

A missing response is not proof of failure. A retry is not safe merely because the executor timed out.

## Authority invariants

An external agent runtime, model response, provider event, tool result, evaluation score, or execution receipt must never:

- widen its own permissions;
- replace or silently rewrite founder intent;
- infer approval from successful execution;
- convert provider acceptance into verified founder outcome;
- bypass project, privacy, security, billing, deployment, publication, database, or product-specific boundaries;
- retry an ambiguous consequential write without reconciliation;
- reuse stale authority or evidence after the bound target/fingerprint changes;
- become a separate founder-facing control plane competing with FCR.

## OpenAI Frontier evaluation boundary

OpenAI Frontier is an example candidate for this execution-substrate role. Before any Frontier-backed pilot is called ready, live evidence must establish the exact supported identity/permission model, tool and business-context access, human-approval behavior, event/receipt interfaces, execution ambiguity semantics, observability, evaluation hooks, revocation behavior, and data/runtime boundaries needed by the mission.

Until those capabilities are directly observed in the authorized environment, classify them as `UNKNOWN`, not assumed product behavior.

The first useful pilot is one bounded real mission whose acceptance criteria prove:

```text
exact intent
+ exact authority
+ exact mutation identity
+ exact recovery point
+ exact execution evidence
+ independent outcome evidence
+ interruption/resume without reconstructing truth from memory
```

## Persistence and Supabase boundary

Do not create a Frontier-specific database silo by default. Prefer existing FCR provider-neutral mission, authority, evidence, provider-observation, and execution-receipt structures when they can represent the contract without losing semantics.

A schema migration is justified only when current storage cannot durably bind a required field or invariant. Provider-specific convenience is not enough reason to fork the truth model.

No database migration, provider connection, credential setup, production execution, deployment, publication, billing change, or external mutation is authorized by this document.

## Rollback

This is governance/policy only. Revert the source commit if the contract proves incorrect. Any future live provider integration must carry its own exact rollback and reconciliation behavior.
