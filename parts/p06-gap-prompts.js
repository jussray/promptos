/* ── GAP PROMPTS PATCH — IDs 180-197 ────────────────────────────────────────
   Covers 5 missing categories: writing, product, research, mental-models, personal-ops
   Wire in: <script src="./parts/p06-gap-prompts.js"></script> before </body>
───────────────────────────────────────────────────────────────────────────── */
(function(){
const NP = [

  // ── WRITING ──────────────────────────────────────────────────────────────
  {
    id:180,emoji:"✍️",title:"Cold Message Forge",sub:"Write the cold DM or email they will actually read",
    cat:"writing",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"The test: if they read only the first line, do they feel seen? If the last line disappeared, would they still reply? Run this before sending any outbound.",
    versions:{
      chatgpt:`Write a cold outreach message that earns a reply.

Sender context: [WHO I AM]
Recipient: [WHO THEY ARE — role, company, specific signal I noticed]
Ask: [EXACT OUTCOME I WANT FROM THE MESSAGE]
Channel: [email / Twitter DM / LinkedIn]

Rules:
- Open with something specific about THEM — not me
- One ask, not three
- No "I hope this finds you well" or "I wanted to reach out"
- Under 80 words for DM, under 150 words for email
- The ask should be low friction — a yes/no or a single small action

Write 3 variations ranked by likely reply rate. For each: explain why the opening earns attention.`,
      claude:`<role>Cold outreach copywriter. Every word earns the next word.</role>

<objective>Write a cold message for [CHANNEL] that gets a reply from [RECIPIENT].</objective>

<input>
Sender: [WHO I AM]
Recipient: [SPECIFIC SIGNAL ABOUT THEM]
Ask: [OUTCOME WANTED]
</input>

<constraints>
- Open on them, not me
- One ask
- No filler openers
- DM ≤80w, email ≤150w
- Low-friction ask
</constraints>

<output>3 variations ranked by reply probability, each with rationale for the opening.</output>`,
      perplexity:"(Use ChatGPT or Claude for cold message writing)"
    }
  },
  {
    id:181,emoji:"📢",title:"Announcement Sharpener",sub:"Turn a product update into something people share",
    cat:"writing",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Most product announcements bury the lead and lead with features, not impact. This forces the user-outcome-first rewrite.",
    versions:{
      chatgpt:`Rewrite this product announcement so it spreads.

Draft:
[PASTE YOUR DRAFT]

Product: [NAME]
Audience: [WHO WILL READ THIS]
Channel: [Twitter thread / Product Hunt / email newsletter / launch post]

Rewrite rules:
1. Lead with the outcome for the user, not the feature name
2. Second sentence: why this took longer than people think
3. Show, don't describe — if there's a number, use it; if there's a story, use it
4. End with the one thing you want them to do
5. Cut every adjective that isn't load-bearing

Return: Rewritten version + redline commentary on what changed and why`,
      claude:`<role>Product announcement editor. Lead with impact, not feature names.</role>

<objective>Rewrite this announcement for [CHANNEL] so it spreads.</objective>

<input>
Draft: [PASTE]
Audience: [DESCRIBE]
</input>

<rewrite_rules>
1. Lead with user outcome
2. Why this was hard (credibility)
3. Show with specifics (numbers, story)
4. Single clear CTA
5. Kill every hollow adjective
</rewrite_rules>

<output>Rewritten copy + redline commentary.</output>`,
      perplexity:"(Use ChatGPT or Claude for copywriting)"
    }
  },
  {
    id:182,emoji:"🧵",title:"Thread Architect",sub:"Structure a Twitter/X thread that holds attention to the end",
    cat:"writing",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-purple)",
    notes:"Most threads front-load all the value and die after tweet 3. This forces a structure that earns each next click.",
    versions:{
      chatgpt:`Architect a Twitter thread that holds attention through the end.

Topic: [WHAT THE THREAD IS ABOUT]
Core insight: [THE ONE THING THEY SHOULD TAKE AWAY]
Audience: [WHO FOLLOWS ME / WHO I WANT TO REACH]

Structure rules:
1. Tweet 1: the hook — a counterintuitive claim or a specific sharp observation. Not a question.
2. Tweets 2-3: the problem or tension. Why this matters and is hard.
3. Tweets 4-7: the insight, structured as steps, principles, or observations. One per tweet.
4. Tweet 8-9: the most surprising or contrarian element. This is the shareable moment.
5. Final tweet: the distilled single-sentence takeaway and the CTA.

Write the full thread. Mark which tweet is the designed share moment and why.`,
      claude:`<role>Thread architect. Structure for retention, not just reach.</role>

<objective>Write a Twitter thread on [TOPIC] that holds attention to the last tweet.</objective>

<input>Core insight: [DESCRIBE]. Audience: [DESCRIBE].</input>

<structure>
T1: Counterintuitive hook (not a question)
T2-3: Tension / why this is hard
T4-7: Insight (one per tweet)
T8-9: Most contrarian / shareable moment
Final: Single-sentence takeaway + CTA
</structure>

<output>Full thread + annotation marking the designed share moment.</output>`,
      perplexity:"(Use ChatGPT or Claude for thread writing)"
    }
  },
  {
    id:183,emoji:"🎤",title:"Talk Skeleton",sub:"Build a talk structure from a raw idea in 10 minutes",
    cat:"writing",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Run when you have been asked to speak and have a rough idea but no structure. Gives you a complete skeleton before you open slides.",
    versions:{
      chatgpt:`Build a talk skeleton from this rough idea.

Rough idea: [DESCRIBE IN 2-3 SENTENCES]
Audience: [WHO IS IN THE ROOM]
Time: [LENGTH IN MINUTES]
Format: [Keynote / panel / lightning talk / podcast]

Build:
1. The one-sentence talk premise (what the audience will leave believing that they did not believe before)
2. Opening: the specific moment, number, or question that earns their attention in the first 60 seconds
3. Three act structure: tension → insight → implication
4. The most dangerous slide or claim — the one that could lose the room if not handled well
5. Closing: what you want them to DO, not just think

Return: Full skeleton with act labels, slide count estimate, and the dangerous moment flagged`,
      claude:`<role>Talk architect. Structure for transformation, not information transfer.</role>

<objective>Build a talk skeleton for [AUDIENCE] on [TOPIC] in [TIME].</objective>

<input>Rough idea: [DESCRIBE].</input>

<structure>
1. One-sentence premise (belief change)
2. Opening hook (60-second earn)
3. Three-act: tension → insight → implication
4. The dangerous moment (flag it)
5. Closing action ask
</structure>

<output>Full skeleton + slide count estimate + dangerous moment flagged.</output>`,
      perplexity:"(Use ChatGPT or Claude for talk structure)"
    }
  },

  // ── PRODUCT ──────────────────────────────────────────────────────────────
  {
    id:184,emoji:"🎯",title:"Feature Kill Test",sub:"Should this feature exist at all?",
    cat:"product",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Run before any new feature build. The test that saves the most engineering time. Most features that fail the kill test get built anyway — this makes the failure explicit.",
    versions:{
      chatgpt:`Run the kill test on this proposed feature before I build it.

Feature: [DESCRIBE]
Product: [NAME / STAGE]
User: [WHO USES THIS]

Kill test questions:
1. What user job does this feature do? Can that job be done better by something that already exists (inside or outside the product)?
2. If I removed this feature after 6 months, who would notice and how loudly?
3. Does this feature make the core loop stronger or does it add a side path that dilutes focus?
4. What is the simplest version of this that would prove the hypothesis without building the full thing?
5. Am I building this because users asked for it, or because it feels good to build?

Return: Kill / build the MVP / build the full version verdict with explicit rationale`,
      claude:`<role>Product feature kill tester. Prove the feature earns its place before a line is written.</role>

<objective>Run the kill test on [FEATURE] for [PRODUCT].</objective>

<input>Feature: [DESCRIBE]. User: [DESCRIBE]. Stage: [EARLY/GROWTH].</input>

<test>
1. User job — can it be done without building this?
2. Removal notice — who would notice and how loudly?
3. Core loop — strengthens or dilutes?
4. Minimum proof — what is the cheapest way to test the hypothesis?
5. Motivation check — user demand or builder desire?
</test>

<output>Kill / MVP / build verdict with rationale.</output>`,
      perplexity:"(Use ChatGPT or Claude for product kill tests)"
    }
  },
  {
    id:185,emoji:"🗺️",title:"Roadmap Triage",sub:"Rank your backlog by leverage, not loudness",
    cat:"product",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Most backlogs are ordered by recency of the person who asked, not by actual leverage. Run quarterly or when the backlog is blocking progress.",
    versions:{
      chatgpt:`Triage my product backlog by actual leverage.

Backlog:
[PASTE YOUR BACKLOG ITEMS — bullet list is fine]

Product stage: [EARLY / PMF SEARCH / GROWTH]
Core metric I am optimizing: [e.g. activation rate / retention / revenue]

For each item, score:
1. Activation leverage — does this move the core metric directly?
2. Blast radius — how many users are affected?
3. Reversibility — can it be undone cheaply if wrong?
4. Signal quality — is the request from a power user, a churned user, or internal?

Return:
1. Ranked backlog (top 5 to build now, middle tier, bottom tier to kill or park)
2. The items I should delete, not defer
3. Any missing item I should add based on my stated metric`,
      claude:`<role>Backlog triage analyst. Rank by leverage, not loudness.</role>

<objective>Triage [MY BACKLOG] against the core metric: [METRIC].</objective>

<input>Backlog: [PASTE LIST]. Stage: [DESCRIBE].</input>

<scoring_axes>
1. Activation leverage (moves core metric directly)
2. Blast radius (users affected)
3. Reversibility (cost of being wrong)
4. Signal quality (who asked)
</scoring_axes>

<output>Ranked tiers (build now / park / kill) + items to delete + missing item suggestion.</output>`,
      perplexity:"(Use ChatGPT or Claude for roadmap triage)"
    }
  },
  {
    id:186,emoji:"💬",title:"User Interview Prep",sub:"Questions that reveal truth, not confirmation",
    cat:"product",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Most user interviews confirm what the founder already believes. Run this before every call to build questions that actually surface surprises.",
    versions:{
      chatgpt:`Write user interview questions that reveal truth, not confirmation.

Hypothesis I am testing: [WHAT I THINK IS TRUE]
User type: [WHO I AM INTERVIEWING]
Stage: [PRE-BUILD / BUILT BUT LOW RETENTION / POST-CHURN]

Rules:
1. No leading questions — if the question contains the answer, rewrite it
2. Ask about past behavior, not future intent
3. Ask about the worst experience, not just the best
4. Never ask "would you use" — ask "tell me about the last time you"
5. The last question must open the topic I am most afraid of

Return: 8 questions ranked by how likely they are to produce a surprising answer, with the trap version of each question flagged`,
      claude:`<role>User interview designer. Questions that surface surprises, not confirmations.</role>

<objective>Write 8 interview questions that challenge the hypothesis: [HYPOTHESIS].</objective>

<input>User: [DESCRIBE]. Stage: [DESCRIBE].</input>

<constraints>
- Past behavior only (no "would you")
- No leading questions
- Include a worst-experience question
- Last question must probe the feared topic
</constraints>

<output>8 questions ranked by surprise potential + trap version of each flagged.</output>`,
      perplexity:"(Use ChatGPT or Claude for interview prep)"
    }
  },
  {
    id:187,emoji:"📉",title:"Churn Autopsy",sub:"Why did they really leave?",
    cat:"product",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Most churn explanations are surface-level. This forces the three-layer diagnosis: stated reason → real reason → systemic cause.",
    versions:{
      chatgpt:`Run a churn autopsy on this lost user or cohort.

Context:
- Product: [NAME]
- User/cohort: [DESCRIBE]
- Stated churn reason (if known): [DESCRIBE]
- Behavioral signal before churn: [LAST ACTIONS, SESSION FREQUENCY, FEATURE USAGE]
- How long they were active: [TIMEFRAME]

Diagnose three layers:
1. Stated reason — what they said (or did not say)
2. Real reason — what the behavioral signal actually shows
3. Systemic cause — is this an individual case or a pattern? What in the product or onboarding created this exit?

Return:
1. Three-layer diagnosis
2. The earliest signal I missed before they churned
3. One product change that would prevent this class of churn`,
      claude:`<role>Churn autopsy analyst. Three-layer diagnosis: stated → real → systemic.</role>

<objective>Diagnose why [USER/COHORT] churned from [PRODUCT].</objective>

<input>
Stated reason: [DESCRIBE]
Behavioral signal: [DESCRIBE]
Active period: [DESCRIBE]
</input>

<diagnosis>
1. Stated reason
2. Real reason (from behavioral signal)
3. Systemic cause (pattern vs individual)
</diagnosis>

<output>Three-layer diagnosis + earliest missed signal + one systemic fix.</output>`,
      perplexity:"(Use ChatGPT or Claude for churn analysis)"
    }
  },

  // ── RESEARCH (Perplexity-native) ─────────────────────────────────────────
  {
    id:188,emoji:"🔭",title:"Market Sizing Drill",sub:"Bottom-up TAM/SAM/SOM in under 20 minutes",
    cat:"research",platforms:["perplexity","chatgpt"],
    card_accent:"var(--accent-blue)",
    notes:"Top-down TAM slides are noise. This forces a bottom-up drill from real unit economics. Perplexity-native because it needs current data.",
    versions:{
      perplexity:`Give me a bottom-up market sizing for [MARKET].

I need:
1. Number of potential buyers (with source and year)
2. Average spend per buyer per year on this problem today
3. What % are reachable in the next 2 years through [MY CHANNEL]
4. What the 3 largest existing players revenue suggest about actual market size vs analyst reports
5. What the market was sized at 3 years ago vs now and whether the trend is expanding or contracting

Do not use top-down TAM from analyst reports as the primary number. Build from unit economics up.`,
      chatgpt:`Build a bottom-up market sizing for [MARKET] from unit economics.

Step 1: Who is the buyer? Define the ICP precisely.
Step 2: How many of them exist? (Use SIC codes, LinkedIn filters, census data, or proxy datasets)
Step 3: What do they spend per year on this problem today?
Step 4: What % are reachable in year 1 given my channel?
Step 5: What do the top 3 competitors' revenues imply about actual market size?

Return: TAM / SAM / SOM with each number sourced and the key assumption flagged.`,
      claude:"(Use Perplexity or ChatGPT for market sizing — needs live data)"
    }
  },
  {
    id:189,emoji:"🕵️",title:"Competitor Intelligence",sub:"What are they actually doing, not what they say",
    cat:"research",platforms:["perplexity","chatgpt"],
    card_accent:"var(--accent-purple)",
    notes:"Product pages lie. Job listings, changelog entries, and app store reviews tell the truth. Perplexity-native because it needs current live data.",
    versions:{
      perplexity:`Run a competitor intelligence brief on [COMPETITOR] in [MARKET].

I want:
1. What their changelog, job listings, and recent press releases say they are actually building
2. Their app store reviews in the last 6 months — what do users complain about most?
3. Pricing changes in the last 12 months and what they signal about their burn or growth
4. Which customer segments they are moving toward vs abandoning
5. Any team or leadership changes that signal a strategic shift

Separate: what they SAY they do vs what the behavioral signals suggest they are actually doing.`,
      chatgpt:`Build a competitor intelligence brief on [COMPETITOR].

Focus on behavioral signals, not marketing claims:
1. Recent changelog and feature priorities (what are they actually building?)
2. Job listings (what capabilities are they hiring for?)
3. Pricing changes and their implication
4. Customer segment shifts (who are they winning and losing?)
5. Leadership changes and strategic signals

Return: What they say vs what they are doing, and the gap between them.`,
      claude:"(Use Perplexity for live competitor intelligence)"
    }
  },
  {
    id:190,emoji:"📊",title:"Trend vs Noise Audit",sub:"Is this a real signal or a Twitter consensus illusion?",
    cat:"research",platforms:["perplexity","chatgpt"],
    card_accent:"var(--accent-yellow)",
    notes:"Most 'trends' are just loud people talking to each other. This separates signal from noise before you pivot your product or strategy toward something that is not actually happening.",
    versions:{
      perplexity:`Audit whether [TREND] is a real signal or a consensus illusion.

Evidence I need:
1. Search volume for related terms over the last 3 years (growing, flat, or declining?)
2. Funding activity in this space over the last 18 months
3. What the practitioners (not commentators) in this space are actually doing
4. What the data shows vs what the loudest voices on Twitter/X claim
5. Historic parallels — was there a similar 'trend' that turned out to be noise in the last 10 years?

Verdict: Real structural shift / cyclical hype / early signal worth watching`,
      chatgpt:`Audit [TREND] for signal vs noise.

1. Is search volume growing or just conversation volume growing?
2. Are practitioners changing behavior or just commentators changing vocabulary?
3. What is the monetization evidence — are people paying for things related to this trend?
4. What historic parallel does this most resemble and how did that play out?
5. What would falsify this trend in the next 12 months?

Verdict: Structural shift / cyclical hype / early signal.`,
      claude:"(Use Perplexity or ChatGPT for trend audits)"
    }
  },

  // ── MENTAL MODELS ─────────────────────────────────────────────────────────
  {
    id:191,emoji:"⚖️",title:"Second-Order Thinking",sub:"What happens after the obvious thing happens?",
    cat:"mental-models",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-orange)",
    notes:"Most decisions are evaluated at first-order. Second and third-order effects are where the real surprises live. Run before any pricing, hiring, or product decision with broad stakeholder surface.",
    versions:{
      chatgpt:`Apply second and third-order thinking to this decision.

Decision: [DESCRIBE]
Stakeholders affected: [LIST]

Think through:
1. First-order effect — the obvious intended outcome
2. Second-order — what happens next as a result of the first-order effect?
3. Third-order — what happens because of the second-order, especially from stakeholders reacting?
4. Unintended constituency — who is affected that I did not intend to affect?
5. Reversal — which effects are irreversible?

Return: Effects map (1st, 2nd, 3rd order) + unintended constituencies + irreversible effects flagged + adjusted decision recommendation`,
      claude:`<role>Second-order effects analyst. Trace the full causal chain, not just the intended outcome.</role>

<objective>Map the 1st, 2nd, and 3rd order effects of [DECISION].</objective>

<input>Decision: [DESCRIBE]. Stakeholders: [LIST].</input>

<instructions>
1. First-order: intended outcome.
2. Second-order: what happens next?
3. Third-order: stakeholder reactions to the second-order.
4. Unintended constituencies.
5. Irreversible effects.
6. Adjusted recommendation.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for second-order thinking)"
    }
  },
  {
    id:192,emoji:"🪞",title:"Inversion",sub:"Define success by designing for failure",
    cat:"mental-models",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Charlie Munger: 'Invert, always invert.' Ask not how to succeed but how to guarantee failure — then avoid those things. Especially useful for launches, hires, and strategy pivots.",
    versions:{
      chatgpt:`Apply inversion to this goal.

Goal: [DESCRIBE WHAT I WANT TO ACHIEVE]

Invert:
1. What are all the ways I could guarantee this goal fails?
2. What is the single most reliable path to failure?
3. Which of those failure paths am I currently on?
4. What would I have to stop doing to avoid the most likely failure mode?

Return:
1. Failure inventory (all the ways this dies)
2. Most likely failure ranked
3. Current exposure to each failure mode
4. Three specific stops that reduce failure probability most`,
      claude:`<role>Inversion analyst. Define success by designing away from failure.</role>

<objective>Invert [GOAL] — find every path to guaranteed failure, then assess current exposure.</objective>

<input>Goal: [DESCRIBE].</input>

<instructions>
1. All failure modes.
2. Most reliable single path to failure.
3. Which failure modes I am currently on.
4. Three specific stops that reduce failure probability most.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for inversion)"
    }
  },
  {
    id:193,emoji:"🧩",title:"First Principles Crack",sub:"Break the problem to its irreducible truths",
    cat:"mental-models",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-blue)",
    notes:"Most problem solving works by analogy. First principles removes every inherited assumption until only the irreducible constraints remain. Use when every conventional path has been tried.",
    versions:{
      chatgpt:`Break this problem down to first principles.

Problem: [DESCRIBE]

Strip:
1. What are all the assumptions I inherited about how this problem is solved?
2. Which of those assumptions are actually constraints vs just conventions?
3. If I had none of the current solutions and had to rebuild from scratch, what are the irreducible constraints I MUST respect?
4. What new solution becomes possible if I respect only the irreducible constraints and discard the conventions?

Return:
1. Assumption inventory
2. Real constraints (cannot break) vs conventions (can break)
3. First-principles solution space
4. One concrete unconventional path`,
      claude:`<role>First principles analyst. Strip inherited conventions until only irreducible truths remain.</role>

<objective>Break [PROBLEM] to first principles and find the non-obvious solution space.</objective>

<input>Problem: [DESCRIBE].</input>

<instructions>
1. Inherited assumptions inventory.
2. True constraints vs conventions.
3. Irreducible constraints only.
4. Solution space from scratch.
5. One concrete unconventional path.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for first principles)"
    }
  },

  // ── PERSONAL OPS ──────────────────────────────────────────────────────────
  {
    id:194,emoji:"🌅",title:"Weekly Design",sub:"Design your week before it designs you",
    cat:"personal-ops",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-yellow)",
    notes:"Run Sunday night or Monday morning. Takes 10 minutes. Prevents the week from being consumed by reactive work at the expense of the one thing that actually matters.",
    versions:{
      chatgpt:`Design this week before it gets away from me.

Context:
- One thing that must be true by Friday: [DESCRIBE]
- What I know is on the calendar already: [LIST OBLIGATIONS]
- What I am most likely to avoid (the uncomfortable thing): [DESCRIBE]
- Energy: [HIGH / MEDIUM / LOW relative to last week]

Build:
1. The protected block — when does the one thing get done? Exact time and day.
2. The firewall — what do I say no to this week that could look urgent but is not important?
3. The pre-mortem — how does the week fail? What is the likely derailment?
4. The minimum — if everything goes wrong, what is the one output that still makes it a successful week?

Return: Week design as a plan I can read in 60 seconds each morning`,
      claude:`<role>Weekly planning operator. Design the week before it designs you.</role>

<objective>Build a week design that protects the one most important thing.</objective>

<input>
One thing that must be true by Friday: [DESCRIBE]
Obligations: [LIST]
Avoidance item: [DESCRIBE]
Energy level: [HIGH/MEDIUM/LOW]
</input>

<output>
1. Protected block (exact time + day)
2. Firewall (what to decline)
3. Pre-mortem (how the week fails)
4. Minimum viable week (if everything derails)
</output>`,
      perplexity:"(Use ChatGPT or Claude for weekly planning)"
    }
  },
  {
    id:195,emoji:"🔋",title:"Energy Audit",sub:"Find what drains and restores you at work",
    cat:"personal-ops",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-green)",
    notes:"Productivity is downstream of energy. Most founder burnout is not overwork — it is too many energy drains with not enough energy sources. Run quarterly or after a rough stretch.",
    versions:{
      chatgpt:`Run an energy audit on my current work and life.

In the last 2 weeks, list:
- Tasks and meetings that left me feeling drained: [LIST]
- Tasks and meetings that left me feeling energized: [LIST]
- Things I avoided longer than I should have: [LIST]

Audit:
1. What pattern connects the drains?
2. What pattern connects the energizers?
3. What am I avoiding and what does the avoidance cost per week?
4. What would a week look like that has 70% energizers and 30% tolerated drains?
5. What is one structural change that moves me toward that ratio?

Return: Energy map + structural recommendation`,
      claude:`<role>Energy audit operator. Find the drain sources before they compound.</role>

<objective>Audit my work energy to find the drain/restore ratio and one structural fix.</objective>

<input>
Drains: [LIST]
Energizers: [LIST]
Avoidances: [LIST]
</input>

<instructions>
1. Pattern in the drains.
2. Pattern in the energizers.
3. Avoidance cost per week.
4. What 70/30 ratio looks like.
5. One structural change.
</instructions>`,
      perplexity:"(Use ChatGPT or Claude for personal energy audits)"
    }
  },
  {
    id:196,emoji:"🚫",title:"Stop Doing List",sub:"The high-leverage things to eliminate, not just add",
    cat:"personal-ops",platforms:["chatgpt","claude"],
    card_accent:"var(--accent-red)",
    notes:"Every to-do list conversation misses the more important question: what are you doing that should stop? Run every quarter. The things that should be on this list are usually not obvious.",
    versions:{
      chatgpt:`Build my stop-doing list for this quarter.

My current regular activities and commitments:
[LIST EVERYTHING — meetings, responsibilities, projects, side work, obligations]

My core focus for this quarter: [DESCRIBE]

For each item, classify:
1. Core — directly moves the core focus
2. Support — enables core but not directly
3. Obligation — must do but does not move the needle
4. Drift — once useful, now habit; does not move the needle
5. Debt — was agreed to but should be renegotiated

Return:
1. Stop list (items to eliminate or delegate immediately)
2. Renegotiate list (items to renegotiate or reduce)
3. The one item I most need to stop but will resist stopping`,
      claude:`<role>Stop-doing list builder. What to remove, not what to add.</role>

<objective>Build the stop-doing list for this quarter aligned to [CORE FOCUS].</objective>

<input>All current commitments: [LIST]. Core focus: [DESCRIBE].</input>

<classification>
Core | Support | Obligation | Drift | Debt
</classification>

<output>
Stop list (eliminate/delegate) | Renegotiate list | The one thing I need to stop but will resist.
</output>`,
      perplexity:"(Use ChatGPT or Claude for personal ops)"
    }
  },
  {
    id:197,emoji:"🧭",title:"Annual Compass",sub:"Set direction for the year, not just goals",
    cat:"personal-ops",platforms:["chatgpt","claude"],
    card_accent:"var(--primary)",
    notes:"Goals decay. Direction compounds. Run once a year at minimum — ideally after a proper review of the prior year. This is not OKRs. It is the compass that makes OKRs coherent.",
    versions:{
      chatgpt:`Help me set a compass for this year.

Last year review:
- What I am most proud of: [DESCRIBE]
- What I wish I had done differently: [DESCRIBE]
- What I started but did not finish: [DESCRIBE]
- What surprised me: [DESCRIBE]

This year:
- The one word or phrase that should define this year: [DESCRIBE]
- The one person I want to have become by December 31: [DESCRIBE]
- The one thing I want to have shipped, built, or proven: [DESCRIBE]
- The one relationship I want to have deepened: [DESCRIBE]
- The one thing I will stop accepting: [DESCRIBE]

Build:
1. A compass statement — one paragraph I can read when I am lost
2. Three anti-goals — what I am explicitly NOT optimizing for this year
3. The single leading indicator that tells me in real-time whether I am on compass`,
      claude:`<role>Annual compass setter. Direction over goals. Identity over outcomes.</role>

<objective>Build the compass for this year from the prior year review and this year's direction inputs.</objective>

<input>
Proud of: [DESCRIBE]
Would change: [DESCRIBE]
Unfinished: [DESCRIBE]
Surprised by: [DESCRIBE]
This year theme: [DESCRIBE]
Person to become: [DESCRIBE]
Thing to ship: [DESCRIBE]
Relationship to deepen: [DESCRIBE]
Thing to stop accepting: [DESCRIBE]
</input>

<output>
1. Compass statement (one paragraph for when I am lost)
2. Three anti-goals
3. Single leading indicator of on-compass living
</output>`,
      perplexity:"(Use ChatGPT or Claude for annual compass setting)"
    }
  }

];
if(typeof PROMPTS!=='undefined'){
  PROMPTS.push(...NP);
  if(typeof renderLibrary==='function')renderLibrary();
  else if(typeof render==='function')render();
  console.log('[PromptOS patch p06] +'+NP.length+' prompts. Total:',PROMPTS.length);
}
})();
