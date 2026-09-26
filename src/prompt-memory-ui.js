import {
  LANE_REGISTRY, clearPromptMemory, exportPromptMemory, inferLane, laneContract,
  listPrompts, recordExecution, recordGeneratedPrompt, recordOutcome,
} from './prompt-memory.js';

const UI_VERSION = 'prompt-memory-ui-v1';
const $ = (id) => document.getElementById(id);
const val = (selector) => String(document.querySelector(selector)?.value || '').trim();
const txt = (value) => String(value ?? '').trim();
let outcomeRecord = null;
let rendering = false;

function styles() {
  if (document.querySelector('[data-pm-style]')) return;
  const el = document.createElement('style');
  el.dataset.pmStyle = '1';
  el.textContent = `.pm-note,.pm-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:14px}.pm-note{color:var(--text-muted);font-size:12px;line-height:1.6;margin-bottom:12px}.pm-tools,.pm-meta,.pm-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pm-tools{margin-bottom:12px}.pm-tools select,.pm-form input,.pm-form select,.pm-form textarea{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:8px;color:var(--text)}.pm-sections{display:grid;gap:12px}.pm-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px}.pm-head h3{font-family:var(--mono);font-size:14px}.pm-head p{font-size:11px;color:var(--text-muted);margin-top:3px}.pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(310px,100%),1fr));gap:10px}.pm-card{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;display:grid;gap:8px}.pm-card h4{font-family:var(--mono);font-size:12.5px}.pm-code{font-family:var(--mono);font-size:10px;color:var(--text-muted);white-space:pre-wrap;max-height:92px;overflow:hidden;background:var(--code-bg);padding:8px;border-radius:var(--r-md)}.pm-empty{padding:18px;text-align:center;color:var(--text-faint);font-family:var(--mono);font-size:11px;border:1px dashed var(--border-2);border-radius:var(--r-md)}#pmOutcomeDialog{width:min(640px,calc(100vw - 24px));background:var(--surface);color:var(--text);border:1px solid var(--border-2);border-radius:16px;padding:0}#pmOutcomeDialog::backdrop{background:var(--scrim)}.pm-form{padding:18px;display:grid;gap:10px}.pm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pm-field{display:grid;gap:4px;font-size:11px;color:var(--text-muted)}.pm-field.full{grid-column:1/-1}.pm-field textarea{min-height:64px}.pm-actions{justify-content:flex-end}@media(max-width:650px){.pm-form-grid{grid-template-columns:1fr}.pm-field.full{grid-column:auto}}`;
  document.head.appendChild(el);
}

function nav(show) {
  for (const [selector, mobile] of [['.sidebar [data-page="library"]', false], ['.mobile-nav [data-page="library"]', true]]) {
    const anchor = document.querySelector(selector);
    const parent = mobile ? '.mobile-nav' : '.sidebar';
    if (!anchor || document.querySelector(`${parent} [data-page="prompt-memory"]`)) continue;
    const b = document.createElement('button');
    b.className = 'nav-item'; b.dataset.page = 'prompt-memory'; b.type = 'button';
    b.innerHTML = mobile ? '🧠 Memory' : '🧠 Prompt Memory <span class="n-count" id="pmNavCount">0</span>';
    b.addEventListener('click', show); anchor.insertAdjacentElement('afterend', b);
  }
}

