# PromptOS

PromptOS is Juss Ray's **standalone governed prompt, skill, instruction, and founder-intent system**. It began as a 159-prompt library and has since grown into a governed catalog runtime with executable contracts, portable Juss command parity, plugin-management boundaries, research-grounded prompt packs, a founder-intent mission compiler, and desktop/mobile browser proof.

PromptOS can interoperate with Founder Control Room, Chief AI Machine, SolContinuity, and other first-party systems through explicit contracts without becoming a module, shell, or subordinate runtime of another product.

**Current catalog:** 398 curated prompts inside 5,000 selected recipes.

The current catalog is executable source truth, not a historical marketing count. `scripts/verify-catalog-runtime.mjs` verifies the selected and curated counts, and `scripts/verify-current-truth-surface.mjs` prevents this README from drifting away from the runtime again.

## Product boundary

PromptOS, Chief AI Machine, SolContinuity, and Founder Control Room are complementary standalone peers, not interchangeable layers inside one product.

- **Founder Control Room is a standalone founder operating environment and governance/evidence plane.** It owns FCR-native state and may evaluate or coordinate cross-system execution only where an explicit current contract gives it that role; it is not the parent product shell for its peers.
- **PromptOS is a standalone human-AI instruction governance product.** It structures founder intent, context, constraints, reusable workflows, prompts, skills, agent behavior, and human-reviewed learning while retaining its own repository, product identity, interface, lifecycle, evidence, and failure state.
- **Chief AI Machine is a standalone Founder Intelligence product.** It may interpret bounded requests, reason, plan, compose capability proposals, and produce evidence-shaped handoffs without becoming an FCR module or self-authorizing consequential execution.
- **SolContinuity is a standalone continuity and resilience product.** It can exchange bounded evidence with the other peers without surrendering its own runtime or product boundary.
- A PromptOS artifact, Chief output, FCR receipt, or SolContinuity observation cannot silently widen another peer's execution authority or prove deployment, provider state, publication, or external outcome on that peer's behalf.

The machine-readable functional contract lives at `.control-room/product-boundary.json`; the standalone-peer topology is also recorded in `.control-room/council-residency.contract.json`. Both are enforced by repository verification.

```text
Founder Control Room
current truth -> authority decision -> governed coordination/execution -> evidence -> outcome -> next gate

PromptOS
intent/context -> instruction governance -> workflow/skill behavior -> proposal request -> learning

Chief AI Machine
request -> reasoning -> capability composition -> proposal -> evidence handoff

SolContinuity
routes/providers -> continuity evidence -> failover/recovery -> proof
```

## Commercial packaging

PromptOS keeps its standalone product identity regardless of go-to-market packaging. It may be offered directly, keep a free public catalog or acquisition layer, or participate in an explicit multi-product bundle with Founder Control Room or another first-party product.

Bundling with Founder Control Room does not collapse PromptOS product identity, runtime, authority, receipts, pricing truth, or evidence. A paid PromptOS offer, conversion claim, retention claim, or revenue claim still requires PromptOS-specific economic evidence.

## What exists now

- **Prompt catalog:** 398 curated prompts are pinned inside a 5,000-recipe selected catalog. The curated layer includes builder prompts, reasoning/challenge prompts, and the 150-prompt research expansion.
- **Founder-intent mission compiler:** turns founder intent, constraints, providers, and project context into a governed mission with an explicit authority ceiling, verification requirements, rollback path, and cross-system handoffs.
- **Authority contracts:** repository and founder-intelligence instructions keep audit context below integration or mutation authority and prohibit silent authority expansion.
- **Plugin-management contract:** allows declared integrations to be reasoned about without treating repository configuration as proof of live provider state.
- **Portable command surface:** keeps Juss command semantics consistent across supported agent environments while preserving each participating system's own authority boundary.
- **Verification:** focused source-contract checks plus desktop/mobile Playwright proof run in the Control Room test workflow and retain proof artifacts.


## Court compiler bridge

PromptOS exposes a bounded server-side `POST /court/compile` adapter for
Founder Court/Council handoffs. The route deterministically compiles an
evidence-bound next-proof workflow; it does not call a model, mutate the prompt
catalog, promote a candidate, publish, deploy, or create execution authority.

