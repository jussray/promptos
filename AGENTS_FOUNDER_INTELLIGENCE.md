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

PromptOS also exposes the canonical portable Juss OS reasoning modes:

```text
/goalfix /ultrathink /truthmode /confess /redteam /lindymode /ooda /visualize
```

- `/goalfix`: diagnose one bounded failure or gap and choose the smallest reversible evidence-backed fix.
- `/ultrathink`: expand the option space, reconcile constraints, and select the highest-leverage evidence-backed path.
- `/truthmode`: separate `VERIFIED`, `INFERRED`, `UNKNOWN`, and `BLOCKED` claims against inspected evidence.
- `/confess`: expose unsupported assumptions, stale evidence, missing inspection, and overclaimed certainty.
- `/redteam`: challenge the premise, proposed change, authority boundary, and selected implementation for failure modes.
- `/lindymode`: prefer durable, reversible, low-dependency primitives over novelty and brittle coupling.
- `/ooda`: observe, orient, decide, act within current authority, verify, and define the next loop.
- `/visualize`: translate verified state into a diagram, plan, or explanation only; it does not mutate PromptOS, providers, infrastructure, or production state.

These portable commands are reasoning, planning, and routing modes only. They do not grant authority to execute, merge, deploy, publish, send externally, alter provider state, expose or rotate secrets, spend funds, delete material, or change production routing.

## Governed portable skills

### `browser-reality-inspector`

- **File:** [`skills/browser-reality-inspector/SKILL.md`](skills/browser-reality-inspector/SKILL.md)
- **Load when:** a user asks an agent to resolve a URL or share redirect and report what a real browser actually rendered.
- **Do not load when:** ordinary public research does not require live rendered-page inspection.
- **Boundary:** read-only navigation and evidence capture only; login/authentication steps, CAPTCHA, permission prompts, provider boundaries, mutation, and scope expansion stop the run.
- **Privacy:** browser-managed first-party session cookies may remain in an already-authenticated browser but may never be inspected or exported; evidence fingerprints bind sanitized receipts and never identify people/devices or correlate activity across sites.

The remembrance loop, repository-local instructions, privacy/safety rules, approval gates, exact-head proof, rollback requirements, Founder Control Room release truth, and non-deletion rules remain stronger authority. If a portable command conflicts with a stricter PromptOS rule, the stricter rule wins.

This entrypoint supplements repository-local agent instructions and never weakens privacy, safety, approval, rollback, evidence, or non-deletion rules.