function page() {
  const el = document.createElement('section');
  el.className = 'page'; el.id = 'page-prompt-memory';
  el.innerHTML = `<div class="page-head"><div class="crumb">promptos <span>/</span> <b>prompt memory</b></div><h2>Every prompt leaves a receipt.</h2><p>Each lane owns its own North Star. Founder-intended outcome, not raw engagement, decides promotion.</p></div>
  <div class="stat-row"><div class="stat"><div class="n" id="pmTotal">0</div><div class="l">Recorded</div></div><div class="stat"><div class="n" id="pmProven">0</div><div class="l">Proven</div></div><div class="stat"><div class="n" id="pmRevision">0</div><div class="l">Revision</div></div><div class="stat"><div class="n" id="pmLanes">0</div><div class="l">Active lanes</div></div></div>
  <div class="pm-note"><b>Local-first truth:</b> prompt memory persists in this browser profile with IndexedDB. Founder Control Room is the intended canonical sync authority, but FCR sync is <b>not connected</b> here yet. Sol, Chief, and FCR routes are recommendations only until an execution receipt exists.</div>
  <div class="pm-tools"><select id="pmLane"><option value="">All lanes</option></select><button class="mini-btn" id="pmExport">Export memory</button><button class="mini-btn" id="pmClear">Clear local memory</button></div>
  <div class="pm-sections"><section class="pm-box"><div class="pm-head"><div><h3>✨ Proven Visual Library</h3><p>Only prompts explicitly proven to satisfy founder intent are reusable here.</p></div><span class="badge" id="pmProvenCount">0</span></div><div class="pm-grid" id="pmProvenGrid"></div></section>
  <section class="pm-box"><div class="pm-head"><div><h3>🛠 Revision Memory</h3><p>Generated, pending, and missed prompts stay here with their evidence and lineage.</p></div><span class="badge" id="pmRevisionCount">0</span></div><div class="pm-grid" id="pmRevisionGrid"></div></section></div>`;
  return el;
}

function dialog() {
  const d = document.createElement('dialog'); d.id = 'pmOutcomeDialog';
  d.innerHTML = `<form class="pm-form" id="pmOutcomeForm"><div class="pm-head"><div><div class="crumb">prompt memory / outcome</div><h3 id="pmOutcomeTitle">Record outcome</h3></div><button class="icon-btn" id="pmOutcomeClose" type="button">✕</button></div><div class="pm-form-grid">
  <label class="pm-field"><span>Founder intent result</span><select id="pmOutcomeResult"><option value="pending">Pending</option><option value="success">Satisfied</option><option value="miss">Did not satisfy</option></select></label><label class="pm-field"><span>Lane metric</span><select id="pmOutcomeMetric"></select></label>
  <label class="pm-field"><span>Observed value</span><input id="pmOutcomeValue" placeholder="6 qualified replies"></label><label class="pm-field"><span>Attribution</span><select id="pmOutcomeAttribution"><option value="unknown">Unknown / mixed</option><option value="prompt">Prompt</option><option value="executor">Executor</option><option value="channel">Channel</option><option value="timing">Timing</option><option value="audience">Audience</option></select></label>
  <label class="pm-field"><span>Executor</span><input id="pmOutcomeExecutor" placeholder="Sol, Chief, FCR"></label><label class="pm-field"><span>Channel</span><input id="pmOutcomeChannel" placeholder="LinkedIn, Facebook, GitHub"></label>
  <label class="pm-field full"><span>Published/result artifact or execution receipt</span><input id="pmOutcomeArtifact" placeholder="URL, post id, PR, trace"></label><label class="pm-field full"><span>Evidence reference</span><input id="pmOutcomeEvidence" placeholder="analytics receipt, screenshot, metric source"></label><label class="pm-field full"><span>What happened / what to revise</span><textarea id="pmOutcomeNote"></textarea></label></div><div class="pm-actions"><button class="mini-btn" id="pmOutcomeCancel" type="button">Cancel</button><button class="mini-btn solid" id="pmOutcomeSave" type="submit">Save outcome</button></div></form>`;
  return d;
}

function empty(message) { const e = document.createElement('div'); e.className = 'pm-empty'; e.textContent = message; return e; }

function card(record) {
  const lane = laneContract(record.laneId); const c = document.createElement('article');
  c.className = 'pm-card'; c.dataset.promptMemoryId = record.id;
  c.innerHTML = `<div class="pm-meta"><span class="badge pm-lane"></span><span class="badge pm-version"></span><span class="badge pm-status"></span></div><h4></h4><div class="pm-code"></div><div class="pm-meta"><span class="badge pm-north"></span></div><div class="pm-meta"><small class="pm-proof"></small></div><div class="pm-actions"><button class="mini-btn pm-copy" type="button">Copy</button><button class="mini-btn solid pm-outcome" type="button">Record outcome</button></div>`;
  c.querySelector('.pm-lane').textContent = lane.title; c.querySelector('.pm-version').textContent = `v${record.version}`; c.querySelector('.pm-status').textContent = record.status.replaceAll('_', ' '); c.querySelector('h4').textContent = record.title; c.querySelector('.pm-code').textContent = record.promptText; c.querySelector('.pm-north').textContent = `North Star: ${record.northStar?.metric || lane.northStar}`;
  const o = record.outcomes?.at(-1); const x = record.executions?.at(-1); c.querySelector('.pm-proof').textContent = `Evidence: ${o?.evidenceRef || x?.artifactRef || 'none yet'} · Route: ${(record.route?.recommendedExecutors || []).join(' → ')}`;
  c.querySelector('.pm-copy').addEventListener('click', () => navigator.clipboard?.writeText(record.promptText)); c.querySelector('.pm-outcome').addEventListener('click', () => openOutcome(record)); return c;
}

