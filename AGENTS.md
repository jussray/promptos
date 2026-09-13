# Agent Instructions

Use these instructions whenever Claude, Codex, ChatGPT, Perplexity, GitHub-connected agents, or other AI coding agents work in this repository.

## Founder Intelligence entrypoint

Before material planning, implementation, review, automation, publication, deployment, migration, or cross-repository coordination, read and apply:

- [`AGENTS_FOUNDER_INTELLIGENCE.md`](AGENTS_FOUNDER_INTELLIGENCE.md)
- [`docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md`](docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md)
- [`.control-room/necessary-fix-policy.json`](.control-room/necessary-fix-policy.json)
- [`docs/EXTERNAL_AGENT_EXECUTION_SUBSTRATE.md`](docs/EXTERNAL_AGENT_EXECUTION_SUBSTRATE.md) when evaluating or integrating managed agent runtimes such as OpenAI Frontier

Use the complete remembrance loop:

```text
/human
→ /futureyou
→ /truthmode
→ /confess
→ /billgates
→ /elonmusk
→ Build
→ Verify
→ Explain
→ Leave evidence
→ Teach the next builder
→ Repeat
```

`/futureyou` asks: **How would it be remembered by building this?** Protect the future system from stale branches, hidden assumptions, unverifiable success, irreversible shortcuts, and instruction drift. Preserve purpose, boundaries, evidence, rollback, and enough context for the next builder to continue safely.

This loop supplements every stricter repository, privacy, approval, release, and non-deletion rule below. It never invents founder approval or weakens a human-only gate.

## Founder operating stack

Use the full founder stack for nontrivial work:

```text
/elonmusk /garyvee lindymode redteam l99 redteam ooda /truthmode
```

`/elonmusk` adds first-principles reduction, bottleneck identification, leverage analysis, and deletion of unnecessary complexity. It does not replace the founder stack. Red-team 1 attacks whether the request, premise, evidence, and scope justify a change. Lindy mode then selects the smallest durable, reversible, low-dependency carrier and preserves what is already working. L99 maps provenance, state, authority, release, rollback, and long-term drift. Red-team 2 attacks the selected implementation for authority drift, security/privacy failures, regressions, stale evidence, hidden assumptions, overclaims, and missing recovery.

## Truth hierarchy

1. Current repository, branch, exact commit, and deployed configuration actually inspected.
2. Founder Control Room records, especially release-truth, outage, merge, Cloudflare, and cross-repo evidence.
3. Current test results, Playwright evidence, logs, schemas, runtime behavior, and Cloudflare build/deploy evidence.
4. Explicit founder decisions and approved project records.
5. Current official provider documentation.
6. Prior summaries, memory, generated plans, and assumptions.

Do not claim a file, feature, migration, deployment, fix, test, or merge exists without evidence.

## Infrastructure outage and CI classification

When GitHub Actions fails, classify the evidence before blaming code:

- `runner_startup_failure`: GitHub runner or job startup failed before meaningful steps executed, especially when jobs show no steps, no logs, or null log URLs.
- `workflow_no_jobs`: the workflow itself schedules no jobs or is skipped before jobs exist.
- `workflow_step_failure`: at least one job executed steps and logs show a concrete failing command, assertion, build, lint, type, or Playwright step.

Never call a zero-step/no-log GitHub Actions failure a code regression. Treat it as infrastructure evidence. However, an infrastructure outage can still gate merge, release, and deployment truth under this repo's release rules until Founder Control Room and any available Cloudflare/runtime evidence explain the situation.

## Control Room and Cloudflare release truth

Look to Founder Control Room first for release-truth interpretation. Capture the exact repository, PR, branch, head SHA, workflow, run, job evidence, classification, Cloudflare build status, runtime evidence, and next gate.

Cloudflare build or deploy success is separate from GitHub Actions success. GitHub Actions outage is not application failure, and Cloudflare success is not proof that all app, auth, data, privacy, or Playwright gates passed. Record both without blending them.

## Work completion rule

Continue working the requested task until it is done or until a real blocker is reached. Do not stop at a plan when a focused implementation, verification, or documentation update is available.

Every handoff must state what was changed, what was verified, what remains blocked, and the next gate.

## Necessary-fix execution default

Apply `policyId: necessary-fix-execution-default` from `.control-room/necessary-fix-policy.json` before returning a repair or implementation step as founder homework.

