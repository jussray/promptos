# Prompt catalog donor recovery

## Authority

The standalone 204-entry artifact is a donor, not PromptOS source authority. PromptOS's current hardened prompt modules win whenever an ID already exists.

The immutable provenance anchor for the recovered entries is `archive/promptos-donor-175.html`, pinned from repository history. `scripts/materialize-donor-prompts.mjs` evaluates only the historical prompt-data segment in an isolated Node `vm` context and selects a fixed ID allowlist.

## Reconciliation result

The 204-entry donor ID space is `1–118`, gap `119–120`, then `121–206`. Current hardened modules already own donor IDs `64–94` and `160–206`.

Therefore the genuinely missing set is exactly **126 entries**:

- `1–63` (63 entries)
- `95–118` (24 entries)
- `121–159` (39 entries)

The materializer refuses IDs `119/120`, refuses already-canonical donor ranges, requires all 126 historical entries, requires uniqueness, and never regenerates or rewrites prompt wording.

## Generated canonical part

The recovered entries are materialized as `parts/p04-donor-missing.js`. That file is an ignored generated browser artifact, not a second editable source of truth.

The exact generated output is pinned to SHA-256:

`196b4958508f5b096d610b0110e5c1e39d74a2fe3f3eb52b20ff18161a87da0d`

Any donor, allowlist, renderer, or prompt-content drift that changes this output fails materialization until deliberately reviewed and re-pinned.

`parts/auth.js` is now a minimal parser bootstrap. It initializes `window.PROMPTS`, exposes a donor provenance receipt, synchronously loads the local generated `p04` module, then loads `parts/auth-core.js`. `auth-core.js` is the pre-existing PromptOS auth/persistence implementation preserved byte-for-byte. The historical donor archive is never fetched or evaluated by the browser.

`scripts/verify-control-room-tests.mjs` materializes and fingerprint-checks `p04`, verifies both bootstrap and auth-core contracts, then syntax-checks the complete browser module set. The generated file is ignored by Git, so verification does not create a source commit or widen mutation authority.

The founder-gated Pages workflow stages the verified generated `p04` plus `auth-core.js` with the public browser parts. The donor archive, materializer, governance files, and staged remote-persistence implementation remain outside the public browser artifact.

## Browser proof

`e2e/rendered-proof.mjs` runs desktop and mobile and proves:

- `parts/p04-donor-missing.js` is present in the rendered script graph;
- the provenance receipt carries the exact source/count/fingerprint;
- all 126 recovered donor IDs are present;
- recovered ID `1` (`Repo Audit First`) renders and opens;
- existing hardened prompts remain present and every registry ID remains unique;
- FCR persistence truth remains `not-connected`.

## Verification

```sh
node --test test/donor-materializer.test.mjs
node scripts/verify-control-room-tests.mjs
```

The generated `parts/p04-donor-missing.js` must never be hand-edited. Change the governed donor/allowlist/materializer instead, obtain a reviewed replacement fingerprint, and rerun exact-head desktop/mobile proof.
