# Remote persistence boundary

Status: **STAGED / DISABLED / NOT CONNECTED**.

Founder Control Room remains PromptOS's canonical runtime persistence authority. This change adds a schema-bound adapter and a Cloudflare Worker implementation for proof, but it does not load the adapter in `index.html`, does not change the browser persistence truth in `parts/auth.js`, and does not deploy or enable remote sync.

## State contract

Remote state uses schema version `1` only and is bounded by `src/promptos-state-schema.mjs`:

- maximum JSON payload: 512 KiB
- maximum starred prompts: 500
- maximum custom prompts: 100
- title: 120 characters
- subtitle: 240 characters
- body: 20,000 characters
- platforms: 8
- strict top-level and custom-prompt key allowlists
- recursive rejection of `__proto__`, `prototype`, and `constructor`
- duplicate custom IDs rejected
- future and legacy remote schema versions rejected

The browser adapter reuses the existing import validator before any remote write and validates every pulled state before returning it to a caller. A pull does not apply state automatically.

## Conflict and evidence model

Remote writes are conditional:

1. pull the current state and ETag;
2. review the state;
3. validate the local state against schema version 1;
4. write with `If-Match` and an exact lowercase 40-character PromptOS source SHA;
5. the Worker validates again and writes through a single SQLite-backed Durable Object;
6. the response returns a new ETag, monotonic revision, state SHA-256 fingerprint, and source SHA.

A stale ETag returns `412`. A missing precondition returns `428`. The adapter does not merge or retry conflicts automatically.

## Credential boundary

`parts/remote-persistence.js` accepts authorization only through a caller-supplied callback. It does not implement a durable browser credential store and is not loaded by the current product surface.

`cloudflare-worker/promptos-sync.wrangler.toml` declares `PROMPTOS_SYNC_SECRET` as a required encrypted Worker secret. No secret value belongs in repository source or Wrangler vars.

The previously disclosed sync credential must be considered invalid. It must be invalidated and replaced at the provider before any sync path is enabled. Provider-side rotation is not proven by repository code.

## Provider storage

The staged Worker uses a SQLite-backed Durable Object, not Workers KV. The state document is intentionally one founder-controlled logical object in this first slice. There is no multi-tenant claim.

## Enablement gate

Remote sync must remain disabled until all of the following are true on one exact PR head:

1. state-schema unit tests are green;
2. Attack-20 remote-persistence tests are green;
3. donor catalog recovery tests are green;
4. PromptOS rendered desktop Playwright is green;
5. PromptOS rendered mobile Playwright is green;
6. import-boundary desktop/mobile Playwright is green;
7. exact-head CI identity is green;
8. the disclosed provider secret is invalidated and a replacement secret is proven configured by provider readback;
9. the Worker binding/origin/class configuration is proven by provider readback;
10. a fresh semantic/security review approves loading the adapter;
11. the provider merge membrane is green.

Only after those gates pass may a successor change on the same lineage load the adapter and truthfully change `runtimePersistence` away from `not-connected`.

## Rollback

Before enablement, rollback is source-only: revert the remote adapter, shared schema, Worker/config, tests, and this document. No remote state migration is required because this staged slice has no deploy authority and no browser integration.
