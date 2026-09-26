# Main + Assistant Continuity Fingerprints

This is a non-secret continuity protocol for binding AI work to exact repository reality.

## Main receipt

Each participating repository `main` is represented by:

```text
repository + branch + exact SHA
→ SHA-256 main fingerprint
→ SHA-256 continuity cookie
```

The cookie is **not a browser cookie**. It is never emitted with `Set-Cookie`, never stored in browser cookie state, never treated as authentication, and never grants merge, deploy, publish, provider, billing, deletion, secret, or production authority.

A main fingerprint uses repository identity, branch, and exact Git SHA only. It is not a device, IP, browser, account, or personal-data fingerprint.

Any repository, branch, or SHA movement expires predecessor continuity. Historical fingerprints remain historical evidence rather than being rewritten.

## Assistant receipt

The assistant continuity receipt binds:

```text
source + operator version + sorted current-main receipts
→ assistant fingerprint
→ assistant continuity cookie
```

For ChatGPT work, `source=chatgpt`. The operator version should name the actual current model/configuration used for the work when known.

Input ordering does not affect the assistant fingerprint. Any bound `main` movement, source movement, or operator-version movement expires the assistant cookie and requires reacquisition before predecessor proof is reused.

The assistant receipt contains `browserCookie=false`, `deviceFingerprint=false`, `personalDataFingerprint=false`, `authorizing=false`, and `approvalCarryForward=false`.

## Use

Create one exact-main receipt:

```bash
node workflows/continuity/continuity-cookie.mjs main \
  --repository jussray/promptos \
  --sha <exact-main-sha>
```

Bind the currently observed mains into one ChatGPT/operator receipt:

```bash
node workflows/continuity/continuity-cookie.mjs assistant \
  --operator gpt-5.6-sol \
  --main jussray/promptos@<sha> \
  --main jussray/founder-control-room@<sha>
```

Only bind repositories actually reacquired from an authoritative provider. A remembered SHA is not a current-main observation.

## Relationship to FCR

PromptOS continuity is routing and correlation metadata. Founder Control Room remains the execution/authority plane and may impose stricter continuity contracts. PromptOS cookies cannot authenticate a founder, donate green checks, renew an approval, or override FCR.
