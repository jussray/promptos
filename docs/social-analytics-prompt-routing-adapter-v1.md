# Social Analytics Prompt Routing Adapter v1

## Role

PromptOS shapes and routes analysis prompts. It does not own social-provider truth, continuity authority, or publishing authority.

FCR provides evidence. Chief provides bounded decision logic. Sol preserves continuity. PromptOS must preserve those boundaries when generating or routing social-analysis work.

## Prompt invariants

Every social-analysis prompt that can influence strategy should require, when material:

- account identity;
- source/provider;
- observation window and window kind;
- metric definitions;
- exact post/content identity for post-level claims;
- evidence references;
- truth labels: `VERIFIED`, `OBSERVED`, `INFERRED`, `UNKNOWN`, `BLOCKED`;
- separation of observation from hypothesis and recommendation.

## Forbidden reasoning shortcuts

PromptOS must not encourage or accept these substitutions as facts:

- rolling 30d -> calendar month;
- views -> impressions;
- reach -> views;
- likes + comments -> all engagement;
- account totals -> per-post performance;
- one account -> whole portfolio;
- partial follower delta -> full-month growth;
- secondary-blog numeric algorithm weights -> official platform weights;
- missing evidence -> zero;
- engagement signal -> publishing authority.

When exact numeric algorithm weights are not supplied by the platform, preserve them as `UNKNOWN` rather than inventing precision.

## Experiment prompt shape

For bounded content tests, prompt for:

1. control;
2. challenger;
3. primary success metric;
4. compatible supporting metrics;
5. observed confounders;
6. falsifier;
7. minimum evidence needed before a winner can be recommended;
8. existing external gates that analytics cannot override.

## Current Instagram routing rule

Prefer prompts that compare:

- control: personal/family video;
- challenger: personal/founder hybrid video;

Treat founder-only content as an unproven hypothesis unless fresh FCR evidence says otherwise.

Preserve the JBH image-quality and approved cadence gates as external constraints. A prompt may analyze JBH content but cannot route around those gates.

## Output discipline

Generated analysis should distinguish:

- observation;
- derived rate;
- inference;
- recommendation;
- authority.

Any strategy recommendation must point back to compatible FCR evidence or explicitly say the evidence is unavailable.

## Authority ceiling

PromptOS can propose wording, analysis structure, and routing. It cannot publish, schedule, alter approved copy, fabricate evidence, widen authority, merge, deploy, spend, or treat Sol continuity markers as proof of current provider state.
