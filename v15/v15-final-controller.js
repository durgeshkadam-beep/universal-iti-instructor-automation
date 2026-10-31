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
  instructor:[['dashboard','📊 Dashboard'],['ai-assistant','✨ AI Assistant'],['planning','🗓️ Year Planning / Split-up'],['skill-review','✅ Skills & Workplace Use'],['market-editor','💼 Job Sources'],['trainees','👥 Trainees'],['attendance','✅ Attendance'],['practicals','🖥️ Practicals'],['theory','📘 Theory'],['evaluation','📝 Evaluation'],['notices','📰 Notice Board'],['leave','🩺 Leave & Discipline'],['exams','📝 Secure MCQ Exams'],['ojt','🏭 OJT & Projects'],['gallery','🖼️ Gallery'],['activities','🏆 Extra Activities'],['records','📄 Records & Backup']],
  staff:[['dashboard','📊 Staff Dashboard'],['notices','📰 Notices'],['record-formats','🖨️ Record Formats'],['reports','📄 Reports']],
  student:[['dashboard','🏠 My Dashboard'],['trainees','👤 My Profile'],['attendance','✅ My Attendance'],['practicals','🖥️ My Practicals'],['theory','📘 Theory'],['splitup','🗓️ Training Calendar'],['evaluation','📝 My Marks'],['notices','📰 Notices'],['leave','🩺 My Leave'],['exams','📝 Class Tests'],['ojt','🏭 My OJT / Projects'],['career-coach','💬 Career Coach'],['skills','🧩 My Skills'],['skill-gap','🎯 Skill Gap'],['career-lens','🔎 Skill to Career'],['local-market','📍 Job Market']]
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const START={
  principal:[['users','Staff & Access','Review staff access and assignments.'],['inspection','Inspection & Compliance','Review submitted training records.'],['reports','Institute Reports','Open institute reports.']],
  instructor:[['attendance','Take Attendance','Open the daily attendance register.'],['skill-review','Verify Student Skills','Record practical evidence and progress.'],['planning','Plan Training','Review your saved year plan and day-wise training schedule.']],
  staff:[['notices','Read Notices','View institute announcements.'],['record-formats','Record Formats','Open the available record formats.'],['reports','View Reports','Review the available reports.']],
  student:[['attendance','My Attendance','Check your attendance record.'],['skills','My Skills','View your skills and instructor verification.'],['career-lens','See Your Skill’s Future','Link verified practicals to reviewed career examples.']]
};
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
    #v15QuickStart{margin-bottom:18px}
    #v15QuickStart .v15-start-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    #v15QuickStart button{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;white-space:normal;text-align:left;padding:16px!important;min-height:96px!important;height:auto;min-width:0;overflow-wrap:anywhere;line-height:1.4}
    #v15QuickStart button strong,#v15QuickStart button span{flex-shrink:0;font-family:inherit;line-height:1.4}
    #v15QuickStart button span{font-weight:400;font-size:.9rem}
    @media(max-width:650px){#v15QuickStart .v15-start-grid{grid-template-columns:1fr}}
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
  // Retain the existing forms before replacing the shell. Grouped routes reuse these nodes.
  oldMain.querySelectorAll(':scope > .panel').forEach(p=>{const key=p.id.replace(/^tab-/,'');if(!preserved.has(key))preserved.set(key,p);});
  const panels=document.createDocumentFragment();
  for(const [name] of NAV[r]){const p=keepPanel(name);p.classList.add('panel');p.classList.remove('active');p.hidden=false;p.style.display='';panels.appendChild(p);}
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

let tradeBuildSerial=0;
V.finalEnsureWorkspaceSwitcher=async function(){
  const ticket=++tradeBuildSerial;
  if(role()!=='instructor'){removeOldTradeSwitchers();return;}
  const who=document.querySelector('.topbar .who');if(!who)return;
  const list=await V.listTradeWorkspaces?.({includeArchived:false})||[];
  if(ticket!==tradeBuildSerial||role()!=='instructor')return;
  removeOldTradeSwitchers();
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

let attendanceBuildSerial=0;
V.finalAttendanceGovernance=async function(){
  const ticket=++attendanceBuildSerial;
  if(role()!=='instructor')return;
  const p=panel('attendance');if(!p)return;
  removeAttendanceDuplicates();
  const m=(document.getElementById('attDate')?.value||todayISO()).slice(0,7),scope=V.workspaceId,uid=V.fb?.user?.uid,l=await V.getAttendanceLock?.(m);
  if(ticket!==attendanceBuildSerial||role()!=='instructor'||V.workspaceId!==scope||V.fb?.user?.uid!==uid||(document.getElementById('attDate')?.value||todayISO()).slice(0,7)!==m)return;
  const d=document.createElement('div');d.className='card';d.id='v15AttendanceGovernance';d.dataset.v15AttendanceGovernance='1';
  d.innerHTML=`<h3>🔒 Monthly Attendance Submission</h3><p class="muted">Submit a completed month to Principal. Submitted/approved months are locked until Principal reopens them.</p><div class="field-row"><div class="field"><label>Submission month</label><input id="v15AttMonth" type="month" value="${esc(m)}"></div><div><span class="badge">Current: ${esc(l?.status||'Open')}</span></div></div><button class="btn secondary" id="v15AttSubmit">Submit month to Principal</button>`;
  removeAttendanceDuplicates();p.prepend(d);
  const monthInput=d.querySelector('#v15AttMonth');monthInput.addEventListener('change',async()=>{const date=document.getElementById('attDate');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthInput.value))return;date.value=monthInput.value+'-01';Attendance.loadDay();await V.finalAttendanceGovernance();});
  d.querySelector('#v15AttSubmit').addEventListener('click',async()=>{const month=d.querySelector('#v15AttMonth').value;try{await V.submitAttendanceMonth(month);alert('Attendance month submitted and locked for Principal review.');await V.finalAttendanceGovernance();}catch(e){alert(e.message||e);}});
};
V.injectAttendanceGovernance=V.finalAttendanceGovernance;
document.addEventListener('change',e=>{if(e.target.id==='attDate'&&role()==='instructor')V.finalAttendanceGovernance().catch(console.error);});

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
  try{if(name==='ai-assistant'){InstructorAI?.refreshStatus?.();InstructorAI?.refreshTopicPicker?.();InstructorAI?.renderToday?.();}}catch(e){}
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
  if(name==='exams')return V.renderSecureExams?.();
  if(name==='career-coach')return V.renderCareerCoach?.();
  if(name==='skills')return V.renderSkillPassport?.();
  if(name==='skill-gap')return V.renderStudentSkillGap?.();
  if(name==='local-market')return V.renderStudentLocalMarket?.();
  if(name==='career-lens')return V.renderSkillCareerLens?.();
  if(name==='dashboard')V.renderStudentDashboard?.();
  else renderLegacyInstructor(name);
  if(name==='notices')await V.injectInstituteNotices?.();
  V.sanitizeStudent?.();
}

