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
- `/redteam`: challenge the premise, proposed change, authority boundary, and selected implementation for failure modes.
- `/lindymode`: prefer durable, reversible, low-dependency primitives over novelty and brittle coupling.
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