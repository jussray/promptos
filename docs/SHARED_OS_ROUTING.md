# PromptOS routing: standalone (A) and shared OS (B)

Status: prepared, not deployed. No production route, DNS record, or Worker deployment has been changed.

## Roles
- **A, standalone app** `promptos.jussco.company`: the real application (`index.html` + `parts/*`), staged to `_site` by `scripts/stage-public-site.mjs`. Config: `wrangler.standalone.toml` (assets-only, no routes).
- **B, shared OS API** `promptos.foundercontrolroom.org`: `cloudflare-worker/analytics.js`. Config: `wrangler.shared-api.toml` (no routes).
- **C, Founder Control Room**: reads B's identity and proof endpoints with its own credential. It never inherits B's permissions and never treats HTTP 200 alone as readiness.

## Protected vs public surface (B)
| Route | Auth |
|---|---|
| `GET /runtime-identity` | Bearer `PROMPTOS_AI_OPERATOR_KEY` |
| `POST /runtime-proof` | Bearer (invokes a provider; costs money) |
| `GET/POST /providers` | Bearer |
| `POST /optimizer/evaluate` | Bearer |
| `POST /event` | Public, allow-listed event names only |
| `GET /totals` | Public, aggregate counts only |

Protected routes return 503 when the operator key is unset and 401 on a missing or wrong bearer, before any provider is called.

## Founder-gated steps (not done here)
1. Create the analytics KV namespace and replace `REPLACE_WITH_FOUNDER_KV_NAMESPACE_ID` in `wrangler.shared-api.toml`.
2. Set secrets with `wrangler secret put` for `PROMPTOS_AI_OPERATOR_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `MODEL_API_KEY` as needed. Set `PROMPTOS_RELEASE_SHA` to the exact deployed 40-char SHA.
3. Deploy B to a non-production name first and verify it (below) before touching any route.
4. Only after B verifies: attach the route `promptos.foundercontrolroom.org/*` to `promptos-shared-api`. Confirm first which Worker currently serves that host. A route to `promptos-public-front-door` makes every B path return 404.
5. Deploy A with `EXPECTED_HEAD_SHA=<sha> node scripts/stage-public-site.mjs`, then `wrangler deploy --config wrangler.standalone.toml`, then attach `promptos.jussco.company/*`.

## Verification before any route change (B)
- `node --test cloudflare-worker/*.test.mjs` at the exact head (local, not production proof).
- Against the non-production deployment: `GET /runtime-identity` without bearer → 401; with the operator bearer → 200 with `schema`, `service`, `release_sha` equal to the deployed SHA, and a fresh `observed_at`.
- `GET /totals` → 200 with counts only.

## CORS
`analytics.js` allows only `https://jussray.github.io`. The standalone app does not call B today (`ANALYTICS_ENDPOINT` is empty in `parts/auth.js`). If it is later pointed at B from `promptos.jussco.company`, the allow-list must be extended in a separate reviewed change. Protected routes rely on the bearer, not CORS.

## Rollback
- A: remove the `promptos.jussco.company/*` route. The Pages publication path is unchanged.
- B: remove the `promptos.foundercontrolroom.org/*` route and re-attach whichever Worker served that host before.
- Code: revert the branch `fix/promptos-shared-api-standalone-contract`.

## Not verified here
- Live routes, DNS, and which Worker currently serves each host.
- Whether `promptos-shared-api` is deployed at all.
- Browser-level authentication on A's protected app features.
