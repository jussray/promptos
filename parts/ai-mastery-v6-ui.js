import { MODES, compileV6Prompt, buildPromptOSSignal, validateFounderSignal } from '../src/ai-mastery-v6.mjs';

const MODE_LABELS = {
  'mission-sprint': 'Deep Work / Mission Sprint',
  'goal-to-action': 'Goal-to-Action Planner',
  'task-prioritizer': 'Smart Task Prioritizer',
  'meeting-to-action': 'Meeting-to-Action Assistant',
  'learning-accelerator': 'Learning Accelerator',
  'email-efficiency': 'Email Efficiency Expert',
  'workflow-optimizer': 'Workflow Optimizer',
  'daily-progress-review': 'Daily Progress Review',
};
const $ = (selector) => document.querySelector(selector);

function installStyles() {
  if ($('#aiMasteryV6Styles')) return;
  const style = document.createElement('style');
  style.id = 'aiMasteryV6Styles';
  style.textContent = `
    #page-mastery .v6-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
    #page-mastery .v6-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;min-width:0}
    #page-mastery .v6-field{display:grid;gap:6px;margin:12px 0}
    #page-mastery .v6-field label{font:600 11px var(--mono);color:var(--text-muted);letter-spacing:.04em}
    #page-mastery input,#page-mastery select,#page-mastery textarea{width:100%;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r-md);padding:10px;color:var(--text);font:12px var(--sans)}
    #page-mastery textarea{min-height:104px;resize:vertical;line-height:1.55}
    #page-mastery .v6-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    #page-mastery .v6-output{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--code-bg);border:1px solid var(--border);border-radius:var(--r-md);padding:13px;min-height:140px;max-height:430px;overflow:auto;font:11px/1.65 var(--mono);color:var(--text)}
    #page-mastery .v6-note{border-left:3px solid var(--accent-yellow);background:var(--primary-dim);padding:10px 12px;margin:12px 0;color:var(--text-muted);font-size:12px}
    #page-mastery .v6-status{font:600 11px var(--mono);color:var(--primary);margin-top:10px;min-height:18px}
    #page-mastery .v6-section{font:700 12px var(--mono);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
    #page-mastery .v6-full{grid-column:1/-1}
    @media(max-width:760px){#page-mastery .v6-grid{grid-template-columns:1fr}#page-mastery .v6-full{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

function installPage() {
  const sidebar = $('.sidebar');
  const mobile = $('.mobile-nav');
  const builder = $('#page-builder');
  const main = $('.main');
  if (!sidebar || !mobile || !builder || !main) return false;

  for (const nav of [sidebar, mobile]) {
    if (nav.querySelector('[data-page="mastery"]')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-item';
    button.dataset.page = 'mastery';
    button.textContent = nav.classList.contains('mobile-nav') ? 'V6 Mastery' : 'AI Mastery V6';
    const anchor = nav.querySelector('[data-page="builder"]');
    if (anchor?.parentNode) anchor.parentNode.insertBefore(button, anchor.nextSibling);
    else nav.appendChild(button);
  }

  if (!$('#page-mastery')) {
    builder.insertAdjacentHTML('afterend', `
      <section class="page" id="page-mastery" aria-labelledby="v6Title">
        <div class="page-head">
          <div class="crumb">promptos <span>/</span> <b>ai-mastery-v6</b></div>
          <h2 id="v6Title">AI Mastery V6</h2>
          <p>Compile founder intent, receive advisory proposals from Chief or FCR, and prepare governed handoffs without transferring authority.</p>
        </div>
        <div class="v6-note"><b>Authority boundary:</b> This workspace compiles prompts and advisory JSON only. It does not authenticate a sender, contact Chief/FCR, approve actions, execute tools, merge, deploy, or publish.</div>
        <div class="v6-grid">
          <section class="v6-panel">
            <div class="v6-section">01 · Founder intent</div>
            <div class="v6-field"><label for="v6Mode">Specialist mode</label><select id="v6Mode"></select></div>
            <div class="v6-field"><label for="v6Intent">Intent / command</label><input id="v6Intent" value="repair verify workflow" maxlength="120"></div>
            <div class="v6-field"><label for="v6Goal">Desired outcome</label><textarea id="v6Goal" placeholder="Describe the outcome, not just the activity.">Connect the approved AI Mastery V6 workflow to the real PromptOS application and governed Chief/FCR handoffs.</textarea></div>
            <div class="v6-actions"><button class="mini-btn solid" id="v6Compile" type="button">Compile V6 prompt</button><button class="mini-btn" id="v6CopyPrompt" type="button">Copy prompt</button></div>
            <div class="v6-status" id="v6CompileStatus" role="status" aria-live="polite"></div>
          </section>
          <section class="v6-panel">
            <div class="v6-section">02 · Compiled workflow</div>
            <pre class="v6-output" id="v6PromptOutput" aria-label="Compiled V6 prompt">Compile a founder intent to preview the approved V6 protocol.</pre>
          </section>
          <section class="v6-panel">
            <div class="v6-section">03 · Receive Chief / FCR proposal</div>
            <div class="v6-field"><label for="v6Inbound">Paste inbound JSON signal</label><textarea id="v6Inbound" placeholder='{"contract":"juss/founder-signal@v1","source":"chief","target":"promptos","intent":"plan","goal":"..."}'></textarea></div>
            <div class="v6-actions"><button class="mini-btn solid" id="v6Receive" type="button">Validate &amp; compile proposal</button></div>
            <div class="v6-status" id="v6ReceiveStatus" role="status" aria-live="polite"></div>
            <pre class="v6-output" id="v6InboundOutput">No inbound proposal received in this session.</pre>
          </section>
          <section class="v6-panel">
            <div class="v6-section">04 · Prepare outbound handoff</div>
            <div class="v6-field"><label for="v6Target">Recipient</label><select id="v6Target"><option value="fcr">Founder Control Room (authority &amp; execution)</option><option value="chief">Chief (reasoning &amp; decomposition)</option></select></div>
            <div class="v6-note">Outbound signals are advisory. Approval is always false, authority is none, and evidence remains UNKNOWN until independently established by the receiving system.</div>
            <div class="v6-actions"><button class="mini-btn solid" id="v6BuildSignal" type="button">Build handoff JSON</button><button class="mini-btn" id="v6CopySignal" type="button">Copy handoff</button></div>
            <div class="v6-status" id="v6SignalStatus" role="status" aria-live="polite"></div>
            <pre class="v6-output" id="v6SignalOutput">No outbound signal prepared.</pre>
          </section>
          <section class="v6-panel v6-full">
            <div class="v6-section">Operating contract</div>
            <div class="v6-output">TRUTHMODE → CONFESS → 5W1H → BILLGATES → ELONMUSK → GARYVEE → ULTRATHINK → RED TEAM I → RED TEAM TWIN → LINDY → L99 → RED TEAM II → OODA → GOALFIX → ATTACK TEN → PROOF → CONTINUITY

Chief: interpret, reason, prioritize and propose.
PromptOS: own the V6 workflow, compiler and signal contract.
FCR: resolve current project authority, execute only approved capabilities, verify outcomes and issue receipts.

Fingerprints and SHA-256 signal hashes are integrity/continuity markers only. They are not signatures, sender authentication, consent, approval or execution authority.</div>
          </section>
        </div>
      </section>`);
  }
  return true;
}

async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}
  const field = document.createElement('textarea');
  field.value = value;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  return copied;
}

function activatePage(name) {
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('on', page.id === `page-${name}`));
  document.querySelectorAll('.nav-item[data-page]').forEach((button) => button.classList.toggle('active', button.dataset.page === name));
}

function setStatus(selector, message) {
  const element = $(selector);
  if (element) element.textContent = message;
}

function readIntent() {
  return {
    contract: 'juss/founder-signal@v1',
    source: 'founder',
    target: 'promptos',
    intent: $('#v6Intent').value.trim(),
    goal: $('#v6Goal').value.trim(),
    evidenceClass: 'unknown',
    authority: 'none',
    approved: false,
    requestedMode: $('#v6Mode').value,
  };
}

function renderCompile(result, output = '#v6PromptOutput', status = '#v6CompileStatus') {
  if (!result.selected || !result.prompt) {
    $(output).textContent = `Not compiled: ${result.reason}. ${(result.errors || []).join('; ')}`;
    setStatus(status, 'Blocked: intent or requested mode did not validate.');
    return false;
  }
  $(output).textContent = result.prompt;
  setStatus(status, `Compiled ${result.mode}. Advisory only; no authority transferred.`);
  return true;
}

async function init() {
  installStyles();
  if (!installPage()) return;
  const mode = $('#v6Mode');
  for (const item of MODES) {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = MODE_LABELS[item] || item;
    mode.appendChild(option);
  }

  document.querySelectorAll('[data-page="mastery"]').forEach((button) => {
    button.addEventListener('click', () => activatePage('mastery'));
  });
  $('#v6Compile').addEventListener('click', () => renderCompile(compileV6Prompt(readIntent())));
  $('#v6CopyPrompt').addEventListener('click', async () => {
    const value = $('#v6PromptOutput').textContent;
    if (!value || value.startsWith('Compile a founder intent')) return;
    setStatus('#v6CompileStatus', await copyText(value) ? 'Prompt copied.' : 'Clipboard unavailable; select and copy the output.');
  });
  $('#v6Receive').addEventListener('click', () => {
    try {
      const raw = JSON.parse($('#v6Inbound').value);
      const input = {
        ...raw,
        requestedMode: raw.requestedMode || raw.selectedMode || '',
        evidenceClass: raw.evidenceClass || 'unknown',
      };
      const checked = validateFounderSignal(input);
      if (!checked.valid) {
        $('#v6InboundOutput').textContent = JSON.stringify({valid:false, errors:checked.errors}, null, 2);
        setStatus('#v6ReceiveStatus', 'Rejected: inbound signal contract invalid.');
        return;
      }
      const compiled = compileV6Prompt(input);
      if (!compiled.selected) {
        $('#v6InboundOutput').textContent = JSON.stringify({valid:true, selected:false, reason:compiled.reason, errors:compiled.errors}, null, 2);
        setStatus('#v6ReceiveStatus', 'Received but not routed: no safe specialist match.');
        return;
      }
      $('#v6InboundOutput').textContent = JSON.stringify({
        valid: true,
        senderClaim: checked.signal.source,
        senderAuthenticated: false,
        signalFingerprintVerified: false,
        approvalClaim: checked.signal.approved,
        approvalVerified: false,
        executionAuthorized: false,
        authorityEffect: 'none',
        selectedMode: compiled.mode,
        goal: checked.signal.goal,
        compiledPrompt: compiled.prompt,
      }, null, 2);
      setStatus('#v6ReceiveStatus', 'Proposal parsed and compiled. Sender and approval remain unverified.');
    } catch (error) {
      $('#v6InboundOutput').textContent = JSON.stringify({valid:false, error: error instanceof Error ? error.message : 'invalid JSON'}, null, 2);
      setStatus('#v6ReceiveStatus', 'Rejected: inbound content is not valid JSON.');
    }
  });
  $('#v6BuildSignal').addEventListener('click', async () => {
    try {
      const input = readIntent();
      const signal = await buildPromptOSSignal({
        target: $('#v6Target').value,
        intent: input.intent,
        goal: input.goal,
        evidenceClass: 'unknown',
        authority: 'none',
        approved: false,
        mode: input.requestedMode,
      });
      $('#v6SignalOutput').textContent = JSON.stringify(signal, null, 2);
      setStatus('#v6SignalStatus', `Prepared advisory signal for ${signal.target}. Not transmitted.`);
    } catch (error) {
      $('#v6SignalOutput').textContent = error instanceof Error ? error.message : 'Signal creation failed.';
      setStatus('#v6SignalStatus', 'Signal creation failed.');
    }
  });
  $('#v6CopySignal').addEventListener('click', async () => {
    const value = $('#v6SignalOutput').textContent;
    if (!value || value.startsWith('No outbound signal')) return;
    setStatus('#v6SignalStatus', await copyText(value) ? 'Handoff JSON copied.' : 'Clipboard unavailable; select and copy the output.');
  });
  window.PROMPTOS_AI_MASTERY_V6_UI_VERSION = 'promptos-ai-mastery-v6-ui-v1';
}

init().catch((error) => {
  console.error('[PromptOS AI Mastery V6] initialization failed', error);
});
