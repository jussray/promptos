(function(){'use strict';
var root=document.getElementById('page-capabilities');if(!root)return;
var appSelect=document.getElementById('capabilityApp'),search=document.getElementById('capabilitySearch'),status=document.getElementById('capabilityStatus'),filter='all',catalog=null;
function el(tag,cls,value){var n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined&&value!==null)n.textContent=String(value);return n;}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild);}
function sourceUrl(s){if(!s||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s.sourceRepository||'')||!/^[0-9a-f]{40}$/.test(s.sourceRevision||''))return null;var p=String(s.sourcePath||'');if(!p||p.startsWith('/')||p.split('/').some(x=>!x||x==='.'||x==='..'))return null;return'https://github.com/'+s.sourceRepository+'/blob/'+s.sourceRevision+'/'+p.split('/').map(encodeURIComponent).join('/');}
function card(list,title,description,tags,source,searchText){var c=el('article','cap-card');c.dataset.capCard='true';c.dataset.search=String(searchText||[title,description].concat(tags||[]).join(' ')).toLowerCase();c.appendChild(el('h4','',title));if(description)c.appendChild(el('p','',description));if(tags&&tags.length){var meta=el('div','cap-meta');tags.forEach(t=>{var x=typeof t==='string'?{label:t}:t;meta.appendChild(el('span','cap-tag'+(x.kind?' '+x.kind:''),x.label));});c.appendChild(meta);}var url=sourceUrl(source);if(url){var a=el('a','cap-link','Open pinned source ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';c.appendChild(a);}list.appendChild(c);}
function list(id,items,draw,message){var target=document.getElementById(id);clear(target);if(!items.length){target.appendChild(el('p','cap-empty',message));return;}items.forEach(item=>draw(target,item));}
function render(app){
document.getElementById('capabilityAppName').textContent=app.name;document.getElementById('capabilityAppRole').textContent=app.role;document.getElementById('capabilityRepository').textContent=app.repositoryLabel;
document.getElementById('capabilityAudit').textContent=app.auditCoverage==='partial'?'Partial source audit':app.auditCoverage==='unresolved'?'Repository unresolved':app.auditCoverage;
document.getElementById('capabilityAppSkillCount').textContent=app.appSkillFileCount;document.getElementById('capabilityAppSkillCount').dataset.count=app.appSkillFileCount;
document.getElementById('capabilitySharedCount').textContent=app.sharedSkills.length;document.getElementById('capabilityIntegrationCount').textContent=app.integrations.length;document.getElementById('capabilityProposedCount').textContent=app.proposedCapabilities.length;document.getElementById('capabilityExcludedCount').textContent=app.excludedWorkspaceSkillCount||0;
list('capabilitySkills',app.skills,(box,s)=>card(box,s.id,s.classification,[{label:s.status,kind:'primary'},s.sourceRepository],s),'No source-verified app skill files are listed for this app yet.');
list('capabilityShared',app.sharedSkills,(box,s)=>card(box,s.id,s.purpose,[{label:'Operator reference only',kind:'primary'},'Advisory','Not distributed into app runtime'],s),'No shared operator references are mapped.');
list('capabilityIntegrations',app.integrations,(box,i)=>{var tags=[{label:i.kind==='plugin-reference'?'Plugin reference':'Skill reference',kind:'primary'},i.status==='catalog-only'?'Catalog only':'Not source-verified',i.lifecycle==='legacy'?{label:'Legacy · review required',kind:'warn'}:'Runtime discovery required'];if(i.aliases&&i.aliases.length)tags.push('Also known as: '+i.aliases.join(', '));card(box,i.name,i.role,tags,null,[i.name,i.category,i.role,i.status].join(' '));},'No plugin or skill references are mapped to this app.');
list('capabilityProposed',app.proposedCapabilities,(box,x)=>card(box,x.id,'Proposed app-owned capability area. Not a source-verified SKILL.md file.',[{label:'Proposed',kind:'warn'},'Awaiting source audit'],null),'No proposed app-owned capability areas are declared.');
list('capabilityRetired',app.retiredSkills,(box,s)=>card(box,s.id,s.classification,[{label:s.status,kind:'warn'},'Historical only · not active'],s),'No retired skill exports are recorded for this app.');
list('capabilitySources',app.sourceRecords,(box,r)=>{var count=r.skillCount===null?'Count withheld':r.skillCount+' skill files';var tags=[r.visibility,r.inventoryStatus];if(r.detailsRedacted)tags.push({label:'Details redacted',kind:'warn'});card(box,r.label,count,tags,null,[r.label,r.profile,r.inventoryStatus].join(' '));},'No repository source records are available.');
var note=document.getElementById('capabilityExcludedNote');note.hidden=!(app.excludedWorkspaceSkillCount>0);note.textContent=app.excludedWorkspaceSkillCount>0?app.excludedWorkspaceSkillCount+' workspace-level skill files are excluded because they are not game-specific.':'';
applyFilters();
}
function applyFilters(){var shown={all:['skills','shared','integrations','proposed','retired','sources'],skills:['skills','shared','retired'],shared:['shared'],plugins:['integrations'],proposed:['proposed'],sources:['sources']}[filter]||['skills'];
root.querySelectorAll('[data-cap-section]').forEach(s=>s.hidden=shown.indexOf(s.dataset.capSection)===-1);
var q=(search.value||'').trim().toLowerCase(),count=0;root.querySelectorAll('[data-cap-card]').forEach(c=>{var match=!q||(c.dataset.search||'').indexOf(q)!==-1;c.hidden=!match;if(match&&!c.closest('[data-cap-section]').hidden)count++;});
document.getElementById('capabilityNoResults').hidden=count!==0;
}
function init(){fetch('./parts/capabilities.v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalog request failed');return r.json();}).then(data=>{
if(!data||data.schemaVersion!=='1.0'||data.registry!=='promptos/public-app-capability-catalog'||!Array.isArray(data.apps)||data.apps.length!==18)throw Error('Catalog schema mismatch');
catalog=data;clear(appSelect);data.apps.forEach(app=>{var option=el('option','',app.name);option.value=app.id;appSelect.appendChild(option);});
appSelect.value=data.apps.some(a=>a.id==='promptos')?'promptos':data.apps[0].id;
appSelect.addEventListener('change',()=>{var app=catalog.apps.find(a=>a.id===appSelect.value);if(app)render(app);});search.addEventListener('input',applyFilters);
root.querySelectorAll('[data-cap-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.capFilter;root.querySelectorAll('[data-cap-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));applyFilters();}));
render(data.apps.find(a=>a.id===appSelect.value));status.dataset.state='ready';status.textContent='Catalog loaded. Live plugin connection and permission state are not checked here.';
}).catch(()=>{status.dataset.state='error';status.textContent='Capability catalog unavailable. The source registries remain unchanged; restore the public catalog to retry.';});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
