// Research-grounded curated PromptOS expansion.
// Source of truth remains this repository. Public research informs job design only;
// no external prompt text is copied into the catalog.

const RESEARCH_GROUPS = [
  {
    "id": "agent-systems",
    "familyId": "repo.audit.first",
    "pack": "research-agent-systems",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["plan", "test", "audit"],
    "modes": ["minimal-edits", "root-cause", "lindy"],
    "risks": ["correctness", "maintainability", "regression"],
    "basis": ["OpenAI evals and agent guidance", "Anthropic effective agent patterns", "Google prompt design guidance"],
    "scope": "Use agentic behavior only when it beats a simpler deterministic workflow. Keep tool use bounded, inspectable, reversible, and explicit about authority, retries, handoffs, and stop conditions.",
    "jobs": [
      ["Choose Workflow vs Agent", "Decide whether this task should stay deterministic, use one bounded agent, or use multiple cooperating agents by comparing uncertainty, tool use, iteration needs, failure cost, and business value."],
      ["Define Agent Tool Contract", "Specify each tool's purpose, required inputs, outputs, side effects, failure modes, authority boundary, evidence returned, retry behavior, and forbidden use."],
      ["Design Handoff Criteria", "Define when work should transfer between agents or tools, what context must move, what evidence must survive, and what must never be silently reinterpreted."],
      ["Bound the Autonomy Budget", "Set hard limits for steps, tokens, tool calls, monetary spend, mutation count, retries, wall-clock loops, and escalation before execution begins."],
      ["Engineer the Context Window", "Separate durable instructions, active task state, retrieved evidence, working scratch, and irrelevant history so the model receives only context that can change the decision."],
      ["Place Human Approval Gates", "Identify send, publish, purchase, merge, delete, permission, billing, credential, and irreversible mutation steps that require explicit human approval."],
      ["Map Safe Parallel Work", "Identify subtasks that can run concurrently without shared-state races, duplicate mutations, contradictory assumptions, or evidence overwrites."],
      ["Build an Evaluator-Optimizer Loop", "Define generator and evaluator roles, scoring rubric, retry threshold, maximum iterations, acceptance evidence, and a fail-closed exit."],
      ["Set Retry and Termination Policy", "Classify retryable failures, strategy-change failures, and stop-now failures; define backoff, retry ceilings, and termination conditions."],
      ["Review the Full Agent Trace", "Inspect model calls, tool selections, handoffs, guardrails, state transitions, retries, and final claims to find where the agent departed from evidence or authority."]
    ]
  },
  {
    "id": "evals-quality",
    "familyId": "repo.audit.first",
    "pack": "research-evals-quality",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["test", "audit", "research"],
    "modes": ["redteam", "root-cause", "minimal-edits"],
    "risks": ["regression", "correctness", "maintainability"],
    "basis": ["OpenAI eval best practices", "OpenAI agent evals and trace grading", "Google prompt design guidance"],
    "scope": "Treat model quality as measurable behavior on representative tasks, not vibes. Use explicit datasets, graders, thresholds, failure taxonomies, and launch gates.",
    "jobs": [
      ["Design a Representative Eval Set", "Build an eval set that covers common cases, hard cases, high-cost failures, ambiguous inputs, edge conditions, and the real distribution of tasks the system must handle."],
      ["Write a Grader Rubric", "Define observable pass, partial, and fail criteria with dimensions, weights, disqualifying errors, evidence requirements, and examples that reduce grader ambiguity."],
      ["Detect Golden-Set Drift", "Check whether the benchmark still represents current product behavior, user tasks, policies, data distributions, and failure costs instead of preserving stale wins."],
      ["Build a Failure Taxonomy", "Cluster eval failures by root cause such as instruction following, retrieval, reasoning, tool use, formatting, authority, stale context, or unsupported claims."],
      ["Compare Model Upgrade Risk", "Run current and candidate models against the same locked eval set and compare regressions, improvements, variance, cost, latency, and failure severity before switching."],
      ["Create a Prompt Regression Suite", "Turn important prompt behaviors into repeatable test cases with fixed inputs, invariants, expected boundaries, and explicit allowable variation."],
      ["Grade End-to-End Agent Traces", "Score the whole trajectory including tool choice, argument quality, state transitions, retries, handoffs, guardrails, and final answer rather than grading only the last message."],
      ["Calibrate Human and Automated Graders", "Measure disagreement between human and automated graders, inspect contested cases, refine rubrics, and identify dimensions that should stay human-reviewed."],
      ["Construct an Adversarial Eval Slice", "Add ambiguity, conflicting instructions, stale evidence, tool failures, partial permissions, malformed data, and edge cases that expose brittle success."],
      ["Set Eval-to-Launch Thresholds", "Define minimum quality, maximum severe-failure rate, regression tolerance, cost/latency bounds, and explicit blockers that determine go, hold, or rollback."]
    ]
  },
  {
    "id": "grounding-retrieval",
    "familyId": "repo.audit.first",
    "pack": "research-grounding",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["research", "audit", "test"],
    "modes": ["audit-first", "root-cause", "lindy"],
    "risks": ["correctness", "regression", "maintainability"],
    "basis": ["OpenAI eval guidance", "NIST AI RMF", "Google prompt and context guidance"],
    "scope": "Ground consequential claims in the authoritative and freshest evidence. Retrieval must preserve source identity, version, scope, conflict, and supersession.",
    "jobs": [
      ["Map the Source Authority Hierarchy", "Rank repositories, live runtime, databases, official docs, primary records, secondary sources, caches, chats, and inference by authority for this exact decision."],
      ["Add a Freshness Gate", "Define when evidence expires, what version/date matters, which facts require live re-checking, and when stale evidence must be demoted rather than reused."],
      ["Measure Citation Coverage", "Map material claims to supporting evidence, identify unsupported or weakly supported synthesis, and quantify where citation coverage is insufficient for the decision."],
      ["Tune Retrieval Chunk Boundaries", "Choose chunk boundaries that preserve semantic units, source metadata, surrounding context, and answerability instead of maximizing arbitrary token size."],
      ["Rewrite Queries for Recall and Precision", "Generate query variants that capture aliases, exact identifiers, terminology drift, and likely source wording, then compare recall against irrelevant-result cost."],
      ["Resolve Conflicting Retrieved Sources", "Classify conflicting sources by authority, date, scope, methodology, and directness; preserve unresolved disagreement instead of averaging contradictions away."],
      ["Detect Unsupported Synthesis", "Find conclusions that combine individually supported facts into a new unsupported claim and require a direct proof step before treating the synthesis as true."],
      ["Invalidate Stale Cache Evidence", "Identify cached, embedded, indexed, or summarized evidence that has been superseded by a newer source, deployment, policy, commit, or authoritative record."],
      ["Locate Evidence in Long Context", "Find the smallest contiguous evidence span that answers the question while preserving enough surrounding context to avoid quote, scope, and causality errors."],
      ["Track Source Supersession", "Record predecessor and successor sources, effective dates, versions, and reasons for supersession so old truth can be explained without remaining authoritative."]
    ]
  },
  {
    "id": "ai-security-authority",
    "familyId": "compliance.and.security.sentinel",
    "pack": "research-ai-security",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["audit", "plan", "test", "launch"],
    "modes": ["redteam", "audit-first", "minimal-edits"],
    "risks": ["security", "compliance", "correctness"],
    "basis": ["OWASP Excessive Agency", "NIST AI RMF Generative AI Profile", "provider agent safety guidance"],
    "scope": "Treat model output as untrusted input to authority-bearing systems. Minimize agency, isolate untrusted content, preserve consent, and fail closed around privileged actions.",
    "jobs": [
      ["Audit Direct Prompt Injection Boundaries", "Test whether user-supplied instructions can override system authority, tool policy, data boundaries, or protected workflow rules and identify the smallest enforceable separation."],
      ["Isolate Indirect Prompt Injection", "Trace instructions embedded in webpages, files, messages, retrieved documents, or tool output and prevent untrusted content from silently becoming executable authority."],
      ["Apply Least Privilege to Tools", "Reduce each tool or credential to the minimum read/write scope, resource boundary, duration, and operation set needed for the verified task."],
      ["Test for Excessive Agency", "Identify places where the model can take damaging actions from ambiguous intent, broad credentials, automatic chaining, or missing approval gates."],
      ["Scan Agent Paths for Secret Exposure", "Inspect prompts, logs, traces, tool arguments, browser state, error messages, artifacts, and generated output for paths that can reveal credentials or confidential data."],
      ["Block Data Exfiltration Paths", "Map outbound channels such as HTTP requests, email, uploads, logs, analytics, tool calls, and generated links, then constrain untrusted content from steering sensitive data into them."],
      ["Sandbox Untrusted Content", "Separate parsing, interpretation, and execution for untrusted code, files, webpages, and documents; define what can be inspected without granting mutation or network authority."],
      ["Verify Consent and Revocation", "Check that consent is specific, current, understandable, revocable, and actually enforced after revocation across cached state, sessions, integrations, and downstream copies."],
      ["Gate Privileged Mutations", "Require explicit authority and precondition evidence before merges, deletes, purchases, sends, publication, permission changes, secret rotation, migrations, or irreversible state changes."],
      ["Prepare an AI Security Incident Playbook", "Define detection, containment, credential revocation, evidence preservation, affected-scope analysis, rollback, communication, and post-incident hardening for AI-mediated failures."]
    ]
  },
  {
    "id": "software-delivery",
    "familyId": "migration.and.release.planner",
    "pack": "research-software-delivery",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["audit", "plan", "test", "launch"],
    "modes": ["minimal-edits", "root-cause", "lindy"],
    "risks": ["regression", "maintainability", "security"],
    "basis": ["GitHub supply-chain security guidance", "GitHub Actions security hardening", "reproducible release practice"],
    "scope": "Make releases reproducible, exact-head, least-privilege, dependency-aware, and reversible. Never let CI green stand in for the wrong code or environment.",
    "jobs": [
      ["Review Dependency Diff Before Merge", "Inspect newly added, removed, or changed dependencies for necessity, provenance, version risk, transitive impact, license/security concerns, and lockfile evidence."],
      ["Verify Lockfile Reproducibility", "Prove the lockfile installs the intended dependency graph from a clean environment and detect hidden floating versions, platform divergence, or generated-lock drift."],
      ["Pin Workflow Actions to Reviewed Code", "Audit CI actions and reusable workflows for mutable tags or branches and pin security-sensitive execution to reviewed immutable versions where appropriate."],
      ["Minimize CI Token Permissions", "Map workflow operations to permissions and remove write scopes, secret exposure, fork trust, and repository authority that the job does not need."],
      ["Dry-Run a Data or Schema Migration", "Model or execute the safest available dry run, validate forward and backward compatibility, quantify affected rows/state, and stop before irreversible mutation without proof."],
      ["Prove the Rollback Path", "Demonstrate how code, configuration, schema, traffic, and user state return to a known-good version after partial or complete release failure."],
      ["Detect Configuration Drift", "Compare intended configuration with deployed/runtime configuration across environments and identify differences that can invalidate source-level proof."],
      ["Check Environment Parity", "Identify behaviorally material differences in dependencies, variables, services, data shape, permissions, network policy, region, and runtime between tested and target environments."],
      ["Retire Stale Feature Flags", "Find flags whose experiment or rollout purpose has ended, verify current population and fallback behavior, then plan safe removal without reactivating dead paths."],
      ["Bind Release to Exact Head", "Tie build, artifact, deployment, tests, receipts, and runtime verification to the same immutable commit or version so success cannot be borrowed from adjacent code."]
    ]
  },
  {
    "id": "reliability-observability",
    "familyId": "debug.without.thrashing",
    "pack": "research-reliability",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["audit", "test", "debug", "build"],
    "modes": ["root-cause", "redteam", "minimal-edits"],
    "risks": ["performance", "regression", "correctness"],
    "basis": ["Google SRE golden signals", "OpenTelemetry semantic conventions", "retry and idempotency guidance"],
    "scope": "Make reliability observable through user-impact signals, correlated telemetry, bounded retries, and recoverable mutation semantics. Diagnose before adding infrastructure.",
    "jobs": [
      ["Instrument the Four Golden Signals", "Define latency, traffic, errors, and saturation for the actual service or user path, including dimensions, thresholds, sampling, and evidence links needed to debug impact."],
      ["Define an SLO and Error Budget", "Translate user expectations into a measurable service-level indicator and target, then define the error budget and what operational decisions change as it burns."],
      ["Make Alerts Actionable", "Remove alerts that lack user impact, ownership, evidence, or a next diagnostic step; define paging thresholds that correspond to conditions requiring timely human action."],
      ["Correlate Traces Metrics and Logs", "Design shared identifiers and semantic fields so an incident can move from aggregate metric to trace to structured logs without guessing across disconnected telemetry."],
      ["Detect Retry Storm Risk", "Model failure amplification from clients, workers, queues, providers, and nested retries; identify multiplicative retry paths and add ceilings, jitter, and circuit behavior."],
      ["Design Idempotent Mutation Recovery", "Define stable operation identity, duplicate detection, replay behavior, stored outcomes, partial-failure handling, and safe retry semantics for side-effecting operations."],
      ["Harden Dead-Letter Recovery", "Define why messages enter dead-letter state, what evidence is preserved, how poison messages are isolated, and how replay avoids duplicate or out-of-order side effects."],
      ["Design Load Shedding", "Identify noncritical work that can degrade first, define overload signals, preserve critical paths, and make rejected or delayed work explicit instead of allowing uncontrolled collapse."],
      ["Run a Dependency-Outage Exercise", "Assume a critical external dependency is slow, unavailable, inconsistent, or rate-limited and verify fallback, timeout, retry, user messaging, and recovery behavior."],
      ["Build an Incident Evidence Timeline", "Reconstruct a time-ordered record of deploys, config changes, alerts, traces, logs, user reports, mitigations, and recovery so causality is separated from coincidence."]
    ]
  },
  {
    "id": "web-accessibility-performance",
    "familyId": "ux.design.system.auditor",
    "pack": "research-web-quality",
    "platforms": ["chatgpt", "claude", "figma"],
    "stages": ["audit", "build", "polish", "test"],
    "modes": ["audit-first", "minimal-edits", "redteam"],
    "risks": ["ux", "performance", "regression"],
    "basis": ["Playwright best practices", "WCAG 2.2", "web performance field guidance"],
    "scope": "Verify user-visible behavior across keyboard, touch, zoom, motion preferences, validation, slow networks, and responsive layouts. Accessibility and performance are real-path properties.",
    "jobs": [
      ["Budget LCP INP and CLS", "Set page-specific budgets for loading, interaction responsiveness, and layout stability, identify the dominant contributors, and choose the smallest change that improves the measured user path."],
      ["Prove the Keyboard-Only Critical Path", "Complete the primary user task without a pointer and verify focus order, visibility, traps, dialogs, menus, error recovery, and reachable controls."],
      ["Audit Minimum Target Size", "Identify interactive targets that are too small or crowded for reliable touch use, preserve exceptions only when justified, and verify the corrected responsive path."],
      ["Provide Non-Dragging Alternatives", "Find functionality that requires dragging and provide an equivalent single-pointer or keyboard-accessible operation without reducing capability."],
      ["Test Focus Appearance and Restoration", "Verify focus indicators remain visible and unobscured, modal/dialog focus moves predictably, and focus returns to a meaningful origin after completion or dismissal."],
      ["Verify Reduced Motion Behavior", "Identify nonessential motion, parallax, autoplay, and transition effects, then verify reduced-motion preferences remove or simplify them without hiding information."],
      ["Stress Text Zoom and Reflow", "Test enlarged text and narrow viewports for clipping, overlap, horizontal traps, hidden actions, and loss of reading or task order."],
      ["Announce Validation and Status Changes", "Verify errors, progress, async completion, saved state, and important status changes are programmatically exposed without relying only on color, position, or fleeting toast timing."],
      ["Design Honest Loading States", "Ensure loading, skeleton, optimistic, queued, and background states reflect real backend authority and do not imply completion before success is known."],
      ["Test on Slow Mobile Conditions", "Exercise the critical path with constrained viewport, latency, bandwidth, and intermittent failures to find UI that is technically rendered but practically unusable."]
    ]
  },
  {
    "id": "product-experiments",
    "familyId": "market.and.pricing.strategist",
    "pack": "research-product-experiments",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["research", "plan", "audit", "launch"],
    "modes": ["lindy", "audit-first", "minimal-edits"],
    "risks": ["conversion", "pricing", "correctness"],
    "basis": ["evidence-driven experimentation practice", "NIST measurement discipline", "product analytics best practices"],
    "scope": "Use experiments to resolve consequential uncertainty with predeclared metrics, guardrails, segments, thresholds, and rollback. Activity is not evidence of outcome.",
    "jobs": [
      ["Write a Falsifiable Product Hypothesis", "Convert a product belief into a specific intervention, target user, expected behavior change, measurable outcome, time horizon, and result that would disconfirm the belief."],
      ["Choose One Primary Success Metric", "Select the single metric that best represents the intended user or business outcome and separate it from supporting diagnostics and vanity activity."],
      ["Add Guardrail Metrics", "Define harms or regressions the experiment must not create, such as retention loss, support burden, latency, refunds, accessibility failure, or margin erosion."],
      ["Design the Minimum Testable Segment", "Choose the smallest meaningful audience, surface, duration, and exposure needed to learn while limiting risk and preserving interpretability."],
      ["Check for Novelty and Learning Effects", "Identify whether temporary attention, onboarding friction, user learning, seasonality, or repeated exposure can distort early results."],
      ["Set Stop Compound and Kill Thresholds", "Predeclare thresholds for stopping due to harm, extending because evidence is inconclusive, killing because the hypothesis failed, or compounding because the outcome holds."],
      ["Plan an Experiment Rollback", "Define how assignment, UI, data writes, pricing, messaging, and downstream state return safely if the experiment is stopped early."],
      ["Measure Cohort Retention Shift", "Compare behavior across cohorts and time windows that match the product's repeat-value cycle rather than relying on aggregate short-term engagement."],
      ["Locate the Funnel Breakpoint", "Measure conversion between sequential user states to identify the first meaningful drop, then distinguish acquisition, comprehension, trust, friction, and product-value causes."],
      ["Reconcile Qualitative and Quantitative Evidence", "Use interviews, support signals, session evidence, and metrics to explain one another while preserving disagreements and avoiding anecdotes that override population data."]
    ]
  },
  {
    "id": "growth-revenue",
    "familyId": "market.and.pricing.strategist",
    "pack": "research-growth-revenue",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["research", "plan", "audit", "launch"],
    "modes": ["audit-first", "lindy", "minimal-edits"],
    "risks": ["conversion", "pricing", "correctness"],
    "basis": ["unit economics practice", "evidence-led customer acquisition", "lifecycle measurement"],
    "scope": "Trace acquisition work through conversion, revenue, retention, referral, and learning. Do not mistake reach, clicks, or generated leads for money.",
    "jobs": [
      ["Score Leads by Evidence of Fit", "Rank prospects using explicit fit evidence, urgency, authority, reachable path, product match, expected value, and disqualifiers instead of superficial enrichment."],
      ["Match Offer to Pain and Proof", "Map the prospect's verified problem to one concrete offer, relevant proof, expected outcome, and a reason the offer is credible without overstating capability."],
      ["Compare Channel Unit Economics", "Compare acquisition channels using total cost, conversion, sales effort, time-to-cash, gross margin, retention quality, and learning value rather than top-line traffic."],
      ["Audit CAC Payback Logic", "Validate customer acquisition cost inputs, contribution margin, churn assumptions, cohort behavior, and payback period before using the metric to justify more spend."],
      ["Design Pricing and Packaging Tests", "Create bounded tests for price, packaging, usage limits, commitment, and value metric while protecting existing customers and defining revenue and retention guardrails."],
      ["Build an Objection Evidence Map", "Classify recurring sales objections, connect each to actual evidence or missing proof, and prioritize product, positioning, or sales fixes by conversion impact."],
      ["Engineer a Referral Loop", "Define the moment of achieved value, eligible referrer, referral incentive or reason, invitation path, attribution, fraud boundary, and repeatable conversion measurement."],
      ["Sequence Lifecycle Follow-Up", "Map follow-up timing and message purpose from first contact through activation, adoption, renewal, expansion, and win-back using behavior rather than indiscriminate cadence."],
      ["Trace Activation to Revenue", "Identify the earliest user behavior that reliably precedes retained value and revenue, then test whether improving that behavior changes downstream business outcomes."],
      ["Diagnose Churn Before Discounting", "Segment churn by cause, value realization, cohort, product usage, support history, price sensitivity, and alternative choice before using discounts as the default retention tactic."]
    ]
  },
  {
    "id": "ecommerce-operations",
    "familyId": "ecommerce.storefront.operator",
    "pack": "research-ecommerce-ops",
    "platforms": ["chatgpt", "claude", "shopify"],
    "stages": ["audit", "build", "launch", "polish"],
    "modes": ["audit-first", "minimal-edits", "root-cause"],
    "risks": ["conversion", "pricing", "ux"],
    "basis": ["Shopify performance and mutation guidance", "Google ecommerce search guidance", "commerce operations practice"],
    "scope": "Preserve catalog, price, availability, fulfillment, checkout, and product-claim truth across storefront and operations. Optimize revenue without inventing inventory or weakening buyer trust.",
    "jobs": [
      ["Reconcile Product Data Truth", "Compare product title, media, description, price, variant, inventory, supplier, shipping, and policy data across source systems and storefront presentation."],
      ["Audit Variant and Availability Parity", "Verify every selectable variant maps to real price, inventory or availability semantics, media, SKU/identifier, fulfillment path, and disabled state when unavailable."],
      ["Profile Checkout Extension Cost", "Measure load, network, render, and interaction cost introduced near checkout and remove work that delays or destabilizes the buyer's critical path."],
      ["Gate Cart Mutations on Buyer Intent", "Ensure cart or checkout mutations occur only after a clear buyer action, are debounced or idempotent where needed, and never create hidden or repeated changes."],
      ["Clarify Shipping and Returns Before Purchase", "Check whether delivery expectations, cost, restrictions, returns, exchanges, and exceptions are discoverable before commitment and consistent with operational reality."],
      ["Validate Commerce Structured Data", "Compare product and organization structured data with visible page truth, variant/availability semantics, canonical URLs, and search-platform requirements."],
      ["Audit Catalog Crawl and Index Paths", "Verify navigation, internal linking, canonicalization, robots/noindex choices, sitemaps, pagination, and product discovery paths do not strand important catalog pages."],
      ["Find Margin Leakage by SKU", "Calculate or classify revenue leakage from product cost, shipping, discounts, returns, fees, advertising, fulfillment exceptions, and supplier mismatch at SKU or variant level."],
      ["Design Fulfillment Exception Recovery", "Map out-of-stock, supplier failure, address issue, delay, partial shipment, lost package, cancellation, refund, and customer communication paths with clear authority."],
      ["Build Post-Purchase Repeat Value", "Design order follow-up around delivery confirmation, usage success, replenishment or complementary need, support, review/referral, and repeat purchase without spam."]
    ]
  },
  {
    "id": "brand-content-distribution",
    "familyId": "brand.voice.and.content",
    "pack": "research-brand-content",
    "platforms": ["chatgpt", "claude", "canva"],
    "stages": ["research", "build", "polish", "launch"],
    "modes": ["audit-first", "minimal-edits", "lindy"],
    "risks": ["ux", "conversion", "correctness"],
    "basis": ["evidence-bound content practice", "accessibility guidance", "channel-specific communication"],
    "scope": "Treat content as a distribution system backed by claim provenance. Reuse evidence, not unsupported language, and adapt form to channel without changing factual meaning.",
    "jobs": [
      ["Build a Claim Provenance Ledger", "List every material claim, its exact evidence, source freshness, allowed wording, prohibited overstatement, and where the claim may safely be reused."],
      ["Design a Repurposing Graph", "Map one verified source asset into derivative formats by audience and channel while preserving source links, factual boundaries, and the distinct job of each derivative."],
      ["Create a Narrative Hierarchy", "Organize problem, stakes, insight, proof, solution, differentiation, objection handling, and action so the audience receives the minimum context needed in the right order."],
      ["Adapt One Message Across Channels", "Translate the same factual proposition into channel-native length, structure, visual emphasis, and CTA without silently changing the claim or target audience."],
      ["Run a Content Hypothesis Test", "Define the audience belief or behavior the content is meant to change, the creative variable under test, distribution context, success signal, and kill/iterate rule."],
      ["Audit Social Proof Claims", "Verify testimonials, logos, customer counts, outcomes, ratings, case studies, and implied endorsements are current, attributable, permitted, and not generalized beyond evidence."],
      ["Generate FAQ from Verified Evidence", "Turn recurring real questions and verified answers into concise FAQ content, flag unanswered questions, and avoid filling knowledge gaps with plausible invention."],
      ["Turn Outcomes into a Case Study", "Build a case study from baseline, intervention, constraints, measured outcome, attribution limits, timeline, and customer evidence rather than promotional adjectives."],
      ["Create a Launch Message Stack", "Coordinate announcement, landing-page message, founder narrative, customer proof, objections, social variants, email, and follow-up around one consistent launch truth."],
      ["Audit Content Accessibility", "Check reading order, headings, link purpose, contrast, text alternatives, captions, transcripts, cognitive load, and visual dependence across the final content surface."]
    ]
  },
  {
    "id": "automation-integrations",
    "familyId": "migration.and.release.planner",
    "pack": "research-automation-integrations",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["audit", "plan", "build", "test"],
    "modes": ["root-cause", "minimal-edits", "redteam"],
    "risks": ["correctness", "security", "regression"],
    "basis": ["Stripe idempotency and retry guidance", "Cloudflare retry guidance", "integration reliability practice"],
    "scope": "Assume networks retry, events reorder, providers rate-limit, and sync conflicts occur. Integrations need explicit schemas, idempotency, reconciliation, and least privilege.",
    "jobs": [
      ["Make Webhook Processing Idempotent", "Define event identity, duplicate detection, stored processing state, safe replay, side-effect deduplication, and behavior when the same event arrives before prior completion."],
      ["Define an Integration Schema Contract", "Specify versioned fields, required/optional semantics, identifiers, units, timestamps, nullability, validation, compatibility, and rejection behavior at the integration boundary."],
      ["Design Retry Backoff and Jitter", "Classify retryable errors, choose bounded exponential backoff and jitter, respect provider retry hints, and prevent nested retry loops from amplifying load."],
      ["Handle Provider Rate Limits", "Read actual limit semantics, distinguish quotas from transient throttling, budget calls, batch/cache where valid, queue nonurgent work, and surface exhaustion explicitly."],
      ["Prove Pagination Completeness", "Validate cursor or page traversal, ordering assumptions, duplicate handling, termination, deletions/insertions during traversal, and evidence that the full requested range was considered."],
      ["Resolve Bidirectional Sync Conflicts", "Define authority by field or object, change identity, conflict detection, merge or human resolution, deletion semantics, and replay behavior without last-write-wins guesswork."],
      ["Minimize OAuth and API Scopes", "Map each requested scope to a concrete operation, remove unused privileges, separate read/write credentials where possible, and plan consent changes without breaking core paths."],
      ["Plan Secret Rotation Without Downtime", "Define dual-validity or staged rotation, deployment order, cache/session behavior, observability, verification, revocation timing, and rollback if the new credential fails."],
      ["Process Out-of-Order Events Safely", "Use sequence/version/event time and current authoritative state to prevent delayed events from reverting newer truth or triggering duplicate downstream actions."],
      ["Build a Reconciliation Job", "Compare expected internal state with authoritative external state on a bounded cadence, classify drift, repair only safe differences, and receipt unresolved mismatches."]
    ]
  },
  {
    "id": "data-analytics",
    "familyId": "repo.audit.first",
    "pack": "research-data-analytics",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["audit", "research", "test"],
    "modes": ["audit-first", "root-cause", "lindy"],
    "risks": ["correctness", "maintainability", "regression"],
    "basis": ["analytics data-quality practice", "measurement discipline", "decision-focused reporting"],
    "scope": "Validate data grain, freshness, semantics, coverage, and attribution before drawing conclusions. A polished dashboard does not repair a broken dataset.",
    "jobs": [
      ["Write a Metric Definition Contract", "Define numerator, denominator, grain, population, time window, timezone, exclusions, source tables/events, ownership, and examples so the metric has one operational meaning."],
      ["Audit Dataset Grain Before Joining", "Identify one-row-per-what for every source, expected cardinality, join keys, fan-out risk, duplicates, and aggregation order before combining data."],
      ["Profile Missingness by Segment", "Measure missing and invalid values across important segments and time, distinguish true absence from instrumentation failure, and quantify decision impact."],
      ["Check Data Freshness and Coverage", "Compare requested period with source sync windows, late arrivals, partial accounts, failed pipelines, and as-of timestamps before reporting a period total."],
      ["Validate Attribution Logic", "Trace how credit is assigned across touches, sessions, devices, channels, orders, and time windows; expose assumptions and double-counting rather than presenting attribution as ground truth."],
      ["Build a Cohort Analysis Plan", "Define cohort entry event, observation windows, retained outcome, censoring, segment controls, and comparison logic that matches the product's value cycle."],
      ["Triage an Anomaly", "Verify the metric definition and pipeline first, localize the movement by segment and component, distinguish real behavior from data breakage, and rank causal hypotheses by evidence."],
      ["Guard Against Causal Overclaim", "Separate correlation, temporal association, controlled experiment evidence, natural experiment evidence, and causal inference assumptions before recommending a causal story."],
      ["Audit Dashboard Decision Usefulness", "Map each chart or KPI to a concrete decision, remove redundant or unactionable views, expose uncertainty, and ensure drill-down supports diagnosis rather than decoration."],
      ["Detect Data Contract Drift", "Compare current schemas, event properties, enumerations, units, semantics, and producer versions with consumer expectations and identify silent compatibility breakage."]
    ]
  },
  {
    "id": "research-decision-intelligence",
    "familyId": "market.and.pricing.strategist",
    "pack": "research-decision-intelligence",
    "platforms": ["chatgpt", "claude", "perplexity"],
    "stages": ["research", "audit", "plan"],
    "modes": ["audit-first", "lindy", "redteam"],
    "risks": ["correctness", "pricing", "compliance"],
    "basis": ["NIST risk management", "primary-source research discipline", "evidence-based decision practice"],
    "scope": "Research should reduce a decision-relevant uncertainty. Prefer primary and current sources, preserve disagreement, expose confidence, and end in a bounded next test.",
    "jobs": [
      ["Build a Research Source Hierarchy", "Define which primary, official, empirical, expert, community, vendor, and secondary sources can support which kinds of claims in this decision."],
      ["Reconcile Contradictory Sources", "Compare conflicting evidence by source authority, date, method, sample, incentives, definition, and scope; preserve unresolved conflict and show what would resolve it."],
      ["Run a Recency and Version Check", "Verify publication date, effective date, product/version applicability, superseding documents, and whether a recently changed fact requires a live check."],
      ["Extract Primary-Source Evidence", "Find the original regulation, documentation, dataset, filing, study, specification, announcement, or first-party record behind a repeated secondary claim."],
      ["Maintain an Uncertainty Ledger", "List consequential unknowns, current confidence, evidence for and against, cost of being wrong, cheapest resolution method, and the decision each unknown blocks."],
      ["Build Scenario Bounds Instead of One Forecast", "Construct downside, base, and upside scenarios from explicit variables and ranges, then show which assumptions dominate the outcome rather than hiding uncertainty in one number."],
      ["Compare Competitors on Evidence", "Compare competitors using current product, pricing, customer, distribution, technical, and business evidence with identical dimensions and clear unknowns."],
      ["Track Regulatory or Policy Change Impact", "Translate a current or proposed rule into affected product surfaces, data flows, claims, processes, deadlines, evidence needs, and reversible preparation steps."],
      ["Run Vendor Due Diligence", "Evaluate capability, security, privacy, reliability, pricing, lock-in, support, contractual limits, integration cost, exit path, and evidence quality before dependency."],
      ["Translate Research into the Next Test", "Convert the strongest findings and remaining uncertainty into one measurable, reversible test with a success threshold, failure threshold, evidence capture, and kill/compound rule."]
    ]
  },
  {
    "id": "multimodal-media",
    "familyId": "brand.voice.and.content",
    "pack": "research-multimodal-media",
    "platforms": ["chatgpt", "claude", "canva"],
    "stages": ["research", "build", "polish", "launch"],
    "modes": ["minimal-edits", "audit-first", "lindy"],
    "risks": ["ux", "correctness", "conversion"],
    "basis": ["multimodal production practice", "accessibility guidance", "evidence-bound claims and provenance"],
    "scope": "Keep generated media continuous, legible, evidence-bound, accessible, and traceable. Separate creative world-building from footage that purports to prove a real product or outcome.",
    "jobs": [
      ["Lock a Visual Canon Before Generation", "Define subject identity, proportions, wardrobe/product geometry, palette, typography, environment, lighting, camera language, and invariants that must persist across assets."],
      ["Plan Shot Jobs Before Motion", "Assign each shot one communication job, subject action, camera behavior, duration, transition purpose, and continuity dependency before generating motion."],
      ["Separate World Footage from Proof Footage", "Label imaginative or illustrative footage separately from footage used to substantiate product behavior, customer outcome, event reality, or other factual claims."],
      ["Write an Image Edit Delta Contract", "State exactly what must remain unchanged, what may change, target style, intended use, crop/aspect constraints, quality gate, and forbidden collateral edits."],
      ["Design Real Motion Instead of Slide Motion", "Specify subject, environment, camera, depth, timing, interaction, and state change so video movement communicates progression rather than panning across static images."],
      ["Verify Caption and Audio Synchronization", "Check spoken content, captions, on-screen text, timing, reading speed, speaker changes, sound cues, and final edit alignment after the actual audio/video assembly."],
      ["Protect Product Visual Truth", "Ensure generated or edited product imagery does not alter material features, included items, results, scale, color, interface state, or performance in ways that mislead buyers."],
      ["Create Useful Alt Text and Media Alternatives", "Describe the information-bearing purpose of images, charts, and video; provide captions, transcripts, or equivalent text where needed without narrating decorative detail."],
      ["Track Asset Provenance and Edit Lineage", "Record source asset, generation/edit model, prompt or edit intent, versions, rights/usage context, derivative relationships, and final approved asset identity."],
      ["Gate Publication on Rights and Claims", "Before publishing, verify ownership or permitted use, likeness/brand constraints, music/media rights, disclosure needs, factual claims, accessibility, and final-channel requirements."]
    ]
  }
];

