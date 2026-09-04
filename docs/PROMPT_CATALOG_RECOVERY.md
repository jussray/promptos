# Prompt catalog donor recovery

## Authority

The standalone 204-entry artifact is a donor, not PromptOS source authority. PromptOS's canonical prompt modules and current hardened prompt variants win whenever an ID already exists.

The historical provenance anchor for the missing donor entries is `archive/promptos-donor-175.html`, pinned from repository history. `scripts/materialize-donor-prompts.mjs` evaluates only the historical prompt-data segment in an isolated Node `vm` context and selects a fixed ID allowlist.

## Reconciliation result

The 204-entry donor ID space is:

- `1–118`
- gap `119–120`
- `121–206`

The current canonical modules already own donor IDs:

- `64–94`
- `160–206`

Therefore the genuinely missing set is exactly 126 entries:

- `1–63` (63 entries)
- `95–118` (24 entries)
- `121–159` (39 entries)

The materializer refuses IDs `119/120`, refuses already-canonical donor ranges, requires all 126 expected historical entries, requires uniqueness, and generates a duplicate-failing `parts/p04-donor-missing.js` source artifact without rewriting prompt wording.

## Current integration state

The donor recovery and deterministic module generation are staged for proof. The existing browser source graph is not silently rewritten by the materializer, and no build workflow is allowed to commit generated output back to the repository.

A generated module must not be wired into the public browser graph until the exact generated source has passed catalog/unit proof and the resulting browser graph has passed desktop/mobile Playwright on the exact successor head. Existing hardened IDs must never be replaced merely to make the donor count match.

## Verification

Run:

```sh
node --test test/donor-materializer.test.mjs
node scripts/materialize-donor-prompts.mjs
```

Use `--write` only when intentionally materializing `parts/p04-donor-missing.js` for a reviewed successor integration. The non-writing command proves the selected ID set without changing the worktree.
