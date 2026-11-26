# PromptOS GitHub App adapter

Status: **source candidate only** until GitHub registration, installation, Cloudflare secret provisioning, FCR public-key registration, and a real signed relay receipt are independently proven.

This adapter is a read-only GitHub event observer. It verifies GitHub webhook HMAC signatures, reduces each supported event to a bounded operational summary, signs that summary with a PromptOS Ed25519 key, and forwards it to the existing FCR Federated Relay v3 receiver.

## Authority boundary

- GitHub permissions are read-only: Actions, Contents, Issues, and Pull Requests.
- The app does not write GitHub comments, repository contents, workflows, pull requests, releases, or deployments.
- The app does not merge, deploy, publish, spend, or change secrets.
- Every forwarded message uses `disposition: observe` and is accepted by FCR as evidence only.
- FCR remains the only execution-authority owner. Relay receipts explicitly deny execution authorization, authority transfer, and approval carry-forward.
- Only events from repository `jussray/promptos` (GitHub repository ID `1299823134`) and the configured exact GitHub App installation ID are forwarded. Comment text is never copied into the relay payload; only a bounded command classification is retained.

## Runtime

`worker.mjs` is a dependency-free Cloudflare Worker module. Required secrets:

- `GITHUB_WEBHOOK_SECRET`
- `PROMPTOS_RELAY_PRIVATE_KEY_JWK` (Ed25519 private JWK; never commit it)

Required plain-text runtime variables:

- `PROMPTOS_RELAY_KEY_ID`
- `PROMPTOS_GIT_SHA` (exact PromptOS `main` SHA represented by this deployment)
- `FCR_RELAY_TARGET_SHA` (exact deployed FCR Worker `GIT_SHA` expected by the receiver)
- `GITHUB_INSTALLATION_ID` (the exact installation ID returned by GitHub for the private app installation)

The relay destination is fixed in source to `https://api.foundercontrolroom.org/api/federated-relay/v3`; it cannot be changed through an environment variable. Source sequence is a deterministic 52-bit projection of the GitHub delivery UUID, preserving retry identity while making collisions negligible; FCR enforces uniqueness per source key.

## Registration

Use `registration.template.json` as the source of truth. Subscribe to `issue_comment`, `pull_request`, and `workflow_run`. Install the private app only on `jussray/promptos`.

Registration is external provider state. A template or deployed Worker does not prove that the GitHub App exists, is installed, or has delivered a signed event.

## Automated test evidence boundary

The Playwright workflow runs the Worker locally and stubs the FCR HTTP response after independently verifying the Ed25519 signature and envelope contract. It proves webhook authentication, payload reduction, deterministic retries, and receipt validation logic against a controlled fixture. It does **not** prove that the production FCR endpoint accepted a message, that a production public key is registered, or that a real GitHub App delivered the event.

## Proof gate

1. Register the exact read-only GitHub App permission/event set.
2. Generate one Ed25519 keypair; store the private JWK only as the Cloudflare secret `PROMPTOS_RELAY_PRIVATE_KEY_JWK`.
3. Register the matching public JWK in FCR `public.federated_relay_public_keys` through the FCR founder-authorized boundary. Key identity/material are immutable; rotation creates a new key row.
4. Set exact source and target SHAs as runtime variables.
5. Install on `jussray/promptos` and deliver a real GitHub webhook.
6. Prove FCR returns a valid accepted/duplicate receipt for the exact delivery ID.
7. Verify the stored FCR message and receipt. A successful relay proves evidence transport only, never execution authority.

Do not widen permissions to write, merge, deploy, or publish as part of this adapter.

## Rollback

Disable the GitHub App webhook delivery or restore the previous Cloudflare Worker version. The relay public key can be retired/revoked through its monotonic lifecycle; do not mutate key material in place.
