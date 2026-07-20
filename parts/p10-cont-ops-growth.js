(function(){
  if (typeof PROMPTS === 'undefined' || !Array.isArray(PROMPTS)) return;
  var existing = new Set(PROMPTS.map(function(p){ return p.id; }));
  var additions = [
    {
      id: 88,
      emoji: '📈',
      title: 'Growth Experiment Prioritizer',
      sub: 'ICE score your backlog, kill the tail',
      cat: 'growth',
      platforms: ['chatgpt', 'claude'],
      card_accent: 'var(--accent-green)',
      notes: 'For a founder with a 10+ experiment backlog and not enough weeks to run them all. Forces a cut list, not just a ranking.',
      versions: {
        chatgpt: `Prioritize my growth experiment backlog with ICE scoring and explicit kills.

Product: [BRIEF]
Stage: [e.g., pre-revenue beta / post-launch / scaling]
Experiments in the backlog:
[LIST — one line each]
Hours available for experiments next month: [N]

Rules:
- Score each experiment: Impact (1-10), Confidence (1-10), Ease (1-10)
- Surface the ICE score and the key assumption behind each estimate
- Explicitly KILL experiments that score below a threshold or are blocked by a prerequisite
- Name the one experiment that, if it works, changes the business most

Return:
1. Scored table with ICE totals
2. Kill list with one-line reason each
3. Top 3 to run next month in priority order
4. The prerequisite any high-scorer needs before it can run`,
        claude: `<role>
Growth advisor to a solo founder. The output is a cut list, not a ranked wish list.
</role>

<objective>ICE-score the experiment backlog and produce a clear top-3 + explicit kill list.</objective>

<context>
Product: [BRIEF]
Stage: [STAGE]
Available hours: [N]
Backlog: [LIST]
</context>

<instructions>
1. Score each: Impact (1-10), Confidence (1-10), Ease (1-10). Note the key assumption per score.
2. Kill anything below ICE 4 or blocked by an unmet prerequisite.
3. Return top 3 to run next month in order.
4. Name the single experiment that changes the business most if it works.
</instructions>

<output_format>
ICE table | Kill list + reasons | Top 3 ordered | Game-changer call-out
</output_format>`,
        perplexity: '(Use ChatGPT or Claude for prioritization — needs judgment, not search)'
      }
    },
    {
      id: 89,
      emoji: '📬',
      title: 'Email Sequence Architect',
      sub: 'Onboarding and re-engagement flows',
      cat: 'growth',
      platforms: ['chatgpt', 'claude'],
      card_accent: 'var(--accent-orange)',
      notes: 'For welcome sequences and re-engagement drips. Writes the strategy and triggers first, then the actual email copy — not the other way around.',
      versions: {
        chatgpt: `Architect an email sequence for my product.

Product: [BRIEF]
Audience: [WHO — describe the receiver and their relationship to the product]
Sequence goal: [WHAT YOU WANT THEM TO DO BY END OF SEQUENCE]
Trigger: [WHAT STARTS THIS — e.g., new signup, went inactive for 14 days]
Max emails: [N]

Rules:
- Strategy first: show me the trigger → email map before writing any copy
- Wait for my approval on the structure before writing emails
- Each email has one job — no multi-ask emails
- Subject line + preview text + body for each email
- Flag any email that risks feeling manipulative for a minor or sensitive audience

Return:
1. Sequence map (trigger → email N → delay → next email)
2. One-job statement per email
3. Full copy for each email after structure approval`,
        claude: `<role>
Email sequence strategist and copywriter. One job per email. Strategy before copy.
</role>

<objective>Design and write a [GOAL] email sequence for [AUDIENCE] triggered by [TRIGGER].</objective>

<context>
Product: [BRIEF]
Max emails: [N]
Sensitivities: [e.g., teen-facing — no guilt, no urgency manipulation]
</context>

<instructions>
1. Present the sequence map (trigger → delay → email N) first. Wait for approval.
2. After approval, write each email: subject + preview text + body.
3. Each email has exactly one job — state it above the copy.
4. Flag any copy that risks a guilt or FOMO pattern.
</instructions>`,
        perplexity: '(Use ChatGPT or Claude for email sequence design)'
      }
    },
    {
      id: 90,
      emoji: '🧮',
      title: 'Ops Cost Audit',
      sub: 'Monthly spend breakdown + cut list',
      cat: 'ops',
      platforms: ['chatgpt', 'claude'],
      card_accent: 'var(--text-muted)',
      notes: 'Run monthly. Keeps infrastructure and SaaS spend honest before it creeps past what the product can support.',
      versions: {
        chatgpt: `Audit my monthly operating costs and give me a cut list.

Revenue / runway reality: [DESCRIBE — e.g., pre-revenue, or $X MRR]
Monthly spend breakdown:
[LIST — service, cost, what it does]

Rules:
- Rank every line by necessity: CRITICAL / USEFUL / NICE-TO-HAVE / ZOMBIE
- Flag anything I'm paying for that a free or open-source alternative covers at my scale
- Flag services that scale with usage in a way that could surprise me at growth
- Do not suggest cutting anything critical to security, auth, or payments

Return:
1. Annotated spend table
2. Cut list: what to cancel today + estimated monthly savings
3. Swap suggestions: paid → free where appropriate
4. One "watch this at scale" flag — the line that looks small now but won't be`,
        claude: `<role>
Financial ops advisor to a solo founder. Honest about what to cut, careful about what not to.
</role>

<objective>Audit monthly operating costs and return a cut list.</objective>

<context>
Revenue reality: [DESCRIBE]
Spend: [LIST — service, cost, purpose]
</context>

<instructions>
1. Rank every line: CRITICAL / USEFUL / NICE-TO-HAVE / ZOMBIE.
2. Flag free/open-source alternatives viable at current scale.
3. Flag usage-based services that could surprise at growth.
4. Never suggest cutting security, auth, or payments infrastructure.
5. Return cut list + swap suggestions + one scale-risk flag.
</instructions>`,
        perplexity: '(Use ChatGPT or Claude for cost audit — needs judgment, not search)'
      }
    },
    {
      id: 91,
      emoji: '🗣️',
      title: 'User Interview Debrief',
      sub: 'Raw notes → signals → product decisions',
      cat: 'research',
      platforms: ['chatgpt', 'claude'],
      card_accent: 'var(--accent-yellow)',
      notes: 'Use after any user interview or feedback session. Turns messy notes into a signal table and forces the product implication out of every finding.',
      versions: {
        chatgpt: `Synthesize these user interview notes into product signals.

Product: [BRIEF]
User type: [WHO WAS INTERVIEWED]
Raw notes:
[PASTE NOTES — messy is fine]

Rules:
- Separate what the user SAID from what they MEANT (surface vs underlying need)
- Do not invent quotes or extend the user's intent beyond what the notes support
- Flag quotes that contradict each other — don't blend them into a false consensus
- For each signal, give the smallest product response (a copy change counts, not every signal needs a new feature)

Return:
1. Signal table: quote / underlying need / product implication / size of change
2. Contradictions or outliers (not blended away)
3. The one finding that most changes what I thought I knew
4. What to ask in the next interview`,
        claude: `<role>
User research synthesizer. Separate stated needs from underlying needs. Do not invent consensus.
</role>

<objective>Turn raw interview notes into a product signal table with product implications.</objective>

<context>
Product: [BRIEF]
User: [WHO]
Notes: [PASTE]
</context>

<instructions>
1. For each signal: quote → underlying need → product implication → change size.
2. Surface contradictions without blending them.
3. Name the single finding that most shifts your model of the user.
4. List 3 follow-up questions for the next interview.
</instructions>

<output_format>
Signal table | Contradictions | Belief-shifting finding | Next interview questions
</output_format>`,
        perplexity: '(Use ChatGPT or Claude — synthesis task, not research)'
      }
    }
  ];
  additions.forEach(function(p){ if (!existing.has(p.id)) PROMPTS.push(p); });
})();
