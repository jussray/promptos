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

/* Founder OS v1: deterministic mission compilation and workspace. */
(function(){
  'use strict';

  if (typeof PROMPTS === 'undefined' || !Array.isArray(PROMPTS)) return;

  var FOUNDER_OS_VERSION = 'founder-os-mission-v1';
  var AUTHORITY_ORDER = ['L0','L1','L2','L3','L4','L5','L6'];
  var existing = new Set(PROMPTS.map(function(p){ return p.id; }));
  var founderPrompts = [
    {
      id: 92,
      emoji: '⚙️',
      title: 'Founder OS Mission Compiler',
      sub: 'Intent → protocol → authority → proof → next state',
      cat: 'system',
      platforms: ['chatgpt','claude','perplexity'],
      card_accent: 'var(--primary)',
      notes: 'Canonical Chief AI → PromptOS → FCR handoff. This compiles instructions and evidence requirements only. It never grants execution authority or claims provider mutation.',
      versions: {
        chatgpt: `Compile this founder intent into a governed Founder OS mission.

Founder intent: [TASK]
Project: [REPO]
Constraints: [CONSTRAINTS]

Architecture:
- Chief AI owns intent interpretation, strategy, prioritization, decomposition, delegation, adaptation, and goal evaluation.
- PromptOS compiles protocols, acceptance criteria, proof requirements, metrics, and stop conditions.
- FCR resolves project-scoped authority and credentials, executes through provider adapters, verifies, receipts, and rolls back.

Rules:
1. Audit authoritative truth first. Repository work starts at exact current main.
2. Separate VERIFIED, INFERRED, UNKNOWN, and BLOCKED.
3. Choose the smallest coherent mission that can move the goal.
4. Declare L0-L6 authority ceiling and required provider capabilities.
5. Prefer reversible actions. Never self-expand authority.
6. UI/runtime claims require Playwright on the exact head and real path.
7. Analytics work requires baseline, decision metric, and post-change measurement.
8. High-risk provider or production mutation requires proof, rollback, and provider read-back.
9. Stop when the goal is proven, evidence contradicts the plan, required authority is missing, or scope would widen.

Return exactly:
GOAL
REALITY
MISSION PLAN
PROMPTOS PROTOCOL STACK
AUTHORITY
PROOF
METRICS
ROLLBACK
STOP CONDITION
NEXT STATE`,
        claude: `<role>Founder OS mission compiler.</role>
<intent>[TASK]</intent>
<project>[REPO]</project>
<constraints>[CONSTRAINTS]</constraints>
<architecture>Chief AI reasons and evaluates. PromptOS compiles protocols and proof. FCR resolves authority, executes, verifies, receipts, and rolls back.</architecture>
<rules>Audit exact authoritative truth first; classify VERIFIED/INFERRED/UNKNOWN/BLOCKED; choose the smallest coherent mission; declare L0-L6 authority and provider capabilities; require Playwright for UI/runtime; require baseline + decision metric + post-change measure for analytics; require rollback + read-back for production; never self-expand authority.</rules>
<output>GOAL | REALITY | MISSION PLAN | PROMPTOS PROTOCOL STACK | AUTHORITY | PROOF | METRICS | ROLLBACK | STOP CONDITION | NEXT STATE</output>`,
        perplexity: `Compile this founder intent into a governed Founder OS mission: [TASK]
Project: [REPO]
Constraints: [CONSTRAINTS]

Chief AI = strategy and goal evaluation. PromptOS = protocol compiler. FCR = authority, execution, verification, receipts, rollback.

Verify authoritative truth first. Separate VERIFIED, INFERRED, UNKNOWN, and BLOCKED. Declare the smallest coherent mission, L0-L6 authority ceiling, provider capabilities, proof, metrics, rollback, stop condition, and next state. UI/runtime claims require Playwright. Analytics requires baseline plus post-change measurement. Never infer authority from intent and never claim external success without read-back.`
      }
    },
    {
      id: 93,
      emoji: '🧭',
      title: 'Product Design Mission Gate',
      sub: 'User outcome → flow → states → proof',
      cat: 'design',
      platforms: ['chatgpt','claude','figma'],
      card_accent: 'var(--accent-orange)',
      notes: 'Use before UI work enters FCR execution. It turns a design request into observable user outcomes and explicit states instead of a screenshot-only brief.',
      versions: {
        chatgpt: `Turn this product-design request into a mission acceptance contract.

Product / project: [REPO]
Desired outcome: [TASK]
Constraints: [CONSTRAINTS]

Return:
1. USER OUTCOME — one sentence describing what becomes easier, clearer, faster, or safer.
2. PRIMARY FLOW — entry → action → feedback → success → recovery.
3. REQUIRED STATES — loading, empty, success, error, permission/blocked, returning-user, and responsive states when applicable.
4. INFORMATION HIERARCHY — what must be visible first, second, and only on demand.
5. ACCESSIBILITY — keyboard/focus, readable labels, reduced motion, contrast, touch targets where applicable.
6. ACCEPTANCE CRITERIA — observable behavior, not taste language.
7. PLAYWRIGHT PROOF — exact paths and interactions that must pass on desktop and mobile.
8. ANALYTICS HOOK — one product behavior metric that would indicate the flow improved.

Do not redesign unrelated screens. Preserve the product's existing visual DNA unless the mission explicitly changes it.`,
        claude: `<role>Product design mission gate.</role>
<project>[REPO]</project>
<outcome>[TASK]</outcome>
<constraints>[CONSTRAINTS]</constraints>
<output>USER OUTCOME | PRIMARY FLOW | REQUIRED STATES | INFORMATION HIERARCHY | ACCESSIBILITY | ACCEPTANCE CRITERIA | PLAYWRIGHT PROOF | ANALYTICS HOOK</output>`,
        figma: `<role>Product design mission gate for a connected Figma workflow.</role>
<objective>[TASK]</objective>
<context>Project: [REPO]</context>
<constraints>[CONSTRAINTS]</constraints>
<instructions>Inspect the relevant current frames first. Define user outcome, primary flow, required states, hierarchy, accessibility, dev-facing acceptance criteria, and the exact browser behavior that later needs Playwright proof. Do not treat a polished static frame as proof of product behavior.</instructions>`
      }
    },
    {
      id: 94,
      emoji: '📊',
      title: 'Data Analytics Mission Gate',
      sub: 'Baseline → decision metric → evidence → readout',
      cat: 'research',
      platforms: ['chatgpt','claude'],
      card_accent: 'var(--accent-blue)',
      notes: 'Use when a mission claims improvement, traction, reliability, conversion, completion, retention, cost, or speed. It prevents task completion from masquerading as outcome improvement.',
      versions: {
        chatgpt: `Turn this mission into an evidence-backed analytics plan.

Project: [REPO]
Mission: [TASK]
Constraints / data boundaries: [CONSTRAINTS]

Return:
1. DECISION — what founder decision this measurement should inform.
2. PRIMARY METRIC — one metric tied directly to the user/business outcome.
3. BASELINE — current value, exact source, observation window, and confidence. If unavailable, mark UNKNOWN and make baseline capture the next step.
4. GUARDRAIL METRICS — 1-3 measures that prevent optimizing the primary metric by harming reliability, safety, cost, or user experience.
5. EVENT / DATA CONTRACT — minimally required events/fields. Do not collect extra personal data merely because it is available.
6. POST-CHANGE WINDOW — when to measure again and what threshold would count as material movement.
7. SEGMENTATION — only segments that could change the decision.
8. PROOF RECEIPT — source, query/report identifier, timestamp, exact release/SHA when relevant, and unresolved caveats.

Never claim uplift without a valid baseline and comparable post-change observation.`,
        claude: `<role>Data analytics mission gate.</role>
<project>[REPO]</project>
<mission>[TASK]</mission>
<data_boundaries>[CONSTRAINTS]</data_boundaries>
<output>DECISION | PRIMARY METRIC | BASELINE | GUARDRAIL METRICS | EVENT/DATA CONTRACT | POST-CHANGE WINDOW | SEGMENTATION | PROOF RECEIPT</output>
<rule>No uplift claim without a valid comparable baseline and post-change observation.</rule>`
      }
    }
  ];

  founderPrompts.forEach(function(p){ if (!existing.has(p.id)) PROMPTS.push(p); });

  function str(value){ return typeof value === 'string' ? value.trim() : ''; }
  function list(value){
    if (Array.isArray(value)) return Array.from(new Set(value.map(str).filter(Boolean)));
    return str(value).split(',').map(function(item){ return item.trim(); }).filter(Boolean);
  }
  function unique(items){ return Array.from(new Set(items)); }
  function has(pattern, text){ return pattern.test(text); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function compilePromptOSMission(input){
    input = input && typeof input === 'object' ? input : {};
    var intent = str(input.intent || input.goal);
    if (!intent) throw new Error('Founder intent is required');

    var project = str(input.project);
    var constraints = list(input.constraints);
    var providers = list(input.providers || input.providerHints);
    var text = [intent, project].concat(constraints, providers).join(' ');
    var ui = has(/\b(ui|ux|screen|flow|interface|frontend|design|responsive|mobile|desktop|accessib|playwright)\b/i, text);
    var analytics = has(/\b(metric|analytics|data|funnel|conversion|retention|cohort|kpi|measure|instrument|telemetry|baseline|completion rate)\b/i, text);
    var providerWork = providers.length > 0 || has(/\b(github|cloudflare|supabase|shopify|hubspot|gmail|slack|figma|canva|provider|dns|worker|pages|database)\b/i, text);
    var production = has(/\b(production|deploy|deployment|migrate|migration|dns|domain|publish|send|spend|charge|refund|rollback)\b/i, text);
    var integration = production || has(/\b(merge|integrate|integration|land|release|main\b)\b/i, text);
    var architecture = has(/\b(architecture|platform|operating system|control plane|runtime|broker|protocol|compiler|framework|system design)\b/i, text);

    var authority = production ? 'L6' : integration ? 'L5' : 'L4';
    var risk = str(input.risk).toLowerCase();
    if (!/^(low|medium|high|critical)$/.test(risk)) risk = production ? 'critical' : (integration || providerWork) ? 'high' : 'medium';

    var protocols = ['goalfix','ultrathink','truthmode','confess','ooda','l99'];
    if (risk !== 'low') protocols.push('redteam');
    if (architecture) protocols.push('lindymode');
    if (ui) protocols.push('product-design');
    if (analytics) protocols.push('data-analytics');
    protocols = unique(protocols);

    var evidence = ['authoritative-source','exact-head'];
    if (ui) evidence.push('playwright');
    if (analytics) evidence.push('metric-baseline','post-change-metric');
    if (providerWork) evidence.push('provider-readback');
    if (production) evidence.push('rollback-path','production-readback');
    evidence = unique(evidence);

    var stopConditions = [
      'Stop when the requested outcome is proven at the authoritative source of truth.',
      'Stop and classify UNKNOWN when a decisive fact cannot be verified.',
      'Stop on failing exact-head tests or contradictory evidence.',
      'Stop before widening scope beyond the stated project and objective.',
      'The system may exercise granted authority but may never expand its own authority.'
    ];
    if (AUTHORITY_ORDER.indexOf(authority) >= AUTHORITY_ORDER.indexOf('L5')) {
      stopConditions.push('Stop before integration when exact-head proof or standing founder policy is missing.');
    }
    if (providerWork) stopConditions.push('Stop before provider mutation when project-scoped capability or credential reference is missing.');
    if (production) stopConditions.push('Stop before production mutation when rollback or post-change read-back is unavailable.');

    var compiled = [
      'FOUNDER OS MISSION v1',
      'Founder intent: ' + intent,
      'Project: ' + (project || 'UNRESOLVED_PROJECT'),
      'Risk: ' + risk,
      'Authority ceiling: ' + authority,
      'Protocol stack: ' + protocols.join(' + '),
      'Required proof: ' + evidence.join(', '),
      providers.length ? 'Provider hints: ' + providers.join(', ') : 'Provider hints: none supplied',
      constraints.length ? 'Constraints: ' + constraints.join(' | ') : 'Constraints: preserve unrelated working behavior; do not expose secrets.',
      '',
      'Chief AI: reason, prioritize, decompose, delegate, adapt, and evaluate the goal.',
      'PromptOS: compile protocols, acceptance criteria, evidence requirements, metrics, and stop conditions.',
      'FCR: resolve project authority, execute through scoped adapters, verify, receipt, and roll back.',
      '',
      'Stop conditions:',
      stopConditions.map(function(item){ return '- ' + item; }).join('\n'),
      '',
      'Return: GOAL | REALITY | MISSION PLAN | AUTHORITY | PROOF | METRICS | ROLLBACK | STOP CONDITION | NEXT STATE'
    ].join('\n');

    return Object.freeze({
      version: FOUNDER_OS_VERSION,
      intent: intent,
      project: project || null,
      projectResolution: project ? 'resolved-by-input' : 'required-before-execution',
      risk: risk,
      authorityCeiling: authority,
      protocols: protocols,
      requiredEvidence: evidence,
      providers: providers,
      stopConditions: stopConditions,
      analytics: Object.freeze({
        proofCoverageTargetPercent: 100,
        baselineRequired: analytics,
        postChangeMeasurementRequired: analytics,
        decisionMetric: 'verified goal-state movement, not task-count completed'
      }),
      productDesign: Object.freeze({
        acceptanceContractRequired: ui,
        playwrightRequired: ui,
        requiredStateModel: ui ? ['entry','loading','empty','success','error','blocked','responsive'] : []
      }),
      compiledPrompt: compiled
    });
  }

  window.PROMPTOS_FOUNDER_OS_VERSION = FOUNDER_OS_VERSION;
  window.compilePromptOSMission = compilePromptOSMission;

  function copyText(text){
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function renderMission(result){
    var output = document.getElementById('foOutput');
    var empty = document.getElementById('foEmpty');
    if (!output || !empty) return;
    empty.hidden = true;
    output.hidden = false;
    output.innerHTML =
      '<div class="stat-row" style="margin-bottom:14px">' +
        '<div class="stat"><div class="n">' + esc(result.authorityCeiling) + '</div><div class="l">Authority ceiling</div></div>' +
        '<div class="stat"><div class="n">' + esc(result.risk) + '</div><div class="l">Risk</div></div>' +
        '<div class="stat"><div class="n">' + result.requiredEvidence.length + '</div><div class="l">Proof receipts</div></div>' +
        '<div class="stat"><div class="n">100%</div><div class="l">Proof coverage target</div></div>' +
      '</div>' +
      '<div class="panel" style="margin-bottom:14px">' +
        '<div class="panel-title"><span class="dot"></span>Protocol stack</div>' +
        '<div class="badges">' + result.protocols.map(function(item){ return '<span class="badge">' + esc(item) + '</span>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="split" style="margin-bottom:14px">' +
        '<div class="panel"><div class="panel-title"><span class="dot"></span>Product design gate</div>' +
          '<div style="color:var(--text-muted);font-size:12px;line-height:1.65">' +
          (result.productDesign.acceptanceContractRequired
            ? 'Required. Define the primary flow and interactive states before execution. Playwright proof is mandatory.'
            : 'Not detected from the mission. No UI acceptance contract added automatically.') +
          '</div></div>' +
        '<div class="panel"><div class="panel-title"><span class="dot"></span>Analytics gate</div>' +
          '<div style="color:var(--text-muted);font-size:12px;line-height:1.65">' +
          (result.analytics.baselineRequired
            ? 'Baseline + comparable post-change measurement required before claiming improvement.'
            : 'No outcome-metric claim detected. Proof still targets verified goal-state movement.') +
          '</div></div>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="panel-title"><span class="dot"></span>Compiled mission instruction</div>' +
        '<pre id="foCompiled" style="white-space:pre-wrap;word-break:break-word;font-family:var(--mono);font-size:12px;line-height:1.75;color:#ccd5e0;background:var(--code-bg);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;max-height:420px;overflow:auto">' + esc(result.compiledPrompt) + '</pre>' +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="mini-btn solid" id="foCopy">Copy mission</button><span style="font-size:11px;color:var(--text-faint);align-self:center">Instruction only. FCR still resolves live authority before execution.</span></div>' +
      '</div>';

    var copyButton = document.getElementById('foCopy');
    if (copyButton) copyButton.addEventListener('click', function(){
      copyText(result.compiledPrompt).then(function(){
        copyButton.textContent = 'Copied';
        setTimeout(function(){ copyButton.textContent = 'Copy mission'; }, 1200);
      });
    });
  }

  function injectMissionWorkspace(){
    if (document.getElementById('page-mission')) return;
    var builderNav = document.querySelector('.sidebar .nav-item[data-page="builder"]');
    if (builderNav) builderNav.insertAdjacentHTML('afterend', '<button class="nav-item" data-page="mission">⚙️ Mission Compiler</button>');
    var mobileBuilder = document.querySelector('.mobile-nav .nav-item[data-page="builder"]');
    if (mobileBuilder) mobileBuilder.insertAdjacentHTML('afterend', '<button class="nav-item" data-page="mission">⚙️ Mission</button>');

    var main = document.querySelector('main.main');
    if (!main) return;
    var section = document.createElement('section');
    section.className = 'page';
    section.id = 'page-mission';
    section.innerHTML =
      '<div class="page-head">' +
        '<div class="crumb">promptos <span>/</span> <b>mission-compiler</b></div>' +
        '<h2>Compile founder intent.</h2>' +
        '<p>Turn a goal into a portable Chief AI → PromptOS → FCR mission contract with authority, proof, Product Design, and Data Analytics gates visible before execution.</p>' +
      '</div>' +
      '<div class="split">' +
        '<div class="panel">' +
          '<div class="panel-title"><span class="dot"></span>Founder intent</div>' +
          '<div class="field"><label>Project / repository</label><input id="foProject" value="jussray/Sekret-Bip" autocomplete="off"></div>' +
          '<div class="field"><label>Goal</label><textarea id="foIntent" style="min-height:120px">Finish the onboarding UX and measure whether more users reach the dashboard successfully.</textarea></div>' +
          '<div class="field"><label>Constraints</label><textarea id="foConstraints">Preserve auth behavior, audit main first, smallest reversible fix, Playwright before UI claims.</textarea></div>' +
          '<div class="field"><label>Provider hints</label><input id="foProviders" placeholder="github, cloudflare, supabase"></div>' +
          '<div class="field"><label>Risk override</label><select id="foRisk"><option value="">Infer from mission</option><option>low</option><option>medium</option><option>high</option><option>critical</option></select></div>' +
          '<button class="mini-btn solid" id="foCompile">Compile mission</button>' +
          '<div class="hint">PromptOS compiles the instruction contract. It does not grant itself GitHub, Cloudflare, Supabase, or production authority.</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-title"><span class="dot"></span>Mission contract</div>' +
          '<div id="foEmpty" class="fs-placeholder">Compile the goal to see authority, proof, Product Design, and Analytics gates.</div>' +
          '<div id="foOutput" hidden></div>' +
        '</div>' +
      '</div>';
    main.appendChild(section);

    var compileButton = document.getElementById('foCompile');
    if (compileButton) compileButton.addEventListener('click', function(){
      try {
        var result = compilePromptOSMission({
          project: document.getElementById('foProject').value,
          intent: document.getElementById('foIntent').value,
          constraints: document.getElementById('foConstraints').value,
          providers: document.getElementById('foProviders').value,
          risk: document.getElementById('foRisk').value
        });
        renderMission(result);
      } catch (error) {
        var empty = document.getElementById('foEmpty');
        var output = document.getElementById('foOutput');
        if (output) output.hidden = true;
        if (empty) {
          empty.hidden = false;
          empty.textContent = error instanceof Error ? error.message : String(error);
        }
      }
    });
  }

  injectMissionWorkspace();
})();