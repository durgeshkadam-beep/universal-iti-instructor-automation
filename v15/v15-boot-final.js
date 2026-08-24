/* V15 deterministic boot coordinator.
 * Prevents saved-session restore from leaving the V14/Instructor shell visible
 * before the role portal module has finished loading.
 */
(function(V){
'use strict';
if(!V)return;
let applying=false,lastSig='';
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
function role(){return window.SESSION?.role||'';}
function caption(r){return r==='admin'?'Technical administration • V15':r==='principal'?'Principal oversight • V15':r==='staff'?'Staff read-only • V15':r==='student'?'Student workspace • V15':'Instructor workspace • V15';}
function setCaption(r){
  const old=[...document.querySelectorAll('.sidebar *')].find(e=>/Instructor Automation\s*•\s*V13/i.test((e.textContent||'').trim()));
  if(old)old.textContent=caption(r);
  const who=document.getElementById('whoName');
  if(who&&window.SESSION&&LABEL[r]&&!who.textContent.includes(LABEL[r]))who.textContent=`${SESSION.name} • ${LABEL[r]}`;
}
function showBootError(err){
  const main=document.getElementById('main');if(!main)return;
  let box=document.getElementById('v15BootError');if(!box){box=document.createElement('div');box.id='v15BootError';box.className='card';box.style.cssText='margin:22px;border:1px solid #f1b5b5';main.prepend(box);}
  box.innerHTML=`<h3>V15 workspace could not finish loading</h3><p>${String(err?.message||err||'Unknown startup error').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</p><button class="btn primary" id="v15BootRetry">Retry workspace</button>`;
  box.querySelector('#v15BootRetry').onclick=()=>{box.remove();apply(true);};
}
async function apply(force=false){
  if(applying||!window.SESSION||!V.ready||typeof V.applyRolePortal!=='function')return false;
  const r=role(),sig=`${r}|${V.workspaceId||''}|${V.fb?.user?.uid||''}`;
  if(!force&&sig===lastSig){setCaption(r);return true;}
  applying=true;
  try{
    await V.applyRolePortal();
    setCaption(r);
    const allowed=r==='admin'?'admin-console':'dashboard';
    const visible=[...document.querySelectorAll('#tabs .tab')].filter(b=>b.style.display!=='none'&&getComputedStyle(b).display!=='none');
    if(r==='admin'&&!document.querySelector('.tab[data-tab="admin-console"]'))throw new Error('System Admin panel did not initialize.');
    if(!visible.length&&r!=='admin')throw new Error(`${LABEL[r]||r} navigation did not initialize.`);
    document.getElementById('v15BootError')?.remove();
    lastSig=sig;
    if(r==='admin')setTimeout(()=>App.switchTab('admin-console'),0);
    else if(!document.querySelector('.panel.active')&&document.querySelector(`.tab[data-tab="${allowed}"]`))setTimeout(()=>App.switchTab(allowed),0);
    return true;
  }catch(e){console.error('V15 portal boot',e);showBootError(e);return false;}
  finally{applying=false;}
}
V.ensureRolePortal=apply;

// A restored Firebase session can complete while later production scripts are still
// downloading. Poll briefly and apply the role UI only after every module exists.
let tries=0;const timer=setInterval(async()=>{
  tries++;
  if(window.SESSION&&V.ready&&typeof V.applyRolePortal==='function'){
    const ok=await apply();if(ok||tries>60)clearInterval(timer);
  }else if(tries>60)clearInterval(timer);
},150);

window.addEventListener('pageshow',()=>setTimeout(()=>apply(),0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>apply(),0);});
console.info('V15 deterministic boot coordinator active.');
})(window.V15Sync);