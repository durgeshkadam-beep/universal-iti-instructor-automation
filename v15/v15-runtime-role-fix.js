/* V15 Production 15 runtime role fix.
 * Root V13/V14 app keeps SESSION in a lexical global. Earlier V15 role modules
 * sometimes missed the new role after Google login and left the old Instructor
 * dashboard visible. This wrapper creates the V15 window-visible session at the
 * exact moment login finishes, then applies the authorized portal immediately.
 */
(function(V){
'use strict';
if(!V)return;
const ROLE_KEY='iti-v15-role-v2';
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const CAPTION={admin:'Technical administration • V15',principal:'Principal oversight • V15',instructor:'Instructor workspace • V15',staff:'Staff read-only • V15',student:'Student workspace • V15'};

function requestedRole(){
  const r=localStorage.getItem(ROLE_KEY)||V.sessionRole||window.__V15_SESSION?.role||window.SESSION?.role||'';
  return LABEL[r]?r:'';
}
function makeSession(){
  const r=requestedRole();
  if(!r||!V.ready||!V.fb?.user)return null;
  const m=V.member||{};
  return {
    role:r,
    name:m.displayName||V.fb.user.displayName||V.fb.user.email||'',
    userId:V.fb.user.uid,
    username:V.email?.(V.fb.user.email)||String(V.fb.user.email||'').toLowerCase(),
    traineeId:m.traineeId||null,
    googleEmail:V.email?.(V.fb.user.email)||String(V.fb.user.email||'').toLowerCase()
  };
}
function publishSession(){
  const s=makeSession();
  if(!s)return null;
  window.SESSION=s;
  window.__V15_SESSION=s;
  V.session=s;
  V.sessionRole=s.role;
  return s;
}
function forceCaption(r,s){
  const c=document.querySelector('.sidebar-caption small');if(c)c.textContent=CAPTION[r]||'V15 workspace';
  const who=document.getElementById('whoName');if(who)who.textContent=`${s.name||''} • ${LABEL[r]||r}${V.member?.owner&&r!=='admin'?' • Creator':''}`;
  const pin=document.getElementById('changePinBtn');if(pin)pin.style.display='none';
  document.title=`Universal ITI V15 — ${LABEL[r]||'Workspace'}`;
}
async function applyNow(){
  const s=publishSession();if(!s)return false;
  const r=s.role;
  try{await V.applyRolePortal?.();}catch(e){console.error('V15 applyRolePortal after login',e);}
  try{await V.enforceRoleUI?.(true);}catch(e){console.error('V15 enforceRoleUI after login',e);}
  try{await V.ensureRolePortal?.(true);}catch(e){console.error('V15 ensureRolePortal after login',e);}
  forceCaption(r,s);

  // Last-resort deterministic Admin portal. This does not grant permissions;
  // authentication/member authorization has already completed in V.login.
  if(r==='admin'){
    try{
      const nav=document.getElementById('tabs'),main=document.getElementById('main');
      if(nav&&main){
        let b=nav.querySelector('.tab[data-tab="admin-console"]');
        if(!b){b=document.createElement('button');b.className='tab';b.dataset.tab='admin-console';b.textContent='⚙️ Admin Panel';nav.prepend(b);}
        let p=document.getElementById('tab-admin-console');
        if(!p){p=document.createElement('section');p.id='tab-admin-console';p.className='panel';main.appendChild(p);}
        [...nav.querySelectorAll('.tab')].forEach(x=>x.style.display=x===b?'':'none');
        [...main.querySelectorAll('.panel')].forEach(x=>x.classList.remove('active'));
        p.classList.add('active');b.classList.add('active');
        b.onclick=()=>{[...main.querySelectorAll('.panel')].forEach(x=>x.classList.remove('active'));p.classList.add('active');};
        if(typeof V.renderAdminPanel==='function')await V.renderAdminPanel();
      }
    }catch(e){console.error('V15 deterministic Admin fallback',e);}
  }
  document.documentElement.dataset.v15RuntimeRole=r;
  return true;
}

const baseLogin=V.login?.bind(V);
if(baseLogin){
  V.login=async function(...args){
    const result=await baseLogin(...args);
    if(this.ready)await applyNow();
    return result;
  };
}

// autoResume is scheduled by auth after script parsing. This interval also covers
// persisted sessions and any unusually slow Firebase restore without expiring.
let last='';
setInterval(()=>{
  if(!V.ready||!V.fb?.user)return;
  const r=requestedRole(),sig=`${r}|${V.fb.user.uid}|${V.workspaceId||''}`;
  if(!r)return;
  if(sig!==last||document.documentElement.dataset.v15RuntimeRole!==r){
    last=sig;applyNow().catch(e=>console.error('V15 runtime role repair',e));
  }
},500);

window.addEventListener('pageshow',()=>setTimeout(()=>applyNow().catch(()=>{}),20));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>applyNow().catch(()=>{}),20);});
V.applyRuntimeRole=applyNow;
console.info('V15 Production 15 runtime role fix active.');
})(window.V15Sync);
