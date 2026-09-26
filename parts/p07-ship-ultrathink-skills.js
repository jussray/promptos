/* ── SHIP / ULTRATHINK / SKILLS PATCH — IDs 198-219 ──────────────────────────
   Categories: shipping (6) | ultrathink (4) | skills (6) | agent-debug (6)
   Wire: <script src="./parts/p07-ship-ultrathink-skills.js"></script>
─────────────────────────────────────────────────────────────────────────────── */
(function(){
const NP = [

  // ── SHIPPING ──────────────────────────────────────────────────────────────
  {
    id:198,emoji:"🏗️",title:"Implementation Plan",sub:"Break a feature into a file-level task tree before writing code",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Never start coding a feature without running this first. Produces a task tree with file-level scope, ordering, acceptance criteria per task, and a flag for what can be delegated to an AI agent vs what needs human judgment.",
    versions:{
      chatgpt:`Build an implementation plan for this feature before any code is written.

Feature spec:
[PASTE SPEC OR DESCRIPTION]

Repo context:
[PASTE RELEVANT FILE STRUCTURE OR DESCRIBE ARCHITECTURE]

Constraints:
[TIME / STACK / TEAM SIZE / AI AGENT DELEGATION OK?]

Produce:
1. File-level task tree — every file that must be created or modified, grouped by layer (data / logic / API / UI / tests)
2. Task ordering — which tasks unlock which (dependency graph in plain text)
3. Acceptance criterion per task — one sentence: how do I know this task is done without opening the file?
4. AI-delegatable flag per task — can an AI coding agent handle this alone, or does it need human judgment?
5. Blast radius — which tasks, if wrong, break the most other tasks?

Rules:
- Do not write code
- Do not skip the test layer
- If the spec is ambiguous, call out the ambiguity before continuing`,
      claude:`<role>Implementation planner. File-level scope before a single line is written.</role>

<objective>Build the implementation plan for [FEATURE] in [REPO].</objective>

<input>Spec: [PASTE]. Architecture: [DESCRIBE]. Constraints: [DESCRIBE].</input>

<output>
1. File-level task tree (data → logic → API → UI → tests)
2. Dependency ordering
3. Acceptance criterion per task
4. AI-delegatable flag (agent-safe / needs-human)
5. Highest blast-radius tasks flagged
</output>

<rules>No code. Ambiguities called out before proceeding.</rules>`,
      perplexity:"(Use ChatGPT or Claude for implementation planning)"
    }
  },
  {
    id:199,emoji:"🎭",title:"Playwright Scenario Generator",sub:"Generate test cases and coverage grid from a feature spec",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Run after implementation plan, before writing a single test. Produces a coverage grid so you know which paths are tested before running Playwright.",
    versions:{
      chatgpt:`Generate Playwright test scenarios for this feature.

Feature: [DESCRIBE]
UI flows involved: [LIST KEY USER FLOWS]
Stack: [e.g. Next.js / Expo Web / React]

Generate:
1. Coverage grid — happy path / edge case / failure mode for each flow
2. For each scenario:
   - Name (file and test description convention)
   - Preconditions (what must be true before the test runs)
   - Steps (user actions in plain English)
   - Expected outcome
   - Priority: critical / high / nice-to-have
3. List of scenarios that are too risky to automate (manual-only)
4. TypeScript test skeleton for the top 3 critical-path scenarios

Rules:
- Use describe/test/expect Playwright convention
- Separate auth-required tests from public tests
- Flag any test that requires real external API calls`,
      claude:`<role>Playwright test designer. Coverage grid before code.</role>

<objective>Generate test scenarios and TypeScript skeletons for [FEATURE].</objective>

<input>Feature: [DESCRIBE]. Flows: [LIST]. Stack: [DESCRIBE].</input>

<output>
1. Coverage grid (happy / edge / failure per flow)
2. Each scenario: name, preconditions, steps, expected outcome, priority
3. Manual-only list (too risky to automate)
4. TypeScript skeleton for top 3 critical paths
</output>`,
      perplexity:"(Use ChatGPT or Claude for test generation)"
    }
  },
  {
    id:200,emoji:"🐛",title:"Defect Reproduction Planner",sub:"Turn a bug report into a reproducible experiment",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Most bug reports are useless until they become reproducible steps. Run this before touching any code. Produces both a reproduction script and an instrumentation checklist.",
    versions:{
      chatgpt:`Turn this bug report into a reproducible experiment.

Bug report:
[PASTE REPORT]

Stack trace / logs (if available):
[PASTE]

User environment:
[Browser / OS / auth state / data state at time of bug]

Produce:
1. Minimal reproduction steps — the shortest sequence that triggers the bug
2. Environment checklist — what must be true in the environment for this to reproduce
3. Instrumentation plan — what logs, metrics, or console statements to add to isolate the cause
4. Hypothesis list — ranked by probability:
   - Most likely root cause
   - Second most likely
   - Long-shot
5. Cheapest experiment to prove or disprove the most likely hypothesis

Rules:
- Do not suggest a fix yet — only define the reproduction and diagnosis
- If steps are ambiguous, say so and ask for clarification`,
      claude:`<role>Bug reproduction analyst. Reproduce before fixing.</role>

<objective>Turn this bug report into a reproducible experiment with ranked hypotheses.</objective>

<input>Report: [PASTE]. Logs: [PASTE]. Environment: [DESCRIBE].</input>

<output>
1. Minimal reproduction steps
2. Environment checklist
3. Instrumentation plan (logs/metrics to add)
4. Hypotheses ranked by probability
5. Cheapest experiment to prove the top hypothesis
</output>

<rule>No fix suggestions until reproduction is defined.</rule>`,
      perplexity:"(Use ChatGPT or Claude for defect reproduction)"
    }
  },
  {
    id:201,emoji:"🚦",title:"Release Gate Checklist",sub:"Final verification before anything ships to production",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Run within 30 minutes of every production deploy. Pairs with L99 Release Truth. Covers migrations, feature flags, config, monitoring, and rollback path before the button is pressed.",
    versions:{
      chatgpt:`Generate a release gate checklist for this deploy.

What is shipping: [DESCRIBE CHANGE]
Repo: [NAME]
Stack: [STACK]
Environments: [dev / staging / prod]

Check every gate:
1. Schema / migration — are all migrations applied in the correct order? Is any migration irreversible?
2. Feature flags — are the right flags on/off per environment?
3. Config / secrets — are all required env vars present in prod?
4. Monitoring — are error rate, latency, and key business metrics being watched?
5. Rollback — what is the exact rollback command or procedure if this breaks within 10 minutes?
6. Dependencies — does any upstream API, third-party service, or external contract need to be verified first?
7. Do-not-ship — list any condition that means this should not ship regardless of gate status

Return: Ordered checklist with pass/fail column + do-not-ship conditions bolded`,
      claude:`<role>Release gate operator. Every gate must be explicitly passed, not assumed.</role>

<objective>Generate a release gate checklist for [CHANGE] deploying to [ENV].</objective>

<input>Change: [DESCRIBE]. Stack: [DESCRIBE].</input>

<gates>
1. Migrations (applied, ordered, reversible?)
2. Feature flags (per-env state correct?)
3. Config / secrets (all vars present in prod?)
4. Monitoring (error rate, latency, business metrics armed?)
5. Rollback (exact command or procedure)
6. Upstream dependencies (verified?)
7. Do-not-ship conditions
</gates>

<output>Ordered checklist with pass/fail column. Do-not-ship items bolded.</output>`,
      perplexity:"(Use ChatGPT or Claude for release checklists)"
    }
  },
  {
    id:202,emoji:"📋",title:"Postmortem Skeleton",sub:"Turn an incident into a learning document in 20 minutes",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-orange)",
    notes:"Pairs with L99 prompts. This one focuses on writing the incident doc from raw notes. Run within 48 hours of any significant incident while memory is fresh.",
    versions:{
      chatgpt:`Write a postmortem from these incident notes.

Incident summary: [DESCRIBE]
Timeline (rough): [DESCRIBE SEQUENCE OF EVENTS]
Impact: [USERS AFFECTED / DURATION / SEVERITY]
What was changed before the incident: [DESCRIBE]
How it was resolved: [DESCRIBE]

Structure the postmortem as:
1. Impact summary (one paragraph — who was affected, for how long, severity)
2. Timeline (chronological, marked with detection / response / resolution milestones)
3. Root cause (the single deepest cause — not the symptom)
4. Contributing factors (what made the root cause possible or harder to catch)
5. What changed (verified list of changes that preceded the incident)
6. Three structural fixes:
   - One code/architecture fix
   - One process fix
   - One monitoring/alerting fix
7. Action items (owner, deadline, done-when)

Rules:
- No blame language
- Separate root cause from contributing factors
- Action items must be specific and assignable`,
      claude:`<role>Postmortem writer. Blame-free, structured, actionable.</role>

<objective>Turn incident notes into a postmortem document for [INCIDENT].</objective>

<input>
Summary: [DESCRIBE]
Timeline: [DESCRIBE]
Impact: [DESCRIBE]
Pre-incident changes: [DESCRIBE]
Resolution: [DESCRIBE]
</input>

<structure>
1. Impact summary
2. Timeline (detection / response / resolution milestones)
3. Root cause (single deepest cause)
4. Contributing factors
5. What changed (verified)
6. Three structural fixes (code / process / monitoring)
7. Action items (owner, deadline, done-when)
</structure>`,
      perplexity:"(Use ChatGPT or Claude for postmortem writing)"
    }
  },
  {
    id:203,emoji:"🔁",title:"Dependency Upgrade Planner",sub:"Upgrade library versions without breaking production",
    cat:"shipping",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Run before any major dependency upgrade. Catches breaking changes, migration steps, and test coverage gaps before the PR is opened.",
    versions:{
      chatgpt:`Plan a safe dependency upgrade for this stack.

Package to upgrade: [NAME]
Current version: [VERSION]
Target version: [VERSION]
Repo: [DESCRIBE]

Produce:
1. Breaking changes — what changed in the API between versions?
2. Migration steps — ordered list of code changes required
3. Test coverage gap — which tests must be added or updated to catch regressions?
4. Risk rating: low / medium / high based on how central this package is
5. Rollback plan if the upgrade causes a production regression
6. Packages that depend on this package and may also need upgrading

Rules:
- Source the breaking changes from the official changelog or migration guide, not assumptions
- Flag any breaking change that cannot be automatically codemoded`,
      claude:`<role>Dependency upgrade planner. Safe migrations, not fast ones.</role>

<objective>Plan a safe upgrade of [PACKAGE] from [v_FROM] to [v_TO] in [REPO].</objective>

<output>
1. Breaking changes (sourced from changelog)
2. Migration steps (ordered)
3. Test gaps to fill
4. Risk rating (low/medium/high)
5. Rollback plan
6. Downstream packages that may also need upgrading
</output>`,
      perplexity:`What are the breaking changes between [PACKAGE] v[FROM] and v[TO]?\n\nInclude: migration guide link, deprecated APIs, required code changes, and any known ecosystem packages that also need updating.`
    }
  },

  // ── ULTRATHINK ────────────────────────────────────────────────────────────
  {
    id:204,emoji:"🧠",title:"Repo Ultrathink Audit",sub:"Deepest structural risk in the codebase — one high-effort pass",
    cat:"ultrathink",platforms:["claude","chatgpt"],
    card_accent:"var(--primary)",
    notes:"Add the word 'ultrathink' anywhere in this prompt when using Claude Code 2.1.68+ — it sets per-turn effort to high on Opus 4.6 / Sonnet 4.6, triggering deeper reasoning. Do NOT use for simple questions. Use once per session on the hardest problem.",
    versions:{
      claude:`ultrathink

Run a single high-effort structural audit of this repo.

Repo: [NAME]
Stack: [STACK]
Context:
[PASTE KEY FILES OR ARCHITECTURE SUMMARY]

Find the deepest risks — not surface-level linting issues, but structural problems:

1. Architecture — what is the implicit contract no one has written down? Where does the architecture break under load or feature growth?
2. Cross-cutting concerns — how are auth, error handling, logging, and observability handled? Are they handled consistently or ad-hoc per file?
3. Brittleness — what is the single component that, if it breaks, takes everything else down?
4. Boundaries — where are the integration points that could drift silently (feature flags, external APIs, queue contracts)?
5. Debt vs risk — separate: debt I can carry vs debt that is an active liability

Return:
1. Top 2 "if this breaks, everything breaks" risks
2. The one implicit contract that should be made explicit right now
3. Ordered list of structural improvements with blast radius per improvement`,
      chatgpt:`Run a deep structural audit of this codebase. Prioritize depth over breadth — I want the 2-3 things that matter most, not a 20-item checklist.

Repo: [NAME]
Stack: [STACK]
Context: [PASTE ARCHITECTURE SUMMARY OR KEY FILES]

Focus on:
1. The implicit contract no one has written down
2. The most brittle single point of failure
3. Cross-cutting concerns handled inconsistently (auth / errors / logging)
4. Integration point drift (feature flags, queues, external APIs)
5. Debt that is an active liability vs debt I can safely carry

Return: 2 critical structural risks + the one thing to make explicit now + ordered improvement list with blast radius`,
      perplexity:"(Use Claude or ChatGPT for deep repo audits — needs codebase context)"
    }
  },
  {
    id:205,emoji:"🔬",title:"Bug Ultrathink",sub:"Reconstruct the full causal chain for a hard-to-trace bug",
    cat:"ultrathink",platforms:["claude","chatgpt"],
    card_accent:"var(--accent-red)",
    notes:"Use 'ultrathink' in Claude Code for per-turn high-effort reasoning. For bugs that survive normal debugging — not for obvious errors. Takes logs + symptoms and reasons deeply about causality.",
    versions:{
      claude:`ultrathink

Reconstruct the causal chain for this bug. I have not been able to reproduce it reliably.

Symptoms:
[DESCRIBE WHAT THE USER SEES]

Logs / stack trace:
[PASTE]

Recent changes:
[LIST COMMITS OR CHANGES IN THE LAST 7 DAYS]

Environment where it occurs:
[DESCRIBE — prod only? specific user? specific data state?]

Reason through:
1. What is the most likely causal chain from root event to symptom?
2. What are 2 alternative causal chains I should rule out first?
3. For each hypothesis: what is the minimum evidence needed to confirm or falsify it?
4. What is the cheapest instrumentation I can add to narrow it down?
5. What condition makes this bug intermittent rather than deterministic?

Return: Ranked hypotheses with confirmation experiment per hypothesis`,
      chatgpt:`Deep-reason through this hard-to-trace bug. Do not jump to solutions — reconstruct the causal chain first.

Symptoms: [DESCRIBE]
Logs: [PASTE]
Recent changes: [LIST]
Environment pattern: [DESCRIBE]

Reason through:
1. Most likely causal chain (root → propagation → symptom)
2. Two alternative chains to rule out
3. Minimum evidence to confirm each hypothesis
4. Cheapest instrumentation to narrow it down
5. Why is this intermittent?

Return: Ranked hypothesis list with evidence needed + cheapest experiment per hypothesis`,
      perplexity:"(Use Claude or ChatGPT for deep bug reasoning)"
    }
  },
  {
    id:206,emoji:"⚖️",title:"Decision Ultrathink",sub:"High-effort one-turn pass on a hard irreversible call",
    cat:"ultrathink",platforms:["claude","chatgpt"],
    card_accent:"var(--accent-purple)",
    notes:"Use for decisions with significant downside asymmetry — architecture choices, key hires, pricing pivots. 'ultrathink' keyword triggers high-effort reasoning in Claude Code. Not for daily decisions.",
    versions:{
      claude:`ultrathink

I need a high-effort pass on this decision before I commit.

Decision: [DESCRIBE EXACTLY WHAT I AM CHOOSING]
Context: [RELEVANT BACKGROUND]
Constraints: [TIME / RESOURCES / REVERSIBILITY]
My current leaning: [DESCRIBE]

Run this as:
1. Frame 1 — the conventional view: what does standard industry practice suggest?
2. Frame 2 — the contrarian view: what would a smart person who disagrees with Frame 1 argue?
3. Frame 3 — the first-principles view: ignoring convention, what do the irreducible facts support?
4. Decision matrix: score each option across speed, reversibility, blast-radius-if-wrong, and alignment-with-core-goal
5. Blindspot audit: what am I not seeing because of my current leaning?
6. How-I'll-know-I'm-wrong: one falsifiable signal per option that would tell me in real time this was a mistake

Return: Verdict with explicit rationale, dissenting case, and the falsification signal`,
      chatgpt:`Give this decision a deep multi-frame analysis before I commit.

Decision: [DESCRIBE]
Context: [DESCRIBE]
My leaning: [DESCRIBE]

Three frames:
1. Conventional: what does standard practice say?
2. Contrarian: what does a smart disagreer argue?
3. First-principles: what do the irreducible facts say, ignoring convention?

Then:
- Decision matrix (speed / reversibility / blast-radius / goal-alignment)
- Blindspot audit on my current leaning
- One falsification signal per option

Return: Verdict + dissenting case + how I'll know I'm wrong`,
      perplexity:"(Use Claude or ChatGPT for high-effort decision analysis)"
    }
  },
  {
    id:207,emoji:"🌊",title:"System Design Ultrathink",sub:"One-turn deep architecture design with full tradeoff mapping",
    cat:"ultrathink",platforms:["claude","chatgpt"],
    card_accent:"var(--accent-blue)",
    notes:"Use when designing a new subsystem, service, or data model that will be load-bearing for years. 'ultrathink' in Claude Code triggers high-effort per-turn reasoning. Not for small changes.",
    versions:{
      claude:`ultrathink

Design this system or subsystem with full tradeoff mapping. Do not optimize for the fast answer.

What I am designing: [DESCRIBE]
Constraints: [SCALE / LATENCY / CONSISTENCY / TEAM SIZE / EXISTING STACK]
Non-negotiables: [LIST]
What I am willing to trade: [LIST]

Produce:
1. Option A — the conventional design: describe architecture, data model, integration points, failure modes
2. Option B — the minimal design: the simplest version that is still production-ready
3. Option C — the scalable design: what you would build if you expected 10x usage in year 2
4. Tradeoff table: operational complexity / scalability / reversibility / time-to-build per option
5. Recommended option with rationale
6. The three questions I must answer before starting implementation`,
      chatgpt:`Design this system with full tradeoff mapping. Depth over speed.

Designing: [DESCRIBE]
Constraints: [DESCRIBE]
Non-negotiables: [LIST]
Trade-offs I will accept: [LIST]

Produce three designs:
1. Conventional — standard industry approach
2. Minimal — simplest production-ready version
3. Scalable — designed for 10x in year 2

Tradeoff table per option: complexity / scalability / reversibility / build-time
Recommendation + rationale
Three questions to answer before implementation starts`,
      perplexity:"(Use Claude or ChatGPT for system design)"
    }
  },

  // ── SKILLS ────────────────────────────────────────────────────────────────
  {
    id:208,emoji:"📐",title:"Skill Design Brief",sub:"Define a SKILL.md before you write a single line",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Run before authoring any Agent Skill. SKILL.md requires name (lowercase, hyphens, max 64 chars) and description. Spec recommends under 500 lines / 5,000 tokens. This prompt designs the brief before the file is written.",
    versions:{
      chatgpt:`Design a SKILL.md brief before I write the file.

Problem area: [DESCRIBE WHAT THIS SKILL WILL DO]
Target agent frameworks: [Claude Code / Codex CLI / Cursor / other]
Who uses it: [DEVELOPER / FOUNDER / SUPPORT / OTHER]

Produce:
1. Skill name — lowercase, hyphens only, max 64 chars, clear and specific
2. Description — one sentence, max 64 chars, agent-readable trigger phrase
3. Scope — what this skill does in 3 bullets
4. Non-goals — what this skill explicitly does NOT do
5. Progressive disclosure plan:
   - What goes in SKILL.md core (loaded every time)
   - What goes in referenced sub-files (loaded on demand)
6. Tool or permission requirements
7. Safety notes — what should this skill never do?

Return: Brief ready to hand to a SKILL.md author`,
      claude:`<role>Skill design architect. Brief first, file second.</role>

<objective>Design a SKILL.md brief for [PROBLEM AREA].</objective>

<input>Problem: [DESCRIBE]. Frameworks: [LIST]. Users: [DESCRIBE].</input>

<output>
1. Skill name (lowercase-hyphens, ≤64 chars)
2. Description (≤64 chars, trigger-phrase quality)
3. Scope (3 bullets)
4. Non-goals
5. Progressive disclosure plan (core vs referenced)
6. Tool/permission requirements
7. Safety notes
</output>`,
      perplexity:"(Use ChatGPT or Claude for skill design)"
    }
  },
  {
    id:209,emoji:"📄",title:"SKILL.md Generator",sub:"Write a compliant SKILL.md from a brief",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Takes the output of Skill Design Brief and emits a spec-compliant SKILL.md. Keeps body under 500 lines. Adds progressive disclosure hooks for heavy sub-files.",
    versions:{
      chatgpt:`Write a compliant SKILL.md from this brief.

Brief:
[PASTE SKILL DESIGN BRIEF OUTPUT]

Requirements:
- YAML frontmatter: name, description, version (1.0.0), tags array
- Body under 500 lines / 5,000 tokens
- Clear role and objective sections
- Instructions written for an AI agent, not a human
- Progressive disclosure: if any section would push over 300 lines, reference a sub-file instead
- Safety notes section at the end
- Trigger examples: 2-3 example phrases that should cause an agent to load this skill

Format the output as a code block I can copy directly to SKILL.md`,
      claude:`<role>SKILL.md author. Spec-compliant, token-efficient, agent-readable.</role>

<objective>Write a production-ready SKILL.md from this brief.</objective>

<input>[PASTE BRIEF]</input>

<requirements>
- YAML frontmatter: name, description, version, tags
- Body ≤500 lines, ≤5,000 tokens
- Role + objective sections
- Written for AI agent, not human
- Progressive disclosure: heavy sections → reference sub-files
- Safety notes
- 2-3 trigger phrases
</requirements>

<output>Full SKILL.md as a copyable code block.</output>`,
      perplexity:"(Use ChatGPT or Claude for SKILL.md generation)"
    }
  },
  {
    id:210,emoji:"🔍",title:"Skill Linter",sub:"Audit a SKILL.md for spec compliance and quality",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run before publishing any skill. Checks spec compliance, token budget, injection risk, and trigger quality.",
    versions:{
      chatgpt:`Audit this SKILL.md for spec compliance and quality issues.

SKILL.md:
[PASTE FILE]

Check:
1. YAML frontmatter — are name, description, version, and tags present and correctly formatted?
2. Name — lowercase, hyphens only, max 64 chars?
3. Description — agent-trigger-quality? Under 64 chars?
4. Body size — estimate token count. Over 5,000? Flag sections to move to sub-files.
5. Ambiguity — are any instructions unclear to an AI agent without human context?
6. Prompt injection risk — does any section allow user input to override core instructions?
7. Scope creep — does the skill try to do more than one thing?
8. Safety — is there a clear statement of what the skill should never do?
9. Trigger quality — would the description reliably cause an agent to load this skill at the right moment?

Return: Issue list with severity (critical / warning / info) + corrected version of each flagged item`,
      claude:`<role>SKILL.md linter. Spec compliance and quality auditor.</role>

<objective>Audit this SKILL.md and return every issue with severity and fix.</objective>

<input>[PASTE SKILL.MD]</input>

<checks>
1. YAML frontmatter completeness
2. Name format (lowercase-hyphens, ≤64 chars)
3. Description trigger quality (≤64 chars)
4. Token budget (flag if >5,000)
5. Instruction ambiguity
6. Prompt injection risk
7. Scope creep
8. Safety statement
9. Trigger reliability
</checks>

<output>Issue list (critical/warning/info) + corrected item per finding.</output>`,
      perplexity:"(Use ChatGPT or Claude for skill linting)"
    }
  },
  {
    id:211,emoji:"🧬",title:"Skill Evolution Planner",sub:"Version your skill based on usage signals and feedback",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Run when a skill has been deployed and used for at least 30 days. Keeps skills from becoming stale or bloated.",
    versions:{
      chatgpt:`Plan the next version of this skill based on usage signals.

Current SKILL.md:
[PASTE]

Usage signals / feedback:
[DESCRIBE — e.g. 'agents often ask for clarification on X', 'the skill fires too broadly', 'users say step 3 is confusing']

Produce:
1. Changelog from v[CURRENT] to v[NEXT] — what changes and why
2. Instructions to deprecate — what is no longer needed?
3. New examples or trigger phrases to add
4. Sections to move to progressive disclosure sub-files (if body is growing)
5. Safety notes to strengthen based on observed misuse
6. Updated SKILL.md body (changes only — do not rewrite what is not changing)`,
      claude:`<role>Skill evolution planner. Improve based on evidence, not instinct.</role>

<objective>Plan the next version of [SKILL NAME] from [vCURRENT] to [vNEXT].</objective>

<input>Current SKILL.md: [PASTE]. Usage signals: [DESCRIBE].</input>

<output>
1. Changelog (what changes and why)
2. Deprecated instructions
3. New trigger phrases or examples
4. Progressive disclosure candidates
5. Strengthened safety notes
6. Updated SKILL.md delta (changes only)
</output>`,
      perplexity:"(Use ChatGPT or Claude for skill evolution)"
    }
  },
  {
    id:212,emoji:"🗺️",title:"Skill Catalog Mapper",sub:"Map your repo's implicit behaviors into named skills",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Run on any repo that uses AI agents but has not yet formalized its skills. Extracts implicit repeatable agent behaviors from AGENTS.md, comments, and existing prompts and proposes them as named skills.",
    versions:{
      chatgpt:`Map implicit agent behaviors in this repo into named skills.

Repo context:
[PASTE AGENTS.MD / SYSTEM PROMPT / AI USAGE NOTES]

Look for:
1. Repeatable tasks an agent is asked to do more than once (e.g. "classify CI failure", "verify release truth")
2. Domain-specific knowledge the agent needs that is not in the base model (e.g. your deploy process, your stack quirks)
3. Safety rules that apply to every agent interaction in this repo
4. Output formats or conventions the agent must follow consistently

For each identified skill:
- Proposed skill name (lowercase-hyphens)
- One-sentence description
- Trigger: when should an agent load this skill?
- Core instructions (3-5 bullets)
- Priority: should this be built first?

Return: Skill catalog sorted by priority`,
      claude:`<role>Skill catalog mapper. Find implicit skills before formalizing them.</role>

<objective>Extract implicit repeatable agent behaviors from [REPO] and propose them as named skills.</objective>

<input>[PASTE AGENTS.MD OR SYSTEM CONTEXT]</input>

<look_for>
1. Repeatable agent tasks
2. Domain-specific repo knowledge
3. Universal safety rules
4. Required output conventions
</look_for>

<output>Skill catalog: name | description | trigger | core instructions | priority — sorted by priority.</output>`,
      perplexity:"(Use ChatGPT or Claude for skill catalog mapping)"
    }
  },
  {
    id:213,emoji:"🤖",title:"Known Skills Bootstrap",sub:"Write the skills block for your AGENTS.md",
    cat:"skills",platforms:["chatgpt","claude"],
    card_accent:"var(--primary)",
    notes:"Run after Skill Catalog Mapper. Produces the 'known skills' section of AGENTS.md so every agent that reads it knows which skills to load and when.",
    versions:{
      chatgpt:`Write the known-skills section of my AGENTS.md from this skill catalog.

Skill catalog:
[PASTE OUTPUT OF SKILL CATALOG MAPPER]

Format each skill as:
### [skill-name]
- **File:** ./skills/[skill-name]/SKILL.md
- **Load when:** [trigger phrase — what the user says or what the task type is]
- **Do not load when:** [anti-trigger — when NOT to use this skill]
- **Core capability:** [one sentence]
- **Safety boundary:** [one sentence — what it must never do]

Return: Complete known-skills section ready to paste into AGENTS.md`,
      claude:`<role>AGENTS.md author. Known-skills section writer.</role>

<objective>Write the known-skills section for AGENTS.md from [SKILL CATALOG].</objective>

<input>[PASTE CATALOG]</input>

<format_per_skill>
### skill-name
- File: ./skills/skill-name/SKILL.md
- Load when: [trigger]
- Do not load when: [anti-trigger]
- Core capability: [one sentence]
- Safety boundary: [one sentence]
</format_per_skill>

<output>Complete known-skills section, paste-ready for AGENTS.md.</output>`,
      perplexity:"(Use ChatGPT or Claude for AGENTS.md authoring)"
    }
  },

  // ── AGENT DEBUG ───────────────────────────────────────────────────────────
  {
    id:214,emoji:"🪲",title:"Agent Run Debrief",sub:"Diagnose where the agent deviated from instructions",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run after any agent run that produced unexpected output, skipped steps, or called the wrong tools. The most important input is the agent's tool call log.",
    versions:{
      chatgpt:`Debrief this agent run and diagnose what went wrong.

User objective: [WHAT THE USER ASKED THE AGENT TO DO]
Agent run log (tool calls, errors, warnings):
[PASTE LOG]
Actual output: [DESCRIBE OR PASTE]
Expected output: [DESCRIBE]

Diagnose:
1. Where did the agent deviate from the user's intent?
2. Which tool calls were incorrect, unnecessary, or in the wrong order?
3. What context was missing that caused the deviation?
4. Was this a system prompt failure, a skill gap, or a model reasoning error?
5. What is the one change to the system prompt or skill that would prevent this in the next run?

Return: Deviation map + root cause classification + one fix`,
      claude:`<role>Agent run debrief analyst. Find the deviation before changing the system prompt.</role>

<objective>Diagnose why the agent deviated from [OBJECTIVE] in this run.</objective>

<input>
Objective: [DESCRIBE]
Log: [PASTE]
Expected: [DESCRIBE]
Actual: [DESCRIBE]
</input>

<diagnose>
1. Deviation points in the run
2. Incorrect tool calls
3. Missing context
4. Root cause class: system-prompt-failure / skill-gap / reasoning-error
5. One fix
</diagnose>`,
      perplexity:"(Use ChatGPT or Claude for agent run debriefs)"
    }
  },
  {
    id:215,emoji:"🔧",title:"Tool Use Sanity Check",sub:"Verify function-calling output before it executes",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-orange)",
    notes:"Run when reviewing agent tool call output before it is executed on a real system. Catches argument errors, schema mismatches, and unintended destructive operations.",
    versions:{
      chatgpt:`Sanity check these tool calls before execution.

Tool schema:
[PASTE OPENAPI / FUNCTION DEFINITION]

Tool call output from agent:
[PASTE TOOL CALLS]

User intent:
[DESCRIBE WHAT THE USER ACTUALLY WANTED]

Check each call:
1. Do arguments match the schema? Are required fields present and correctly typed?
2. Does the call match the user's actual intent?
3. Is there any destructive operation (delete, overwrite, send) that was not explicitly requested?
4. Is there any secret, credential, or PII being passed that should not be?
5. Is the call order correct?

Return: Pass / warn / block per call with exact issue and suggested correction`,
      claude:`<role>Tool call safety auditor. Verify before execute.</role>

<objective>Sanity check these agent tool calls against the schema and user intent.</objective>

<input>
Schema: [PASTE]
Tool calls: [PASTE]
User intent: [DESCRIBE]
</input>

<checks>
1. Argument schema compliance
2. Intent match
3. Unintended destructive operations
4. Credential / PII leakage
5. Call order correctness
</checks>

<output>Pass / warn / block per call + exact issue + correction.</output>`,
      perplexity:"(Use ChatGPT or Claude for tool call auditing)"
    }
  },
  {
    id:216,emoji:"📊",title:"Eval Scenario Generator",sub:"Build a test suite for any agent skill or system prompt",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Run before deploying any new skill or system prompt change. Produces a structured eval set with rubrics so you can measure quality regressions.",
    versions:{
      chatgpt:`Generate an evaluation scenario set for this agent skill or system prompt.

Skill / System prompt:
[PASTE]

Objective of the skill:
[DESCRIBE WHAT IT IS SUPPOSED TO DO]

Generate for each scenario type:
1. Happy path — the ideal input where the skill should perform perfectly
2. Edge case — an unusual but valid input that should still work
3. Failure mode — a noisy, incomplete, or adversarial input

For each scenario:
- Input: [exact prompt or user message to test with]
- Expected output: [what the agent should return]
- Rubric: [how to score this 1-5, what makes it pass or fail]
- Regression marker: [one word or phrase that must appear in a passing response]

Return: 9 scenarios (3 per type) + rubric table`,
      claude:`<role>Agent eval scenario generator. Test suites before deployment.</role>

<objective>Generate 9 eval scenarios (happy / edge / failure) for [SKILL/PROMPT].</objective>

<input>Skill: [PASTE]. Objective: [DESCRIBE].</input>

<per_scenario>
- Input (exact test prompt)
- Expected output
- Rubric (1-5 scale, pass/fail criteria)
- Regression marker (word/phrase that must appear)
</per_scenario>

<output>9 scenarios in a structured table + rubric.</output>`,
      perplexity:"(Use ChatGPT or Claude for eval generation)"
    }
  },
  {
    id:217,emoji:"🛡️",title:"Agent Safety Redteam",sub:"Attack your own system prompt before users do",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run before any public-facing AI feature. Finds jailbreak paths, data exfiltration vectors, and instruction override vulnerabilities that are invisible from the author's perspective.",
    versions:{
      chatgpt:`Redteam this agent's system prompt for safety vulnerabilities.

System prompt:
[PASTE]

Agent context: [WHAT THE AGENT HAS ACCESS TO — tools, data, APIs]

Attack vectors to check:
1. Jailbreak paths — can user phrasing override core instructions?
2. Role confusion — can the user convince the agent it has a different identity or purpose?
3. Data exfiltration — can the agent be prompted to return system prompt contents or internal data?
4. Privilege escalation — can the user get the agent to call tools it should not call?
5. Injection via tool output — if an external API returns adversarial content, can it override instructions?
6. Scope creep — can the user get the agent to perform tasks outside its defined scope?

For each vulnerability:
- Attack example (exact prompt that would exploit it)
- Severity: critical / medium / low
- Hardened fix (exact instruction change)

Return: Vulnerability list + hardened system prompt`,
      claude:`<role>Agent safety redteamer. Find every attack vector before users do.</role>

<objective>Redteam [AGENT]'s system prompt for jailbreaks, exfiltration, and privilege escalation.</objective>

<input>System prompt: [PASTE]. Agent context: [DESCRIBE].</input>

<attack_vectors>
1. Jailbreak paths
2. Role confusion
3. Data exfiltration
4. Privilege escalation
5. Tool output injection
6. Scope creep
</attack_vectors>

<output>Each finding: attack example + severity + hardened fix. Return full hardened system prompt.</output>`,
      perplexity:"(Use ChatGPT or Claude for agent safety redteam)"
    }
  },
  {
    id:218,emoji:"🔎",title:"Context Window Audit",sub:"Is your agent's context too bloated to reason well?",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Long context degrades reasoning quality. Run when an agent is producing inconsistent or shallow outputs despite a good system prompt. Identifies what is consuming context budget unnecessarily.",
    versions:{
      chatgpt:`Audit this agent's context window for bloat that degrades reasoning.

System prompt + skills loaded:
[PASTE]

Conversation history length: [APPROXIMATE TOKENS]
Tools / function schemas loaded: [LIST]

Audit:
1. What is taking the most tokens in the context that is NOT load-bearing for the current task?
2. Are there skill files or instructions being loaded that are not relevant to this task?
3. Is conversation history being injected beyond what is needed for continuity?
4. Are any tool schemas unnecessarily verbose?
5. What is the minimum context needed to complete this task at high quality?

Return: Bloat map (component | tokens | necessary? | can remove?) + lean context recommendation`,
      claude:`<role>Context window auditor. Lean context = better reasoning.</role>

<objective>Find and remove unnecessary context bloat for [AGENT] on [TASK].</objective>

<input>System prompt + skills: [PASTE]. History size: [TOKENS]. Tools: [LIST].</input>

<audit>
1. Non-load-bearing content by token weight
2. Off-task skills loaded
3. Unnecessary history injection
4. Verbose tool schemas
5. Minimum viable context for this task
</audit>

<output>Bloat map (component | tokens | necessary | removable) + lean context spec.</output>`,
      perplexity:"(Use ChatGPT or Claude for context auditing)"
    }
  },
  {
    id:219,emoji:"📡",title:"Agent Monitoring Setup",sub:"Define what to watch so silent agent failures surface fast",
    cat:"agent-debug",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Most agent failures are silent — no exception is thrown, but the output is wrong or incomplete. Run this to define a monitoring layer before any agent goes to production.",
    versions:{
      chatgpt:`Design a monitoring setup for this production agent.

Agent: [DESCRIBE WHAT IT DOES]
Stack: [RUNTIME / FRAMEWORK / HOSTING]
Tools it calls: [LIST]
Output format: [DESCRIBE EXPECTED OUTPUT]

Define:
1. Success signal — what is the observable indicator that this agent completed its task correctly?
2. Failure signals — list 5 silent failure patterns specific to this agent (not just exceptions)
3. Logging schema — what fields to log on every run (input hash, output hash, tools called, latency, model used, error if any)
4. Alerting thresholds — at what rate of silent failures should an alert fire?
5. Human review trigger — what output pattern should escalate to a human instead of auto-completing?
6. Regression test hook — what automated check can run after each deploy to verify the agent still behaves correctly?

Return: Monitoring spec ready to implement`,
      claude:`<role>Agent monitoring designer. Make silent failures visible before they compound.</role>

<objective>Design the monitoring layer for [AGENT] in production.</objective>

<input>Agent: [DESCRIBE]. Stack: [DESCRIBE]. Tools: [LIST]. Expected output: [DESCRIBE].</input>

<output>
1. Success signal definition
2. Five silent failure patterns
3. Logging schema (fields per run)
4. Alert thresholds
5. Human escalation triggers
6. Post-deploy regression test hook
</output>`,
      perplexity:"(Use ChatGPT or Claude for agent monitoring design)"
    }
  }

];
if(typeof PROMPTS!=='undefined'){
  PROMPTS.push(...NP);
  if(typeof renderLibrary==='function')renderLibrary();
  else if(typeof render==='function')render();
  console.log('[PromptOS patch p07] +'+NP.length+' prompts. Total:',PROMPTS.length);
}
})();
