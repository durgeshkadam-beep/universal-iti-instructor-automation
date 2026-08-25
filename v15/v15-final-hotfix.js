/* Universal ITI FINAL — role isolation + Principal Staff Access hotfix
 * - Instructor is locked to the active assigned Trade workspace (no institute-wide Trade selector).
 * - Principal Staff & Access is forced to render after final navigation and can never remain blank.
 */
(function(V){
'use strict';
if(!V)return;

function currentRole(){
  try{return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function syncSession(){
  try{
    const s=V.currentSession?.()||window.__V15_SESSION||window.SESSION||V.session||null;
    if(s){window.SESSION=s;window.__V15_SESSION=s;V.session=s;V.sessionRole=s.role||V.sessionRole||'';}
    return s;
  }catch(e){return null;}
}

// An Instructor is a single teaching-workspace role. Even if a legacy account contains
// more than one workspaceId, only the workspace selected during secure login is exposed.
const listBase=V.listTradeWorkspaces?.bind(V);
if(listBase)V.listTradeWorkspaces=async function(opts={}){
  const list=await listBase(opts);
  if(currentRole()!=='instructor')return list;
  const wid=this.workspaceId||V.workspaceId||'';
  if(!wid)return list.slice(0,1);
  const hit=(list||[]).find(w=>w.id===wid);
  if(hit)return [hit];
  try{
    const M=this.fb?.M;
    if(M&&this.fb?.db){
      const s=await M.getDoc(M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid));
      if(s.exists()){
        const w={id:s.id,...s.data()};
        if(opts.includeArchived||w.status!=='archived')return [w];
      }
    }
  }catch(e){console.warn('FINAL instructor workspace isolation',e);}
  return [];
};

// Keep the existing Principal renderer, but guarantee a visible loading/error state and
// prevent the final panel from remaining an empty white page after navigation races.
const staffBase=V.renderPrincipalStaff?.bind(V);
if(staffBase)V.renderPrincipalStaff=async function(){
  syncSession();
  const p=document.getElementById('tab-users');
  if(!p||currentRole()!=='principal')return;
  if(!String(p.textContent||'').trim()){
    p.innerHTML='<div class="card"><h2>👥 Staff &amp; Access</h2><p class="muted">Loading Instructor / Staff accounts and Trade assignments…</p></div>';
  }
  try{
    await staffBase();
    if(!String(p.textContent||'').trim())throw new Error('Staff & Access renderer returned an empty page.');
  }catch(e){
    console.error('FINAL Staff & Access hotfix',e);
    p.innerHTML=`<div class="card"><h2>👥 Staff &amp; Access</h2><div class="callout cloud-error"><b>Could not load Staff &amp; Access:</b> ${esc(e?.message||e)}</div><p class="muted">No account, Firebase or trainee data was changed.</p><button class="btn primary" id="v15StaffHotfixRetry">Retry</button></div>`;
    p.querySelector('#v15StaffHotfixRetry')?.addEventListener('click',()=>V.renderPrincipalStaff());
  }
};

// Final router guard: after the canonical navigation completes, verify Principal Staff & Access
// really contains its page; also rebuild the Instructor trade badge from the isolated list.
const openBase=V.finalOpenTab?.bind(V);
if(openBase)V.finalOpenTab=async function(name){
  syncSession();
  const out=await openBase(name);
  const r=currentRole();
  if(r==='principal'&&name==='users'){
    const p=document.getElementById('tab-users');
    if(p&&!/Staff\s*&\s*Access/i.test(p.textContent||''))await V.renderPrincipalStaff();
  }
  if(r==='instructor'){
    try{await V.finalEnsureWorkspaceSwitcher?.();}catch(e){console.warn('FINAL trade badge refresh',e);}
  }
  return out;
};

console.info('Universal ITI FINAL hotfix: Principal Staff Access + single Instructor Trade active.');
})(window.V15Sync);
