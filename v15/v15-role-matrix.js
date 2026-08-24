/* V15 role portals and final least-confusion UI matrix.
 * Loaded last. It turns the shared V14 shell into purpose-built V15 workspaces:
 * - System Admin: technical accounts/security/migration/health only.
 * - Principal: institute oversight, staff, alerts, notices, inspection and reports.
 * - Instructor: full teaching/record workflow.
 * - Staff: small read-only office/support view.
 * - Student: own profile/attendance/learning/marks/leave/tests only.
 */
(function(V){
'use strict';
if(!V) return;

const MATRIX={
  admin:new Set(['admin-console']),
  principal:new Set(['dashboard','users','notices','record-formats','inspection','reports']),
  instructor:new Set(['dashboard','ai-assistant','syllabus-ai','modules','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities','record-formats','inspection','cloud','reports']),
  staff:new Set(['dashboard','notices','record-formats','reports']),
  student:new Set(['dashboard','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt'])
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const NAV_LABELS={
  principal:{dashboard:'📊 Principal Dashboard',users:'👥 Staff & Access',notices:'📰 Notices', 'record-formats':'🖨️ Record Formats',inspection:'🛡️ Inspection & Compliance',reports:'📄 Reports'},
  staff:{dashboard:'📊 Staff Dashboard',notices:'📰 Notices','record-formats':'🖨️ Record Formats',reports:'📄 Reports'},
  student:{dashboard:'🏠 My Dashboard',trainees:'👤 My Profile',attendance:'✅ My Attendance',practicals:'🖥️ My Practicals',theory:'📘 Theory',splitup:'🗓️ Training Calendar',evaluation:'📝 My Marks',notices:'📰 Notices',leave:'🩺 My Leave',exams:'📝 Class Tests',ojt:'🏭 My OJT / Projects'}
};

function activeRole(){return SESSION?.role||'';}
function allowed(tab){return !!MATRIX[activeRole()]?.has(tab);}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function num(v){const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null;}
function pct(v){const n=num(v);return n==null?'—':`${Math.round(n)}%`;}
function attendancePct(t){try{return num(Trainees?.attendancePct?.(t.id));}catch(e){return null;}}
function practicalAvg(t){try{return num(Trainees?.practicalAvg?.(t.id));}catch(e){return null;}}
function countMap(o){let n=0;for(const v of Object.values(o||{})){if(v&&typeof v==='object')n+=Object.keys(v).length;else n++;}return n;}
function statusPending(v){return !v||/pending|requested|new|applied/i.test(String(v));}
function conductedCount(a){return (a||[]).filter(x=>x?.conducted===true||x?.completed===true||/conducted|completed|done|approved/i.test(String(x?.status||''))).length;}
function button(panel,tab,label){const b=panel.querySelector(`[data-go="${tab}"]`);if(b)b.addEventListener('click',()=>App.switchTab(tab));}
function card(title,value,sub=''){return `<div class="card"><div class="muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(title)}</div><div style="font-size:30px;font-weight:800;margin-top:6px">${esc(value)}</div>${sub?`<div class="muted" style="margin-top:5px">${esc(sub)}</div>`:''}</div>`;}

function patchLegacyChrome(){
  const pin=document.getElementById('changePinBtn');if(pin)pin.style.display='none';
  const role=activeRole();
  const cap=document.querySelector('.sidebar-caption small');
  if(cap) cap.textContent=role==='principal'?'Principal oversight • V15':role==='admin'?'Technical administration • V15':role==='student'?'Student workspace • V15':role==='staff'?'Staff read-only • V15':'Instructor workspace • V15';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(/Instructor Automation\s*•\s*V13/i.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(/Instructor Automation\s*•\s*V13/ig,'Universal ITI • V15 Shared Realtime');});
}

function resetNavLabels(){
  const original={dashboard:'📊 Dashboard',users:'👥 Staff & Access',trainees:'👥 Trainees',attendance:'✅ Attendance',practicals:'🖥️ Practicals',theory:'📘 Theory',splitup:'🗓️ Split-up Syllabus',evaluation:'📝 Evaluation',notices:'📰 Notice Board',leave:'🩺 Leave & Discipline',exams:'📝 Class Test',ojt:'🏭 OJT & Projects',gallery:'🖼️ Gallery',activities:'🏆 Extra Activities','record-formats':'🖨️ Record Formats',inspection:'🛡️ Inspection File',cloud:'☁️ Cloud & Drive',reports:'📄 Reports'};
  document.querySelectorAll('#tabs .tab').forEach(b=>{if(original[b.dataset.tab])b.textContent=original[b.dataset.tab];});
  const labels=NAV_LABELS[activeRole()]||{};
  for(const [tab,label] of Object.entries(labels)){const b=document.querySelector(`#tabs .tab[data-tab="${tab}"]`);if(b)b.textContent=label;}
}

async function renderPrincipalDashboard(){
  const panel=document.getElementById('tab-dashboard');if(!panel||activeRole()!=='principal')return;
  const trainees=[...(DATA?.trainees||[])];
  const threshold=num(DATA?.meta?.attendanceThreshold)??80;
  const att=trainees.map(t=>({t,p:attendancePct(t),a:practicalAvg(t)}));
  const valid=att.filter(x=>x.p!=null);const avgAtt=valid.length?Math.round(valid.reduce((s,x)=>s+x.p,0)/valid.length):null;
  const low=att.filter(x=>x.p!=null&&x.p<threshold).sort((a,b)=>a.p-b.p);
  const pCount=(DATA?.practicals||[]).length,tCount=(DATA?.theory||[]).length;
  const pDone=conductedCount(DATA?.practicals),tDone=conductedCount(DATA?.theory);
  const pendingLeaves=(DATA?.leaves||[]).filter(x=>statusPending(x?.status)).length;
  const tests=(DATA?.exams||[]).length,attempts=(DATA?.examAttempts||[]).length;
  const projects=(DATA?.projects||[]).length;
  let activeStaff='—';
  try{const d=await V.staffDirectory?.();if(d)activeStaff=(d.members||[]).filter(x=>!x.owner&&x.active!==false&&['instructor','staff'].includes(x.role)).length;}catch(e){}
  const rows=low.slice(0,15).map(x=>`<tr><td>${esc(x.t.roll||'')}</td><td><b>${esc(x.t.name||'')}</b></td><td>${pct(x.p)}</td><td>${x.a==null?'—':pct(x.a)}</td><td><span class="badge pending">Below ${esc(threshold)}%</span></td></tr>`).join('');
  panel.innerHTML=`
    <div class="hero" style="margin-bottom:16px"><div class="hero-content"><div><span class="showcase-kicker">INSTITUTE OVERSIGHT</span><h2>Principal Dashboard</h2><p>High-level academic, attendance and compliance monitoring. Daily attendance marking and teaching-plan entry remain with the Instructor.</p></div></div></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:16px">
      ${card('Trainees',trainees.length,'Current shared trainee register')}
      ${card('Average Attendance',avgAtt==null?'—':avgAtt+'%',`${low.length} below ${threshold}%`)}
      ${card('Active Instructor / Staff',activeStaff,'Managed from Staff & Access')}
      ${card('Pending Leave Requests',pendingLeaves,'Trainee leave/discipline attention')}
    </div>
    <div class="cards" style="grid-template-columns:1.25fr .75fr;margin-bottom:16px">
      <div class="card"><div class="field-row" style="justify-content:space-between;align-items:center"><div><h3>Attendance Attention</h3><p class="muted">Only trainees below the institute attendance threshold are shown.</p></div><span class="badge">Threshold ${esc(threshold)}%</span></div>
        <div class="table-wrap"><table class="datatable"><thead><tr><th>Roll</th><th>Trainee</th><th>Attendance</th><th>Practical Avg</th><th>Status</th></tr></thead><tbody>${rows||`<tr><td colspan="5" class="muted">No trainee is currently below ${esc(threshold)}% attendance.</td></tr>`}</tbody></table></div>
      </div>
      <div class="card"><h3>Academic Record Status</h3>
        <p><b>Trade Practical:</b> ${esc(pCount)} planned${pDone?` • ${esc(pDone)} marked conducted`:''}</p>
        <p><b>Trade Theory:</b> ${esc(tCount)} planned${tDone?` • ${esc(tDone)} marked conducted`:''}</p>
        <p><b>Class Tests:</b> ${esc(tests)} tests • ${esc(attempts)} attempts</p>
        <p><b>OJT / Projects:</b> ${esc(projects)} records</p>
        <p><b>Calendar/Holidays:</b> ${esc((DATA?.holidays||[]).length)} entries</p>
      </div>
    </div>
    <div class="card"><h3>Principal Actions</h3><p class="muted">Keep this workspace focused on authorization, monitoring, inspection and official reporting.</p><div class="field-row" style="flex-wrap:wrap"><button class="btn primary" data-go="users">👥 Staff & Access</button><button class="btn secondary" data-go="reports">📄 Reports</button><button class="btn secondary" data-go="inspection">🛡️ Inspection & Compliance</button><button class="btn ghost" data-go="notices">📰 Notice Board</button></div></div>`;
  ['users','reports','inspection','notices'].forEach(t=>button(panel,t));
}

function renderStaffDashboard(){
  const panel=document.getElementById('tab-dashboard');if(!panel||activeRole()!=='staff')return;
  panel.innerHTML=`<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">READ-ONLY SUPPORT</span><h2>Staff Dashboard</h2><p>View notices, approved record formats and reports. Teaching, attendance, marks and student account management stay with authorized teaching staff.</p></div></div></div>
  <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:16px">${card('Trainees',(DATA?.trainees||[]).length,'Summary only')}${card('Notices',(DATA?.notices||[]).length,'Institute communication')}${card('Practical Records',(DATA?.practicals||[]).length,'Shared academic register')}${card('Theory Records',(DATA?.theory||[]).length,'Shared academic register')}</div>
  <div class="card"><div class="field-row"><button class="btn primary" data-go="notices">📰 Notices</button><button class="btn secondary" data-go="reports">📄 Reports</button><button class="btn ghost" data-go="record-formats">🖨️ Record Formats</button></div></div>`;
  ['notices','reports','record-formats'].forEach(t=>button(panel,t));
}

function nextPlanned(a){
  const now=new Date();now.setHours(0,0,0,0);
  return (a||[]).map(x=>({x,d:new Date(x?.plannedDate||x?.proposedDate||x?.date||'')})).filter(z=>!isNaN(z.d)&&z.d>=now).sort((a,b)=>a.d-b.d)[0]?.x||null;
}
function renderStudentDashboard(){
  const panel=document.getElementById('tab-dashboard');if(!panel||activeRole()!=='student')return;
  const t=(DATA?.trainees||[])[0]||{};const ap=attendancePct(t),pa=practicalAvg(t);
  const np=nextPlanned(DATA?.practicals),nt=nextPlanned(DATA?.theory);
  const ownLeaves=(DATA?.leaves||[]).length,tests=(DATA?.exams||[]).length;
  panel.innerHTML=`<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">MY TRAINING</span><h2>${esc(t.name||SESSION?.name||'Student')} — Dashboard</h2><p>${t.roll?`Roll ${esc(t.roll)} • `:''}${t.prn?`PRN ${esc(t.prn)} • `:''}${esc(DATA?.meta?.trade||'ITI Training')}</p></div></div></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-top:16px;margin-bottom:16px">${card('My Attendance',ap==null?'—':Math.round(ap)+'%','Attendance is read-only')}${card('Practical Average',pa==null?'—':Math.round(pa)+'%','Based on evaluated practicals')}${card('Leave Requests',ownLeaves,'My submitted requests')}${card('Class Tests',tests,'Available class tests')}</div>
    <div class="cards" style="grid-template-columns:1fr 1fr;margin-bottom:16px"><div class="card"><h3>Next Practical</h3><p>${esc(np?.title||np?.topic||np?.name||'Check the Training Calendar')}</p></div><div class="card"><h3>Next Theory</h3><p>${esc(nt?.title||nt?.topic||nt?.name||'Check the Training Calendar')}</p></div></div>
    <div class="card"><h3>Quick Access</h3><div class="field-row" style="flex-wrap:wrap"><button class="btn primary" data-go="attendance">✅ My Attendance</button><button class="btn secondary" data-go="practicals">🖥️ My Practicals</button><button class="btn secondary" data-go="splitup">🗓️ Training Calendar</button><button class="btn ghost" data-go="notices">📰 Notices</button></div></div>`;
  ['attendance','practicals','splitup','notices'].forEach(x=>button(panel,x));
}

function hideButtons(panelId,re){
  const p=document.getElementById(panelId);if(!p)return;
  p.querySelectorAll('button').forEach(b=>{const txt=(b.textContent||'').trim();if(re.test(txt))b.style.display='none';});
}
function sanitizeStudent(){
  if(activeRole()!=='student')return;
  const tr=document.getElementById('tab-trainees');if(tr){const h=tr.querySelector('h2');if(h)h.textContent='👤 My Profile';}
  hideButtons('tab-trainees',/add trainee|load 5|clear all|import|remove|reset|set gmail|change gmail/i);
  hideButtons('tab-attendance',/mark all|save attendance|present all|absent all|bulk|reset|clear|import/i);
  hideButtons('tab-practicals',/add practical|new practical|edit|delete|remove|mark conducted|generate.*plan|ai draft|approve.*plan/i);
  hideButtons('tab-theory',/add lesson|new lesson|edit|delete|remove|mark conducted|generate.*plan|ai draft|approve.*plan/i);
  hideButtons('tab-splitup',/generate|apply calendar|save calendar|load holiday|add holiday|import|clear/i);
  hideButtons('tab-evaluation',/save marks|update marks|add marks|edit|delete|remove|evaluate trainee/i);
  hideButtons('tab-notices',/add notice|new notice|edit|delete|remove|publish/i);
  hideButtons('tab-leave',/approve|reject|discipline action|delete request/i);
  hideButtons('tab-exams',/create test|new test|edit test|delete test|publish test/i);
  hideButtons('tab-ojt',/add project|new project|edit|delete|remove|grade|approve/i);
}
function sanitizeStaff(){
  if(activeRole()!=='staff')return;
  hideButtons('tab-notices',/add notice|new notice|edit|delete|remove|publish/i);
}

function safeBackupData(){
  const clean=(v)=>{
    if(Array.isArray(v))return v.map(clean);
    if(v&&typeof v==='object'){
      const o={};for(const [k,val] of Object.entries(v)){if(/^(pin|principalPin|instructorPin|dataUrl|activationProof)$/i.test(k))continue;o[k]=clean(val);}return o;
    }
    return v;
  };
  return clean(DATA||{});
}
V.downloadEmergencyBackup=function(){
  if(activeRole()!=='admin'||!V.member?.owner)return;
  const payload={exportedAt:new Date().toISOString(),schemaVersion:15,instituteId:V.INSTITUTE_ID,workspaceId:V.workspaceId,data:safeBackupData()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ITI-V15-emergency-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
};
async function enhanceAdminPanel(){
  if(activeRole()!=='admin'||!V.member?.owner)return;
  const panel=document.getElementById('tab-admin-console');if(!panel||document.getElementById('v15AdminSystemHealth'))return;
  let members=[],pending=[];try{const d=await V.accountDirectory?.();members=d?.members||[];pending=(d?.access||[]).filter(a=>!members.some(m=>V.email(m.email)===V.email(a.email)));}catch(e){}
  const roleCount=r=>members.filter(m=>m.active!==false&&m.role===r&&!m.owner).length;
  const health=document.createElement('div');health.id='v15AdminSystemHealth';health.className='card';health.style.marginTop='16px';
  health.innerHTML=`<div class="field-row" style="justify-content:space-between;align-items:flex-start"><div><h3>🩺 System Health & Safety</h3><p class="muted">Technical overview only. Academic work remains in the Principal/Instructor workspaces.</p></div><span class="badge success">Schema V15</span></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:12px 0">${card('Principal',roleCount('principal'),'Active account')}${card('Instructors',roleCount('instructor'),'Active accounts')}${card('Staff',roleCount('staff'),'Active accounts')}${card('Students',roleCount('student'),'Activated accounts')}${card('Pending Access',pending.length,'Waiting first login')}</div>
    <div class="callout"><b>Shared workspace:</b> ${esc(V.workspaceId||'—')}<br><b>Firebase project:</b> ${esc(V.config?.().projectId||'—')}<br><b>Data:</b> ${(DATA?.trainees||[]).length} trainees • ${(DATA?.practicals||[]).length} practicals • ${(DATA?.theory||[]).length} theory • ${countMap(DATA?.attendance)} attendance entries • ${countMap(DATA?.marks)} mark entries</div>
    <div class="field-row" style="margin-top:12px"><button class="btn secondary" id="v15EmergencyBackup">⬇️ Download Emergency JSON Backup</button></div>`;
  panel.appendChild(health);health.querySelector('#v15EmergencyBackup')?.addEventListener('click',()=>V.downloadEmergencyBackup());
}

const adminRenderBase=V.renderAdminPanel?.bind(V);
if(adminRenderBase){V.renderAdminPanel=async function(...args){const r=await adminRenderBase(...args);await enhanceAdminPanel();return r;};}

V.enforceRoleMatrix=async function(){
  const role=activeRole();if(!role||!MATRIX[role])return;
  const users=document.querySelector('.tab[data-tab="users"]');if(users){users.dataset.roles='principal';users.textContent='👥 Staff & Access';}
  if(role==='admin')this.ensureAdminPanel?.();
  resetNavLabels();
  document.querySelectorAll('#tabs .tab').forEach(b=>{b.style.display=allowed(b.dataset.tab)?'':'none';});
  if(role!=='principal')document.getElementById('v15StaffShortcut')?.remove();
  if(role==='principal'){try{await this.renderAuthorityStaffPanel?.();}catch(e){try{await this.renderStaffPanel?.(false);}catch(_){}}}
  patchLegacyChrome();
  if(role==='principal')await renderPrincipalDashboard();
  else if(role==='student'){renderStudentDashboard();sanitizeStudent();}
  else if(role==='staff'){renderStaffDashboard();sanitizeStaff();}
  else if(role==='admin')await enhanceAdminPanel();
  const visible=[...document.querySelectorAll('#main > section.panel')].find(p=>p.style.display!=='none'&&p.offsetParent!==null),visibleTab=visible?.id?.replace(/^tab-/,'');
  if(!visibleTab||!allowed(visibleTab)){const first=role==='admin'?'admin-console':'dashboard';setTimeout(()=>{try{App.switchTab(first);}catch(e){}},0);}
  const who=document.getElementById('whoName');if(who&&SESSION){const creator=this.member?.owner&&role!=='admin'?' • Creator':'';who.textContent=`${SESSION.name} • ${LABEL[role]||role}${creator}`;}
  try{App.buildMobileNav?.();}catch(e){}
};

const applyBase=V.applySelectedRoleUI?.bind(V);
if(applyBase){V.applySelectedRoleUI=async function(){const r=await applyBase();await this.enforceRoleMatrix();return r;};}
const roleBase=V.applyRoleWorkspace?.bind(V);
if(roleBase){V.applyRoleWorkspace=async function(){const r=await roleBase();await this.enforceRoleMatrix();return r;};}
const refreshBase=V.refresh?.bind(V);
if(refreshBase){V.refresh=function(){const r=refreshBase();setTimeout(()=>V.ready&&V.enforceRoleMatrix().catch(console.error),0);return r;};}

const switchBase=App.switchTab?.bind(App);
if(switchBase){App.switchTab=function(name){
  if(SESSION&&MATRIX[SESSION.role]&&!MATRIX[SESSION.role].has(name))name=SESSION.role==='admin'?'admin-console':'dashboard';
  const r=switchBase(name);
  if(name==='admin-console'&&SESSION?.role==='admin')V.renderAdminPanel?.(false).catch(console.error);
  if(name==='users'&&SESSION?.role==='principal')V.renderAuthorityStaffPanel?.().catch(console.error);
  setTimeout(()=>{patchLegacyChrome();if(SESSION?.role==='student')sanitizeStudent();if(SESSION?.role==='staff')sanitizeStaff();},0);
  return r;
};}

setTimeout(()=>V.ready&&V.enforceRoleMatrix().catch(console.error),0);
console.info('V15 purpose-built role portals active.');
})(window.V15Sync);