The route requires the dedicated server-only `PROMPTOS_COURT_BRIDGE_KEY`.
Do **not** reuse `PROMPTOS_AI_OPERATOR_KEY`: provider/optimizer credentials and
Court compilation authority are separate capability roots. A valid Court
handoff must bind a full source SHA, witness receipt fingerprint, observation
lease, exact zero-authority ceiling, and its own handoff fingerprint. Stale
handoffs compile only to `BLOCKED_STALE_HANDOFF`.

## Truth boundary

PromptOS compiles and governs instructions; it does **not** turn an audit, prompt, plugin declaration, generated mission, or Chief proposal into deployment or production authority.

Use this order when making a material claim:

```text
current main -> executable contract -> exact-head checks -> provider/runtime evidence -> claim
```

Keep `VERIFIED`, `INFERRED`, `UNKNOWN`, and `BLOCKED` distinct. A successful repository check proves only the boundary it actually executed.

## Repository mutation boundary

Provider branch-protection and ruleset state is runtime truth, not repository inference. `.github/workflows/main-authority-contract.yml` verifies founder-owned non-force `main` pushes, checks ancestry to reject non-fast-forward history movement, and reads back live GitHub protection state.

Repository-side CI can detect an unsafe `main` mutation after GitHub accepts it, but it cannot prevent that mutation when the provider leaves `main` unprotected. Therefore PromptOS does **not** claim provider-enforced merge authority unless `scripts/verify-main-provider-protection.mjs` confirms required status checks are enforced by classic branch protection or an active main-applicable ruleset.

## Key surfaces

- `AGENTS.md` — repository operating contract
- `AGENTS_FOUNDER_INTELLIGENCE.md` — founder-intelligence execution boundary
- `docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md` — governance constitution
- `docs/HUMAN_SAFE_BUILD_CONTRACT.md` — bounded build contract
- `docs/receipts/PROMPTOS_TRUTH_SURFACE_MERGE_REVIEW_2026-09-26.md` — latest truth-surface/merge continuity receipt
- `.control-room/plugin-management.json` — plugin-management declaration
- `.control-room/product-boundary.json` — PromptOS/Chief/FCR functional boundary
- `.control-room/council-residency.contract.json` — standalone-peer topology
- `control-room.manifest.json` — Control Room capability manifest
- `scripts/verify-catalog-runtime.mjs` — 5,000 selected / 398 curated catalog contract
- `scripts/verify-current-truth-surface.mjs` — binds current README claims to executable catalog and product truth
- `scripts/verify-pages-publication-source.mjs` — live GitHub Pages publication-source readback and authority gate
- `scripts/verify-main-push-authority.mjs` — founder/non-force `main` push authority proof
- `scripts/verify-main-provider-protection.mjs` — live branch-protection/ruleset required-check readback
- `scripts/verify-founder-os-mission-compiler.mjs` — Founder OS compiler contract proof
- `scripts/verify-product-boundary.mjs` — PromptOS/Chief/FCR functional boundary proof
- `e2e/founder-os-mission-compiler.mjs` — desktop/mobile compiler proof
- `.github/workflows/control-room-tests.yml` — exact repository verification lane
- `.github/workflows/main-authority-contract.yml` — exact-head main mutation and provider-protection authority lane
- `.github/workflows/pages-deploy.yml` — founder-gated manual deployment workflow, permitted to publish only when live Pages authority is configured for GitHub Actions
- `e2e/public-deploy-proof.mjs` — proves the deployed public URL is wall-free, renders the real guest-boot UI, and serves the exact published commit SHA

## Public surface boundary

PromptOS's human-facing browser UI may be published through `.github/workflows/pages-deploy.yml`, which runs only on an explicit `workflow_dispatch` and stages an allowlisted public artifact. Chief AI Machine, Founder Control Room, governance manifests, credentials, and non-public control surfaces stay outside that artifact.

Provider publication state is runtime truth, not repository inference. The deployment workflow and deployment-candidate contract call `scripts/verify-pages-publication-source.mjs` and fail closed unless GitHub Pages reports `build_type=workflow`. If the provider is configured in legacy branch mode, a push to `main` can publish outside the authorized workflow and the deployment-authority gates must remain blocked.

Merging `main` is not authorization to publish. A successful source or staged-browser test proves code readiness, not provider publication authority. The latest provider-specific continuity receipt is kept under `docs/receipts/`.

## Documentation rule

`main` is implementation authority. Markdown is a projection of verified repository truth, not a reason to change implementation merely to make stale prose true. Historical documents may remain historical; current-state documents must be reconciled when their claims materially drift from `main`.
