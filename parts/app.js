/* PromptOS — Full App Runtime + Gist Device Sync
   State: stars, custom prompts, theme, last tab
   Sync:  GitHub Gist (token-gated, opt-in)
   Fallback: in-memory only (sandbox-safe, no localStorage)
*/
(function(){
'use strict';

/* ── 1. IN-MEMORY STATE (no localStorage — sandbox-safe) ──────────── */
var STATE = {
  stars: {},          // { [promptId]: true }
  custom: [],         // [{id,emoji,title,sub,cat,platforms,body,ts}]
  theme: 'dark',
  page: 'library',
  filter: 'all',
  search: '',n  sync: { token: '', gistId: '', status: 'idle', lastSynced: null }
};

/* ── 2. GIST SYNC ENGINE ──────────────────────────────────────────── */
var GIST_FILENAME = 'promptos-state.json';

function gistHeaders(token){
  return { 'Authorization': 'token ' + token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' };
}

function syncPayload(){
  return JSON.stringify({ stars: STATE.stars, custom: STATE.custom, theme: STATE.theme, _v: Date.now() }, null, 2);
}

async function gistPush(){
  var t = STATE.sync.token, g = STATE.sync.gistId;
  if (!t) return;
  setSyncStatus('saving');
  try {
    var body = { files: {} };
    body.files[GIST_FILENAME] = { content: syncPayload() };
    var url, method;
    if (g) { url = 'https://api.github.com/gists/' + g; method = 'PATCH'; }
    else    { url = 'https://api.github.com/gists'; method = 'POST'; body.description = 'PromptOS device sync'; body.public = false; }
    var res = await fetch(url, { method: method, headers: gistHeaders(t), body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    STATE.sync.gistId = data.id;
    STATE.sync.lastSynced = new Date();
    setSyncStatus('ok');
    toast('☁️ Synced to Gist');
  } catch(e) {
    setSyncStatus('error');
    toast('⚠️ Sync failed: ' + e.message);
  }
}

async function gistPull(){
  var t = STATE.sync.token, g = STATE.sync.gistId;
  if (!t || !g) return;
  setSyncStatus('loading');
  try {
    var res = await fetch('https://api.github.com/gists/' + g, { headers: gistHeaders(t) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var file = data.files[GIST_FILENAME];
    if (!file) throw new Error('No state file in Gist');
    var remote = JSON.parse(file.content);
    /* Merge: remote wins on conflicts, local custom prompts are union-merged */
    if (remote.stars)  STATE.stars  = Object.assign({}, remote.stars);
    if (remote.theme)  STATE.theme  = remote.theme;
    if (Array.isArray(remote.custom)) {
      var ids = new Set(STATE.custom.map(function(p){ return p.id; }));
      remote.custom.forEach(function(p){ if (!ids.has(p.id)) STATE.custom.push(p); });
    }
    STATE.sync.lastSynced = new Date();
    setSyncStatus('ok');
    applyTheme(STATE.theme);
    renderAll();
    toast('☁️ Pulled from Gist');
  } catch(e) {
    setSyncStatus('error');
    toast('⚠️ Pull failed: ' + e.message);
  }
}

async function gistFindOrCreate(){
  var t = STATE.sync.token;
  if (!t) return;
  setSyncStatus('loading');
  try {
    /* List user's gists and find ours */
    var res = await fetch('https://api.github.com/gists?per_page=100', { headers: gistHeaders(t) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var list = await res.json();
    var found = list.find(function(g){ return g.files && g.files[GIST_FILENAME]; });
    if (found) {
      STATE.sync.gistId = found.id;
      await gistPull();
    } else {
      await gistPush();
    }
  } catch(e) {
    setSyncStatus('error');
    toast('⚠️ Gist connect failed: ' + e.message);
  }
}

function setSyncStatus(s){
  STATE.sync.status = s;
  var dot = document.getElementById('syncDot');
  var lbl = document.getElementById('syncLabel');
  if (!dot || !lbl) return;
  var map = { idle: ['#575552','Sync off'], saving: ['var(--accent-yellow)','Saving…'], loading: ['var(--accent-blue)','Pulling…'], ok: ['var(--accent-green)','Synced'], error: ['var(--accent-red)','Sync error'] };
  var m = map[s] || map.idle;
  dot.style.background = m[0];
  lbl.textContent = m[1];
  if (STATE.sync.lastSynced && s === 'ok') {
    var d = STATE.sync.lastSynced;
    lbl.textContent = 'Synced ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
  }
}

/* ── 3. BENCH DATA ────────────────────────────────────────────────── */
var BENCH = [
  {task:'Long-form research report',gpt:'★★★★☆',cla:'★★★★★',per:'★★★★☆',best:'Claude'},
  {task:'Code review / debug',gpt:'★★★★☆',cla:'★★★★★',per:'★★☆☆☆',best:'Claude'},
  {task:'Live web search',gpt:'★★★☆☆',cla:'★★☆☆☆',per:'★★★★★',best:'Perplexity'},
  {task:'System prompt engineering',gpt:'★★★★☆',cla:'★★★★★',per:'★★★☆☆',best:'Claude'},
  {task:'Multimodal image analysis',gpt:'★★★★★',cla:'★★★★☆',per:'★★☆☆☆',best:'ChatGPT'},
  {task:'Competitor / market research',gpt:'★★★☆☆',cla:'★★★☆☆',per:'★★★★★',best:'Perplexity'},
  {task:'Creative writing',gpt:'★★★★★',cla:'★★★★☆',per:'★★☆☆☆',best:'ChatGPT'},
  {task:'Data analysis + Python',gpt:'★★★★★',cla:'★★★★☆',per:'★★☆☆☆',best:'ChatGPT'},
  {task:'Structured XML/JSON output',gpt:'★★★★☆',cla:'★★★★★',per:'★★★☆☆',best:'Claude'},
  {task:'Real-time pricing / stock',gpt:'★★☆☆☆',cla:'★★☆☆☆',per:'★★★★★',best:'Perplexity'},
  {task:'Figma / Canva connector ops',gpt:'★★☆☆☆',cla:'★★★★★',per:'★☆☆☆☆',best:'Claude'},
  {task:'Shopify admin automation',gpt:'★★★☆☆',cla:'★★★★★',per:'★★☆☆☆',best:'Claude'}
];

/* ── 4. CATEGORY ACCENT COLOURS ──────────────────────────────────── */
var CAT_COLOR = {
  coding:   'var(--primary)',
  research: 'var(--accent-blue)',
  redteam:  'var(--accent-red)',
  system:   'var(--accent-purple)',
  design:   'var(--accent-orange)',
  ecom:     'var(--accent-green)',
  cloudflare:'var(--accent-yellow)',
  learning: 'var(--accent-blue)',
  growth:   'var(--accent-green)',
  ops:      'var(--text-muted)',
  custom:   'var(--accent-purple)'
};

/* ── 5. HELPERS ───────────────────────────────────────────────────── */
var _tid;
function toast(msg, dur){
  var el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(_tid);
  el.innerHTML = msg;
  el.classList.add('show');
  _tid = setTimeout(function(){ el.classList.remove('show'); }, dur || 2200);
}

function copy(text){
  navigator.clipboard.writeText(text).then(function(){ toast('<b>Copied</b> to clipboard'); }).catch(function(){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('<b>Copied</b>');
  });
}

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  var btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = t === 'dark'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
}

function allPrompts(){
  var base = (typeof PROMPTS !== 'undefined') ? PROMPTS : [];
  var custom = STATE.custom.map(function(p){
    return { id: p.id, emoji: p.emoji||'✨', title: p.title, sub: p.sub||'', cat: 'custom',
      platforms: (p.platforms||'chatgpt').split(',').map(function(x){ return x.trim(); }),
      notes: '', versions: { chatgpt: p.body||'' }, _custom: true };
  });
  return base.concat(custom);
}

/* ── 6. RENDER LIBRARY ────────────────────────────────────────────── */
function renderAll(){
  renderStats(); renderChips(); renderGrid();
  renderCustomList(); renderBench();
  updateCounts();
}

function renderStats(){
  var all = allPrompts();
  var starred = Object.keys(STATE.stars).filter(function(k){ return STATE.stars[k]; }).length;
  var plats = new Set();
  all.forEach(function(p){ (p.platforms||[]).forEach(function(pl){ plats.add(pl); }); });
  qs('#statTotal').textContent  = all.length;
  qs('#statStar').textContent   = starred;
  qs('#statCustom').textContent = STATE.custom.length;
  qs('#statPlatforms').textContent = plats.size;
  qs('#countPill').textContent  = all.length + ' prompts';
}

function renderChips(){
  var all = allPrompts();
  var cats = {};
  all.forEach(function(p){ cats[p.cat] = (cats[p.cat]||0)+1; });
  var order = ['all','⭐ starred','coding','research','redteam','system','design','ecom','cloudflare','learning','growth','ops','custom'];
  var el = qs('#chips'); if (!el) return;
  el.innerHTML = '';
  order.forEach(function(c){
    if (c === 'all') { var n = all.length; }
    else if (c === '⭐ starred') { var n = Object.keys(STATE.stars).filter(function(k){return STATE.stars[k];}).length; if (!n) return; }
    else { var n = cats[c]; if (!n) return; }
    var b = document.createElement('button');
    b.className = 'chip' + (STATE.filter === c ? ' active' : '') + (c==='⭐ starred'?' c-star':'');
    b.textContent = c + ' ' + n;
    b.addEventListener('click', function(){
      STATE.filter = c; STATE.search = ''; qs('#search').value = '';
      renderChips(); renderGrid();
    });
    el.appendChild(b);
  });
}

function filteredPrompts(){
  var all = allPrompts();
  var q = STATE.search.toLowerCase();
  return all.filter(function(p){
    if (STATE.filter === '⭐ starred') { if (!STATE.stars[p.id]) return false; }
    else if (STATE.filter !== 'all') { if (p.cat !== STATE.filter) return false; }
    if (!q) return true;
    return (p.title+' '+p.sub+' '+(p.notes||'')+(p.cat||'')).toLowerCase().indexOf(q) > -1;
  });
}

function renderGrid(){
  var el = qs('#grid'); if (!el) return;
  var list = filteredPrompts();
  if (!list.length) { el.innerHTML = '<div class="empty">No prompts match — try a different filter or search.</div>'; return; }
  el.innerHTML = '';
  list.forEach(function(p){
    var accent = CAT_COLOR[p.cat] || 'var(--primary)';
    var starred = STATE.stars[p.id];
    var plats = (p.platforms||[]).slice(0,3);
    var preview = firstVersion(p);
    var card = document.createElement('div');
    card.className = 'pcard'; card.style.setProperty('--pa', accent);
    card.innerHTML =
      '<div class="top"><span class="emoji">'+(p.emoji||'📝')+'</span>'+
      '<div style="min-width:0"><h3>'+esc(p.title)+'</h3><div class="sub">'+esc(p.sub||'')+'</div></div>'+
      '<button class="star-btn'+(starred?' on':'')+'" data-id="'+p.id+'" title="Star">'+(starred?'★':'☆')+'</button></div>'+
      '<div class="badges">'+
        '<span class="badge cat">'+esc(p.cat)+'</span>'+
        plats.map(function(pl){ return '<span class="badge">'+esc(pl)+'</span>'; }).join('')+
      '</div>'+
      (preview ? '<div class="snippet">'+esc(preview.slice(0,300))+'</div>' : '')+
      '<div class="foot"><span class="kind">'+(p._custom?'custom':'library')+'</span>'+
      '<button class="mini-btn push" data-open="'+p.id+'">Open →</button></div>';
    el.appendChild(card);
  });
  /* star toggles */
  el.querySelectorAll('.star-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){ e.stopPropagation(); toggleStar(btn.dataset.id); });
  });
  /* open modal */
  el.querySelectorAll('[data-open]').forEach(function(btn){
    btn.addEventListener('click', function(e){ e.stopPropagation(); openModal(parseInt(btn.dataset.open)); });
  });
  el.querySelectorAll('.pcard').forEach(function(card){
    card.addEventListener('click', function(){
      var btn = card.querySelector('[data-open]');
      if (btn) openModal(parseInt(btn.dataset.open));
    });
  });
}

function firstVersion(p){
  if (!p.versions) return '';
  var keys = Object.keys(p.versions);
  return keys.length ? (p.versions[keys[0]]||'') : '';
}

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function qs(sel){ return document.querySelector(sel); }

/* ── 7. STARS ─────────────────────────────────────────────────────── */
function toggleStar(id){
  id = parseInt(id);
  STATE.stars[id] = !STATE.stars[id];
  if (!STATE.stars[id]) delete STATE.stars[id];
  renderStats(); renderChips(); renderGrid();
  /* update modal star if open */
  var mStar = qs('#mStar');
  if (mStar && mStar.dataset.id == id) {
    mStar.classList.toggle('on', !!STATE.stars[id]);
    mStar.textContent = STATE.stars[id] ? '★' : '☆';
  }
  debouncePush();
}

/* ── 8. MODAL ─────────────────────────────────────────────────────── */
var _openId = null;
var _openTab = null;

function openModal(id){
  var all = allPrompts();
  var p = all.find(function(x){ return x.id === id; });
  if (!p) return;
  _openId = id;
  var versions = p.versions || {};
  var tabs = Object.keys(versions);
  _openTab = tabs[0] || null;

  qs('#mTitle').textContent = (p.emoji||'') + ' ' + p.title;
  qs('#mSub').textContent = p.sub||'';
  var noteEl = qs('#mNote'); var noteTxt = qs('#mNoteText');
  if (p.notes) { noteTxt.textContent = p.notes; noteEl.hidden = false; } else { noteEl.hidden = true; }

  var mStar = qs('#mStar');
  mStar.dataset.id = id;
  mStar.classList.toggle('on', !!STATE.stars[id]);
  mStar.textContent = STATE.stars[id] ? '★' : '☆';

  renderModalTabs(tabs, versions);
  qs('#modalWrap').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderModalTabs(tabs, versions){
  var tabEl = qs('#mTabs'); var bodyEl = qs('#mBody');
  tabEl.innerHTML = '';
  tabs.forEach(function(tab){
    var btn = document.createElement('button');
    btn.className = 'ptab' + (tab === _openTab ? ' active' : '');
    btn.textContent = tab;
    btn.addEventListener('click', function(){
      _openTab = tab;
      tabEl.querySelectorAll('.ptab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      bodyEl.textContent = versions[tab]||'';
    });
    tabEl.appendChild(btn);
  });
  bodyEl.textContent = _openTab ? (versions[_openTab]||'') : '';
}

function closeModal(){
  qs('#modalWrap').classList.remove('open');
  document.body.style.overflow = '';
  _openId = null;
}

/* ── 9. BUILDER ───────────────────────────────────────────────────── */
var BUILDER_TEMPLATES = {
  coding: {
    chatgpt: function(r,task,constraints,fmt){ return 'You are a senior software engineer working in '+r+'\n\nTask: '+task+'\n\nConstraints: '+constraints+'\n\nReturn: '+fmt; },
    claude: function(r,task,constraints,fmt){ return '<role>\nSenior engineer in '+r+'\n</role>\n\n<objective>'+task+'</objective>\n\n<constraints>\n'+constraints+'\n</constraints>\n\n<output_format>\n'+fmt+'\n</output_format>'; }
  },
  research: {
    chatgpt: function(r,task,constraints,fmt){ return 'You are a founder-grade research analyst.\n\nScope: '+r+'\nResearch goal: '+task+'\nConstraints: '+constraints+'\nReturn: '+fmt; },
    claude: function(r,task,constraints,fmt){ return '<role>\nFounder-grade research analyst\n</role>\n\n<objective>'+task+'</objective>\n\n<context>\nScope: '+r+'\n</context>\n\n<constraints>'+constraints+'</constraints>\n\n<output_format>'+fmt+'</output_format>'; }
  },
  redteam: {
    chatgpt: function(r,task,constraints,fmt){ return 'You are a red-team security auditor.\n\nTarget system: '+r+'\nTask: '+task+'\nConstraints: '+constraints+'\nOutput: '+fmt; },
    claude: function(r,task,constraints,fmt){ return '<role>\nRed-team security auditor\n</role>\n\n<objective>'+task+'</objective>\n\n<context>\nTarget: '+r+'\n</context>\n\n<constraints>'+constraints+'</constraints>\n\n<output_format>'+fmt+'</output_format>'; }
  },
  system: {
    chatgpt: function(r,task,constraints,fmt){ return 'You are a platform architect.\n\nSystem: '+r+'\nTask: '+task+'\nConstraints: '+constraints+'\nOutput: '+fmt; },
    claude: function(r,task,constraints,fmt){ return '<role>\nPlatform architect\n</role>\n\n<objective>'+task+'</objective>\n\n<context>\nSystem: '+r+'\n</context>\n\n<constraints>'+constraints+'</constraints>\n\n<output_format>'+fmt+'</output_format>'; }
  },
  design: {
    chatgpt: function(r,task,constraints,fmt){ return 'You are a product designer.\n\nProject: '+r+'\nTask: '+task+'\nConstraints: '+constraints+'\nOutput: '+fmt; },
    claude: function(r,task,constraints,fmt){ return '<role>\nProduct designer\n</role>\n\n<objective>'+task+'</objective>\n\n<context>\nProject: '+r+'\n</context>\n\n<constraints>'+constraints+'</constraints>\n\n<output_format>'+fmt+'</output_format>'; }
  }
};

function buildPrompt(){
  var pack = qs('#bPack').value;
  var plat = qs('#bPlatform').value.toLowerCase();
  var repo = qs('#bRepo').value.trim();
  var task = qs('#bTask').value.trim();
  var con  = qs('#bConstraints').value.trim();
  var fmt  = qs('#bFormat').value;
  var tpls = BUILDER_TEMPLATES[pack];
  if (!tpls) return 'No template for pack: ' + pack;
  var fn = tpls[plat] || tpls['chatgpt'];
  return fn(repo, task, con, fmt);
}

function renderBuilder(){
  var out = qs('#builderOut');
  if (out) out.textContent = buildPrompt();
}

/* ── 10. FREESTYLE (rule-based generator) ─────────────────────────── */
var FS_CATS = {
  debug:    ['debug','fix','error','crash','broken','bug','exception','fail'],
  security: ['auth','security','token','permission','role','trust','vuln','xss','injection'],
  review:   ['review','audit','check','inspect','assess','evaluate'],
  plan:     ['plan','architect','design','structure','roadmap','strategy','migrate'],
  research: ['research','market','competitor','analyse','analyze','investigate','compare'],
  copy:     ['write','copy','landing','email','headline','content','post','message'],
  data:     ['data','sql','query','schema','database','analytics'],
  ops:      ['ops','deploy','ci','pipeline','monitor','infra','cost','spend'],
  growth:   ['growth','funnel','conversion','retention','onboard','acquisition','experiment']
};

function inferCat(q){
  q = q.toLowerCase();
  var scores = {};
  Object.keys(FS_CATS).forEach(function(cat){
    FS_CATS[cat].forEach(function(kw){ if (q.indexOf(kw)>-1) scores[cat]=(scores[cat]||0)+1; });
  });
  var best = Object.keys(scores).sort(function(a,b){ return scores[b]-scores[a]; })[0];
  return best || 'coding';
}

var FS_EMOJIS = { debug:'🐛', security:'🔐', review:'🔍', plan:'🗺️', research:'🔬', copy:'✏️', data:'📊', ops:'⚙️', growth:'📈', coding:'💻' };

function generateFreestyle(ask, plats){
  var cat = inferCat(ask);
  var emoji = FS_EMOJIS[cat] || '✨';
  var title = ask.length > 55 ? ask.slice(0,52)+'…' : ask;
  var sub = cat + ' · freestyle';
  var notes = 'Generated from: "' + ask + '"';
  var versions = {};
  var catLabel = cat.charAt(0).toUpperCase()+cat.slice(1);

  if (plats.indexOf('chatgpt')>-1 || plats.indexOf('claude')>-1 || plats.indexOf('perplexity')>-1) {
    var base = 'Task: ' + ask + '\n\nInstructions:\n1. Understand the full scope before acting.\n2. Ask one clarifying question if the task is ambiguous.\n3. Provide diagnosis before any fix or output.\n4. Be specific — no generic advice.\n5. Flag risks or assumptions clearly.';
    if (plats.indexOf('chatgpt')>-1) versions.chatgpt = base;
    if (plats.indexOf('claude')>-1)  versions.claude  = '<role>\nExpert '+catLabel+' advisor\n</role>\n\n<objective>\n'+ask+'\n</objective>\n\n<instructions>\n1. Understand full scope before acting.\n2. Ask one clarifying question if ambiguous.\n3. Diagnose before fixing.\n4. Be specific — no generic advice.\n5. Flag risks and assumptions.\n</instructions>';
    if (plats.indexOf('perplexity')>-1) versions.perplexity = 'Research this and return current, sourced answers:\n\n' + ask + '\n\nRequirements:\n- Cite sources\n- Prioritise 2024-2026 data\n- Flag any conflicting findings';
  }
  if (plats.indexOf('figma')>-1)   versions.figma   = '<role>\nFigma design assistant\n</role>\n\n<connector>Requires Figma connector in Claude.</connector>\n\n<objective>\n'+ask+'\n</objective>\n\n<instructions>\n1. Read the relevant frames first.\n2. Diagnose the issue.\n3. Propose changes with layer names.\n</instructions>';
  if (plats.indexOf('canva')>-1)   versions.canva   = '<role>\nCanva brand designer\n</role>\n\n<connector>Requires Canva connector in Claude.</connector>\n\n<objective>\n'+ask+'\n</objective>\n\n<instructions>\n1. Confirm brand kit.\n2. Draft the asset.\n3. Describe before creating.\n</instructions>';
  if (plats.indexOf('shopify')>-1) versions.shopify = '<role>\nShopify commerce assistant\n</role>\n\n<connector>Requires Shopify connector in Claude.</connector>\n\n<objective>\n'+ask+'\n</objective>\n\n<instructions>\n1. Check current store state first.\n2. Propose change.\n3. Confirm before applying.\n</instructions>';

  return { emoji: emoji, title: title, sub: sub, cat: cat, notes: notes, platforms: plats, versions: versions };
}

/* ── 11. CUSTOM PROMPTS ───────────────────────────────────────────── */
function saveCustomPrompt(title, sub, cat, platforms, body){
  var id = 'c_' + Date.now();
  STATE.custom.push({ id: id, emoji: '✨', title: title, sub: sub, cat: cat, platforms: platforms, body: body, ts: Date.now() });
  renderAll();
  debouncePush();
}

function deleteCustom(id){
  STATE.custom = STATE.custom.filter(function(p){ return p.id !== id; });
  renderAll();
  debouncePush();
}

function renderCustomList(){
  var el = qs('#customList'); if (!el) return;
  if (!STATE.custom.length) { el.innerHTML = '<div style="color:var(--text-faint);font-family:var(--mono);font-size:12px;padding:10px">No saved prompts yet.</div>'; return; }
  el.innerHTML = '';
  STATE.custom.forEach(function(p){
    var item = document.createElement('div'); item.className = 'citem';
    item.innerHTML = '<div class="row"><strong>'+esc(p.title)+'</strong>'+
      '<button class="mini-btn push" data-del="'+p.id+'">Delete</button></div>'+
      '<div style="font-size:11px;color:var(--text-faint);margin-top:4px;font-family:var(--mono)">'+esc(p.cat)+' · '+esc((p.platforms||[]).join(', '))+'</div>';
    el.appendChild(item);
    item.querySelector('[data-del]').addEventListener('click', function(){
      if (confirm('Delete "'+p.title+'"?')) deleteCustom(p.id);
    });
  });
}

/* ── 12. BENCH ────────────────────────────────────────────────────── */
function renderBench(){
  var el = qs('#benchBody'); if (!el) return;
  el.innerHTML = '';
  BENCH.forEach(function(row){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>'+esc(row.task)+'</td>'+
      '<td class="stars col-gpt">'+row.gpt+'</td>'+
      '<td class="stars col-claude">'+row.cla+'</td>'+
      '<td class="stars col-perp">'+row.per+'</td>'+
      '<td><span class="best">'+row.best+'</span></td>';
    el.appendChild(tr);
  });
}

/* ── 13. EXPORT / IMPORT ──────────────────────────────────────────── */
function exportState(){
  var blob = new Blob([syncPayload()], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'promptos-state.json'; a.click();
  toast('State exported');
}

function importState(json){
  try {
    var data = JSON.parse(json);
    if (data.stars) STATE.stars = data.stars;
    if (data.theme) { STATE.theme = data.theme; applyTheme(STATE.theme); }
    if (Array.isArray(data.custom)) STATE.custom = data.custom;
    renderAll();
    toast('State imported');
    debouncePush();
  } catch(e) { toast('Invalid JSON'); }
}

/* ── 14. NAV / PAGE SWITCHING ─────────────────────────────────────── */
function updateCounts(){
  var navCount = qs('#navCount');
  var navCustom = qs('#navCustom');
  if (navCount) navCount.textContent = allPrompts().length;
  if (navCustom) navCustom.textContent = STATE.custom.length;
}

function switchPage(name){
  STATE.page = name;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('on'); });
  var pg = qs('#page-'+name); if (pg) pg.classList.add('on');
  document.querySelectorAll('.nav-item[data-page]').forEach(function(b){ b.classList.toggle('active', b.dataset.page === name); });
}

/* ── 15. SYNC UI (sidebar panel) ─────────────────────────────────── */
function injectSyncUI(){
  var foot = qs('.side-foot'); if (!foot) return;
  var html = '<div style="margin-top:14px;padding:12px 10px;border-top:1px solid var(--border)">';
  html += '<div class="side-label" style="padding:0 0 8px">☁️ Device Sync</div>';
  html += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px">';
  html += '<span id="syncDot" style="width:8px;height:8px;border-radius:50%;background:#575552;flex-shrink:0"></span>';
  html += '<span id="syncLabel" style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">Sync off</span></div>';
  html += '<div class="field" style="margin-bottom:8px"><label style="display:block;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint);margin-bottom:5px">GitHub Token</label>';
  html += '<input id="syncToken" type="password" placeholder="ghp_…" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:7px 9px;font-size:12px;font-family:var(--mono);color:var(--text);transition:border-color var(--t)"></div>';
  html += '<div style="display:flex;gap:6px">';
  html += '<button class="mini-btn solid" id="syncConnect" style="font-size:11px;padding:5px 10px">Connect</button>';
  html += '<button class="mini-btn" id="syncPush" style="font-size:11px;padding:5px 10px">Push</button>';
  html += '<button class="mini-btn" id="syncPull" style="font-size:11px;padding:5px 10px">Pull</button>';
  html += '</div>';
  html += '<div style="font-size:10px;color:var(--text-faint);margin-top:8px;line-height:1.5">Token needs <code style="color:var(--primary)">gist</code> scope. Saved in memory only — never persisted.</div>';
  html += '</div>';
  foot.insertAdjacentHTML('beforebegin', html);

  qs('#syncConnect').addEventListener('click', function(){
    var tok = qs('#syncToken').value.trim();
    if (!tok) { toast('Paste a GitHub token with gist scope'); return; }
    STATE.sync.token = tok;
    gistFindOrCreate();
  });
  qs('#syncPush').addEventListener('click', function(){
    if (!STATE.sync.token) { toast('Connect first'); return; }
    gistPush();
  });
  qs('#syncPull').addEventListener('click', function(){
    if (!STATE.sync.token || !STATE.sync.gistId) { toast('Connect first'); return; }
    gistPull();
  });
}

/* Debounced auto-push on state changes */
var _pushTimer;
function debouncePush(){
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(function(){ if (STATE.sync.token) gistPush(); }, 2000);
}

/* ── 16. BOOT ─────────────────────────────────────────────────────── */
function boot(){
  applyTheme(STATE.theme);
  injectSyncUI();
  renderAll();
  switchPage('library');

  /* Theme toggle */
  var themeBtn = qs('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function(){
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme(STATE.theme);
    debouncePush();
  });

  /* Nav */
  document.querySelectorAll('[data-page]').forEach(function(btn){
    btn.addEventListener('click', function(){ switchPage(btn.dataset.page); });
  });

  /* Search */
  var searchEl = qs('#search');
  if (searchEl) searchEl.addEventListener('input', function(){
    STATE.search = searchEl.value;
    STATE.filter = 'all';
    renderChips(); renderGrid();
  });

  /* Modal close */
  qs('#mClose').addEventListener('click', closeModal);
  qs('#mClose2').addEventListener('click', closeModal);
  qs('#modalWrap').addEventListener('click', function(e){ if (e.target === qs('#modalWrap')) closeModal(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });

  /* Modal star */
  qs('#mStar').addEventListener('click', function(){
    if (_openId !== null) toggleStar(_openId);
  });

  /* Modal copy */
  qs('#mCopy').addEventListener('click', function(){
    var body = qs('#mBody'); if (body) copy(body.textContent);
  });

  /* Builder live update */
  ['#bPack','#bPlatform','#bRepo','#bTask','#bConstraints','#bFormat'].forEach(function(sel){
    var el = qs(sel); if (el) el.addEventListener('input', renderBuilder);
  });
  renderBuilder();

  qs('#copyBuilder').addEventListener('click', function(){
    copy(buildPrompt());
  });
  qs('#saveBuilder').addEventListener('click', function(){
    var title = qs('#bTask').value.slice(0,60) || 'Builder prompt';
    saveCustomPrompt(title, 'from builder', qs('#bPack').value, [qs('#bPlatform').value.toLowerCase()], buildPrompt());
    toast('Saved to My Prompts');
  });

  /* Freestyle */
  var fsState = null;
  function getSelectedPlats(){
    return Array.from(document.querySelectorAll('.pcheck input:checked')).map(function(c){ return c.value; });
  }
  function runFreestyle(){
    var ask = qs('#fsAsk').value.trim();
    if (!ask) { toast('Describe what you need first'); return; }
    var plats = getSelectedPlats();
    if (!plats.length) { toast('Select at least one platform'); return; }
    fsState = generateFreestyle(ask, plats);
    var tabs = Object.keys(fsState.versions);
    var activeTab = tabs[0];

    qs('#fsPlaceholder').style.display = 'none';
    var prev = qs('#fsPreview'); prev.classList.add('on');
    qs('#fsEmoji').textContent = fsState.emoji;
    qs('#fsTitle').textContent = fsState.title;
    qs('#fsSub').textContent = fsState.sub;
    qs('#fsBadges').innerHTML = [fsState.cat].concat(fsState.platforms).map(function(b){ return '<span class="badge">'+esc(b)+'</span>'; }).join('');
    var noteEl = qs('#fsNote'); var noteTxt = qs('#fsNoteText');
    if (fsState.notes) { noteTxt.textContent = fsState.notes; noteEl.hidden = false; } else { noteEl.hidden = true; }

    /* Tabs */
    var tabEl = qs('#fsTabs'); tabEl.innerHTML = '';
    tabs.forEach(function(tab){
      var btn = document.createElement('button'); btn.className = 'ptab'+(tab===activeTab?' active':''); btn.textContent = tab;
      btn.addEventListener('click', function(){
        activeTab = tab;
        tabEl.querySelectorAll('.ptab').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        qs('#fsBody').textContent = fsState.versions[tab]||'';
      });
      tabEl.appendChild(btn);
    });
    qs('#fsBody').textContent = fsState.versions[activeTab]||'';
  }

  qs('#fsGenerate').addEventListener('click', runFreestyle);
  qs('#fsClear').addEventListener('click', function(){
    qs('#fsAsk').value = ''; qs('#fsPlaceholder').style.display = ''; qs('#fsPreview').classList.remove('on'); fsState = null;
  });
  qs('#fsRegenerate').addEventListener('click', runFreestyle);
  qs('#fsCopy').addEventListener('click', function(){
    var body = qs('#fsBody'); if (body) copy(body.textContent);
  });
  qs('#fsSave').addEventListener('click', function(){
    if (!fsState) return;
    var firstBody = fsState.versions[Object.keys(fsState.versions)[0]]||'';
    saveCustomPrompt(fsState.title, fsState.sub, fsState.cat, fsState.platforms, firstBody);
    toast('Saved to My Prompts');
  });
  qs('#fsAsk').addEventListener('keydown', function(e){
    if ((e.metaKey||e.ctrlKey) && e.key==='Enter') runFreestyle();
  });

  /* Custom save */
  qs('#saveCustom').addEventListener('click', function(){
    var title = qs('#cTitle').value.trim();
    if (!title) { toast('Add a title'); return; }
    var sub   = qs('#cSub').value.trim();
    var cat   = qs('#cCat').value;
    var plats = qs('#cPlatforms').value.split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    var body  = qs('#cBody').value.trim();
    if (!body) { toast('Add a prompt body'); return; }
    saveCustomPrompt(title, sub, cat, plats.length ? plats : ['chatgpt'], body);
    qs('#cTitle').value=''; qs('#cSub').value=''; qs('#cPlatforms').value=''; qs('#cBody').value='';
    toast('Prompt saved');
  });

  /* Export / Import / Reset */
  qs('#exportBtn').addEventListener('click', exportState);
  qs('#importBtn').addEventListener('click', function(){ qs('#importFile').click(); });
  qs('#importFile').addEventListener('change', function(e){
    var file = e.target.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function(ev){ importState(ev.target.result); };
    r.readAsText(file);
    e.target.value = '';
  });
  qs('#resetBtn').addEventListener('click', function(){
    if (!confirm('Reset all stars, custom prompts, and theme? This cannot be undone.')) return;
    STATE.stars = {}; STATE.custom = []; STATE.theme = 'dark';
    applyTheme('dark'); renderAll(); toast('State reset');
    if (STATE.sync.token) gistPush();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