async function render() {
  if (rendering || !$('page-prompt-memory')) return; rendering = true;
  try {
    const laneId = $('pmLane').value; const visible = await listPrompts({laneId}); const all = await listPrompts();
    const proven = visible.filter((r) => r.libraryVisibility === 'visual'); const revision = visible.filter((r) => r.libraryVisibility !== 'visual');
    $('pmTotal').textContent = all.length; $('pmProven').textContent = all.filter((r) => r.libraryVisibility === 'visual').length; $('pmRevision').textContent = all.filter((r) => r.libraryVisibility !== 'visual').length; $('pmLanes').textContent = new Set(all.map((r) => r.laneId)).size; $('pmProvenCount').textContent = proven.length; $('pmRevisionCount').textContent = revision.length; if ($('pmNavCount')) $('pmNavCount').textContent = all.length;
    $('pmProvenGrid').replaceChildren(...(proven.length ? proven.map(card) : [empty('No proven prompts yet.') ])); $('pmRevisionGrid').replaceChildren(...(revision.length ? revision.map(card) : [empty('No prompts waiting for evidence or revision.') ]));
  } finally { rendering = false; }
}

function openOutcome(record) {
  outcomeRecord = record; $('pmOutcomeTitle').textContent = record.title; $('pmOutcomeMetric').replaceChildren(...laneContract(record.laneId).metrics.map((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m; o.selected = m === record.northStar?.metric; return o; })); $('pmOutcomeResult').value = 'pending'; $('pmOutcomeValue').value = ''; $('pmOutcomeAttribution').value = 'unknown'; $('pmOutcomeExecutor').value = ''; $('pmOutcomeChannel').value = record.route?.channel || ''; $('pmOutcomeArtifact').value = ''; $('pmOutcomeEvidence').value = ''; $('pmOutcomeNote').value = ''; $('pmOutcomeDialog').showModal();
}

async function saveOutcome(event) {
  event.preventDefault(); if (!outcomeRecord) return; const result = $('pmOutcomeResult').value; const executor = txt($('pmOutcomeExecutor').value); const channel = txt($('pmOutcomeChannel').value); const artifactRef = txt($('pmOutcomeArtifact').value); let executionRef = '';
  if (executor || channel || artifactRef) { const updated = await recordExecution(outcomeRecord.id, {executor: executor || 'unknown', channel, artifactRef, status: result === 'miss' ? 'failed' : artifactRef ? 'published' : 'produced', note: txt($('pmOutcomeNote').value)}); executionRef = updated.executions.at(-1)?.id || ''; }
  await recordOutcome(outcomeRecord.id, {metric: $('pmOutcomeMetric').value, value: txt($('pmOutcomeValue').value), founderIntentSatisfied: result === 'success' ? true : result === 'miss' ? false : null, attribution: $('pmOutcomeAttribution').value, channel, executionRef, evidenceRef: txt($('pmOutcomeEvidence').value) || artifactRef, note: txt($('pmOutcomeNote').value)}); $('pmOutcomeDialog').close(); outcomeRecord = null; await render();
}

