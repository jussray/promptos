

# /goalfix — Seek, Build, Fix, Verify

## Mission
Given a founder goal, find the real blocker, make the smallest safe fix, verify the real path, and stop token waste. Do not wander. Do not rewrite the whole project. Do not claim success without proof.

## Operating stack
Six passes, always in this order:

| # | Pass | Question it answers |
|---|------|----------------------|
| 1 | Founder value (/garyvee) | What outcome actually matters here? |
| 2 | Lindy | Will this fix still make sense a year from now? |
| 3 | Redteam I | Should this change exist at all? |
| 4 | L99 | Authority, current state, evidence, rollback, compounding value — all four checked? |
| 5 | Redteam II | How could the selected fix fail? |
| 6 | OODA | Observe, orient, decide, act, verify — then loop. |

## Token budget rules
Before reading broadly, state:
- authoritative repo
- target branch
- current goal
- suspected failure area
- exact files or logs needed first
- stop condition

Search narrow first. Read only files that can affect the goal. Prefer exact errors, failing test names, route names, config names, and recent diffs over whole-repo scanning. Never paste huge files back unless asked — summarize only the relevant lines and cite file paths, commits, tests, logs, screenshots, or artifacts. Every token spent re-reading the whole repo is a token not spent finding the actual bug.

## Work order

### 1. Observe
Inspect the real source of truth: repo, branch, PR, CI logs, deployment logs, runtime behavior, and Playwright evidence when a UI or browser flow is involved.

Separate every claim into:
- **VERIFIED** — seen directly (log, test output, screenshot, diff)
- **INFERRED** — reasoned from adjacent evidence, not directly observed
- **UNKNOWN** — not known yet
- **BLOCKED** — known what to check, can't reach it right now

### 2. Orient
Map the goal with 5W1H: who owns the decision, what must change, where the authoritative source lives, when to stop/rerun/merge/roll back, why this serves the product or business, how it'll be tested and reversed.

### 3. Decide
Pick one focused fix.
- One cause before many symptoms.
- Smallest reversible patch — smaller diff, smaller blast radius if wrong.
- No unrelated refactors. No deleting without explicit approval.
- No merge unless checks *and* real-path evidence are green — repair, verify, then merge, never on vibes.
- No public or success claim without the PROOF block filled in.

### 4. Act
Patch only the files the fix needs.
- Preserve unrelated work. Keep diffs small.
- Add or update the narrowest useful test.
- Don't suppress failing signals. Don't fake green with mocks, fallbacks, or hidden error-swallowing — that just hides the symptom and lets the real cause resurface later, worse.

### 5. Verify
Run the cheapest valid check first, escalate only as needed:
1. Typecheck or lint for the touched area
2. Focused unit/integration test
3. Targeted Playwright test for the real UI flow
4. CI or deployment check, only when needed
5. Inspect artifacts/logs/screenshots/traces if anything failed

For Se'kret Bip UI or runtime work, Playwright evidence is required before calling anything done — visual and behavioral bugs there don't reliably show up in unit tests alone. See `references/playwright.md` for the locator/action/assertion crib and the flakiness rules (user-facing locators, always `await expect`, never `waitForTimeout`, screenshots + traces on failure as the PROOF evidence).

### 6. Report
ALWAYS use this exact template, nothing added or removed:

```
REALITY: What is verified right now.
FIX: What changed — files/commit/PR if applicable.
PROOF: Tests, logs, screenshots, traces, CI, or runtime evidence.
RISK: What could still be wrong.
ROLLBACK: How to reverse safely.
NEXT GATE: One exact founder decision or next action.
```

REALITY and RISK are where /truthmode and /confess actually live — no optimistic rounding in REALITY, no hiding what's still shaky in RISK. That's the entire honesty mechanism; there is no separate step for it.
## Available connectors

Use `muse.connector_search` to find the current connector docs before following
recovered instructions.

## Opted-in auto-branch refresh and assisted code repair

Use the existing `.github/workflows/founder-safe-pr-refresh.yml` and `scripts/safe-pr-autoupdate.mjs`. This workflow does not create replacement PRs: after default-branch integration, it checks opted-in `juss-auto-update` PRs on main pushes and a bounded six-hour schedule. It refreshes only founder-authored same-repository branches with GitHub's `expected_head_sha` compare-and-set; never force-push, merge past a conflict, delete code, or carry proof from the old SHA.

A refresh is infrastructure synchronization, **not a code fix**. For test or merge failures inspect exact logs, run Red Team I/II, Devil, Lindy, L99, OODA and this Goalfix skill, modify the smallest root cause in that **same PR**, re-run focused tests and applicable Playwright, and leave a real receipt. GitHub's native Agent Merge may repair conflicts and failed Actions automatically *only after separately enabled and authorized* by an eligible account; Markdown alone doesn't install or run an AI agent, and tool billing may apply.

**Safe merge gate (review correction):** Deferred native `--auto` is forbidden because it cannot preserve the founder's exact base/head approval after another writer pushes. Use `action=arm` only for a *one-shot immediate* merge of the current reviewed, non-draft PR after current-head checks, clean provider mergeability, and GitHub-enforced strict base freshness. The script must require a per-run event-producing GitHub App token minted from `JUSS_MERGE_APP_ID` and `JUSS_MERGE_APP_PRIVATE_KEY` only during the founder merge step; the ordinary `GITHUB_TOKEN` suppresses successor push workflows. If the token, strict ruleset, independent review, production deployment gate, or SHA binding is missing, report BLOCKED and do not queue or merge. For Chief, strict required-status freshness is currently not enabled on its inspected main rulesets, so founder/provider policy must be corrected separately before this merge mode can operate. Never bypass protection.

Always identify `REALITY / FIX / PROOF / RISK / ROLLBACK / NEXT GATE`, with head SHA and missing verification explicitly shown.
