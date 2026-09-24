# Continuity Fingerprint Protocol

Purpose: make future founder shorthand resolvable without guessing, while preserving repository truth as authority.

## Resolution rule

Use shorthand as a retrieval signal, never as proof.

```text
founder shorthand
→ conversation/history fingerprints
→ candidate project
→ authoritative repository verification
→ action
```

For PromptOS, high-signal fingerprints include: prompt library, OODA, Redteam, L99, Lindy, prompt packs, Builder, Freestyle, custom prompts, prompt capability conversion, and repository operating prompts.

If a fingerprint could belong to Chief AI, FCR, Sol Continuity, or another project, verify the exact repo, branch, files, PR/issue, and current `main` before acting.

## TRUE-FIRST discovery invariant

PromptOS must compile truth-seeking work in this order: establish the strongest evidence-bound TRUE baseline first, then search for contradiction.

```text
exact subject binding
→ VERIFIED + TRUE claims only
→ deterministic baseline fingerprint
→ bounded non-secret proof cookie
→ contradiction search
→ exact-subject challenge
→ reconfirm TRUE, VERIFIED_CONTRADICTION, or force re-baseline
```

Rules:

1. Only `VERIFIED` TRUE claims carrying evidence references enter the baseline.
2. `INFERRED`, `REMEMBERED`, `UNKNOWN`, `BLOCKED`, `STALE`, evidence-free, or already-FALSE claims remain outside the TRUE baseline.
3. A moved repo head, runtime, provider state, authority state, or scope makes the predecessor claim stale. Movement is not automatically proof of falsehood.
4. After movement, reacquire TRUE before asking what is false. Never compare two different subject bindings and label the difference a contradiction.
5. Fingerprints must bind the load-bearing subject identity, scope, exact head/runtime identity, and accepted evidence-bound claims.
6. Proof cookies are continuity receipts only. They must be freshness-bounded, optionally linked to a predecessor, and may never encode standing approval or mutation authority.
7. Successful contradiction findings preserve both the predecessor TRUE receipt and the contradictory evidence so later agents can reconstruct what changed and why.
8. Where a project requires Playwright or another real-path verifier, PromptOS must preserve that evidence requirement when compiling the proof gate.

Founder Control Room owns the executable portfolio truth kernel. PromptOS compiles requests into that evidence discipline but does not mint execution authority.

## Genesis fingerprint

When asked when this project started, resolve in this order:
1. GitHub repository `created_at`.
2. Root/first commit reachable from authoritative history.
3. Earliest substantive implementation commit.
4. Historical docs that reference earlier work.
5. Earliest available conversation about the project.
6. Earlier uploaded designs, files, or artifacts.
7. Founder testimony, labeled as founder-reported rather than GitHub proof.

Keep idea genesis, repo genesis, first recorded build, first substantive build, launch milestones, and current state separate.

## Truth states

Always distinguish VERIFIED, INFERRED, REMEMBERED, UNKNOWN, STALE, and BLOCKED.

## Supersession and decay

Prior prompts, plans, branches, screenshots, PR descriptions, or deploy claims lose authority when `main`, runtime, provider state, or governing contracts change. Revalidate before reuse.

## Reuse rule

Every correction should leave a reusable fingerprint. Prefer exact prompt IDs, files, failing tests, PRs, SHAs, provider boundaries, and prior decisions before broad repo scans.

## Federated continuity quartet

PromptOS participates in a four-repository federation with Founder Control Room, Chief AI Machine, and Sol Continuity. PromptOS remains a standalone intent/workflow compiler; federation never turns it into a control plane or grants it mutation authority.

- **PromptOS** compiles founder intent, workflows, prompts, constraints, and reasoning modes.
- **Chief AI Machine** performs reasoning, capability composition, challenge, governance interpretation, and Chief-owned test-ledger work.
- **Sol Continuity** carries assistant/model/session continuity and capability-routing state across tools and adapters.
- **Founder Control Room** owns consequential founder-control execution boundaries, current approval binding, provider/runtime mutation, merge/deploy gates, and verified operational receipts.

Founder intent may enter through any approved surface, but PromptOS output is structure, not permission. A workflow, command, mode name, generated plan, fingerprint, or proof cookie cannot self-select privileged execution or widen authority.

### Bidirectional cookie rule

For material cross-repo work, PromptOS must accept continuity markers only as retrieval/evidence inputs, then re-resolve the source repo/head and target authority before using them:

```text
peer marker
→ exact source repo / branch / head verification
→ subject + runtime + provider + evidence + authority comparison
→ classify continuity movement
→ compile the smallest exact proposal
→ target repo applies its own approval/authority gate
→ re-observe outcome
→ successor fingerprint / proof cookie + receipt returns to affected peers
```

Cookies are non-secret state/evidence markers only. They are not browser cookies, secrets, credentials, approvals, merge tokens, deploy tokens, publish tokens, or standing execution authority. PromptOS must never encode a stale approval as reusable workflow authority.

Movement in repo head, subject, scope, authority, runtime, provider, evidence requirement, or founder proposal expires the affected present-tense marker until revalidated. Preserve predecessor markers and receipts as historical provenance.

Fresh verified evidence may update or invalidate stale PromptOS assumptions, workflow state, fingerprints, proof cookies, or next gates. Evidence alone never mutates. Under current founder approval bound to the exact proposal, and only when the target repository's own gates are satisfied, that evidence may support the smallest reversible repair, implementation, stale-proof correction, issue reconciliation, merge, or next action.

After an approved mutation elsewhere, PromptOS must consume the returned successor marker and compile from the new authoritative state rather than replaying the predecessor plan. If the outcome is unproven or contradictory, preserve that uncertainty explicitly.

This protocol supplements `AGENTS.md`, Founder Intelligence, release truth, Playwright, and approval gates. It never overrides a stricter rule or grants mutation authority by itself.