async function capture(input) { try { return await recordGeneratedPrompt(input); } catch (error) { console.error('[PromptOS Prompt Memory] capture failed', error); return null; } }
function captureCatalog(event) { if (event.detail?.event !== 'compile_ready') return; const promptText = txt($('catalogOutput')?.textContent); if (!promptText) return; const familyId = txt($('catalogDialogFamily')?.textContent) || event.detail.familyId || ''; const title = txt($('catalogDialogTitle')?.textContent) || `${familyId} prompt`; capture({promptText, title, laneId: inferLane({familyId}), workflowId: familyId, founderIntent: val('[data-catalog-input="goal"]') || title, channel: val('[data-catalog-input="channel"]'), source:{surface:'catalog', familyId, platform:event.detail.platform, stage:event.detail.stage}}); }
function captureBuilder() { const promptText = txt($('builderOut')?.textContent); const task = val('#bTask'); const pack = val('#bPack'); if (promptText) capture({promptText,title:task.slice(0,80)||'Builder prompt',pack,category:pack,workflowId:`builder.${pack||'general'}`,founderIntent:task||'Builder prompt outcome',source:{surface:'builder',platform:val('#bPlatform').toLowerCase()||null}}); }
function captureFreestyle() { const promptText = txt($('fsBody')?.textContent); if (!promptText || !$('fsPreview')?.classList.contains('on')) return; const title = txt($('fsTitle')?.textContent) || val('#fsAsk') || 'Freestyle prompt'; const category = txt($('fsSub')?.textContent).split('·')[0].trim(); capture({promptText,title,category,workflowId:`freestyle.${category||'general'}`,founderIntent:val('#fsAsk')||title,source:{surface:'freestyle'}}); }
function captureCustom() { const promptText = val('#cBody'); const title = val('#cTitle') || 'Custom prompt'; const category = val('#cCat'); if (promptText) capture({promptText,title,category,workflowId:`custom.${category||'general'}`,founderIntent:val('#cSub')||title,source:{surface:'custom'}}); }

function wireCapture() {
  window.addEventListener('promptos:catalog', captureCatalog); document.addEventListener('click', (event) => { const id = event.target?.closest?.('button')?.id || ''; if (['copyBuilder','saveBuilder'].includes(id)) captureBuilder(); if (['fsGenerate','fsRegenerate'].includes(id)) setTimeout(captureFreestyle,0); if (['fsCopy','fsSave'].includes(id)) captureFreestyle(); if (id === 'saveCustom') captureCustom(); }, true);
  window.addEventListener('promptos:prompt-generated', (e) => e.detail && capture(e.detail)); window.addEventListener('promptos:prompt-executed', (e) => e.detail?.promptId && recordExecution(e.detail.promptId,e.detail).catch(console.error)); window.addEventListener('promptos:prompt-outcome', (e) => e.detail?.promptId && recordOutcome(e.detail.promptId,e.detail).catch(console.error));
}

function show() { document.querySelectorAll('.page').forEach((p) => p.classList.remove('on')); $('page-prompt-memory').classList.add('on'); document.querySelectorAll('.nav-item[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === 'prompt-memory')); render(); }
async function exportMemory() { const data = await exportPromptMemory(); const blob = new Blob([`${JSON.stringify(data,null,2)}\n`],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'promptos-prompt-memory.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),0); }

function mount() {
  if ($('page-prompt-memory')) return; styles(); const main = document.querySelector('.main'); if (!main) return; main.appendChild(page()); document.body.appendChild(dialog()); nav(show); const lane = $('pmLane'); for (const item of Object.values(LANE_REGISTRY)) { const o = document.createElement('option'); o.value = item.id; o.textContent = `${item.title} · ${item.northStar}`; lane.appendChild(o); } lane.addEventListener('change',render); $('pmExport').addEventListener('click',exportMemory); $('pmClear').addEventListener('click',async()=>{if(confirm('Clear all Prompt Memory records stored in this browser? Export first if you need a backup.')){await clearPromptMemory();await render();}}); $('pmOutcomeForm').addEventListener('submit',saveOutcome); $('pmOutcomeClose').addEventListener('click',()=>$('pmOutcomeDialog').close()); $('pmOutcomeCancel').addEventListener('click',()=>$('pmOutcomeDialog').close()); window.addEventListener('promptos:prompt-memory-changed',render); wireCapture(); render();
}

window.PromptOSPromptMemory = Object.freeze({version:UI_VERSION,recordGeneratedPrompt,recordExecution,recordOutcome,listPrompts,exportPromptMemory,inferLane,laneContract,clearPromptMemory});
mount();
