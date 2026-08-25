/* Universal ITI FINAL — last-mile role polish
 * 1) Principal Staff & Access renders from V15's authoritative role/session, not window.SESSION only.
 * 2) Every final page synchronizes the legacy window session before older V15 render helpers run.
 */
(function(V){
'use strict';
if(!V)return;
function currentRole(){return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}
function syncWindowSession(){const s=V.currentSession?.()||window.__V15_SESSION||window.SESSION||V.session||null;if(s){window.SESSION=s;window.__V15_SESSION=s;V.session=s;V.sessionRole=s.role||V.sessionRole||'';}return s;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function wsLabel(w){return [w?.trade||'Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
const LABEL={instructor:'Instructor',staff:'Staff (read-only)'};

const openBase=V.finalOpenTab?.bind(V);
if(openBase)V.finalOpenTab=async function(name){syncWindowSession();return openBase(name);};
const applyBase=V.applyRolePortal?.bind(V);
if(applyBase)V.applyRolePortal=async function(){syncWindowSession();return applyBase();};

// Own the Principal Staff & Access renderer so it cannot silently return because a legacy
// window.SESSION binding is missing/stale after Google/Firebase role restoration.
V.renderPrincipalStaff=async function(){
  syncWindowSession();
  const p=document.getElementById('tab-users');
  if(!p||currentRole()!=='principal')return;
  try{
    const [ws,members]=await Promise.all([this.listTradeWorkspaces({includeArchived:false}),this.accountDirectory()]);
    const staff=members.filter(x=>!x.owner&&['instructor','staff'].includes(x.role));
    p.innerHTML=`<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">STAFF MANAGEMENT</span><h2>👥 Staff & Access</h2><p>Create or update Instructor/Staff Google accounts and assign the correct Trade / Session / Batch.</p></div></div></div>
    <div class="cards" style="grid-template-columns:minmax(320px,.8fr) minmax(420px,1.2fr);margin-top:16px">
      <div class="card"><h3>Create Instructor / Staff</h3>
        <div class="field"><label>Name</label><input id="psName" placeholder="Full name"></div>
        <div class="field"><label>Google / Gmail</label><input id="psEmail" type="email" placeholder="name@gmail.com"></div>
        <div class="field"><label>Role</label><select id="psRole"><option value="instructor">Instructor</option><option value="staff">Staff (read-only)</option></select></div>
        <div class="field"><label>Assigned Trade / Batch</label><select id="psWs"><option value="">Select Trade / Batch…</option>${ws.map(w=>`<option value="${esc(w.id)}">${esc(wsLabel(w))}</option>`).join('')}</select></div>
        <button class="btn primary" id="psCreate">Create / update account</button>
        <div id="psResult" class="callout" style="display:none;margin-top:10px"></div>
        <p class="muted" style="margin-top:10px">Principal manages operational staff. System Admin remains for technical/security setup only.</p>
      </div>
      <div class="card"><div class="field-row" style="justify-content:space-between;align-items:center"><div><h3>Active Instructor / Staff</h3><p class="muted">The assigned workspace count shows how many Trade/Batch workspaces each account can access.</p></div><span class="badge">${staff.length} account(s)</span></div>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Assigned workspace(s)</th><th>Status</th></tr></thead><tbody>${staff.map(x=>`<tr><td><b>${esc(x.displayName||x.email)}</b><br><small>${esc(x.email||'')}</small></td><td>${esc(LABEL[x.role]||x.role)}</td><td>${esc((x.workspaceIds||[]).length)}</td><td>${x.active===false?'Disabled':'Active'}</td></tr>`).join('')||'<tr><td colspan="4">No Instructor/Staff accounts yet.</td></tr>'}</tbody></table></div>
      </div>
    </div>`;
    const btn=p.querySelector('#psCreate');
    btn.onclick=async()=>{
      const out=p.querySelector('#psResult');
      try{
        const workspaceId=p.querySelector('#psWs').value;
        if(!workspaceId)throw new Error('Select the correct Trade / Session / Batch.');
        const r=await V.createOrUpdateAccount({name:p.querySelector('#psName').value,email:p.querySelector('#psEmail').value,accountRole:p.querySelector('#psRole').value,workspaceId});
        out.style.display='block';out.className='callout cloud-ok';out.innerHTML=r.updated?'<b>Existing account updated.</b><br>The assigned Trade/Batch and role are saved.':`<b>Account approved.</b><br>First-login activation code: <b>${esc(r.code)}</b>`;
        if(r.updated)setTimeout(()=>V.renderPrincipalStaff().catch(console.error),700);
      }catch(e){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}
    };
  }catch(e){
    console.error('Principal Staff & Access',e);
    p.innerHTML=`<div class="card"><h2>👥 Staff & Access</h2><div class="callout cloud-error"><b>Could not load staff access:</b> ${esc(e.message||e)}</div><button class="btn primary" id="psRetry">Retry</button></div>`;
    p.querySelector('#psRetry')?.addEventListener('click',()=>V.renderPrincipalStaff());
  }
};

console.info('Universal ITI FINAL Principal/workspace polish active.');
})(window.V15Sync);
