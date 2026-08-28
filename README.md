# PromptOS

PromptOS is Juss Ray's governed prompt and founder-intent operating system. It started as a 159-prompt library for OODA, Redteam, L99, Lindy, coding, and Chief AI repo operations; current `main` also includes executable governance contracts, portable Juss OS command parity, plugin-management boundaries, and a Founder OS mission compiler with desktop/mobile browser proof.

## What exists now

- **Prompt library:** structured prompts for OODA, Redteam, L99, Lindy, coding, Chief AI, and founder operations.
- **Founder OS mission compiler:** turns founder intent, constraints, providers, and project context into a governed mission with an explicit authority ceiling, verification requirements, rollback path, and cross-system handoffs.
- **Authority contracts:** repository and founder-intelligence instructions keep audit context below integration or mutation authority and prohibit silent authority expansion.
- **Plugin-management contract:** allows declared integrations to be reasoned about without treating repository configuration as proof of live provider state.
- **Portable command surface:** keeps Juss OS command semantics consistent across supported agent environments.
- **Verification:** focused source-contract checks plus desktop/mobile Playwright proof run in the Control Room test workflow and retain proof artifacts.

## Truth boundary

PromptOS compiles and governs instructions; it does **not** turn an audit, prompt, plugin declaration, or generated mission into deployment or production authority.

Use this order when making a material claim:

```text
current main -> executable contract -> exact-head checks -> provider/runtime evidence -> claim
```

Keep `VERIFIED`, `INFERRED`, `UNKNOWN`, and `BLOCKED` distinct. A successful repository check proves only the boundary it actually executed.

## Key surfaces

- `AGENTS.md` — repository operating contract
- `AGENTS_FOUNDER_INTELLIGENCE.md` — founder-intelligence execution boundary
- `docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md` — governance constitution
- `docs/HUMAN_SAFE_BUILD_CONTRACT.md` — bounded build contract
- `.control-room/plugin-management.json` — plugin-management declaration
- `control-room.manifest.json` — Control Room capability manifest
- `scripts/verify-founder-os-mission-compiler.mjs` — Founder OS compiler contract proof
- `e2e/founder-os-mission-compiler.mjs` — desktop/mobile compiler proof
- `.github/workflows/control-room-tests.yml` — exact repository verification lane
- `.github/workflows/pages-deploy.yml` — founder-gated, `workflow_dispatch`-only publication of `index.html` and its canonical `parts/*.js` to GitHub Pages
- `e2e/public-deploy-proof.mjs` — proves the deployed public URL is wall-free, renders the real guest-boot UI, and serves the exact published commit SHA

## Public surface boundary

PromptOS's human-facing browser UI (`index.html` and its canonical `parts/*.js`) may be published to GitHub Pages, but only through `.github/workflows/pages-deploy.yml`, which runs solely on an explicit `workflow_dispatch`. That workflow stages only the browser prompt library — Chief AI Machine, Founder Control Room, and every governance manifest in this repository stay off the public artifact. Publication is not merge; merging this repository's `main` branch never deploys anything on its own.

## Documentation rule

`main` is implementation authority. Markdown is a projection of verified repository truth, not a reason to change implementation merely to make stale prose true. Historical documents may remain historical; current-state documents must be reconciled when their claims materially drift from `main`.
