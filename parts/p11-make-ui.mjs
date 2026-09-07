import {compileWorkflowArtifact, validateWorkflowArtifact} from '../src/workflow-artifact.mjs';

const MAKE_UI_VERSION = 'promptos-make-ui-v1';

function list(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}

function currentMission() {
  if (typeof window.compilePromptOSMission !== 'function') {
    throw new Error('Founder OS mission compiler is unavailable.');
  }
  return window.compilePromptOSMission({
    project: document.getElementById('foProject')?.value || '',
    intent: document.getElementById('foIntent')?.value || '',
    constraints: document.getElementById('foConstraints')?.value || '',
    providers: document.getElementById('foProviders')?.value || '',
    risk: document.getElementById('foRisk')?.value || '',
  });
}

function renderDraft(workflow) {
  const status = document.getElementById('foWorkflowStatus');
  const gate = document.getElementById('foWorkflowGate');
  const output = document.getElementById('foWorkflowDraft');
  const copy = document.getElementById('foWorkflowCopy');
  if (!status || !gate || !output || !copy) return;

  status.hidden = false;
  status.innerHTML = [
    `<span class="badge">${workflow.id}@${workflow.version}</span>`,
    `<span class="badge">${workflow.status.toUpperCase()}</span>`,
    `<span class="badge">authority ${workflow.sourceMission.authorityCeiling}</span>`,
    `<span class="badge">lineage ${workflow.lineage.length || 0}</span>`,
  ].join('');
  gate.hidden = false;
  gate.textContent = 'Founder approval required before registry promotion. This preview cannot self-register or widen authority.';
  output.hidden = false;
  output.textContent = JSON.stringify(workflow, null, 2);
  copy.hidden = false;
}

function renderError(error) {
  const gate = document.getElementById('foWorkflowGate');
  const output = document.getElementById('foWorkflowDraft');
  const status = document.getElementById('foWorkflowStatus');
  const copy = document.getElementById('foWorkflowCopy');
  if (status) status.hidden = true;
  if (output) output.hidden = true;
  if (copy) copy.hidden = true;
  if (gate) {
    gate.hidden = false;
    gate.textContent = error instanceof Error ? error.message : String(error);
  }
}

function injectMakeUI() {
  if (document.getElementById('foMake')) return;
  const missionPage = document.getElementById('page-mission');
  const intentPanel = missionPage?.querySelector('.split > .panel');
  if (!missionPage || !intentPanel) {
    throw new Error('Mission Compiler workspace is unavailable for /MAKE.');
  }

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.marginTop = '14px';
  panel.setAttribute('data-promptos-make-ui', MAKE_UI_VERSION);
  panel.innerHTML =
    '<div class="panel-title"><span class="dot"></span>/MAKE workflow draft</div>' +
    '<div class="field"><label>Workflow ID</label><input id="foWorkflowId" placeholder="repair-user-path" autocomplete="off"></div>' +
    '<div class="field"><label>Aliases</label><input id="foWorkflowAliases" placeholder="/goalfix, repair login" autocomplete="off"></div>' +
    '<div class="field"><label>Lineage</label><input id="foWorkflowLineage" value="ultrathink, goalfix" autocomplete="off"></div>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<button class="mini-btn solid" id="foMake">/MAKE workflow draft</button>' +
      '<button class="mini-btn" id="foWorkflowCopy" hidden>Copy workflow</button>' +
    '</div>' +
    '<div class="badges" id="foWorkflowStatus" hidden style="margin-top:12px"></div>' +
    '<div class="hint" id="foWorkflowGate" hidden style="margin-top:10px"></div>' +
    '<pre id="foWorkflowDraft" hidden style="white-space:pre-wrap;word-break:break-word;font-family:var(--mono);font-size:11px;line-height:1.65;color:#ccd5e0;background:var(--code-bg);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;max-height:360px;overflow:auto;margin-top:12px"></pre>';
  intentPanel.appendChild(panel);

  const makeButton = document.getElementById('foMake');
  const copyButton = document.getElementById('foWorkflowCopy');

  makeButton?.addEventListener('click', () => {
    try {
      const mission = currentMission();
      const workflow = compileWorkflowArtifact(mission, {
        id: document.getElementById('foWorkflowId')?.value || undefined,
        aliases: list(document.getElementById('foWorkflowAliases')?.value),
        lineage: list(document.getElementById('foWorkflowLineage')?.value),
      });
      const validation = validateWorkflowArtifact(workflow);
      if (!validation.valid) {
        throw new Error(`Workflow draft failed validation: ${validation.errors.join(' | ')}`);
      }
      renderDraft(workflow);
    } catch (error) {
      renderError(error);
    }
  });

  copyButton?.addEventListener('click', () => {
    const output = document.getElementById('foWorkflowDraft');
    if (!output || output.hidden) return;
    copyText(output.textContent || '').then(() => {
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = 'Copy workflow'; }, 1200);
    });
  });
}

window.PROMPTOS_WORKFLOW_MAKER_UI_VERSION = MAKE_UI_VERSION;
injectMakeUI();
