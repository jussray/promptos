# PromptOS paid personal-prompt gate, JussPay authority

**Candidate only:** Existing PR #60, not automatically deployed. No live checkout enabled.

## Product rule

The curated PromptOS catalog and guest onboarding stay free. Saving personal prompts (New Prompt, Builder save, Freestyle save and custom JSON import) requires a signed-in visitor with a current JussPay entitlement: `product: promptos`, `entitlements` including `promptos.personal_prompts`, `until` strictly in the future. Rejected saves preserve unsaved form inputs. Saved custom prompts are session-only; there is no claim of FCR-backed persistence.

## Payment authority

JussPay (`jussray/JussPay`) is the canonical Juss&Co. subscription and entitlement authority. **PromptOS must not create separate Stripe subscriptions or accept independent Stripe payment webhooks.** Eligible Juss&Co. digital applications may eventually offer USD $1 for the **first monthly billing period**, followed by a founder-approved product-specific renewal price, with terms disclosed before purchase. Existing free tiers stay free. Juss Beautiful Hair/hair-product checkout is categorically excluded. Children's products require guardian-controlled billing.

The source Wrangler binding contracts are now declared: `PROMPTOS_JUSSPAY` on the PromptOS provider Worker targets the existing `jusspay` Worker; JussPay declares `AUTH` targeting the private `jusspay-auth` Worker. The private AUTH Worker must be separately deployed and verified before JussPay source configuration is deployable. These declarations are **not** evidence of live service bindings or production entitlement delivery.

The server-side Worker route `GET /billing/entitlement` and `POST /prompts/admit`:

1. Require a signed Google ID token. Verify the RS256 signature, Google issuer, configured audience and expiry against Google's public keys. This is defense-in-depth, **not** JussPay subject authority.
2. Call the **private, fixed-origin** `PROMPTOS_JUSSPAY` Cloudflare Worker service binding for `GET https://jusspay.internal/entitlements`, forwarding only the already-verified visitor Bearer token.
3. JussPay's **own private `AUTH` service binding must independently validate** this token for audience `jusspay`, issuer, stable user mapping, session revocation policy and expiry. Do not infer that PromptOS's Google login is already compatible with JussPay's deployed identity adapter.
4. Accept only that caller's current JussPay `promptos.personal_prompts` entitlement, and deny missing, other-product, wrong-permission, expired, unauthenticated or unavailable responses. Browser values, success URLs, and cookies do not grant admission.
5. The UI remains a browser client. Private JussPay and `AUTH` service bindings are never configured as browser URLs or sent to the client.

## $1 offer configuration and release blockers

`GET /billing/offer` and `POST /billing/checkout` are wired to the existing private JussPay binding but remain disabled by default (`PROMPTOS_INTRO_SANDBOX_ENABLED=false`). In an isolated approved test environment, the offer endpoint requires verified identity and a currently eligible USD $1 first-month JussPay catalog entry with explicit test mode and approved renewal terms. Checkout re-reads the offer, forwards only fixed product and exact affirmative renewal consent, and rejects a mismatched/non-test receipt or non-Stripe destination. JussPay remains responsible for provider price, invoice, customer linkage, redemption, webhook and entitlement verification. Production activation remains blocked. `POST /billing/webhook` on PromptOS returns `404`: Stripe webhooks belong to JussPay. The client has no fallback to direct Stripe or Shopify success redirects.

The founder must approve the PromptOS regular monthly renewal price and complete tax, refund, cancellation and billing terms before creating/activating a recurring offer. Shopify product publication can complement an approved storefront offer, but it is never a second entitlement authority.

## Verification (what is and is not proved)

- `node --test cloudflare-worker/prompt-paywall.test.mjs` verifies rejection and the private-binding protocol using mock Google JWKS and mock JussPay responses.
- `node e2e/paid-prompt-proof.mjs` checks desktop/mobile unpaid-user denial and simulated paid UI. Positive-path billing in the browser is mocked; this is **not** a real JussPay OAuth or Stripe payment transaction.
- `node scripts/verify-control-room-tests.mjs` and the staged browser tests protect source and public artifact behavior.
- **Not proved:** deployed Cloudflare `PROMPTOS_JUSSPAY` binding; JussPay's actual `AUTH` mapping for PromptOS Google tokens; real paid subscription readback; real $1 test payment; duplicate redemptions; production checkout, feature fulfillment, or actual Stripe live mode.

## Rollback

PR #60 is unmerged. The branch can be reverted to its previous commit without touching production. For any future released bridge, restore the previously proven Worker artifact and keep its billing disabled until authorization works again. Preserve JussPay Durable Object/Stripe customer, payment and webhook receipts on rollback; never erase financial evidence. No production deployment is authorized by this document.
