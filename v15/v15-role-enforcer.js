/* V15 final role UI enforcer.
 * Safety net for browsers where the old V14 shell becomes visible before the
 * asynchronous V15 role portal finishes. This script does not grant access;
 * Firebase/member authorization has already completed before SESSION exists.
 */
(function(V){
'use strict';
if(!V)return;
const MATRIX={
  admin:new Set(['admin-console']),
  principal:new Set(['dashboard','users','notices','record-formats','inspection','reports']),
  instructor:new Set(['dashboard','ai-assistant','syllabus-ai','modules','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities','record-formats','inspection','cloud','reports']),
  staff:new Set(['dashboard','notices','record-formats','reports']),
  student:new Set(['dashboard','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt'])
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const CAPTION={admin:'Technical administration • V15',principal:'Principal oversight • V15',instructor:'Instructor workspace • V15',staff:'Staff read-only • V15',student:'Student workspace • V15'};
let busy=false,last='';
function role(){return window.SESSION?.role||'';}
function ensureAdmin(){
  const tabs=document.getElementById('tabs'),main=document.getElementById('main');if(!tabs||!main)return null;
  let b=tabs.querySelector('.tab[data-tab="admin-console"]');
  if(!b){b=document.createElement('button');b.className='tab';b.dataset.tab='admin-console';b.textContent='⚙️ Admin Panel';tabs.appendChild(b);}
  let p=document.getElementById('tab-admin-console');
  if(!p){p=document.createElement('section');p.id='tab-admin-console';p.className='panel';main.appendChild(p);}
  b.onclick=()=>{try{App.switchTab('admin-console');}catch(e){document.querySelectorAll('#main .panel').forEach(x=>x.classList.remove('active'));p.classList.add('active');}};
  return {b,p};
}
function caption(r){
  const c=document.querySelector('.sidebar-caption small');if(c)c.textContent=CAPTION[r]||'V15 workspace';
  const who=document.getElementById('whoName');if(who&&window.SESSION)who.textContent=`${SESSION.name||''} • ${LABEL[r]||r}${V.member?.owner&&r!=='admin'?' • Creator':''}`;
  const pin=document.getElementById('changePinBtn');if(pin)pin.style.display='none';
}
function showAllowed(r){
  const allowed=MATRIX[r]||new Set();
  document.querySelectorAll('#tabs .tab').forEach(b=>{b.style.display=allowed.has(b.dataset.tab)?'':'none';});
}
function fallbackError(p,e){if(!p)return;p.innerHTML=`<div class="card" style="margin:20px;border:1px solid #efb2b2"><h3>V15 ${LABEL[role()]||'role'} panel could not load</h3><p>${String(e?.message||e||'Unknown error').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</p><button class="btn primary" onclick="location.reload()">Reload V15</button></div>`;}
async function enforce(force=false){
  const r=role();if(!r||!window.SESSION||busy)return false;
  const sig=`${r}|${V.workspaceId||''}|${V.fb?.user?.uid||''}`;if(!force&&sig===last){caption(r);showAllowed(r);return true;}
  busy=true;
  try{
    let admin=null;if(r==='admin')admin=ensureAdmin();
    showAllowed(r);caption(r);
    // Try the full role portal first. If one optional panel fails, continue with a
    // deterministic shell instead of leaving the old Instructor/V13 UI visible.
    try{if(typeof V.applyRolePortal==='function')await V.applyRolePortal();}catch(e){console.error('V15 full portal apply failed',e);}
    showAllowed(r);caption(r);
    if(r==='admin'){
      admin=ensureAdmin();showAllowed(r);caption(r);
      try{if(typeof V.renderAdminPanel==='function')await V.renderAdminPanel();else throw new Error('Admin renderer is not loaded.');}
      catch(e){console.error('V15 admin renderer',e);fallbackError(admin?.p,e);}
      try{App.switchTab('admin-console');}catch(e){document.querySelectorAll('#main .panel').forEach(x=>x.classList.remove('active'));admin?.p?.classList.add('active');}
    }else{
      const current=document.querySelector('#tabs .tab.active');
      if(!current||current.style.display==='none')try{App.switchTab('dashboard');}catch(e){}
      if(r==='principal'){
        try{await V.renderPrincipalDashboard?.();await V.renderPrincipalStaff?.();}catch(e){console.error('V15 principal renderer',e);}
      }
      if(r==='staff')try{V.renderStaffDashboard?.();}catch(e){}
      if(r==='student')try{V.renderStudentDashboard?.();V.sanitizeStudent?.();}catch(e){}
      if(r==='instructor')try{await V.ensureWorkspaceSwitcher?.();}catch(e){}
    }
    document.documentElement.dataset.v15RoleReady=r;document.body?.classList.add('v15-role-ready');last=sig;return true;
  }finally{busy=false;}
}
V.enforceRoleUI=enforce;
let n=0,t=setInterval(async()=>{n++;if(window.SESSION){const ok=await enforce(n%8===0);if(ok&&n>12)clearInterval(t);}if(n>80)clearInterval(t);},200);
window.addEventListener('pageshow',()=>setTimeout(()=>enforce(true),50));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>enforce(true),50);});
console.info('V15 final role UI enforcer active.');
})(window.V15Sync);