const GROUPS={
  planning:{title:'Year Planning / Split-up',intro:'Review the saved calendar or import and review syllabus topics. Viewing and printing do not regenerate your plan.',items:[['splitup','Saved split-up'],['syllabus-ai','Import & plan'],['modules','Topics & modules (advanced)']]},
  records:{title:'Records & Backup',intro:'Generate records from this workspace, review them and print or save PDF. A PDF is a readable copy; a training JSON backup restores only its listed training resources.',items:[['reports','My records'],['record-formats','Plans & other formats'],['inspection','Inspection & profile'],['cloud','Backup & Drive'],['pilot-impact','Pilot evidence (optional)']]}
};
const INSTRUCTOR_ALIASES=Object.fromEntries(Object.entries(GROUPS).flatMap(([name,g])=>g.items.map(([child])=>[child,name])));
INSTRUCTOR_ALIASES['skill-applications']='skill-review';
let planningScope='';
function groupHeading(title,intro,items,selected){
  const header=document.createElement('div');header.className='card instructor-group-header';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=intro;p.className='muted';const nav=document.createElement('div');nav.className='instructor-section-nav';nav.setAttribute('aria-label',title+' sections');
  for(const [key,label] of items){const b=document.createElement('button');b.type='button';b.className='btn '+(key===selected?'primary':'ghost');b.setAttribute('aria-pressed',String(key===selected));b.textContent=label;b.addEventListener('click',()=>V.finalOpenTab(key).catch(console.error));nav.append(b);}
  header.append(h,p,nav);return header;
}
async function renderGroup(name,requested){
  const group=GROUPS[name],host=panel(name),selected=group.items.some(([key])=>key===requested)?requested:group.items[0][0];
  if(name==='planning'){
    const scope=[V.fb?.user?.uid,V.workspaceId].join('|');if(scope!==planningScope){planningScope=scope;UniversalSyllabus.state={trade:DATA.meta.trade||'',items:[],calendar:[],sourceName:'',analyzedAt:null};UniversalSyllabus._calendarContext=null;for(const [id,value] of [['uTrade',DATA.meta.trade||''],['uStart',DATA.meta.scheduleStartDate||''],['uEnd',DATA.meta.sessionEndDate||DATA.meta.scheduleEndDate||'']]){const input=keepPanel('syllabus-ai').querySelector('#'+id);if(input)input.value=value;}UniversalSyllabus.renderPreview();UniversalSyllabus.renderCalendar();}
  }
  const children=group.items.map(([key])=>{const child=keepPanel(key);child.classList.remove('panel');child.classList.toggle('active',key===selected);child.classList.add('instructor-subsection');child.hidden=key!==selected;child.style.display=key===selected?'block':'none';return child;});
  host.replaceChildren(groupHeading(group.title,group.intro,group.items,selected),...children);
  if(selected==='pilot-impact')await V.renderPilotTimeEvidence?.();else renderLegacyInstructor(selected);
  if(selected==='syllabus-ai'){UniversalSyllabus.init();UniversalSyllabus.renderPreview();UniversalSyllabus.renderCalendar();}
  if(selected==='record-formats')RecordFormats.populatePlanSelects?.();
  if(selected==='reports')Reports.renderStorageStats?.();
}
async function renderSkillGroup(requested){
  const host=panel('skill-review'),industry=requested==='skill-applications',assessment=document.createElement('div'),application=keepPanel('skill-applications');assessment.id='v15InstructorAssessment';assessment.hidden=industry;application.classList.remove('panel');application.hidden=!industry;application.style.display=industry?'block':'none';
  host.replaceChildren(groupHeading('Skills & Workplace Use','Review workplace applications once per practical. Verify each Student only after observing their own work; workplace guidance is not an assessment or certification.',[['skill-review','Student assessment'],['skill-applications','Workplace use & sources']],industry?'skill-applications':'skill-review'),assessment,application);
  if(industry)await V.renderInstructorSkillApplications?.();else await V.renderInstructorSkillVerification?.(assessment);
}

