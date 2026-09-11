# Founder Intelligence Agent Entry Point

Every AI agent working in this repository must read and apply [`docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md`](docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md) before material planning, implementation, review, automation, publication, deployment, migration, or cross-repository coordination.

When a task invokes ChatGPT Plugin Management or an external plugin, also read [`.control-room/plugin-management.json`](.control-room/plugin-management.json). That file declares intended repository capability only. Live installation, connection, permission, and execution state must be discovered from the ChatGPT runtime before making any claim or taking a plugin-backed action; prompt, provider, key, publication, deployment, and production authority remain separately gated.

Required remembrance loop:

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

## Portable Juss OS command surface

PromptOS exposes provider-neutral workflow semantics. These names describe reusable intent and protocol behavior. They do not claim that Anthropic, OpenAI, or another provider implements a native slash command with the same name.

```text
/goalfix /ultrathink /truthmode /confess /redteam /lindymode /ooda /visualize
/plan /goal /make /loop /resume /compact /btw /effort /lens /pack
```

Existing reasoning modes:

- `/goalfix`: diagnose one bounded failure or gap and choose the smallest reversible evidence-backed fix.
- `/ultrathink`: expand the option space, reconcile constraints, and select the highest-leverage evidence-backed path.
- `/truthmode`: separate `VERIFIED`, `INFERRED`, `UNKNOWN`, and `BLOCKED` claims against inspected evidence.
- `/confess`: expose unsupported assumptions, stale evidence, missing inspection, and overclaimed certainty.
- `/redteam`: run two bounded passes. Red-team 1 attacks the premise, current evidence, scope, and whether the change should exist; Red-team 2 attacks the selected implementation for authority drift, security/privacy failures, regressions, stale proof, hidden assumptions, overclaims, and rollback gaps.
- `/lindymode`: prefer existing verified carriers and durable, reversible, low-dependency primitives; do not preserve age for its own sake or add novelty before a real need and proof.
- `/ooda`: observe, orient, decide, act within current authority, verify, and define the next loop.
- `/visualize`: translate verified state into a diagram, plan, or explanation only; it does not mutate PromptOS, providers, infrastructure, or production state.

Portable workflow semantics:

- `/plan`: produce a bounded plan with dependencies, proof, rollback, stop conditions, and a next gate. Planning is not execution.
- `/goal`: normalize intent into a goal, constraints, definition of done, evidence requirements, and an authority ceiling.
- `/make`: compile a current founder intent or repeated approved pattern into a reusable versioned workflow draft using the current mission contract; preserve the intent and authority ceiling, preview before registration, and require explicit founder approval before registry promotion.
- `/loop`: re-observe current state, compare expected and observed state, adapt the next bounded move, and invalidate stale evidence after state movement.
- `/resume`: reacquire current fingerprints and continuity evidence before continuing prior work. Prior proof never carries across changed state.
- `/compact`: compress working context while preserving decisions, exact fingerprints, evidence, blockers, authority boundaries, rollback, and unresolved unknowns.
- `/btw`: answer a side question in isolation. It cannot silently change the active goal, plan, authority, or continuity state.
- `/effort`: declare requested reasoning depth, time, or cost budget as planning metadata. More effort may deepen analysis but cannot widen authority.
- `/lens`: request a named reasoning lens as advisory metadata. Return conclusions, evidence, tradeoffs, and decisions; do not require private chain-of-thought and do not impersonate a named person.
- `/pack`: invoke a declared, versioned prompt pack by identifier. A pack cannot widen authority and cannot be described as installed or executed until runtime availability is observed.

`/make` is the reusable-workflow seam over the existing Founder OS mission compiler. A newly compiled workflow remains `draft`, cannot self-register, and cannot silently replace founder intent. Source-controlled approved workflows are listed in `workflows/registry.json`; changing a workflow from draft to approved is a founder authority event, not an inference from reuse or successful tests.

### Two-pass red-team order

For nontrivial work, apply the challenge stack in this order:

1. **Red-team 1 — premise:** test whether the requested change should exist, whether current authoritative evidence establishes a real defect, and whether the proposed scope serves the founder's intended outcome.
2. **Lindy mode:** choose the smallest durable, reversible, low-dependency carrier; preserve existing verified work and stable interfaces, but replace an older choice when evidence shows it no longer fits.
3. **L99:** bind provenance, state, authority, release, rollback, and long-term drift so the selected path remains legible.
4. **Red-team 2 — implementation:** attack the chosen patch for authority drift, stale evidence, security/privacy failures, regressions, hidden assumptions, overclaims, missing recovery, and unsafe retry or escalation.