- Use `execute-now` when the fix is necessary, reversible, inside the current approved scope, and current authority plus applicable evidence/exact-head requirements are satisfied.
- Use `proof-gated` when the action is reversible but the repository requires proof before integration; collect the proof and continue through the existing gate rather than asking the founder to perform automatable verification.
- Use `founder-required` for scope expansion, external publication or communication, spending, destructive or irreversible changes, authority expansion, or any stricter PromptOS/FCR boundary.
- Bidirectional fingerprints/cookies may be updated or invalidated by evidence, but they never grant authority. Provider acceptance is not outcome proof. Verify the outcome, emit/update receipts and continuity markers, then identify the next gate.

This default does not widen tool, merge, deployment, publication, provider, secret, billing, destructive-write, or authority permissions.

## Codex provider baseline

When a repo-running Codex agent needs model-provider configuration, keep it machine-local and use OpenAI/Codex as the default coding engine:

```toml
model = "gpt-5.3-codex"
model_provider = "openai"
model_reasoning_effort = "high"
model_reasoning_summary = "auto"
model_supports_reasoning_summaries = true
model_auto_compact_token_limit = 900000
```

Store the API key outside the repository, for example in `~/.codex/.env`:

```dotenv
OPENAI_API_KEY=replace_with_local_secret
```

Never commit `.codex/.env`, `OPENAI_API_KEY`, `MODEL_API_KEY`, service-role keys, provider tokens, or any other secret. Model choice does not override this file, local provider roles, verification gates, Founder Control Room truth, or explicit founder approval gates.

## Playwright verification

For UI, route, browser, release, onboarding, checkout, auth-flow, or runtime behavior changes, verify with Playwright on the exact changed head before calling the task complete. If Playwright is not applicable, say why. If Playwright cannot run because of infrastructure, missing secrets, missing browser dependencies, or a GitHub runner outage, record that as a verification blocker rather than converting it into code blame.

## Merge authority

`merge_authority: true` means the repository's merge capability is available. It does **not** mean a specific candidate is approved.

Before every merge, require fresh explicit founder approval bound to the exact repository, PR number, current base SHA, and current head SHA. If that approval is absent, ambiguous, or stale, ask the founder and stop. Review, implementation, green checks, mergeability, continuity markers, broad `approved`, `cont`, `continue`, or approval of a predecessor candidate do not authorize the merge. Any base/head movement expires approval and requires a new ask.

After exact candidate approval exists, a merge is safe only when:

- repository, target branch, PR, and exact head SHA are verified;
- the scope is focused and no unrelated work is hidden in the diff;
- changed code, configuration, schemas, docs, and generated artifacts have been reviewed;
- required checks have genuinely executed and passed, or a documented infrastructure outage is classified and the remaining evidence is sufficient for the specific change;
- Playwright has passed for any changed user-facing web/runtime path, or is explicitly inapplicable;
- Founder Control Room and Cloudflare evidence have been checked when release truth or deployment is involved;
- no unresolved critical review thread remains;
- privacy, security, brand/IP, credentials, user data, and project boundaries remain intact;
- rollback or safe forward-fix is understood;
- the merge itself does not silently perform deployment, migration, auth/RLS changes, billing/spending, external publication, destructive deletion, credential movement, or other separately gated action.

If those conditions are not met, keep working or leave the PR open with the exact blocker. If the evidence conditions are met but fresh exact-candidate founder approval is missing, ask the founder and stop.

## Provider roles

- Claude: long-context repo reasoning, focused implementation, refactor planning, and documentation. Read `AGENTS.md` and any local `CLAUDE.md` before acting.
- Codex: code edits, tests, Playwright, CI triage, and repository operations. Keep patches focused and evidence-backed. Use the Codex provider baseline above when local model-provider configuration is needed.
- ChatGPT: reasoning, review, debugging, threat modeling, data analysis, and founder-readable decisions. Separate fact, inference, and action.
- Perplexity: current public research and source discovery. It is not private repository, account, Supabase, Cloudflare, or production truth unless those systems are explicitly connected and inspected.
- Managed agent runtimes such as OpenAI Frontier: eligible only as bounded execution substrates under Founder Control Room. Their identity, permission, tool, event, observability, and evaluation capabilities must be observed rather than assumed, and their execution receipts never self-promote into founder outcome truth.

## Separate gates

Do not deploy, roll back production, run destructive migrations, alter auth/RLS, rotate or expose secrets, spend funds, publish externally, send external communications, delete user material, or change production routing without explicit approval for that exact action.

Never delete Ray/Juss material without explicit approval for that specific deletion.