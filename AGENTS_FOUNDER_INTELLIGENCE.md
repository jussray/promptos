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
/plan /goal /loop /resume /compact /btw /effort /lens /pack
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
- `/loop`: re-observe current state, compare expected and observed state, adapt the next bounded move, and invalidate stale evidence after state movement.
- `/resume`: reacquire current fingerprints and continuity evidence before continuing prior work. Prior proof never carries across changed state.
- `/compact`: compress working context while preserving decisions, exact fingerprints, evidence, blockers, authority boundaries, rollback, and unresolved unknowns.
- `/btw`: answer a side question in isolation. It cannot silently change the active goal, plan, authority, or continuity state.
- `/effort`: declare requested reasoning depth, time, or cost budget as planning metadata. More effort may deepen analysis but cannot widen authority.
- `/lens`: request a named reasoning lens as advisory metadata. Return conclusions, evidence, tradeoffs, and decisions; do not require private chain-of-thought and do not impersonate a named person.
- `/pack`: invoke a declared, versioned prompt pack by identifier. A pack cannot widen authority and cannot be described as installed or executed until runtime availability is observed.

Named reasoning lenses may include ULTRATHINK, ATTACK TEN, L99, Lindy, OODA, First Principles, Anti-Advice, Socratic challenge, FutureYOU, 80/20, Unlearn, Human, and truth-oriented passes. A lens changes the requested analysis frame, not execution authority.

Prompt-pack classes may include social strategy, content pillars, 30-day calendars, post creation, short-form video scripting, community growth, performance analysis, and website/workflow guidance. Keep packs versioned and data-driven where practical. Skill, plugin, or pack availability must be observed before any execution claim.

These portable commands are reasoning, planning, and routing modes only. They do not grant authority to execute, merge, deploy, publish, send externally, alter provider state, expose or rotate secrets, spend funds, delete material, or change production routing.

A changed repository head, provider state, proposal fingerprint, or other bound subject invalidates predecessor proof for that changed subject. `/resume`, `/loop`, `/compact`, or any other command cannot carry stale evidence forward as fresh proof.

PromptOS may preserve compact decisions and evidence references, but it does not persist or require private chain-of-thought.

The remembrance loop, repository-local instructions, privacy/safety rules, approval gates, exact-head proof, rollback requirements, Founder Control Room release truth, and non-deletion rules remain stronger authority. If a portable command conflicts with a stricter PromptOS rule, the stricter rule wins.

This entrypoint supplements repository-local agent instructions and never weakens privacy, safety, approval, rollback, evidence, or non-deletion rules.
