# PromptOS independent public entrance (2026-10-22)

Product: `jussray/promptos` — not a Founder Control Room feature or tenant.

## Production Cloudflare changes
- Uploaded script `promptos-public-front-door` with no bindings, database, auth, or private content.
- Added Worker route `promptos.foundercontrolroom.org/*` to the PromptOS public front door. Its Worker explicitly serves only root GET/HEAD, returning 404 on other paths.
- Disabled, did NOT delete, existing FCR DNS-zone dynamic redirect rule `f9370353c6a841529b6185ddaa76fc7a`. Prior target was `https://foundercontrolroom.org/#promptos`, which improperly collapsed PromptOS into FCR.
- Kept the proxied DNS record unchanged, because the Worker route takes precedence. Do not re-enable the wrong FCR redirect without independent review.

Source: `public-face.html` blob `a123a9f81fd78cc773c4e0a9c81bf37f26c0162e`, explicitly designated the public-safe introduction by `SITES.md`. Avoid exposing the private prompt catalog, account state, credentials, or governance-only content. This Worker is only a public entrance; it is NOT the complete PromptOS app.

## Anonymous browser proof
- `/` and `/?utm_source=test` render `PromptOS | Founder Intent to Governed Workflow`.
- `/admin`, `/api/private`, `/index.html` contain only Not Found. Runtime Worker code returns 404 for those paths.
- SOL remains independently branded at `sol.foundercontrolroom.org`.

## Acceptance / rollback
- Run `node --test tests/front-door.test.mjs`.
- Deploy only following review using `npx wrangler deploy --config wrangler.front-door.jsonc`.
- Roll back the new Worker route AND restore the disabled redirect only as an intentionally reverted state (historically that exposes an incorrect FCR landing, not a secure independent PromptOS). Prefer reattaching to a separately verified PromptOS deployment over reverting.
- Do not merge PromptOS, FCR, Chief and SolContinuity applications. Their ability to collaborate does not transfer application ownership or execution authority.