async function renderRole(r,name,requested){
  if(r==='admin')return V.renderAdminPanel?.();
  if(r==='principal')return renderPrincipal(name);
  if(r==='instructor'){
    if(name==='exams')return V.renderSecureExams?.();
    if(GROUPS[name])return renderGroup(name,requested);
    if(name==='skill-review')return renderSkillGroup(requested);
    if(name==='skill-applications')return V.renderInstructorSkillApplications?.();
    if(name==='market-editor')return V.renderInstructorMarketEditor?.();
    if(name==='pilot-impact')return V.renderPilotTimeEvidence?.();
    renderLegacyInstructor(name);
    if(name==='attendance')await V.finalAttendanceGovernance();
    if(name==='gallery')await V.injectGalleryCloud?.();
    if(name==='notices')await V.injectInstituteNotices?.();
    return;
  }
  if(r==='staff')return renderStaff(name);
  if(r==='student')return renderStudent(name);
}

function renderQuickStart(r){
  const host=panel('dashboard');if(!host||!START[r])return;
  host.querySelector('#v15QuickStart')?.remove();
  const card=document.createElement('section');card.id='v15QuickStart';card.className='card';card.setAttribute('aria-label','Main tasks');
  card.innerHTML='<h2>Start here</h2><p class="muted">Choose a main task below. All other tools remain in the menu.</p><div class="v15-start-grid"></div>';
  for(const [target,title,description] of START[r]){
    if(!allowed(r,target))continue;
    const button=document.createElement('button');button.type='button';button.className='btn secondary';button.dataset.quickTab=target;
    const heading=document.createElement('strong');heading.textContent=title;button.appendChild(heading);
    const detail=document.createElement('span');detail.textContent=description;button.appendChild(detail);
    button.addEventListener('click',()=>V.finalOpenTab(target).catch(console.error));card.querySelector('.v15-start-grid').appendChild(button);
  }
  host.prepend(card);
}

V.finalOpenTab=async function(name){
  const r=role();if(!V.ready||!r)return false;
  const requested=name;if(r==='instructor')name=INSTRUCTOR_ALIASES[name]||name;
  if(!allowed(r,name))name=defaultTab(r);
  if(!mount(r))return false;
  updateVisuals(r);activate(name);
  // Record selection before asynchronous rendering so shell refreshes follow the latest route.
  localStorage.setItem('iti-v15-tab-v2',name);
  try{await renderRole(r,name,requested);if(name==='dashboard')renderQuickStart(r);}catch(e){console.error('FINAL page',r,name,e);pageError(name,e);}
  if(r==='instructor')V.finalEnsureWorkspaceSwitcher().catch(()=>{});else removeOldTradeSwitchers();
  try{App.buildMobileNav?.();}catch(e){}
  return true;
};

V.applyRolePortal=async function(){
  const r=role();if(!V.ready||!r)return false;
  mount(r);updateVisuals(r);
  if(r!=='instructor')removeOldTradeSwitchers();
  const saved=localStorage.getItem('iti-v15-tab-v2');
  return V.finalOpenTab(saved||defaultTab(r));
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
