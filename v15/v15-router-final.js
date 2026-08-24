/* V15 Production 16 final role router.
 * Stops the legacy V13/V14 App.switchTab renderers from overwriting V15 role pages.
 * Provides deterministic Principal/Admin/Staff/Student navigation and visible errors.
 */
(function(V){
'use strict';
if(!V||!window.App)return;

const MATRIX={
  admin:new Set(['admin-console']),
  principal:new Set(['dashboard','users','notices','record-formats','inspection','reports']),
  instructor:new Set(['dashboard','ai-assistant','syllabus-ai','modules','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities','record-formats','inspection','cloud','reports']),
  staff:new Set(['dashboard','notices','record-formats','reports']),
  student:new Set(['dashboard','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt'])
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const FOOTER={admin:'Technical administration • V15',principal:'Principal oversight • V15',instructor:'Instructor workspace • V15',staff:'Staff read-only • V15',student:'Student workspace • V15'};
const NAV={
  principal:{dashboard:'📊 Principal Dashboard',users:'👥 Staff & Access',notices:'📰 Institute Notices','record-formats':'🖨️ Record Formats',inspection:'🛡️ Inspection & Compliance',reports:'📄 Institute Reports'},
  staff:{dashboard:'📊 Staff Dashboard',notices:'📰 Notices','record-formats':'🖨️ Record Formats',reports:'📄 Reports'},
  student:{dashboard:'🏠 My Dashboard',trainees:'👤 My Profile',attendance:'✅ My Attendance',practicals:'🖥️ My Practicals',theory:'📘 Theory',splitup:'🗓️ Training Calendar',evaluation:'📝 My Marks',notices:'📰 Notices',leave:'🩺 My Leave',exams:'📝 Class Tests',ojt:'🏭 My OJT / Projects'}
};

function role(){return V.currentRole?.()||V.sessionRole||window.__V15_SESSION?.role||window.SESSION?.role||'';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function defaultTab(r){return r==='admin'?'admin-console':'dashboard';}
function panel(name){return document.getElementById('tab-'+name);}

function ensureStyle(){
  if(document.getElementById('v15RouterStyle'))return;
  const s=document.createElement('style');s.id='v15RouterStyle';
  s.textContent=`#tabs[data-v15-footer]::after{content:attr(data-v15-footer)!important}#tabs[data-v15-brand]::before{content:attr(data-v15-brand)!important}`;
  document.head.appendChild(s);
}

function setVisuals(r){
  ensureStyle();
  document.documentElement.dataset.v15RuntimeRole=r;
  const tabs=document.getElementById('tabs');
  if(tabs){tabs.dataset.v15Footer=FOOTER[r]||'V15 workspace';tabs.dataset.v15Brand='Universal ITI • V15';}
  const cap=document.querySelector('.sidebar-caption small');if(cap)cap.textContent=FOOTER[r]||'V15 workspace';
  const who=document.getElementById('whoName'),s=V.currentSession?.()||window.__V15_SESSION||window.SESSION||{};
  if(who&&r)who.textContent=`${s.name||V.member?.displayName||V.fb?.user?.displayName||''} • ${LABEL[r]||r}${V.member?.owner&&r!=='admin'?' • Creator':''}`;
  const pin=document.getElementById('changePinBtn');if(pin)pin.style.display='none';
  document.title=`Universal ITI V15 — ${LABEL[r]||'Workspace'}`;
}

function activate(name){
  document.querySelectorAll('#tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#mobileNav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#mobileMoreGrid button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('#main .panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
}

function loading(name,title){
  const p=panel(name);if(!p)return;
  p.innerHTML=`<div class="card"><h3>${esc(title||'Loading…')}</h3><p class="muted">Loading secure V15 data…</p></div>`;
}
function showError(name,title,e){
  const p=panel(name);if(!p)return;
  p.innerHTML=`<div class="hero"><div class="hero-content"><div><h2>${esc(title||'V15 page')}</h2><p>This page could not load.</p></div></div></div><div class="card"><div class="callout cloud-error"><b>V15 error:</b> ${esc(e?.message||e||'Unknown error')}</div><p class="muted">Your records were not deleted. If this says permission denied, publish the latest Firestore rules; otherwise use Retry.</p><button class="btn primary" id="v15PageRetry">Retry</button></div>`;
  p.querySelector('#v15PageRetry')?.addEventListener('click',()=>V.openRoleTab(name,true));
}

async function renderPrincipal(name){
  const map={dashboard:['Principal Dashboard','renderPrincipalDashboard'],users:['Staff & Access','renderPrincipalStaff'],notices:['Institute Notices','renderPrincipalNotices'],inspection:['Inspection & Compliance','renderPrincipalInspection'],reports:['Institute Reports','renderPrincipalReports']};
  const x=map[name];if(!x)return;
  loading(name,x[0]);
  const fn=V[x[1]];
  if(typeof fn!=='function')throw new Error(`${x[0]} renderer is missing.`);
  await fn.call(V);
}

async function renderRolePage(r,name){
  if(r==='admin'){
    loading('admin-console','System Admin Panel');
    if(typeof V.renderAdminPanel!=='function')throw new Error('System Admin renderer is missing.');
    await V.renderAdminPanel();return;
  }
  if(r==='principal'){await renderPrincipal(name);return;}
  if(r==='staff'){
    if(name==='dashboard')V.renderStaffDashboard?.();
    if(name==='notices')await V.injectInstituteNotices?.();
    if(name==='reports')window.Reports?.renderSignatures?.();
    return;
  }
  if(r==='student'){
    if(name==='dashboard')V.renderStudentDashboard?.();
    if(name==='notices')await V.injectInstituteNotices?.();
    V.sanitizeStudent?.();return;
  }
  // Instructor keeps the mature V14/V13 content renderers, but navigation is V15-owned.
  if(name==='dashboard')window.Dashboard?.render?.();
  if(name==='reports')window.Reports?.renderSignatures?.();
  if(name==='inspection')window.Inspection?.render?.();
  if(name==='notices')await V.injectInstituteNotices?.();
  if(name==='attendance')await V.injectAttendanceGovernance?.();
  if(name==='gallery')await V.injectGalleryCloud?.();
}

V.openRoleTab=async function(name,force=false){
  const r=role();if(!V.ready||!r)return false;
  if(!MATRIX[r]?.has(name))name=defaultTab(r);
  setVisuals(r);activate(name);
  try{await renderRolePage(r,name);}
  catch(e){console.error('V15 role page',r,name,e);showError(name,NAV[r]?.[name]||LABEL[r]||name,e);}
  try{App.buildMobileNav?.();}catch(e){}
  return true;
};

// Canonical role portal application. This intentionally replaces the older wrapper
// so legacy Users.render()/Dashboard.render() cannot overwrite Principal pages.
V.applyRolePortal=async function(){
  const r=role();if(!r||!V.ready)return false;
  if(r==='admin')V.ensureAdminTab?.();else{document.querySelector('.tab[data-tab="admin-console"]')?.remove();document.getElementById('tab-admin-console')?.remove();}
  document.querySelectorAll('#tabs .tab').forEach(b=>{
    const ok=MATRIX[r]?.has(b.dataset.tab);b.style.display=ok?'':'none';
    if(NAV[r]?.[b.dataset.tab])b.textContent=NAV[r][b.dataset.tab];
  });
  setVisuals(r);
  if(r==='instructor'){
    try{await V.ensureWorkspaceSwitcher?.();}catch(e){}
    try{await V.injectAttendanceGovernance?.();}catch(e){}
    try{await V.injectGalleryCloud?.();}catch(e){}
    try{await V.rebuildWorkspaceSummary?.();}catch(e){}
  }
  if(r!=='principal')try{await V.injectInstituteNotices?.();}catch(e){}
  const active=document.querySelector('#tabs .tab.active');
  const name=active&&MATRIX[r]?.has(active.dataset.tab)?active.dataset.tab:defaultTab(r);
  await V.openRoleTab(name,true);
  return true;
};

// Replace legacy switchTab after all older scripts have loaded.
const legacySwitch=App.switchTab?.bind(App);
App.switchTab=function(name){
  if(V.ready&&role()){V.openRoleTab(name).catch(console.error);return;}
  return legacySwitch?.(name);
};

// Capture desktop tab clicks before the V13 listener can call its old renderers.
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#tabs .tab');if(!b||!V.ready||!role())return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  V.openRoleTab(b.dataset.tab).catch(console.error);
},true);

// Keep visual role/footer correct even if a legacy refresh rewrites the shell later.
setInterval(()=>{
  const r=role();if(!V.ready||!r)return;setVisuals(r);
  const active=document.querySelector('#tabs .tab.active');
  if(!active||!MATRIX[r]?.has(active.dataset.tab))V.openRoleTab(defaultTab(r)).catch(()=>{});
},800);

window.addEventListener('pageshow',()=>setTimeout(()=>{if(V.ready&&role())V.applyRolePortal().catch(console.error);},30));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&V.ready&&role())setTimeout(()=>V.applyRolePortal().catch(console.error),30);});
console.info('V15 Production 16 deterministic role router active.');
})(window.V15Sync);
