/* Universal ITI FINAL — Staff Access + responsive forms fix
 * Keeps desktop workflow intact while making all dialogs usable at 100% zoom.
 */
(function(V){
'use strict';
if(!V||!window.App)return;

function currentRole(){
  try{return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function wsLabel(w){return [w?.trade||'Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
const LABEL={instructor:'Instructor',staff:'Staff (read-only)'};

function exposeStaffPanel(){
  if(currentRole()!=='principal')return;
  const p=document.getElementById('tab-users');
  if(p){
    p.style.removeProperty('display');
    p.hidden=false;
  }
  const b=document.querySelector('#tabs .tab[data-tab="users"]');
  if(b){b.style.removeProperty('display');b.hidden=false;}
}

V.renderPrincipalStaff=async function(){
  exposeStaffPanel();
  const p=document.getElementById('tab-users');
  if(!p||currentRole()!=='principal')return;

  p.innerHTML=`<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">STAFF MANAGEMENT</span><h2>👥 Staff & Access</h2><p>Create Instructor/Staff access and assign the correct Trade / Session / Batch.</p></div></div></div>
  <div class="card"><p class="muted">Loading staff accounts and active Trade workspaces…</p></div>`;

  let ws=[],members=[],loadErrors=[];
  const results=await Promise.allSettled([
    V.listTradeWorkspaces?.({includeArchived:false}),
    V.accountDirectory?.()
  ]);
  if(results[0].status==='fulfilled')ws=results[0].value||[];else loadErrors.push('Trade workspaces: '+(results[0].reason?.message||results[0].reason||'load failed'));
  if(results[1].status==='fulfilled')members=results[1].value||[];else loadErrors.push('Staff directory: '+(results[1].reason?.message||results[1].reason||'load failed'));

  const staff=members.filter(x=>!x.owner&&['instructor','staff'].includes(x.role));
  const warning=loadErrors.length?`<div class="callout cloud-error" style="margin-bottom:12px"><b>Some data could not load.</b><br>${esc(loadErrors.join(' • '))}<br><small>You can retry without losing any records.</small></div>`:'';

  p.innerHTML=`
    <div class="hero"><div class="hero-content"><div><span class="showcase-kicker">STAFF MANAGEMENT</span><h2>👥 Staff & Access</h2><p>Create or update Instructor/Staff Google accounts and assign the correct Trade / Session / Batch.</p></div></div></div>
    ${warning}
    <div class="v15-staff-grid">
      <div class="card v15-staff-form">
        <div class="v15-staff-card-head"><div><h3>Create / Update Staff</h3><p class="muted">Principal can manage Instructor and read-only Staff accounts.</p></div><button class="btn ghost small" id="psRefresh" type="button">↻ Refresh</button></div>
        <div class="field"><label>Name</label><input id="psName" autocomplete="name" placeholder="Full name"></div>
        <div class="field"><label>Approved Google / Gmail</label><input id="psEmail" type="email" inputmode="email" autocomplete="email" placeholder="name@gmail.com"></div>
        <div class="field"><label>Role</label><select id="psRole"><option value="instructor">Instructor</option><option value="staff">Staff (read-only)</option></select></div>
        <div class="field"><label>Assigned Trade / Batch</label><select id="psWs"><option value="">Select Trade / Batch…</option>${ws.map(w=>`<option value="${esc(w.id)}">${esc(wsLabel(w))}</option>`).join('')}</select></div>
        ${ws.length?'':'<div class="callout cloud-error">No active Trade/Batch workspace is available. Create/activate a Trade workspace first.</div>'}
        <button class="btn primary full" id="psCreate" type="button" ${ws.length?'':'disabled'}>Create / update account</button>
        <div id="psResult" class="callout" style="display:none;margin-top:10px"></div>
      </div>
      <div class="card v15-staff-list">
        <div class="v15-staff-card-head"><div><h3>Active Instructor / Staff</h3><p class="muted">Accounts currently registered in this institute.</p></div><span class="badge">${staff.length} account(s)</span></div>
        <div class="table-wrap"><table class="datatable"><thead><tr><th>Name</th><th>Role</th><th>Workspace(s)</th><th>Status</th></tr></thead><tbody>
        ${staff.map(x=>`<tr><td><b>${esc(x.displayName||x.email)}</b><br><small>${esc(x.email||'')}</small></td><td>${esc(LABEL[x.role]||x.role)}</td><td>${esc((x.workspaceIds||[]).length)}</td><td>${x.active===false?'Disabled':'Active'}</td></tr>`).join('')||'<tr><td colspan="4">No Instructor/Staff accounts yet.</td></tr>'}
        </tbody></table></div>
      </div>
    </div>`;

  p.querySelector('#psRefresh')?.addEventListener('click',()=>V.renderPrincipalStaff());
  p.querySelector('#psCreate')?.addEventListener('click',async()=>{
    const btn=p.querySelector('#psCreate'),out=p.querySelector('#psResult');
    try{
      const name=p.querySelector('#psName')?.value.trim()||'';
      const email=p.querySelector('#psEmail')?.value.trim()||'';
      const accountRole=p.querySelector('#psRole')?.value||'instructor';
      const workspaceId=p.querySelector('#psWs')?.value||'';
      if(!name)throw new Error('Enter staff name.');
      if(!email)throw new Error('Enter approved Google / Gmail address.');
      if(!workspaceId)throw new Error('Select the correct Trade / Session / Batch.');
      if(typeof V.createOrUpdateAccount!=='function')throw new Error('Staff account service is not ready. Reload the app and try again.');
      btn.disabled=true;btn.textContent='Saving…';
      const r=await V.createOrUpdateAccount({name,email,accountRole,workspaceId});
      out.style.display='block';out.className='callout cloud-ok';
      out.innerHTML=r?.updated?'<b>Account updated.</b><br>Role and assigned Trade/Batch were saved.':`<b>Account approved.</b><br>First-login activation code: <b>${esc(r?.code||'')}</b>`;
      setTimeout(()=>V.renderPrincipalStaff().catch(console.error),900);
    }catch(e){
      out.style.display='block';out.className='callout cloud-error';out.textContent=e?.message||String(e);
      btn.disabled=false;btn.textContent='Create / update account';
    }
  });
};

// The legacy V15 UI hides the old Users panel inline. For Principal this is now the real
// Staff & Access panel, so always expose it after routing.
const openBase=V.finalOpenTab?.bind(V);
if(openBase)V.finalOpenTab=async function(name){
  const out=await openBase(name);
  if(currentRole()==='principal'&&name==='users'){
    exposeStaffPanel();
    await V.renderPrincipalStaff();
    pActivate();
  }
  return out;
};
function pActivate(){
  const p=document.getElementById('tab-users');if(!p)return;
  p.style.removeProperty('display');p.classList.add('active');
  document.querySelectorAll('#main .panel').forEach(x=>{if(x!==p)x.classList.remove('active');});
}

document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-tab="users"]');
  if(!b||currentRole()!=='principal')return;
  setTimeout(()=>{exposeStaffPanel();V.renderPrincipalStaff().catch(console.error);},30);
},true);

function installResponsiveDialogStyle(){
  if(document.getElementById('v15ResponsiveDialogFix'))return;
  const s=document.createElement('style');s.id='v15ResponsiveDialogFix';
  s.textContent=`
  /* All forms remain usable at browser zoom 100% on laptops/tablets. */
  .modal-overlay{overflow:hidden!important}
  .modal-overlay>.modal-card{
    max-height:calc(100dvh - 32px)!important;
    overflow-y:auto!important;
    overflow-x:hidden!important;
    overscroll-behavior:contain;
    scrollbar-gutter:stable;
  }
  .modal-card input,.modal-card select,.modal-card textarea{max-width:100%;box-sizing:border-box}
  .v15-staff-grid{display:grid;grid-template-columns:minmax(300px,.8fr) minmax(420px,1.2fr);gap:14px;align-items:start}
  .v15-staff-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
  .v15-staff-card-head h3{margin-bottom:2px}

  @media(max-width:900px){
    .v15-staff-grid{grid-template-columns:1fr}
  }

  @media(max-width:760px){
    .modal-overlay{
      padding:0!important;
      align-items:flex-end!important;
      justify-content:center!important;
      background:rgba(7,22,34,.48)!important;
      backdrop-filter:blur(2px)!important;
      z-index:1600!important;
    }
    .modal-overlay>.modal-card{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      max-height:calc(100dvh - max(8px,env(safe-area-inset-top)))!important;
      margin:0!important;
      padding:18px 16px calc(14px + env(safe-area-inset-bottom))!important;
      border-radius:24px 24px 0 0!important;
      box-shadow:0 -16px 45px rgba(8,27,42,.22)!important;
      -webkit-overflow-scrolling:touch;
    }
    .modal-card>h2:first-child,.modal-card>h3:first-child{
      position:sticky;top:-18px;z-index:4;background:#fff;
      margin:-18px -16px 12px!important;padding:17px 16px 12px!important;
      border-bottom:1px solid #edf0f3;
    }
    .modal-card>.field-row:last-child{
      position:sticky;bottom:calc(-14px - env(safe-area-inset-bottom));z-index:5;
      margin:14px -16px calc(-14px - env(safe-area-inset-bottom))!important;
      padding:10px 16px calc(12px + env(safe-area-inset-bottom))!important;
      background:rgba(255,255,255,.98);border-top:1px solid #e8edf1;
      display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;
    }
    .modal-card>.field-row:last-child .btn{width:100%!important;min-width:0!important;margin:0!important}
    .modal-card .field{margin-bottom:12px!important}
    .modal-card .field label{font-size:.72rem!important;margin-bottom:6px!important}
    .modal-card input,.modal-card select,.modal-card textarea{
      width:100%!important;min-width:0!important;font-size:16px!important;
      min-height:46px!important;border-radius:13px!important;
    }
    .modal-card textarea{min-height:88px!important;resize:vertical}
    #traineeModal>.modal-card{max-height:100dvh!important}
    #traineeModal .field{margin-bottom:10px!important}
    #examQuestionModal>.modal-card,#aiModal>.modal-card,#planModal>.modal-card{max-width:100%!important;width:100%!important}
    #planModal .plan-document-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch}
    .v15-staff-grid{grid-template-columns:1fr!important;gap:9px!important}
    #tab-users .hero{margin-bottom:10px!important}
    #tab-users .card{padding:14px!important}
    #tab-users .v15-staff-card-head{align-items:center}
    #tab-users .v15-staff-card-head .btn{min-height:38px!important}
  }`;
  document.head.appendChild(s);
}
installResponsiveDialogStyle();

window.addEventListener('pageshow',()=>setTimeout(exposeStaffPanel,80));
console.info('V15 FINAL Staff Access + responsive form fix active.');
})(window.V15Sync);
