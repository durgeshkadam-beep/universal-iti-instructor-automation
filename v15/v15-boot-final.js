/* V15 deterministic boot coordinator.
 * Keeps the legacy shell hidden until the authorized V15 portal is fully ready.
 */
(function(V){
'use strict';
if(!V)return;
let applying=false,lastSig='';
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
function role(){return window.SESSION?.role||'';}
function caption(r){return r==='admin'?'Technical administration • V15':r==='principal'?'Principal oversight • V15':r==='staff'?'Staff read-only • V15':r==='student'?'Student workspace • V15':'Instructor workspace • V15';}
function guard(){return document.getElementById('v15BootGuard');}
function finishBoot(){guard()?.remove();document.getElementById('v15BootGuardStyle')?.remove();document.documentElement.dataset.v15Ready='1';}
function setCaption(r){
  const direct=document.querySelector('.sidebar-caption small');
  if(direct)direct.textContent=caption(r);
  const who=document.getElementById('whoName');
  if(who&&window.SESSION&&LABEL[r])who.textContent=`${SESSION.name} • ${LABEL[r]}${V.member?.owner&&r!=='admin'?' • Creator':''}`;
  document.title=`Universal ITI V15 — ${LABEL[r]||'Workspace'}`;
}
function visibleTabs(){return [...document.querySelectorAll('#tabs .tab')].filter(b=>b.style.display!=='none'&&getComputedStyle(b).display!=='none');}
function portalHealthy(r){
  const tabs=visibleTabs().map(b=>b.dataset.tab);
  if(r==='admin')return tabs.length===1&&tabs[0]==='admin-console'&&!!document.getElementById('tab-admin-console');
  if(r==='principal')return tabs.includes('dashboard')&&tabs.includes('users')&&!tabs.includes('attendance')&&!tabs.includes('practicals');
  if(r==='instructor')return tabs.includes('dashboard')&&tabs.includes('attendance')&&tabs.includes('practicals')&&!tabs.includes('admin-console')&&!tabs.includes('users');
  if(r==='staff')return tabs.includes('dashboard')&&tabs.includes('notices')&&!tabs.includes('attendance');
  if(r==='student')return tabs.includes('dashboard')&&tabs.includes('attendance')&&tabs.includes('practicals')&&!tabs.includes('cloud');
  return false;
}
function showBootError(err){
  let box=guard();
  if(!box){box=document.createElement('div');box.id='v15BootGuard';box.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f5f7fb;display:grid;place-items:center;font-family:Arial,sans-serif;color:#0b2740';document.body.appendChild(box);}
  box.innerHTML=`<div style="width:min(520px,calc(100% - 38px));background:#fff;border-radius:18px;padding:28px;box-shadow:0 14px 40px rgba(0,0,0,.12);text-align:center"><h2>V15 workspace could not finish loading</h2><p>${String(err?.message||err||'Unknown startup error').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</p><button id="v15BootRetry" style="border:0;border-radius:10px;padding:11px 18px;background:#0b756f;color:#fff;font-weight:700">Retry workspace</button><p><small>Build: Production 12. Your records were not deleted.</small></p></div>`;
  box.querySelector('#v15BootRetry').onclick=()=>{box.innerHTML='<div style="text-align:center"><h2>Retrying V15…</h2></div>';lastSig='';apply(true);};
}
async function apply(force=false){
  if(applying||!window.SESSION||!V.ready||typeof V.applyRolePortal!=='function')return false;
  const r=role(),sig=`${r}|${V.workspaceId||''}|${V.fb?.user?.uid||''}`;
  if(!force&&sig===lastSig&&portalHealthy(r)){setCaption(r);finishBoot();return true;}
  applying=true;
  try{
    await V.applyRolePortal();
    setCaption(r);
    if(!portalHealthy(r))throw new Error(`${LABEL[r]||r} menu did not initialize correctly.`);
    lastSig=sig;
    if(r==='admin')App.switchTab('admin-console');
    else{
      const active=document.querySelector('.panel.active');
      if(!active||active.offsetParent===null)App.switchTab('dashboard');
    }
    finishBoot();
    return true;
  }catch(e){console.error('V15 portal boot',e);showBootError(e);return false;}
  finally{applying=false;}
}
V.ensureRolePortal=apply;

let tries=0;const timer=setInterval(async()=>{
  tries++;
  // No saved login: reveal the V15 Google login screen after all auth UI hooks exist.
  if(!window.SESSION&&!V.ready&&typeof V.showRoleLogin==='function'){
    const login=document.getElementById('loginScreen');
    if(login&&getComputedStyle(login).display!=='none'&&tries>3){finishBoot();clearInterval(timer);return;}
  }
  if(window.SESSION&&V.ready&&typeof V.applyRolePortal==='function'){
    const ok=await apply();if(ok){clearInterval(timer);return;}
  }
  if(tries===80){
    clearInterval(timer);
    if(window.SESSION&&V.ready&&typeof V.applyRolePortal!=='function')showBootError(new Error('The V15 role portal file did not load. Run the V15 cache repair page once.'));
    else if(window.SESSION)showBootError(new Error('V15 startup timed out. Use Retry workspace or run cache repair.'));
    else finishBoot();
  }
},150);

window.addEventListener('pageshow',()=>setTimeout(()=>{if(window.SESSION)apply();},0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.SESSION)setTimeout(()=>apply(),0);});
console.info('V15 deterministic boot coordinator Production 12 active.');
})(window.V15Sync);