const FAMILY_INPUTS = {
  "repo.audit.first": ["repoName", "branchOrPr", "commitHead", "stack", "goal"],
  "debug.without.thrashing": ["repoName", "feature", "expected", "actual"],
  "migration.and.release.planner": ["repoName", "area", "currentState", "goal"],
  "market.and.pricing.strategist": ["productOrBrand", "audience", "competitiveContext", "goal"],
  "brand.voice.and.content": ["brandVoice", "audience", "channel", "goal"],
  "ux.design.system.auditor": ["productOrSurface", "designSystem", "userFlow", "goal"],
  "ecommerce.storefront.operator": ["storeName", "catalogArea", "goal"],
  "compliance.and.security.sentinel": ["repoName", "surface", "regulatoryContext", "goal"]
};

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function instructionsFor(group, title, focus) {
  return `Execute the research-grounded PromptOS job "${title}" for the concrete founder context supplied with this recipe. Exact job: ${focus} Research-grounded operating constraints for this pack: ${group.scope} Start by identifying the authoritative source of truth for the subject, the current version or date that matters, and the evidence required to make a consequential claim. Separate VERIFIED, INFERRED, UNKNOWN, and BLOCKED. Prefer primary sources, official documentation, current runtime evidence, and direct measurements when facts can change. Do not invent users, metrics, permissions, integrations, availability, customer outcomes, successful execution, or missing evidence. Do not treat generated text, a passing adjacent test, a stale screenshot, or a previous model answer as proof of current reality. Identify material constraints, authority boundaries, dependencies, and the cost of being wrong. Choose the smallest reversible next action that resolves the highest-value uncertainty without widening permissions or scope. If this touches rendered UI, require user-visible browser proof on the real path. If this touches an external mutation, publication, billing action, privileged operation, destructive action, or spend, require explicit authority before execution. Define success, failure, rollback, and stop conditions before recommending consequential action. Preserve useful disagreement and uncertainty instead of forcing false certainty. Return exactly these decision sections: REALITY | ANALYSIS | ACTION | PROOF | RISK | ROLLBACK | NEXT GATE.`;
}

