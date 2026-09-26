---
name: browser-reality-inspector
description: Inspect user-authorized URLs in a live rendered browser; use for redirects and page-state proof, not ordinary web research.
metadata:
  version: 1.0.0
  tags:
    - browser
    - verification
    - read-only
    - privacy
---

# Browser Reality Inspector

Canonical contract: `juss/browser-reality@v1` in [`.control-room/browser-reality.contract.json`](../../.control-room/browser-reality.contract.json).

## Use this skill when

Load this skill when the user asks what a URL, share link, redirect, public post, listing, profile, Reel, event, or other live web page actually renders in a browser.

Trigger examples:

- "Open this share link and tell me what it really points to."
- "Use the cloud browser and verify what is visible on this page."
- "Follow the redirect, capture proof, and red-team the claims."

Do not load it for ordinary web research that does not require live rendered-page inspection.

## Authority and scope

Operate read-only and only within the user-authorized target. Navigation needed to resolve and inspect that target is allowed. Do not search unrelated user content or widen scope without permission.

Never like, comment, message, follow, buy, save, share, post, upload, change settings, or perform any other destination mutation. Do not claim that permission to inspect grants permission to authenticate, bypass a provider boundary, or interact socially or commercially.

## Inspection loop

1. Open the supplied URL in the real browser. Do not substitute search-engine snippets, cached summaries, redirect-shaped URLs, unrendered metadata, or memory.
2. Follow ordinary redirects and record the final URL shown by the browser.
3. Inspect the rendered page state. Identify the target type, visible account or page name, main content, media, date or time, listing price and location, engagement, and external links only when the page visibly supplies them.
4. Capture a screenshot when the browser supports it and it can be limited to relevant visible evidence. Do not expose unrelated private data. Record relevant rendered text concisely rather than copying excessively.
5. Label every material observation using the truth states below. A redirect pattern may support an inference about the target, but it does not verify content that never rendered.
6. Red-team suspicious, inconsistent, unverifiable, or important claims. If outside research is needed, do it separately with read-only authoritative sources. For Facebook, use `FACEBOOK CLAIM` and `EXTERNAL VERIFICATION`; never blend the two.
7. Stop at the first applicable provider boundary and report it exactly. Do not keep trying alternate routes that evade the boundary.

## Truth states

- `VERIFIED`: directly rendered in the live browser or captured by browser evidence.
- `INFERRED`: reasoned from verified adjacent evidence but not rendered directly.
- `UNKNOWN`: the available evidence does not answer it.
- `BLOCKED`: the exact check is known, but a boundary prevents it.

Never upgrade `INFERRED`, `UNKNOWN`, or `BLOCKED` information to `VERIFIED` because it is plausible.

## Stop boundaries

An already-authenticated browser session may continue read-only using its browser-managed first-party session state. Stop and report when the path requires login without an existing authenticated session, a new authentication step, CAPTCHA, permission prompt, provider-boundary crossing, mutation, or scope expansion.

Do not enter credentials, solve CAPTCHAs, change account state, or circumvent access controls under this skill.

## Privacy-safe continuity

- Ordinary first-party session cookies may remain in the browser's existing cookie jar when appropriate. Never inspect, enumerate, extract, export, copy, log, alter, or synthesize them.
- Do not add a cookie writer, persistence engine, or identifier solely to inspect a page.
- A pseudonymous continuity ID is allowed only where an existing first-party application seam requires one. It must be cryptographically random, purpose-limited, resettable, disclosed, consent-aware, and never correlated across sites.
- Never collect or alter a browser or device fingerprint. Prohibited signals include canvas readback, WebGL renderer probes, audio-context probes, font enumeration, user-agent entropy collection, and aggregated hardware signals.
- The repository/history "fingerprints" in `docs/CONTINUITY_FINGERPRINT_PROTOCOL.md` mean deterministic evidence identifiers. They are unrelated to browser or device fingerprinting.

## Safe evidence fingerprint

When SHA-256 is available, bind the inspection proof with the repository implementation in `src/browser-reality-receipt.mjs` and include its lowercase-hex `evidenceFingerprintSha256` in `PROOF`. If hashing is unavailable, state that limitation; never fabricate a digest.

The receipt contains only:

- contract ID `juss/browser-reality@v1`;
- sanitized authorized input URL and sanitized final URL;
- UTC observation time and the authorized inspection scope;
- normalized, ordered `VERIFIED` / `INFERRED` / `UNKNOWN` / `BLOCKED` observations;
- the screenshot's SHA-256 digest when a screenshot exists, never the screenshot bytes.

Use `juss-browser-reality-canonical-json-v1`: reject extra fields, remove URL userinfo and fragments, drop declared tracking parameters, redact declared sensitive query values, and recursively sanitize decoded HTTP(S) redirect URLs in query values through depth 3 (redact anything deeper). Then normalize text, order and deduplicate observations, recursively sort object keys, serialize without extra whitespace, and hash the canonical UTF-8 JSON bytes with SHA-256.

The digest binds a sanitized evidence receipt. It never identifies a person or device and must never correlate activity across sites. Cookie names or values, credentials or tokens, browser or device entropy, person or device identifiers, and unrelated private data are forbidden receipt inputs.

## Required response

Return these sections in this order and no others:

```text
REALITY:
What the live browser verified. Label inference, unknowns, and blocked facts.

TARGET:
What the URL ultimately resolves to.

CONTENT:
A concise description of what rendered.

PROOF:
Final URL, screenshots or screenshot availability, relevant rendered-page observations, and the safe evidence fingerprint when SHA-256 is available.

RED TEAM:
Anything suspicious, inconsistent, unverifiable, or worth checking. Keep source claims separate from external verification.

BLOCKERS:
Anything the site or provider prevented the browser from seeing.

NEXT GATE:
The single most useful authorized next action.
```

When a field is not visible, say `UNKNOWN` or `BLOCKED`; do not omit the gap or fill it from assumptions.

## Failure, disablement, and rollback

If the real browser is unavailable, evidence capture fails, or the page never renders beyond a boundary, report the limitation and stop. Do not fall back to snippets and call the result verified.

Disable this workflow by not loading the skill. Repository rollback is an authorized revert of the focused integration commit; it requires no runtime, provider, authentication, cookie, or user-data rollback.
