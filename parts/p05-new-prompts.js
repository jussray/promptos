/* ── NEW PROMPTS PATCH — IDs 160-179 ─────────────────────────────────────────
   Paste this <script> block at the end of index.html, just before </body>.
   It pushes into the existing PROMPTS array and re-renders the library.
─────────────────────────────────────────────────────────────────────────── */
(function(){
const NP = [

  // ── OODA ──────────────────────────────────────────────────────────────────
  {
    id:160,emoji:"🔄",title:"OODA Loop Sprint",sub:"Observe → Orient → Decide → Act on any blocker",
    cat:"ooda",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Run when you are stuck, spinning, or about to make a big call without full situational awareness. Forces the loop explicitly.",
    versions:{
      chatgpt:`Run a full OODA loop on the current situation.

OBSERVE:
[Paste your current evidence — logs, signals, user feedback, data, repo state]

ORIENT:
- What mental models apply here?
- What biases might I be carrying?
- What am I not seeing?

DECIDE:
- What is the decision space? List options.
- Which option has the smallest blast radius if wrong?

ACT:
- What is the exact next action?
- What is the signal I will check after acting to confirm I am right?

Rules:
- Do not merge Observe and Orient
- Do not skip directly to Act
- If evidence is thin, say so — do not fill gaps with assumption

Return: Situation read → Oriented model → Decision options ranked → Exact next action`,
      claude:`<role>
Strategic decision operator. Run the OODA loop explicitly.
Do not skip layers. Do not fill evidence gaps with assumption.
</role>

<objective>Run a full OODA loop on the situation and return a ranked decision and exact next action.</objective>

<observe>[paste current signals / evidence / repo state / logs]</observe>

<instructions>
1. OBSERVE: restate what is actually known vs inferred.
2. ORIENT: what mental models apply? what am I missing? what biases are present?
3. DECIDE: list the 2-3 realistic options, ranked by speed times reversibility.
4. ACT: give the single next action and the confirmation signal after.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for OODA — needs structured reasoning, not live search)"
    }
  },
  {
    id:161,emoji:"🎯",title:"OODA Debrief",sub:"Post-action loop review",
    cat:"ooda",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Run after any significant decision that played out — win or loss. Closes the loop so the next cycle starts cleaner.",
    versions:{
      chatgpt:`Run an OODA debrief on a completed action cycle.

Action taken: [DESCRIBE]
Outcome: [DESCRIBE]
Expected outcome: [DESCRIBE]

Debrief:
1. What signal did I observe that I missed or misread?
2. Where did my orientation model fail?
3. Was the decision the right one given the info I had at the time?
4. What do I change in the next cycle?

Rules:
- Do not rewrite history — evaluate the decision on the info available then, not now
- Flag every assumption that turned out wrong
- Give one concrete update to my mental model

Return: Model update → Decision rule → Next cycle setup`,
      claude:`<role>OODA debrief analyst. Honest post-action loop review.</role>

<objective>Close the OODA loop by diagnosing what was seen, oriented, decided, and acted — and what must change.</objective>

<input>
Action: [DESCRIBE]
Expected: [DESCRIBE]
Actual: [DESCRIBE]
</input>

<instructions>
1. What signal was missed or misread in Observe?
2. What orientation failure occurred?
3. Was the decision correct given the info available at the time?
4. Give one concrete mental model update.
5. Set up the next loop's observe checklist.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for OODA debriefs)"
    }
  },
  {
    id:162,emoji:"🏔️",title:"OODA Orientation Audit",sub:"Surface hidden biases before a big call",
    cat:"ooda",platforms:["chatgpt","claude"],
    card_accent:"var(--primary)",
    notes:"Use before any irreversible decision — hiring, shipping, pricing, architecture. Forces the Orientation layer which most loops skip.",
    versions:{
      chatgpt:`Audit my orientation before I make this decision.

Decision I am about to make: [DESCRIBE]

Audit for:
1. Confirmation bias — am I only seeing evidence that supports my preferred path?
2. Availability bias — am I overweighting recent events?
3. Sunk cost — am I continuing because I have invested, not because it is right?
4. Anchor — is my first framing of the problem distorting the options?
5. Speed pressure — am I deciding too fast to avoid discomfort, not because I have clarity?

Return:
1. Identified biases and their strength
2. Evidence I should seek before deciding
3. Go / hold / kill recommendation with rationale`,
      claude:`<role>Orientation auditor. Find every bias before the decision is made.</role>

<objective>Surface the cognitive distortions warping the orientation layer before [DECISION].</objective>

<input>Decision: [DESCRIBE]. Evidence so far: [DESCRIBE].</input>

<instructions>
1. Confirmation bias check.
2. Availability bias check.
3. Sunk cost check.
4. Anchoring check.
5. Speed pressure check.
6. List missing evidence.
7. Go / hold / kill verdict.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for orientation audits)"
    }
  },

  // ── LINDY ──────────────────────────────────────────────────────────────────
  {
    id:163,emoji:"⏳",title:"Lindy Filter",sub:"Will this last? Durability test for any decision",
    cat:"lindy",platforms:["chatgpt","claude","perplexity"],
    card_accent:"var(--accent-yellow)",
    notes:"The Lindy Effect: things that have survived longer are likely to survive longer. Apply before adopting any new tool, framework, vendor, or strategy.",
    versions:{
      chatgpt:`Apply the Lindy Filter to this option.

Option: [TOOL / FRAMEWORK / STRATEGY / VENDOR / DECISION]

Test:
1. How long has this existed? What survived the last 5 years in this category?
2. Is the option getting more or less central over time?
3. What would kill it — platform change, regulation, market shift, key-person risk?
4. What is the older, more established alternative I would be giving up?
5. Am I choosing this because it is genuinely better or because it is newer and louder?

Return:
1. Lindy score (estimated decades of likely survival)
2. Kill scenarios ranked by probability
3. Verdict: adopt / test carefully / avoid`,
      claude:`<role>Lindy analyst. Durability over novelty.</role>

<objective>Test whether [OPTION] passes the Lindy Filter before I adopt it.</objective>

<input>Option: [DESCRIBE]. Context: [MY USE CASE].</input>

<instructions>
1. Age and survival history of this option.
2. Trajectory: more or less central over time?
3. Kill scenarios (platform, regulation, key-person, market).
4. Older alternative I would replace.
5. Am I being seduced by novelty?
6. Lindy score (estimated decades) and verdict: adopt / test / avoid.
</instructions>`,
      perplexity:`What is the track record and long-term durability of [OPTION] in [CATEGORY]?

Has it survived previous technology cycles? What typically kills options in this category?
Is adoption accelerating or consolidating? What are the oldest and most battle-tested alternatives?`
    }
  },
  {
    id:164,emoji:"🪨",title:"Lindy Stack Audit",sub:"Which parts of my stack will still be right in 10 years?",
    cat:"lindy",platforms:["chatgpt","perplexity"],
    card_accent:"var(--accent-orange)",
    notes:"Run yearly or before major vendor commitments. Flags over-reliance on novel tech that may not survive.",
    versions:{
      chatgpt:`Audit my current tech stack for Lindy durability.

Stack:
[LIST YOUR STACK — e.g. Expo, Supabase, Cloudflare Workers, TypeScript, React Native]

For each component:
1. How old is it and has it survived previous technology cycles?
2. Is it a foundational primitive or a layer that could shift?
3. What is the switching cost if it dies or pivots?
4. Is there a more Lindy alternative I should be on instead?

Return:
- Durability table (component / lindy score / risk / alternative)
- Top 2 migration considerations
- What I should NOT change (already Lindy)`,
      claude:`<role>Lindy stack auditor. Find the fragile bets before they become expensive.</role>

<objective>Audit [MY STACK] for long-term durability using the Lindy Effect lens.</objective>

<input>Stack: [LIST COMPONENTS]</input>

<instructions>
1. For each component: age, survival history, fragility, switching cost.
2. Rank by durability (most to least Lindy).
3. Flag any component with less than 5-year track record that is load-bearing.
4. Give top 2 migration priorities and what to leave alone.
</instructions>`,
      perplexity:`What is the long-term durability outlook for [STACK COMPONENT]?

Has it survived platform cycles? Who controls it? Are there open-source or more Lindy alternatives?`
    }
  },
  {
    id:165,emoji:"📜",title:"Lindy Rule Extract",sub:"What rules from the oldest practitioners still hold?",
    cat:"lindy",platforms:["chatgpt","perplexity"],
    card_accent:"var(--accent-green)",
    notes:"For founder decisions — pricing, hiring, product. Surfaces durable operating rules from people who survived long enough to matter.",
    versions:{
      chatgpt:`Extract Lindy operating rules for [DOMAIN / DECISION TYPE].

I want rules that:
- Have been observed across decades, not just recent hot takes
- Come from practitioners who survived, not just theorists
- Still hold in the current context even if the surface form has changed

Domain: [e.g. product pricing / hiring / system design / marketing]

Return:
1. Top 5 Lindy rules (with source / era when possible)
2. Rules that USED TO hold but no longer do (and why they broke)
3. One contrarian Lindy principle most people in my category ignore`,
      claude:`<role>Lindy rule extractor. Surface durable operating principles from long-surviving practitioners.</role>

<objective>Give me the operating rules for [DOMAIN] that have survived the longest and still hold.</objective>

<input>Domain: [DOMAIN]. My context: [BRIEF].</input>

<instructions>
1. Top 5 Lindy rules with origin era.
2. Rules that expired and why.
3. One contrarian principle most practitioners in this space ignore.
</instructions>`,
      perplexity:`What operating principles in [DOMAIN] have survived the longest and still hold for practitioners today?

Who are the oldest still-relevant voices in this field? What do they agree on that newer voices dismiss?`
    }
  },

  // ── L99 ──────────────────────────────────────────────────────────────────
  {
    id:166,emoji:"🗺️",title:"L99 State Map",sub:"Provenance, state, release, rollback, drift",
    cat:"l99",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"L99 = provenance + state + release + rollback + long-term drift. Run at the start of any session involving production systems.",
    versions:{
      chatgpt:`Map the current L99 state of this system before any changes.

System: [REPO / SERVICE / FEATURE]

Map:
1. Provenance — what is the verified current state? Commit, deploy, migration, and config that is live?
2. State — what data, auth state, or user state is live right now?
3. Release — what was the last intentional release? What did it change?
4. Rollback — what is the rollback path if the next change breaks something?
5. Drift — what has drifted from the intended design since last intentional review?

Rules:
- Do not describe intended state — describe verified state only
- Say "cannot verify" when evidence is missing
- Separate env (dev / staging / prod) clearly

Return: L99 state table → Drift delta → Rollback path → Safe-to-change vs needs-verification`,
      claude:`<role>
L99 state mapper. Provenance over assumption.
Only describe verified state. Say "cannot verify" when evidence is missing.
</role>

<objective>Map the L99 state of [SYSTEM] before any changes.</objective>

<input>[paste commit SHA, migration state, deploy log, config, Cloudflare status]</input>

<instructions>
1. Provenance: verified live commit, migration, and config.
2. State: live data and auth state.
3. Release: last intentional release and its changes.
4. Rollback: exact rollback path for the next change.
5. Drift: delta from intended design.
</instructions>

<output_format>
L99 table | Drift delta | Rollback path | Safe vs needs-verification
</output_format>`,
      perplexity:"(Use ChatGPT or Claude for L99 state mapping — requires private repo context)"
    }
  },
  {
    id:167,emoji:"📍",title:"L99 Release Truth",sub:"Verify what actually shipped vs what was intended",
    cat:"l99",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Run after every deploy. Closes the loop between what was merged and what is actually live. Catches silent drift before it compounds.",
    versions:{
      chatgpt:`Verify release truth for the last deploy.

What was intended to ship: [DESCRIBE PR / CHANGE]
Evidence of what actually shipped:
- GitHub Actions result: [pass / fail / infrastructure outage]
- Cloudflare build status: [pass / fail / unknown]
- Runtime test: [paste Playwright or manual test result]
- Migration state: [confirmed / pending / unknown]

Classify:
1. Full ship — all gates passed, runtime confirmed
2. Partial ship — some gates passed, runtime unconfirmed
3. Infrastructure gate failure — runner failed before meaningful steps (not a code regression)
4. Code regression — specific step failed, logs confirm

Then: what is the actual live state right now?`,
      claude:`<role>L99 release truth verifier. Separate what was intended from what is live.</role>

<objective>Verify what actually shipped in the last deploy of [SYSTEM].</objective>

<input>
Intended: [DESCRIBE]
GitHub Actions: [STATUS]
Cloudflare: [STATUS]
Runtime: [STATUS]
Migration: [STATUS]
</input>

<instructions>
1. Classify the release: full / partial / infra-failure / regression.
2. State what is verified live vs unconfirmed.
3. Give the confidence level for each component.
4. Define the next verification gate.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for release truth — requires private system context)"
    }
  },
  {
    id:168,emoji:"📉",title:"L99 Drift Audit",sub:"Find what has silently moved from the intended design",
    cat:"l99",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run quarterly or before any major feature build. Long-term drift is the hidden compound debt in any system.",
    versions:{
      chatgpt:`Run a drift audit on [SYSTEM] vs its intended design.

Intended design: [PASTE SPEC / PRD / ARCHITECTURE DECISION]
Current verified state: [PASTE CURRENT CODE / CONFIG / SCHEMA]

Find:
1. Where does the live system deviate from the intended design?
2. Which deviations are intentional improvements vs unintentional drift?
3. Which drifts create security, trust, or data integrity risk?
4. Which drifts are cosmetic and safe to ignore?

Return:
1. Drift table (component | intended | actual | intentional? | risk)
2. Top 3 drifts to resolve before next major feature
3. What to document as permanent design changes`,
      claude:`<role>L99 drift auditor. Separate intentional evolution from silent debt.</role>

<objective>Audit the drift between [SYSTEM]'s intended design and its current verified state.</objective>

<input>
Intended design: [PASTE]
Current state: [PASTE]
</input>

<instructions>
1. Build a drift table: component | intended | actual | intentional | risk level.
2. Classify each drift: intended change / silent debt / security risk / cosmetic.
3. Rank top 3 drifts to resolve next.
4. List what should be formally adopted as permanent design change.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for drift audits)"
    }
  },

  // ── SYSTEM / CHIEF AI ─────────────────────────────────────────────────────
  {
    id:169,emoji:"🧠",title:"Chief AI Session Open",sub:"Session setup for a long Claude or GPT work session",
    cat:"system",platforms:["chatgpt","claude"],
    card_accent:"var(--primary)",
    notes:"Run at the start of any multi-hour AI work session. Sets context, assigns role, and establishes the session truth hierarchy so the model does not drift.",
    versions:{
      chatgpt:`Session setup for a focused work session.

My role: Founder / solo engineer
Project: [REPO] — [BRIEF DESCRIPTION]
Session goal: [SPECIFIC GOAL FOR THIS SESSION]
Stack: [STACK]

Session rules for you:
- Audit before acting
- Do not guess — say "cannot verify" when evidence is missing
- Prefer minimal, surgical changes
- One thing at a time — no multi-part suggestions unless I ask
- Flag if the session goal has hidden prerequisites I have not addressed

Truth hierarchy for this session:
1. Evidence I paste
2. What you can verify from that evidence
3. Your general knowledge (lowest priority — flag when you are using it)

Confirm you understand and ask me for the first piece of evidence.`,
      claude:`<role>
Senior technical collaborator for a focused work session.
You operate under the founder's truth hierarchy: evidence first, then verification, then general knowledge.
Never guess. Say "cannot verify" when evidence is thin.
</role>

<objective>Run a focused session on [GOAL] for [REPO].</objective>

<context>
Founder: solo operator
Stack: [STACK]
Session type: [audit / build / debug / plan / release]
</context>

<session_rules>
- One action at a time
- Audit before acting
- Flag hidden prerequisites before proceeding
- Separate fact, inference, and assumption in every response
- No phantom completions — if you have not verified something, do not claim it is done
</session_rules>

Acknowledge these rules and ask for the first piece of evidence.`,
      perplexity:"(Use ChatGPT or Claude for session setup — Perplexity is for research, not session state)"
    }
  },
  {
    id:170,emoji:"📋",title:"Session Handoff",sub:"End-of-session summary for the next agent or session",
    cat:"system",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Run at the end of every session. Creates a handoff document that the next session, agent, or model can pick up without losing context.",
    versions:{
      chatgpt:`Write a session handoff document.

Session summary:
- What was the goal: [DESCRIBE]
- What was completed: [DESCRIBE]
- What was verified: [DESCRIBE]
- What is still open: [DESCRIBE]
- What is blocked and why: [DESCRIBE]

Format this as a handoff that:
1. States verified changes (commit / file / migration / deploy) with exact references
2. States what was NOT changed and should not be touched
3. Lists the next gate — what must be done before the next session can proceed
4. Flags any open risks or unresolved questions
5. Is readable by a fresh model with no prior context`,
      claude:`<role>Session handoff writer. Clean, evidence-backed, no assumptions.</role>

<objective>Write a handoff document for this session so the next session starts with full situational awareness.</objective>

<session_data>
Goal: [DESCRIBE]
Completed: [DESCRIBE]
Verified: [DESCRIBE]
Open: [DESCRIBE]
Blocked: [DESCRIBE]
</session_data>

<output_format>
Verified changes (with refs) | Not changed (do not touch) | Next gate | Open risks
</output_format>`,
      perplexity:"(Use ChatGPT or Claude for session handoffs)"
    }
  },
  {
    id:171,emoji:"🔐",title:"System Prompt Hardening",sub:"Make your system prompt injection-resistant",
    cat:"system",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run before deploying any system prompt to a user-facing AI feature. Finds the most exploitable gaps.",
    versions:{
      chatgpt:`Harden this system prompt against prompt injection and jailbreak attempts.

System prompt:
[PASTE SYSTEM PROMPT]

Audit for:
1. Instructions that can be overridden by user input phrasing
2. Role confusion attacks (pretend you are, ignore previous instructions)
3. Context injection via tool output or pasted user content
4. Instruction leakage (can the user extract the system prompt?)
5. Privilege escalation paths

For each finding:
- Show the attack vector
- Rate severity (critical / medium / low)
- Give exact hardened replacement text

Return: Hardened system prompt and attack surface summary`,
      claude:`<role>System prompt security auditor. Find every injection vector.</role>

<objective>Harden this system prompt against prompt injection, jailbreaks, and instruction leakage.</objective>

<input>[PASTE SYSTEM PROMPT]</input>

<instructions>
1. Find override vectors in the instruction phrasing.
2. Find role confusion attack surfaces.
3. Find context injection paths (tool output, user paste).
4. Find instruction leakage points.
5. Find privilege escalation paths.
6. Return hardened replacement for each finding.
7. Return the full hardened prompt.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for security audits)"
    }
  },

  // ── CODING (additional) ───────────────────────────────────────────────────
  {
    id:172,emoji:"🔁",title:"Refactor Scoper",sub:"Define the exact boundary before refactoring",
    cat:"coding",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"The most common refactor mistake: scope keeps expanding. Forces a hard boundary before a single line is touched.",
    versions:{
      chatgpt:`Define the exact scope of this refactor before I write any code.

What I want to improve: [DESCRIBE]
Repo: [REPO]
Affected files/modules: [LIST]

Return:
1. Exact files in scope (must touch)
2. Files that are adjacent but must NOT be touched in this refactor
3. The one core change — what is the single structural improvement?
4. Acceptance criterion — how will I know the refactor is complete without feature regression?
5. Red lines — what would mean the refactor has gone too far?`,
      claude:`<role>Refactor scope enforcer. Hard boundaries before any code is written.</role>

<objective>Define the exact scope of this refactor in [REPO] — what is in, what is out, what the acceptance criterion is.</objective>

<input>Target: [DESCRIBE]. Files: [LIST].</input>

<instructions>
1. In-scope files (must touch).
2. Out-of-scope files (do not touch).
3. The single structural improvement.
4. Acceptance criterion.
5. Red lines — when the refactor has gone too far.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for refactor scoping)"
    }
  },
  {
    id:173,emoji:"🌐",title:"API Contract Review",sub:"Validate API surface before building consumers",
    cat:"coding",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Run before building any client that consumes an API — internal or external. Catches contract mismatches before they become runtime bugs.",
    versions:{
      chatgpt:`Review this API contract before I build a consumer.

API: [NAME / URL]
Spec:
[PASTE OPENAPI / GRAPHQL SCHEMA / DESCRIPTION]

Review for:
1. Missing or ambiguous field types
2. Error response shape and status code coverage
3. Pagination contract consistency
4. Auth requirements per endpoint
5. Rate limits and retry behavior
6. Breaking change risk — will this change without a version bump?

Return:
1. Contract gaps and ambiguities
2. Fields I cannot safely rely on
3. Error handling I must implement on the consumer side
4. Recommended defensive patterns`,
      claude:`<role>API contract reviewer. Catch ambiguities before the consumer is built.</role>

<objective>Review the API contract for [API] and flag every gap that will cause a runtime bug in the consumer.</objective>

<input>[PASTE SPEC]</input>

<instructions>
1. Missing or ambiguous types.
2. Error response coverage.
3. Pagination consistency.
4. Auth requirements.
5. Rate limits and retry guidance.
6. Breaking change risk.
7. Return defensive consumer patterns for each finding.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for API contract review)"
    }
  },
  {
    id:174,emoji:"🚦",title:"CI/CD Gate Audit",sub:"Are your CI gates actually catching regressions?",
    cat:"coding",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Run when CI is green but prod breaks. Finds phantom gates — checks that pass trivially without catching real regressions.",
    versions:{
      chatgpt:`Audit my CI/CD gates for phantom coverage.

Repo: [REPO]
Current gates:
[LIST YOUR CI STEPS — lint, typecheck, unit tests, e2e, deploy]

For each gate:
1. What exactly does it catch?
2. What does it NOT catch (and could silently pass)?
3. Is it possible for this gate to be green while a regression ships?
4. What test or check would I add to close the gap?

Return:
1. Gate coverage table
2. Top 3 gaps in my current pipeline
3. Minimum additions to close the most critical gaps`,
      claude:`<role>CI/CD gate auditor. Find the phantom passes before they reach production.</role>

<objective>Audit [REPO]'s CI/CD gates for gaps — where can a regression ship while all gates are green?</objective>

<input>Gates: [LIST]</input>

<instructions>
1. For each gate: what it catches vs what it misses.
2. Phantom pass scenarios per gate.
3. Top 3 pipeline gaps.
4. Minimum additions to close critical gaps.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for CI/CD audits)"
    }
  },

  // ── REDTEAM (additional) ──────────────────────────────────────────────────
  {
    id:175,emoji:"🎭",title:"Redteam My Pricing",sub:"Attack your pricing model before customers do",
    cat:"redteam",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-orange)",
    notes:"Run before any pricing change or launch. Forces the hostile customer and competitor view.",
    versions:{
      chatgpt:`Redteam my pricing strategy as a hostile analyst.

Product: [DESCRIBE]
Current pricing: [DESCRIBE]

Attack from:
1. Customer: why would they refuse to pay, downgrade, or churn?
2. Competitor: where does this pricing create a targeting opportunity for them?
3. Distribution: what channels does this pricing make unviable?
4. Trust: what does this pricing signal about product quality or founder confidence?
5. Regulatory: any pricing patterns that could attract scrutiny?

Return:
1. Weakest point in the current pricing
2. Most dangerous competitive response this enables
3. One pricing change that would close the biggest gap`,
      claude:`<role>Hostile pricing analyst. Find every attack vector in the pricing model.</role>

<objective>Redteam [PRODUCT]'s pricing strategy from the customer, competitor, distribution, and trust angles.</objective>

<input>Pricing: [DESCRIBE]. Context: [DESCRIBE].</input>

<instructions>
1. Customer objections and churn triggers.
2. Competitor targeting opportunity.
3. Distribution viability.
4. Trust signals (positive and negative).
5. Regulatory risk.
6. Verdict: weakest point and one fix.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for redteam — needs adversarial structured reasoning)"
    }
  },
  {
    id:176,emoji:"🧨",title:"Redteam My Onboarding",sub:"Where does your onboarding lose users?",
    cat:"redteam",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Treat onboarding as a trust-building sequence. Run before any launch or major onboarding refactor.",
    versions:{
      chatgpt:`Redteam my onboarding flow as a hostile UX critic.

Product: [DESCRIBE]
Onboarding flow:
[DESCRIBE STEPS OR PASTE SCREENSHOTS]

Attack from:
1. First-impression: what creates doubt in the first 10 seconds?
2. Friction: where does effort exceed expected reward?
3. Trust: where does the product feel unsafe, unclear, or low-quality?
4. Value gap: when does the user not feel the core value before hitting friction?
5. Drop: at what exact step would most users abandon?

Return:
1. Ranked drop points
2. Trust damage moments
3. One change that would have the highest impact on activation rate`,
      claude:`<role>Hostile UX critic. Find every onboarding failure before users do.</role>

<objective>Redteam [PRODUCT]'s onboarding and find every drop, friction, and trust failure point.</objective>

<input>Flow: [DESCRIBE]. Platform: [WEB/MOBILE].</input>

<instructions>
1. First-impression doubt triggers.
2. Friction exceeds expected reward moments.
3. Trust damage points.
4. Value gap (friction before value delivery).
5. Most likely drop step.
6. One highest-impact fix.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for UX redteam)"
    }
  },
  {
    id:177,emoji:"💣",title:"Redteam My Launch",sub:"Kill the launch plan before it kills you",
    cat:"redteam",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run 72 hours before any significant launch. Covers the axes founders most often skip: distribution, trust, ops, and timing.",
    versions:{
      chatgpt:`Redteam my launch plan.

What I am launching: [DESCRIBE]
Launch plan:
[PASTE PLAN — timing, channels, messaging, ops readiness]

Attack:
1. Distribution: will this reach the right people or just broadcast to the wrong crowd?
2. Trust: are there signals that would make the ICP distrust this immediately?
3. Ops: what breaks if 10x the expected load shows up?
4. Timing: is there a better or worse moment I am ignoring?
5. Message: what in the messaging creates the wrong expectation?
6. Worst-case: what is the most embarrassing public failure scenario?

Return:
1. Top 3 failure modes
2. Cheapest fix per failure mode
3. Go / no-go / delay verdict`,
      claude:`<role>Launch redteam critic. Find every failure before it is public.</role>

<objective>Attack [PRODUCT]'s launch plan across distribution, trust, ops, timing, and message.</objective>

<input>Plan: [DESCRIBE].</input>

<instructions>
1. Distribution failure modes.
2. Trust signals that undermine the ICP.
3. Ops breaking points.
4. Timing risks.
5. Message misalignment.
6. Most embarrassing public failure scenario.
7. Top 3 failures, cheapest fix, and go/no-go verdict.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for launch redteam)"
    }
  },
  {
    id:178,emoji:"🔍",title:"Redteam My Hiring",sub:"Attack your hiring decision before you sign an offer",
    cat:"redteam",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Expensive hiring mistakes are avoidable. Run on any hire before extending the offer — especially the first few at a small company.",
    versions:{
      chatgpt:`Redteam this hiring decision before I extend an offer.

Role: [DESCRIBE]
Candidate signal: [what you know — resume, interview, work sample]
Company stage: [early / growth / solo founder]

Attack:
1. Role need: do I actually need this role or am I hiring to avoid doing something uncomfortable?
2. Candidate fit: what is the strongest evidence AGAINST this person?
3. Timing: is this the right time to hire, or am I creating overhead before product-market fit?
4. Compensation: what does this salary signal to future hires?
5. Exit: how painful is the offboarding if this person does not work out in 90 days?

Return:
1. Strongest case against the hire
2. What I should verify before deciding
3. Hire / delay / redesign the role verdict`,
      claude:`<role>Hiring decision redteam. Find the reasons NOT to hire before the offer goes out.</role>

<objective>Attack the hiring decision for [ROLE] — find the strongest case against it.</objective>

<input>Candidate: [DESCRIBE]. Stage: [DESCRIBE].</input>

<instructions>
1. Role need check (are you avoiding something?).
2. Strongest evidence against the candidate.
3. Timing risk.
4. Compensation signaling to future hires.
5. 90-day offboarding pain.
6. Verify-before-deciding list.
7. Hire / delay / redesign verdict.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for hiring redteam)"
    }
  },
  {
    id:179,emoji:"🌀",title:"Redteam My Mental Model",sub:"Challenge the assumptions behind your worldview",
    cat:"redteam",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"The most powerful redteam is the one on your own operating model. Run quarterly or after a significant failure to surface belief updates.",
    versions:{
      chatgpt:`Redteam my core operating mental model.

My current beliefs about [DOMAIN — e.g. product / hiring / growth / users / AI]:
[LIST 3-5 core assumptions you operate from]

Attack each belief:
1. What is the strongest counter-evidence that this belief is wrong?
2. When did this belief WORK and when did it FAIL?
3. Is this belief a durable principle or a rationalization of past choices?
4. What would I have to observe to update this belief?

Return:
1. Strongest challenges to each belief
2. Which beliefs are solid vs need re-examination
3. One belief I should update based on current evidence`,
      claude:`<role>Mental model auditor. Challenge the operating beliefs, not just the decisions.</role>

<objective>Redteam my core assumptions in [DOMAIN] and surface the ones that need updating.</objective>

<input>Beliefs: [LIST 3-5].</input>

<instructions>
1. Strongest counter-evidence per belief.
2. When it worked vs when it failed.
3. Durable principle vs post-hoc rationalization.
4. Update trigger for each belief.
5. Verdict: solid / re-examine / update now.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for mental model redteam)"
    }
  }

];
if(typeof PROMPTS!=='undefined'){
  PROMPTS.push(...NP);
  if(typeof renderLibrary==='function')renderLibrary();
  else if(typeof render==='function')render();
  console.log('[PromptOS patch] +'+NP.length+' prompts. Total:',PROMPTS.length);
}
})();
