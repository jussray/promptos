# ACTUAL-FLOW V4: repository-bound engineering proof

This is a **founder-requested project export candidate** for PromptOS. It reuses
`workflows/continuity/continuity-fingerprint.mjs` without altering the approved
ULTRATHINK workflow or replacing Founder Control Room. The candidate registers
version 4.0.0 for PromptOS only when its change passes review and merges into main.
An approved workflow *definition* never authorizes agent execution or publication.

## Purpose

Tie an explicitly authorized software-engineering goal to:

- the **exact** observed repository names, branches, and 40-character head SHAs;
- a bounded goal/scope identifier and current OODA stage;
- individually classified evidence (`VERIFIED`, `INFERRED`, `UNKNOWN`, `BLOCKED`);
- a revocable, non-secret SHA-256 fingerprint + **proof cookie**;
- one specific next gate.

A repo/head/goal/evidence/next-gate change makes the old receipt stale and
requires a new inspection. The adapter re-derives the receipt to detect modified
evidence/continuity/cookie fields, and frozen in-memory evidence discourages
accidental mutation. Because all hashes are **non-secret**, a self-consistent
receipt is not an authenticated assertion: its evidence and repository head
must still be independently inspected. `proofGateVerdict()` reports evidence
classification completeness only; always pair it with freshness evaluation
and external evidence review. Proof cookies are **not browser cookies**, not
device fingerprints, not an authentication/session/permission token, and never
carry an approval from one repository state to another.

## Engineering lenses and routing

1. **5W1H + Socrates**: define who/what/where/when/why/how and falsify weak assumptions.
2. **GOALFIX + MoSCoW + 80/20**: diagnose the verified bottleneck and pick the
   smallest high-value in-scope action; retain the repo's exact bottleneck classes.
3. **Red Team 1 → LindyMode → L99 → Red Team 2**: attack premise, prefer durable
   existing carriers, bind authority/evidence/rollback, then attack the actual patch.
4. **OODA + FutureMe/You + first principles + ULTRATHINK/GODMODE**: observe current
   source, orient, decide one reversible action, act only inside authority, verify.
5. **Codex Dev Workflows**: scoped feature, bug, QA, and release review;
   **Codex Coordinator**: only when two or three independent durable workstreams
   exist in one checkout, and only with the project marker enabled;
   **Codex Engineering Guardrails**: implementation + independent verification;
   **Codex Process Jobs**: qualifying finite long local jobs;
   **Codex TestFlight Release**: eligible iOS builds with separate release approval;
   **Codex Material Themes**: editor appearance only.

`ATTACK/GODMODE` is deeper critical analysis, **not elevated access**.

## How to use (from PromptOS repository root)

```js
import {
  createEngineeringProofReceipt,
  evaluateEngineeringProofReceipt,
  proofGateVerdict,
} from './workflows/actual-flow-v4/proof-gate.mjs';

const current = {
  goalId: 'promptos-example',
  scopeId: 'authentication-review',
  stage: 'VERIFY',
  nextGate: 'founder-review',
  source: 'chatgpt',
  operator: 'gpt-6',
  mains: [{ repository: 'jussray/promptos', branch: 'main', sha: '<EXACT_40_CHARACTER_SHA>' }],
  evidence: [{ criterion: 'unit-tests', truth: 'UNKNOWN', ref: '' }],
};
const receipt = createEngineeringProofReceipt(current);
const freshness = evaluateEngineeringProofReceipt(receipt, current);
const evidenceVerdict = proofGateVerdict(receipt);
```

Replace the illustrative SHA with an actual observed 40-character SHA. Do not
use the example as a ready-to-run release receipt.

Run the new checks in the real repository checkout (the native continuity suite also
checks surrounding CI/workflow files, so it must run in a complete checkout):

```bash
node workflows/actual-flow-v4/verify.mjs
node workflows/continuity/verify.mjs
```

For changes to public UI/auth/browser flows, run the repository's required
Playwright tests on the **exact changed head** before claiming completion.
Existing CI, FCR, Cloudflare, or TestFlight gates remain separate; none of the
above substitutes for current runtime outcome proof.

## Deterministic PromptOS project export

Run on a verified checked-out commit **after the approved registry and workflow definition
are both present at that exact head**:

```bash
node workflows/actual-flow-v4/verify-export.mjs
node workflows/actual-flow-v4/export-project.mjs \
  --expected-head "$(git rev-parse HEAD)" \
  --project promptos \
  --output artifacts/actual-flow-v4.project-export.json
```

The export contains the complete versioned workflow definition, exact SHA and a
fail-closed project envelope. It refuses stale SHA, missing/duplicate registry
entries, unapproved definitions and unknown project identifiers. It creates a
new file without overwriting existing exports. Never treat the exported JSON as
an execution credential, authenticated account, provider connector, deployment,
or ChatGPT Sites publication.

The ChatGPT Sites identity remains UNVERIFIED under `SITES.md`. Do not claim
that the Site/editor imported this file, rendered an interface, or published a
live runtime until those outcomes are directly witnessed. Public domains and
the separate Founder Control Room surface remain unchanged. Once a real site
binding is verified, import this versioned definition only behind a verified
user account and perform desktop/mobile browser verification before release.

## Separate browser cookies

PromptOS already has opt-in first-party visitor cookies in `parts/auth.js`.
Those cookies are separate from these evidence receipts and must never be used
as source, identity, authority, or proof for this workflow. No invasive browser
fingerprinting or cross-site tracking is introduced here.

## Approval, lifecycle and rollback

- The export candidate adds a source-controlled approved entry to `workflows/registry.json`; this does not take effect on `main` until a separately approved, green merge.
- No merge/push/deploy is implied by completing any evidence check.
- A changed head, scope, evidence classification, goal, or next gate invalidates
  the predecessor proof for present-tense claims.
- Preserve old proof as history and issue a new receipt only on fresh observed evidence.
- To revert this integration, remove only `workflows/actual-flow-v4/` and
  `workflows/actual-flow-v4.workflow.json` **with explicit user approval**;
  no production state, repo continuity library, or browser cookies are affected.
