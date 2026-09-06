---
schema: juss/chatgpt-sites-repository-binding@v1
project_id: promptos
canonical_repository: jussray/promptos
canonical_branch: main
authority_repository: jussray/founder-control-room
site_identity_status: unverified
site_origin: null
---

# ChatGPT Sites repository binding — PromptOS

This file defines the repository-side contract for a ChatGPT `@Sites` surface representing PromptOS. It does not create a Site, prove a Site is connected, or prove publication.

## Canonical source

The Site must treat `jussray/promptos` as the only canonical PromptOS repository and resolve current `main` at use time. It must not use a generated Site snapshot, copied prompt library, another repository, or chat memory as current PromptOS truth.

Before material planning, editing, automation, publication, deployment, or cross-repository coordination, read and apply the current versions of:

- `AGENTS.md`
- `AGENTS_FOUNDER_INTELLIGENCE.md`
- `docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md`
- `docs/HUMAN_SAFE_BUILD_CONTRACT.md`
- `docs/CONTINUITY_FINGERPRINT_PROTOCOL.md`
- `.control-room/plugin-management.json`
- `.control-room/repository.manifest.json`
- `control-room.manifest.json`
- `README.md`

Stricter repository-local rules always win.

## Read contract

A Site may render public-safe PromptOS state from the canonical repository only after resolving the current head and authority files. It must preserve provenance, distinguish source/test/browser/deployment/runtime truth, and fail closed on stale or conflicting evidence.

Never expose provider credentials, API keys, raw private prompts, private model responses, private workflow logs, or proprietary/private prompt content through a public Site merely because the repository can access it.

## Write contract

A Site may prepare PromptOS changes only on a focused branch created from freshly resolved `main`, followed by a pull request. It must not push ordinary work directly to `main`, force-push, delete founder material, bypass checks, or let generated prompt text grant itself authority.

A repository write never silently authorizes merge, GitHub Pages publication, ChatGPT Sites publication, provider configuration, deployment, credentials, external communication, or another separately gated action.

## Publication contract

PromptOS already has a separate founder-gated GitHub Pages publication capability. That existing deployment path remains independent of ChatGPT Sites and must not be confused with a Sites publish result.

The ChatGPT Site identity for PromptOS is currently `UNVERIFIED` in repository evidence. No slug, hostname, project ID, or generated Site URL may be guessed. Until the runtime exposes and verifies that identity, hold live Site publication.

After Site identity verification, a Sites publish must bind to the intended exact repository state, re-read this Markdown authority chain, exclude governance/private surfaces from public output, and capture an observable Site artifact. Editor save, commit, PR, merge, CI, or another provider's deployment is not Sites publication proof.

## Authority boundary

PromptOS governs prompts, skills, agents, and instruction contracts. Founder Control Room remains the portfolio governance/execution authority. PromptOS or its Site may propose and prepare bounded changes; neither may manufacture founder approval or widen its own authority.

## Stop conditions

Stop on unverified Site identity, stale repository head, unreadable authority files, private/proprietary content risk, conflicting source truth, or a publication/deployment/provider gate without current authority.
