# PromptOS Research Expansion Receipt — 2026-09-26

## Authority

Repository source of truth: `jussray/promptos`.

Canonical runtime: `src/catalog-runtime/`.

Public web research informed the capability gaps and job design. It did not become an alternate source of truth, and external prompt text was not copied into the library.

## Change target

- Selected catalog remains exactly **5,000** recipes.
- Existing curated prompts: **248**.
- New research-grounded curated prompts: **150**.
- New curated total: **398**.
- Expansion shape: **15 domains × 10 distinct jobs**.

## Research principles carried into the expansion

1. Prefer clear, specific instructions and evaluate prompts systematically rather than treating prompt quality as subjective.
2. Use agents only when the task benefits from flexible tool use or iterative reasoning; keep simpler workflows simple.
3. Treat agent quality as an end-to-end trajectory problem, including tool calls, handoffs, retries, and final claims.
4. Minimize agent authority and place explicit approval gates around consequential mutations.
5. Use exact-head, dependency-aware, reproducible software-delivery evidence.
6. Test rendered user behavior with browser evidence rather than implementation details alone.
7. Carry accessibility requirements through keyboard, touch, zoom, focus, motion, and equivalent-input paths.
8. Design retries as bounded, idempotent, and backoff-aware rather than blindly repeating failures.
9. Observe reliability through user-impact signals and correlated traces, metrics, and logs.
10. Preserve ecommerce truth across product data, checkout behavior, search discoverability, and fulfillment.
11. Separate activity metrics from measurable business outcomes and decision thresholds.
12. Preserve source authority, freshness, conflict, uncertainty, and supersession in research and retrieval.

## Primary public sources reviewed

- OpenAI, Prompt engineering: https://developers.openai.com/api/docs/guides/prompt-engineering
- OpenAI, Evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices
- Anthropic, Building Effective AI Agents: https://www.anthropic.com/engineering/building-effective-agents
- Google AI for Developers, Prompt design strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies
- OWASP GenAI Security Project, Excessive Agency: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- NIST, AI RMF Generative AI Profile: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- Playwright, Best Practices: https://playwright.dev/docs/best-practices
- W3C, WCAG 2.2: https://www.w3.org/TR/wcag/
- GitHub Docs, software supply-chain security: https://docs.github.com/en/code-security/tutorials/implement-supply-chain-best-practices/securing-code
- Stripe, Designing robust and predictable APIs with idempotency: https://stripe.com/blog/idempotency
- Google SRE, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- OpenTelemetry, Semantic Conventions: https://opentelemetry.io/docs/concepts/semantic-conventions/
- Shopify, Checkout UI extension performance: https://shopify.dev/docs/apps/build/checkout/extension-performance
- Shopify, Applying changes: https://shopify.dev/docs/apps/build/checkout/extension-performance/applying-changes
- Google Search Central, Ecommerce SEO: https://developers.google.com/search/docs/specialty/ecommerce
- Cloudflare Durable Objects, Error handling: https://developers.cloudflare.com/durable-objects/best-practices/error-handling/

## Added domains

1. Agent systems
2. Evals and quality
3. Grounding and retrieval
4. AI security and authority
5. Software delivery
6. Reliability and observability
7. Web accessibility and performance
8. Product experiments
9. Growth and revenue
10. Ecommerce operations
11. Brand, content, and distribution
12. Automation and integrations
13. Data and analytics
14. Research and decision intelligence
15. Multimodal media

## Verification contract

The expansion is accepted only if:

- `researchExpansionPrompts.length === 150`
- every research group contains 10 prompts
- all 398 curated prompt IDs and titles are globally unique
- the 5,000 selected-recipe invariant remains intact
- all curated prompts are pinned into the selected catalog
- all selected recipes compile with complete inputs
- UI-oriented research recipes retain Playwright proof clauses
- focused desktop and mobile Chromium proof can find, open, and compile representative research prompts
- exact-head verification succeeds before `main` advances