function makeGroupPrompts(group) {
  const requiredInputs = FAMILY_INPUTS[group.familyId];
  if (!requiredInputs) throw new Error(`Missing family inputs for ${group.familyId}`);

  return group.jobs.map(([title, focus], index) => ({
    id: `research.curated.${group.id}.${String(index + 1).padStart(2, '0')}.${slug(title)}|catalog-v1`,
    title,
    description: `Research-grounded ${group.id.replace(/-/g, ' ')} recipe with evidence, authority, rollback, and proof gates.`,
    pack: group.pack,
    familyId: group.familyId,
    clauseIds: [],
    platform: group.platforms[index % group.platforms.length],
    stage: group.stages[index % group.stages.length],
    modes: [group.modes[index % group.modes.length]],
    riskLens: group.risks[index % group.risks.length],
    inputs: [...requiredInputs],
    status: 'curated',
    version: 'catalog-v1',
    requiresUiProof: group.id === 'web-accessibility-performance',
    researchGroup: group.id,
    researchBasis: [...group.basis],
    instructions: instructionsFor(group, title, focus),
  }));
}

export const researchExpansionGroups = Object.freeze(
  RESEARCH_GROUPS.map((group) => Object.freeze({
    id: group.id,
    familyId: group.familyId,
    pack: group.pack,
    promptCount: group.jobs.length,
    researchBasis: Object.freeze([...group.basis]),
  })),
);

export const researchExpansionPrompts = Object.freeze(RESEARCH_GROUPS.flatMap(makeGroupPrompts));

if (researchExpansionGroups.length !== 15) {
  throw new Error(`Research expansion group drift: expected 15, got ${researchExpansionGroups.length}`);
}
if (researchExpansionPrompts.length !== 150) {
  throw new Error(`Research expansion prompt drift: expected 150, got ${researchExpansionPrompts.length}`);
}