A failed pass changes the goal, narrows the patch, or stops the run; it is not papered over by a successful test.

Named reasoning lenses may include ULTRATHINK, ATTACK TEN, L99, Lindy, OODA, First Principles, Anti-Advice, Socratic challenge, FutureYOU, 80/20, Unlearn, Human, and truth-oriented passes. A lens changes the requested analysis frame, not execution authority.

Prompt-pack classes may include social strategy, content pillars, 30-day calendars, post creation, short-form video scripting, community growth, performance analysis, and website/workflow guidance. Keep packs versioned and data-driven where practical. Skill, plugin, or pack availability must be observed before any execution claim.

These portable commands are reasoning, planning, and routing modes only. They do not grant authority to execute, merge, deploy, publish, send externally, alter provider state, expose or rotate secrets, spend funds, delete material, or change production routing.

A changed repository head, provider state, proposal fingerprint, or other bound subject invalidates predecessor proof for that changed subject. `/resume`, `/loop`, `/compact`, or any other command cannot carry stale evidence forward as fresh proof.

PromptOS may preserve compact decisions and evidence references, but it does not persist or require private chain-of-thought.

## Human voice and prose integrity

When PromptOS composes or revises founder-facing, public-facing, or authored prose, optimize for truthful voice and useful writing, not detector evasion.

Use a density-based voice audit:

- Treat AI-associated wording and rhetorical patterns as a density signal, never as proof of AI authorship.
- Do not use banned-word or banned-punctuation lists. Preserve correct punctuation, ordinary compounds, and precise vocabulary when they serve the sentence.
- Review clustered repetition such as canned signposting, repeated copula avoidance, negative parallelism, padded lists of three, synonym cycling, shallow `-ing` analysis, vague authority, ornamental scope ranges, and repeated chatbot closers. A single occurrence is not a failure.
- Prefer concrete facts, source-backed authority, specific judgment, and information that belongs to the author over generic fluency or decorative gravitas.
- Vague authority must receive a real source, be explicitly qualified, or be removed.
- When authentic author samples are supplied and relevant, use them to preserve vocabulary, rhythm, sentence length, humor, and structure. Do not flatten the voice into generic "humanized" prose.
- Do not invent personal experience, personal opinion, certainty, or emotional texture merely to make generated text appear human.
- Self-audit after drafting, then rewrite only the spans that create a synthetic cluster or weaken truth. Preserve unaffected language.

This audit is a writing-quality control, not an AI detector. It must never be used to accuse a person of AI authorship from style alone.

## Infrastructure consequence filter

When PromptOS reasons about infrastructure used by an FCR-managed product, do not turn vendor changelogs into a founder backlog.

For Cloudflare, Supabase, Firebase, Expo, n8n, Vercel, and future providers, surface a provider change only when it is materially relevant to an active product path. Prioritize:

- official releases or deprecations that create a dated migration or compatibility obligation;
- security or reliability incidents that can change product risk or evidence interpretation;
- limits, pricing, quotas, or runtime behavior that can change viability, cost, or failure modes;
- important integration changes that can alter authentication, deployment, execution, observability, or data flow.

Classify provider changes as `MATERIAL`, `WATCH`, `NOISE`, or `UNKNOWN` before recommending work. Routine changelog activity with no material product effect is `NOISE`, not a task.

A `MATERIAL` item must identify the authoritative provider evidence, the exact affected product path, why the consequence exists now, and the smallest reversible review or repair. Return only the one or two highest-value founder review gates unless more action becomes necessary as evidence changes.

Keep provider truth separate from application truth. A provider incident is provider-state evidence, not proof of an application defect. A successful provider execution is execution evidence, not proof of the founder outcome.

This filter routes attention only. It does not grant permission to upgrade dependencies, migrate data, alter provider configuration, change billing, deploy, or widen execution authority. Founder Control Room remains the single operating-system authority and consequential action still follows its shared intent, authority, evidence, outcome, and next-gate contract.

## Quantum consequence and evidence gate

When PromptOS evaluates quantum-computing claims for FCR-managed products, treat them as evidence-sensitive external capabilities, not as reasons to create a separate operating system or premature runtime dependency.

Classify quantum evidence before recommending implementation:

- `STANDARDIZED`: a relevant standard or binding transition requirement exists from an authoritative standards or government body.
- `PEER_REVIEWED`: the result has passed peer review, while practical relevance must still be established separately.
- `REPLICATED`: an independent implementation, benchmark, or reproduction materially supports the claimed result.
- `VENDOR_TECHNICAL`: a major lab or vendor has published enough technical detail for scrutiny, but independent confirmation is incomplete.
- `SIMULATION_ONLY`: the claimed improvement is numerical or simulated and is not proof of production hardware advantage.
- `CONTESTED`: credible adversarial analysis, a stronger classical baseline, cryptanalysis, or reproduction materially narrows or contradicts the claim.

Do not collapse these classes into a generic `quantum-safe`, `quantum-ready`, or `quantum-advantage` boolean. Algorithm maturity, provider support, enabled configuration, observed runtime behavior, interoperability, and outcome evidence are separate proof planes.

A quantum development becomes `MATERIAL` only when it plausibly changes at least one practical FCR decision surface: AI training/inference/search/sampling; combinatorial optimization, routing, scheduling, allocation, planning, or constraint solving; cryptographic migration or long-lived confidentiality; fault-tolerance/error-correction resource requirements; or hardware/compiler/control economics for a useful workload. Routine qubit counts, isolated fidelity records, roadmap promises, and application-free demonstrations remain `WATCH` or `NOISE`.

For post-quantum security, prefer cryptographic inventory, provider ownership, migration readiness, and crypto agility over application-level reimplementation of cryptographic primitives. A quantum-computing announcement alone is never proof that current public-key cryptography has been broken. Keep harvest-now-decrypt-later exposure, standards migration deadlines, provider deployment support, and demonstrated cryptanalytic capability separate.

For optimization, quantum solvers are challengers, not privileged baselines. Require comparison against a strong classical method using the same problem definition, instance distribution, objective, constraints, resource accounting, stopping rule, and success metric. A claimed advantage that disappears under a stronger classical baseline becomes `CONTESTED` and must not drive production architecture.

Any implementation proposal must pass the existing founder-intent loop:

```text
Founder Intent
→ Current State
→ Affected Capability
→ Authority
→ Smallest Reversible Action
→ Evidence
→ Outcome
→ Next Gate
```

If evidence is mature enough for implementation, use the smallest existing FCR/PromptOS/security/optimization carrier and declare verification plus rollback. If evidence is immature, preserve it as `WATCH` or `RESEARCH` with the falsification or replication evidence needed to promote it. Do not create a new quantum subsystem, dashboard, PR, framework, or runtime dependency when an existing carrier can express the requirement.

This quantum gate routes evidence and attention only. It does not grant authority to change cryptography, provider settings, production dependencies, deployments, security policy, or optimization routing.

## Governed portable skills

### `browser-reality-inspector`

- **File:** [`skills/browser-reality-inspector/SKILL.md`](skills/browser-reality-inspector/SKILL.md)
- **Load when:** a user asks an agent to resolve a URL or share redirect and report what a real browser actually rendered.
- **Do not load when:** ordinary public research does not require live rendered-page inspection.
- **Boundary:** read-only navigation and evidence capture only; login/authentication steps, CAPTCHA, permission prompts, provider boundaries, mutation, and scope expansion stop the run.
- **Privacy:** browser-managed first-party session cookies may remain in an already-authenticated browser but may never be inspected or exported; evidence fingerprints bind sanitized receipts and never identify people/devices or correlate activity across sites.

### `evidence-decision-loop`

- **File:** [`skills/evidence-decision-loop/SKILL.md`](skills/evidence-decision-loop/SKILL.md)
- **Load when:** a conclusion, experiment result, performance call, merge/release review, or cross-repository recommendation depends on mixed evidence.
- **Boundary:** decision support only. It separates source, execution, and outcome truth; secondary signals cannot declare primary success; changed fingerprints invalidate predecessor proof.
- **Authority:** the skill may recommend a next gate but cannot grant merge, deploy, publish, send, spend, delete, permission, or production authority.

The remembrance loop, repository-local instructions, privacy/safety rules, approval gates, exact-head proof, rollback requirements, Founder Control Room release truth, and non-deletion rules remain stronger authority. If a portable command conflicts with a stricter PromptOS rule, the stricter rule wins. Governed skills follow the same precedence and cannot weaken a stricter repository rule.

This entrypoint supplements repository-local agent instructions and never weakens privacy, safety, approval, rollback, evidence, or non-deletion rules.