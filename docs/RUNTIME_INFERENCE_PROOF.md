# Runtime Inference Proof

PromptOS uses a two-phase safety gate so pull-request code never receives provider credentials.

## Phase 1: candidate source safety

A pull request may prove only that the candidate source contract is safe:

1. protected runtime identity and proof routes exist;
2. release identity fails closed when unavailable;
3. provider proof returns provenance only, never model text or credentials;
4. pull-request jobs receive no provider/operator secret;
5. the candidate remains bound to an exact head SHA.

Passing Phase 1 means **SOURCE_SAFE**, not production VERIFIED.

## Phase 2: trusted-main runtime verification

After an approved candidate lands on trusted `main`, but before any production-runtime VERIFIED claim or founder-authorized publication, the trusted-main witness must prove:

1. exact deployed release identity equals the trusted commit SHA;
2. configured provider readiness without credential disclosure;
3. one bounded live provider inference;
4. provider response provenance/evidence identity;
5. Playwright proof through the deployed runtime;
6. a sanitized retained receipt containing no model output or secret.

Only a successful Phase 2 receipt may set `provider_state: VERIFIED`.

The public Pages deployment is separately founder-gated and manual. Source tests, documentation, configuration, or a green pull request are never substitutes for the trusted live receipt.
