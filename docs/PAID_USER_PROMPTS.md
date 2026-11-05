# PromptOS paid personal-prompt gate

**Source candidate:** `fix/paid-user-prompts-20261018` at PR review head, not automatically deployed.

## Product rule

The curated prompt catalog stays free. Personal prompt **saving** (New prompt, Builder save, Freestyle save, and importing custom prompts) requires an authenticated paid account. Guests and free users can still browse the catalog and use free discovery surfaces. Rejecting a save does not discard a user's unsaved form fields.

## Authority and flow

1. Google Identity Services signs in a browser user. The ID token stays in memory and is sent over HTTPS only to the PromptOS Worker on billing actions. Decoded browser profiles and client-side flags do not prove entitlement.
2. Worker checks Google RS256 signature, issuer, audience, expiration, and the `sub` against Google JWKS on each request.
3. Worker reads the customer's Stripe ID from `PROMPTOS_BILLING_KV` then queries Stripe for an **active subscription containing exactly** `PROMPTOS_STRIPE_PRICE_ID`. Unpaid, missing, canceled and past-due subscriptions are denied.
4. `POST /prompts/admit` must return server-verified admission before the existing session-only client can save or import a custom prompt. It accepts no prompt body and stores no personal prompt text. This does not create cross-device prompt persistence and does not replace FCR's canonical runtime-persistence authority.
5. Upgrade uses `POST /billing/checkout` to create a hosted Stripe subscription checkout session, using **only the server-configured price**. A completed paid checkout event delivered to the HMAC-verified webhook binds the Google subject to the Stripe customer. The checkout success page is never proof of payment.

### Configuration required before accepting payments

Deploy the existing `cloudflare-worker/analytics.js` entrypoint and configure:
- Cloudflare KV binding `PROMPTOS_BILLING_KV` for the Google-subject to Stripe-customer mapping.
- Worker secret `PROMPTOS_STRIPE_SECRET_KEY`, never committed or exposed to the browser.
- Worker secret `PROMPTOS_STRIPE_WEBHOOK_SECRET` and a Stripe webhook endpoint pointing to `POST /billing/webhook`, receiving `checkout.session.completed`.
- Worker setting `PROMPTOS_STRIPE_PRICE_ID` for the founder-approved Stripe recurring price.
- Worker HTTPS return URLs `PROMPTOS_BILLING_SUCCESS_URL` and `PROMPTOS_BILLING_CANCEL_URL`, on an approved PromptOS site origin.
- Worker `PROMPTOS_GOOGLE_CLIENT_ID` matching the Google Identity Services browser audience if changing the current approved Google client.
- Set the **public, nonsecret** build variable `PROMPTOS_BILLING_API_URL` to the verified HTTPS Worker origin for the public site staging command. It injects the URL into the public HTML meta tag. If missing, the browser fails closed for all personal-prompt saves.

Do not invent prices, Stripe product IDs, Worker hostnames, production payment state or checkout success. No Stripe charge or publication is authorized merely by merging this code.

## Verification

- `node --test cloudflare-worker/prompt-paywall.test.mjs` exercises bad/unconfigured auth, invalid RS256 tokens, unpaid and active subscriptions, past-due/canceled denial, no duplicate paid checkout, and Stripe webhook HMAC validation.
- `node e2e/paid-prompt-proof.mjs` runs desktop/mobile Chromium against the source or staged site: saves and custom imports denied for free accounts; free catalog remains visible. A **mock billing API** proves the UI's positive path separately from the server tests. Neither mock establishes a live Stripe account, billing domain or payment.
- Existing `e2e/rendered-proof.mjs` and the staged browser lane remain mandatory. Require exact-head CI and provider-side readback before any production claim.

## Risks and rollback

- **Present limitation:** custom prompts remain browser session data. The server guards official save/admission requests, but the web browser is user-controlled. A malicious user can alter local JavaScript/JSON; this is not a server-side storage/paywall boundary for prompt content. Full tamper-resistant paid prompt storage needs a governed, authenticated server persistence path with FCR coordination.
- Webhook delivery must succeed for newly paid users to be recognized; a missed webhook is a temporary paid-access denial. Reconcile Stripe customer mapping rather than trusting a checkout redirect.
- Stripe billing keys, price, webhook and deployment URLs are **unverified** until the provider configuration and real checkout are read back.
- Roll back by reverting the focused paywall commits or disabling the billing URL injection; if billing is unavailable, personal prompt saves will fail closed. Do not disable the gate to conceal outages, and do not clear user session data without a specific approved recovery procedure.

**Next gate:** founder-approved price/plan and confirmed Stripe/Cloudflare configuration, followed by exact-head browser and real paid/free/canceled account proofs. Separate publication and exact PR merge approvals still apply.
