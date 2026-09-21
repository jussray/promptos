# PromptOS GitHub App adapter

Status: **source candidate only** until provider registration, Worker deployment, installation, and a signed runtime receipt are independently proven.

This adapter turns PromptOS into a GitHub App control surface without turning installation into mutation authority. The first release is intentionally narrow:

- verifies `X-Hub-Signature-256` before parsing or acting on a webhook;
- authenticates as the GitHub App and mints short-lived installation tokens;
- receives `issue_comment`, `pull_request`, and `workflow_run` events;
- answers `/promptos`, `/promptos status`, or `/promptos help` with a deduplicated installation receipt;
- can optionally add deduplicated workflow-failure receipts when `PROMPTOS_COMMENT_ON_FAILURES=true`;
- cannot edit repository contents, merge pull requests, write workflows, deploy, rotate secrets, spend money, or publish externally.

## Runtime

`worker.mjs` is a dependency-free Worker-compatible module. Required runtime secrets:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY` (PKCS#8 PEM)
- `GITHUB_WEBHOOK_SECRET`

Do not commit any of those values. `PROMPTOS_COMMENT_ON_FAILURES` is optional and defaults to off.

Routes:

- `GET /health` — source/runtime authority description;
- `GET /github/registration` — provider registration settings projected from the current origin;
- `GET /github/setup` — post-install proof gate;
- `POST /github/webhook` — signed GitHub webhook receiver.

## Registration contract

Use `registration.template.json` as the source of truth when creating the GitHub App. The first version requests only:

- Actions: read;
- Contents: read;
- Issues: write (needed for issue and PR conversation comments);
- Pull requests: read.

Subscribe to `issue_comment`, `pull_request`, and `workflow_run`.

GitHub App registration is external provider state. A checked-in template is not proof that the app exists, is deployed, owns credentials, or is installed anywhere.

## Proof gate

Before widening permissions:

1. deploy the Worker without exposing secrets;
2. register the GitHub App from the exact settings above;
3. install it on one selected test repository;
4. confirm GitHub can deliver a signed webhook;
5. post `/promptos status` and capture the resulting receipt;
6. verify the receipt's repository, installation id, delivery id, and authority boundary;
7. only then consider a separate, explicit permission expansion for code repair.

Code-write or merge permissions are **not** part of this change. They require their own threat model, exact-head proof, rollback, and founder authority gate.
