/* Universal ITI FINAL — clean role controller
 * One navigation owner for every role.
 * Fixes duplicate Trade selectors, duplicate attendance governance cards,
 * stale V13/V14 navigation handlers, and role pages that highlight without rendering.
 */
(function(V){
'use strict';
if(!V||!window.App)return;

const BUILD='FINAL';
const NAV={
  admin:[['admin-console','⚙️ Admin Panel']],
  principal:[['dashboard','📊 Principal Dashboard'],['users','👥 Staff & Access'],['notices','📰 Institute Notices'],['record-formats','🖨️ Record Formats'],['inspection','🛡️ Inspection & Compliance'],['reports','📄 Institute Reports']],
  instructor:[['dashboard','📊 Dashboard'],['ai-assistant','✨ AI Assistant'],['syllabus-ai','🤖 Syllabus AI'],['modules','🧩 Module Manager'],['trainees','👥 Trainees'],['attendance','✅ Attendance'],['practicals','🖥️ Practicals'],['theory','📘 Theory'],['splitup','🗓️ Split-up Syllabus'],['evaluation','📝 Evaluation'],['notices','📰 Notice Board'],['leave','🩺 Leave & Discipline'],['exams','📝 Class Test'],['ojt','🏭 OJT & Projects'],['gallery','🖼️ Gallery'],['activities','🏆 Extra Activities'],['record-formats','🖨️ Record Formats'],['inspection','🛡️ Inspection File'],['cloud','☁️ Cloud & Drive'],['reports','📄 Reports']],
  staff:[['dashboard','📊 Staff Dashboard'],['notices','📰 Notices'],['record-formats','🖨️ Record Formats'],['reports','📄 Reports']],
  student:[['dashboard','🏠 My Dashboard'],['trainees','👤 My Profile'],['attendance','✅ My Attendance'],['practicals','🖥️ My Practicals'],['theory','📘 Theory'],['splitup','🗓️ Training Calendar'],['evaluation','📝 My Marks'],['notices','📰 Notices'],['leave','🩺 My Leave'],['exams','📝 Class Tests'],['ojt','🏭 My OJT / Projects']]
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const FOOTER={admin:'Technical administration • V15 FINAL',principal:'Principal oversight • V15 FINAL',instructor:'Instructor workspace • V15 FINAL',staff:'Staff read-only • V15 FINAL',student:'Student workspace • V15 FINAL'};
const preserved=new Map();
let mountedRole='';
let legacySwitch=App.switchTab?.bind(App);

function legacySession(){try{return (typeof SESSION!=='undefined'&&SESSION)?SESSION:null;}catch(e){return null;}}
function session(){return V.currentSession?.()||window.__V15_SESSION||window.SESSION||legacySession()||V.session||null;}
function role(){return V.currentRole?.()||session()?.role||V.sessionRole||'';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function allowed(r,name){return !!NAV[r]?.some(x=>x[0]===name);}
function defaultTab(r){return r==='admin'?'admin-console':'dashboard';}
function panel(name){return document.getElementById('tab-'+name);}
function wsLabel(w){return [w?.trade||'Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}

function ensureStyle(){
  if(document.getElementById('v15FinalControllerStyle'))return;
  const s=document.createElement('style');s.id='v15FinalControllerStyle';
  s.textContent=`
    #tabs[data-v15-final-footer]::after{content:attr(data-v15-final-footer)!important}
    #tabs[data-v15-final-brand]::before{content:attr(data-v15-final-brand)!important}
    html[data-v15-final-role] #changePinBtn{display:none!important}
    #v15FinalWorkspaceSwitcher{display:flex;align-items:center;gap:7px;min-width:0;max-width:430px}
    #v15FinalWorkspaceSwitcher label{font-size:.8rem;color:#667085;white-space:nowrap}
    #v15FinalWorkspaceSwitcher select{max-width:330px;min-width:180px;padding:7px 9px;border:1px solid #d8e0e8;border-radius:8px;background:#fff}
    .topbar .who{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;min-width:0}
    .v15-final-page-error{max-width:980px;margin:18px auto}
    @media(max-width:1100px){.topbar{flex-wrap:wrap}.topbar .who{width:100%;justify-content:flex-start}#v15FinalWorkspaceSwitcher{max-width:100%;flex:1}#v15FinalWorkspaceSwitcher select{max-width:100%;width:100%}}
  `;
  document.head.appendChild(s);
}

function updateVisuals(r){
  ensureStyle();
  document.documentElement.dataset.v15FinalRole=r;
  const t=document.getElementById('tabs');
  if(t){t.dataset.v15FinalFooter=FOOTER[r]||'V15 FINAL';t.dataset.v15FinalBrand='Universal ITI • V15 FINAL';}
  const cap=document.querySelector('.sidebar-caption small');if(cap)cap.textContent=FOOTER[r]||'V15 FINAL';
  const who=document.getElementById('whoName'),s=session();
  if(who)who.textContent=`${s?.name||V.member?.displayName||V.fb?.user?.displayName||''} • ${LABEL[r]||r}${V.member?.owner&&r!=='admin'?' • Creator':''}`;
  const pin=document.getElementById('changePinBtn');if(pin)pin.style.display='none';
  document.title=`Universal ITI FINAL — ${LABEL[r]||'Workspace'}`;
}

function keepPanel(name){
  if(preserved.has(name))return preserved.get(name);
  let p=document.getElementById('tab-'+name);
  if(!p){p=document.createElement('section');p.id='tab-'+name;p.className='panel';}
  preserved.set(name,p);return p;
}

function mount(r){
  if(!NAV[r])return false;
  if(mountedRole===r&&document.getElementById('tabs')?.dataset.v15FinalOwned==='1'){updateVisuals(r);return true;}
  const oldNav=document.getElementById('tabs'),oldMain=document.getElementById('main');if(!oldNav||!oldMain)return false;
  const panels=document.createDocumentFragment();
  for(const [name] of NAV[r]){const p=keepPanel(name);p.classList.remove('active');panels.appendChild(p);}
  const nav=document.createElement('nav');nav.id='tabs';nav.className=oldNav.className||'tabs';nav.dataset.v15FinalOwned='1';
  const cap=document.createElement('div');cap.className='sidebar-caption';cap.innerHTML='<span>Workspace</span><small></small>';nav.appendChild(cap);
  for(const [name,label] of NAV[r]){const b=document.createElement('button');b.type='button';b.className='tab';b.dataset.tab=name;b.textContent=label;b.addEventListener('click',e=>{e.preventDefault();V.finalOpenTab(name).catch(console.error);});nav.appendChild(b);}
  const main=document.createElement('main');main.id='main';main.appendChild(panels);
  oldNav.replaceWith(nav);oldMain.replaceWith(main);mountedRole=r;
  updateVisuals(r);try{App.buildMobileNav?.();}catch(e){}
  return true;
}

function activate(name){
  document.querySelectorAll('#tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#mobileNav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#mobileMoreGrid button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#main .panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
}

function pageError(name,e){
  const p=panel(name);if(!p)return;
  p.innerHTML=`<div class="v15-final-page-error"><div class="hero"><div class="hero-content"><div><h2>Page could not load</h2><p>${esc(LABEL[role()]||'V15 workspace')}</p></div></div></div><div class="card"><div class="callout cloud-error"><b>Error:</b> ${esc(e?.message||e||'Unknown error')}</div><p class="muted">No Firebase or trainee records were deleted.</p><button class="btn primary" id="v15FinalRetry">Retry</button></div></div>`;
  p.querySelector('#v15FinalRetry')?.addEventListener('click',()=>V.finalOpenTab(name));
}

function removeOldTradeSwitchers(){
  const who=document.querySelector('.topbar .who');if(!who)return;
  who.querySelectorAll('#v15WorkspaceSwitcher,#v15FinalWorkspaceSwitcher,[data-v15-trade-switcher]').forEach(x=>x.remove());
  [...who.children].forEach(x=>{if(x.id==='whoName'||x.id==='changePinBtn'||x.tagName==='BUTTON')return;const txt=(x.textContent||'').trim();if(x.querySelector?.('select')&&/^trade\s*:/i.test(txt))x.remove();});
}

V.finalEnsureWorkspaceSwitcher=async function(){
  removeOldTradeSwitchers();
  if(role()!=='instructor')return;
  const who=document.querySelector('.topbar .who');if(!who)return;
  const list=await V.listTradeWorkspaces?.({includeArchived:false})||[];
  if(!list.length)return;
  const d=document.createElement('div');d.id='v15FinalWorkspaceSwitcher';d.dataset.v15TradeSwitcher='1';
  if(list.length===1){d.innerHTML=`<label>Trade:</label><span class="badge">${esc(wsLabel(list[0]))}</span>`;}
  else{
    d.innerHTML=`<label for="v15FinalTradeSelect">Trade:</label><select id="v15FinalTradeSelect">${list.map(w=>`<option value="${esc(w.id)}" ${w.id===V.workspaceId?'selected':''}>${esc(wsLabel(w))}</option>`).join('')}</select>`;
    d.querySelector('select').addEventListener('change',async e=>{const v=e.target.value;if(!v||v===V.workspaceId)return;e.disabled=true;try{await V.switchWorkspace(v);await V.finalEnsureWorkspaceSwitcher();await V.finalOpenTab(localStorage.getItem('iti-v15-tab-v2')||'dashboard');}catch(x){alert(x.message||x);}finally{e.disabled=false;}});
  }
  const whoName=document.getElementById('whoName');who.insertBefore(d,whoName||who.firstChild);
};
V.ensureWorkspaceSwitcher=V.finalEnsureWorkspaceSwitcher;

function removeAttendanceDuplicates(){
  const p=panel('attendance');if(!p)return;
  p.querySelectorAll('#v15AttendanceGovernance,[data-v15-attendance-governance]').forEach(x=>x.remove());
  [...p.querySelectorAll('.card')].forEach(x=>{const h=x.querySelector('h2,h3,h4');if(/monthly attendance submission/i.test(h?.textContent||''))x.remove();});
}

V.finalAttendanceGovernance=async function(){
  if(role()!=='instructor')return;
  const p=panel('attendance');if(!p)return;
  removeAttendanceDuplicates();
  const m=new Date().toISOString().slice(0,7),l=await V.getAttendanceLock?.(m);
  const d=document.createElement('div');d.className='card';d.id='v15AttendanceGovernance';d.dataset.v15AttendanceGovernance='1';
  d.innerHTML=`<h3>🔒 Monthly Attendance Submission</h3><p class="muted">Submit a completed month to Principal. Submitted/approved months are locked until Principal reopens them.</p><div class="field-row"><div class="field"><label>Month</label><input id="v15AttMonth" type="month" value="${esc(m)}"></div><div><span class="badge">Current: ${esc(l?.status||'Open')}</span></div></div><button class="btn secondary" id="v15AttSubmit">Submit month to Principal</button>`;
  p.prepend(d);
  d.querySelector('#v15AttSubmit').addEventListener('click',async()=>{const month=d.querySelector('#v15AttMonth').value;try{await V.submitAttendanceMonth(month);alert('Attendance month submitted and locked for Principal review.');await V.finalAttendanceGovernance();}catch(e){alert(e.message||e);}});
};
V.injectAttendanceGovernance=V.finalAttendanceGovernance;

function renderLegacyInstructor(name){
  try{if(name==='dashboard')Dashboard?.render?.();}catch(e){}
  try{if(name==='trainees')Trainees?.render?.();}catch(e){}
  try{if(name==='attendance')Attendance?.loadDay?.();}catch(e){}
  try{if(name==='practicals')Practicals?.render?.();}catch(e){}
  try{if(name==='theory')Theory?.render?.();}catch(e){}
  try{if(name==='splitup')Schedule?.render?.();}catch(e){}
  try{if(name==='evaluation'){Evaluation?.populateSelects?.();Evaluation?.render?.();}}catch(e){}
  try{if(name==='notices')Notices?.render?.();}catch(e){}
  try{if(name==='leave'){Leave?.populateSelects?.();Leave?.render?.();}}catch(e){}
  try{if(name==='gallery')Gallery?.render?.();}catch(e){}
  try{if(name==='activities'){ExtraTopics?.render?.();Activities?.render?.();}}catch(e){}
  try{if(name==='reports'){Reports?.populateSelects?.();Reports?.renderSignatures?.();}}catch(e){}
  try{if(name==='inspection')Inspection?.render?.();}catch(e){}
  try{if(name==='modules')ModuleManager?.refresh?.();}catch(e){}
  try{if(name==='ai-assistant'){InstructorAI?.refreshTopicPicker?.();InstructorAI?.renderToday?.();}}catch(e){}
  try{if(name==='cloud')V.cloudUI?.();}catch(e){}
}

async function renderPrincipal(name){
  if(name==='dashboard')return V.renderPrincipalDashboard?.();
  if(name==='users')return V.renderPrincipalStaff?.();
  if(name==='notices')return V.renderPrincipalNotices?.();
  if(name==='inspection')return V.renderPrincipalInspection?.();
  if(name==='reports')return V.renderPrincipalReports?.();
}

async function renderStaff(name){
  if(name==='dashboard')return V.renderStaffDashboard?.();
  if(name==='notices'){
    const p=panel('notices');if(!p)return;const institute=await V.getInstituteNotices?.()||[],local=Array.isArray(DATA?.notices)?DATA.notices:[];
    p.innerHTML=`<div class="hero"><div class="hero-content"><div><h2>📰 Notices</h2><p>Read-only institute and assigned Trade notices.</p></div></div></div><div class="card"><h3>Institute Notices</h3>${institute.map(n=>`<div class="callout"><b>${esc(n.audienceLabel||'Institute')}</b><br>${esc(n.text||'')}</div>`).join('')||'<p class="muted">No institute notices.</p>'}</div><div class="card"><h3>Trade Notices</h3>${local.map(n=>`<div class="callout"><b>${esc(n.title||n.date||'Notice')}</b><br>${esc(n.text||n.message||'')}</div>`).join('')||'<p class="muted">No Trade notices.</p>'}</div>`;return;
  }
  if(name==='reports'){try{Reports?.populateSelects?.();Reports?.renderSignatures?.();}catch(e){}}
}

async function renderStudent(name){
  if(name==='dashboard')V.renderStudentDashboard?.();
  else renderLegacyInstructor(name);
  if(name==='notices')await V.injectInstituteNotices?.();
  V.sanitizeStudent?.();
}

async function renderRole(r,name){
  if(r==='admin')return V.renderAdminPanel?.();
  if(r==='principal')return renderPrincipal(name);
  if(r==='instructor'){
    renderLegacyInstructor(name);
    if(name==='attendance')await V.finalAttendanceGovernance();
    if(name==='gallery')await V.injectGalleryCloud?.();
    if(name==='notices')await V.injectInstituteNotices?.();
    return;
  }
  if(r==='staff')return renderStaff(name);
  if(r==='student')return renderStudent(name);
}

V.finalOpenTab=async function(name){
  const r=role();if(!V.ready||!r)return false;
  if(!allowed(r,name))name=defaultTab(r);
  if(!mount(r))return false;
  updateVisuals(r);activate(name);
  try{await renderRole(r,name);}catch(e){console.error('FINAL page',r,name,e);pageError(name,e);}
  if(r==='instructor')V.finalEnsureWorkspaceSwitcher().catch(()=>{});else removeOldTradeSwitchers();
  try{App.buildMobileNav?.();}catch(e){}
  localStorage.setItem('iti-v15-tab-v2',name);return true;
};

V.applyRolePortal=async function(){
  const r=role();if(!V.ready||!r)return false;
  mount(r);updateVisuals(r);
  if(r!=='instructor')removeOldTradeSwitchers();
  const saved=localStorage.getItem('iti-v15-tab-v2');
  return V.finalOpenTab(saved&&allowed(r,saved)?saved:defaultTab(r));
};

// One canonical tab router. The old App.switchTab remains only as a pre-login fallback.
App.switchTab=function(name){if(V.ready&&role()){V.finalOpenTab(name).catch(console.error);return;}return legacySwitch?.(name);};

document.addEventListener('click',e=>{
  const b=e.target.closest?.('#tabs .tab');if(!b||!V.ready||!role())return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();V.finalOpenTab(b.dataset.tab).catch(console.error);
},true);

// Repair shell after history restore / background return without creating duplicate controls.
window.addEventListener('pageshow',()=>setTimeout(()=>{if(V.ready&&role())V.applyRolePortal().catch(console.error);},50));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&V.ready&&role())setTimeout(()=>V.applyRolePortal().catch(console.error),50);});
setInterval(()=>{if(!V.ready||!role())return;updateVisuals(role());if(role()==='instructor'){const a=document.querySelectorAll('#v15FinalWorkspaceSwitcher').length;if(a!==1)V.finalEnsureWorkspaceSwitcher().catch(()=>{});const p=panel('attendance');if(p?.classList.contains('active')){const cards=[...p.querySelectorAll('.card')].filter(x=>/monthly attendance submission/i.test(x.querySelector('h2,h3,h4')?.textContent||''));if(cards.length!==1)V.finalAttendanceGovernance().catch(()=>{});}}},1500);

console.info('Universal ITI FINAL clean controller active.');
})(window.V15Sync);
