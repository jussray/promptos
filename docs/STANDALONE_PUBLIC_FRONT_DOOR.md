# PromptOS independent public entrance

Product: `jussray/promptos` — standalone from Founder Control Room.

## Current provider reality — 2026-10-27

- Cloudflare has a deployed Worker named `promptos-public-front-door`, but it has no attached Worker custom domain and its workers.dev subdomain is disabled.
- `promptos.foundercontrolroom.org` remains an FCR-owned capability surface. Current DNS points it to `founder-control-room.pages.dev`; the standalone PromptOS Worker must not take ownership of that hostname.
- `promptos.jussco.company` is the canonical standalone PromptOS hostname. It is not currently attached to the Worker, so production routing remains unverified and separately gated.

## Latest observed production state — 2026-11-05

Read-only Cloudflare and browser inspection found:

- The active `promptos-public-front-door` Worker deployment serves 100% of traffic, but its uploaded source currently accepts `promptos.foundercontrolroom.org` and rejects `promptos.jussco.company`.
- No Worker route or custom domain attaches this Worker to the standalone hostname. The zone has a broad `*.jussco.company/*` route to `juss-content-engine`; the standalone apex currently returns a generic “Hello world” page in the browser.
- `www.promptos.jussco.company` currently fails with an upstream connection error.
- `promptos.foundercontrolroom.org` remains the FCR-branded public surface served through the Founder Control Room Pages project.
- This repository branch contains the standalone-only Worker source and a Wrangler route for `promptos.jussco.company/*`, but the Worker source and route have not been deployed from GitHub.

This evidence supersedes the older observation below where the live routing details differ. It does not authorize production routing. After the source release, deploy the exact standalone-only Worker configuration, then verify the canonical host and rejection of FCR/private paths before treating the repair as live.

## Source boundary

The standalone public Worker serves only the public-safe PromptOS introduction sourced from `public-face.html`. It must not expose the private prompt catalog, account state, credentials, model responses, workflow logs, or governance-only material.

The Worker contract is intentionally narrow:

- canonical host: `promptos.jussco.company`;
- root `GET` and `HEAD` only;
- unrelated/private paths return 404;
- `promptos.foundercontrolroom.org` and the FCR apex remain rejected by this Worker;
- no bindings, database, auth, or private data are required.

## Verification

Run:

```bash
node --test tests/front-door.test.mjs
```

The test must prove the standalone host renders the PromptOS public-safe presentation, private paths remain unavailable, the FCR hostname is rejected, and `wrangler.front-door.jsonc` targets only `promptos.jussco.company/*` in the `jussco.company` zone.

## Production gate and rollback

This branch repairs source truth only. It does not authorize merge, deployment, DNS changes, or production routing.

After exact-head proof and fresh founder approval for the production-routing action, the smallest provider change is to attach `promptos.jussco.company` to `promptos-public-front-door` without changing `promptos.foundercontrolroom.org`.

Rollback is to detach only the standalone PromptOS Worker domain or route that was added. Do not repoint or delete the FCR capability surface as part of PromptOS rollback.

PromptOS, Founder Control Room, Chief, and Sol remain independent products. Collaboration does not transfer ownership or execution authority.
