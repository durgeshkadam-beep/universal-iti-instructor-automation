/* Universal ITI FINAL — System Admin Master Control Center
 * Owner-only technical lifecycle management:
 * - workspace create/edit/archive/delete/restore
 * - employee create/edit/disable/delete/restore
 * - pending activation revoke/regenerate
 * - assignment integrity + system health
 * - audit trail
 *
 * "Delete" is intentionally recoverable (soft delete). Official institute data is never
 * destroyed from a browser click; deleted workspaces and activated employees can be restored.
 */
(function(V){
'use strict';
if(!V)return;

const ROLES={principal:'Principal',instructor:'Instructor',staff:'Staff (read-only)'};
function role(){try{return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}}
function isAdmin(){return role()==='admin'&&V.member?.owner===true;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function label(w){return [w?.trade||'Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
function norm(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function activeWorkspace(w){return !w?.deleted&&w?.status!=='archived';}
function employee(m){return !m?.owner&&['principal','instructor','staff'].includes(m?.role);}
function when(v){try{if(!v)return'—';if(typeof v.toDate==='function')return v.toDate().toLocaleString('en-IN');const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('en-IN');}catch(e){return String(v||'—');}}
function syncSession(){try{const s=V.currentSession?.()||window.__V15_SESSION||window.SESSION||V.session||null;if(s){window.SESSION=s;window.__V15_SESSION=s;V.session=s;V.sessionRole=s.role||V.sessionRole||'';}return s;}catch(e){return null;}}
function assertAdmin(){syncSession();if(!isAdmin())throw new Error('System Admin access required.');}
function wsRef(id){return V.fb.M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',id);}
function auditRef(){return V.fb.M.collection(V.fb.db,'institutes',V.INSTITUTE_ID,'auditLog');}

V.sysAdminDirectory=async function(){
  assertAdmin();
  const M=this.fb.M;
  const [ms,as]=await Promise.all([
    M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members')),
    M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'access'))
  ]);
  const members=[];ms.forEach(d=>members.push({uid:d.id,...d.data()}));
  const access=[];as.forEach(d=>access.push({id:d.id,...d.data()}));
  members.sort((a,b)=>(a.owner?-1:0)-(b.owner?-1:0)||String(a.displayName||a.email||'').localeCompare(String(b.displayName||b.email||''),undefined,{numeric:true,sensitivity:'base'}));
  access.sort((a,b)=>String(a.displayName||a.email||'').localeCompare(String(b.displayName||b.email||''),undefined,{numeric:true,sensitivity:'base'}));
  return {members,access};
};

V.sysAdminAudit=async function(limit=60){
  assertAdmin();
  const z=await this.fb.M.getDocs(auditRef()),out=[];
  z.forEach(d=>out.push({id:d.id,...d.data()}));
  out.sort((a,b)=>{
    const av=typeof a.createdAt?.toMillis==='function'?a.createdAt.toMillis():new Date(a.createdAt||0).getTime();
    const bv=typeof b.createdAt?.toMillis==='function'?b.createdAt.toMillis():new Date(b.createdAt||0).getTime();
    return (bv||0)-(av||0);
  });
  return out.slice(0,limit);
};

V.sysAdminUpdateWorkspace=async function(wid,{trade,session,batch}={}){
  assertAdmin();
  trade=String(trade||'').trim();session=String(session||'').trim();batch=String(batch||'A').trim()||'A';
  if(!wid||!trade||!session)throw new Error('Trade and Session are required.');
  const all=await this.listTradeWorkspaces({includeArchived:true});
  const dup=all.find(w=>w.id!==wid&&!w.deleted&&norm(w.trade)===norm(trade)&&norm(w.session)===norm(session)&&norm(w.batch||'A')===norm(batch));
  if(dup)throw new Error('Another workspace already uses the same Trade / Session / Batch.');
  const M=this.fb.M,s=await M.getDoc(wsRef(wid));if(!s.exists())throw new Error('Workspace not found.');
  const before=s.data();
  await M.setDoc(wsRef(wid),{trade,session,batch,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.('workspace.update',{workspaceId:wid,before:{trade:before.trade,session:before.session,batch:before.batch},after:{trade,session,batch}},wid);
};

V.sysAdminDeleteWorkspace=async function(wid){
  assertAdmin();
  const M=this.fb.M,s=await M.getDoc(wsRef(wid));if(!s.exists())throw new Error('Workspace not found.');
  const w=s.data();if(w.deleted)return;
  await M.setDoc(wsRef(wid),{status:'archived',deleted:true,deletedAt:this.now(),deletedBy:this.fb.user.uid,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.('workspace.delete.safe',{workspaceId:wid,trade:w.trade,session:w.session,batch:w.batch},wid);
};

V.sysAdminRestoreWorkspace=async function(wid){
  assertAdmin();
  await this.fb.M.setDoc(wsRef(wid),{status:'active',deleted:false,restoredAt:this.now(),restoredBy:this.fb.user.uid,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.('workspace.restore',{workspaceId:wid},wid);
};

V.sysAdminArchiveWorkspace=async function(wid,archive=true){
  assertAdmin();
  await this.fb.M.setDoc(wsRef(wid),{status:archive?'archived':'active',deleted:false,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.(archive?'workspace.archive':'workspace.activate',{workspaceId:wid},wid);
};

V.sysAdminUpdateEmployee=async function(uid,{displayName,accountRole,workspaceIds=[]}={}){
  assertAdmin();
  const M=this.fb.M,s=await M.getDoc(this.memberRef(uid));if(!s.exists())throw new Error('Employee account not found.');
  const m=s.data();if(m.owner)throw new Error('System Admin owner account is protected.');
  if(!ROLES[accountRole])throw new Error('Invalid employee role.');
  displayName=String(displayName||m.displayName||m.email||'').trim();
  const activeWs=(await this.listTradeWorkspaces({includeArchived:false})).filter(w=>!w.deleted);
  const valid=new Set(activeWs.map(w=>w.id));
  let ids=[...new Set((workspaceIds||[]).filter(x=>valid.has(x)))];
  if(accountRole==='principal')ids=activeWs.map(w=>w.id);
  if(['instructor','staff'].includes(accountRole)&&!ids.length)throw new Error('Assign at least one active Trade workspace.');
  const info=await this.instituteInfo().catch(()=>({}));
  if(accountRole==='principal'&&info?.principalUid&&info.principalUid!==uid)throw new Error('Another official Principal is active. Change/delete that Principal first.');
  if(info?.principalUid===uid&&accountRole!=='principal'){
    await M.setDoc(this.inst(),{principalUid:M.deleteField(),principalEmail:M.deleteField(),principalActivatedAt:M.deleteField(),updatedAt:this.now()},{merge:true});
  }
  await M.updateDoc(this.memberRef(uid),{displayName,role:accountRole,workspaceIds:ids,active:true,deleted:false,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email)await M.setDoc(this.access(m.email),{email:this.email(m.email),displayName,role:accountRole,workspaceIds:ids,active:true,deleted:false,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  if(accountRole==='principal')await M.setDoc(this.inst(),{principalUid:uid,principalEmail:this.email(m.email),principalActivatedAt:this.now(),updatedAt:this.now()},{merge:true});
  await this.audit?.('employee.update',{targetUid:uid,email:m.email,displayName,role:accountRole,workspaceIds:ids});
};

V.sysAdminSetEmployeeActive=async function(uid,active){
  assertAdmin();
  const M=this.fb.M,s=await M.getDoc(this.memberRef(uid));if(!s.exists())throw new Error('Employee account not found.');
  const m=s.data();if(m.owner)throw new Error('System Admin owner account is protected.');
  if(m.deleted&&active)throw new Error('Use Restore for a deleted employee.');
  await M.updateDoc(this.memberRef(uid),{active:!!active,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email)await M.setDoc(this.access(m.email),{active:!!active,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.(active?'employee.enable':'employee.disable',{targetUid:uid,email:m.email});
};

V.sysAdminDeleteEmployee=async function(uid){
  assertAdmin();
  const M=this.fb.M,s=await M.getDoc(this.memberRef(uid));if(!s.exists())throw new Error('Employee account not found.');
  const m=s.data();if(m.owner)throw new Error('System Admin owner account cannot be deleted.');
  const info=await this.instituteInfo().catch(()=>({}));
  if(info?.principalUid===uid)await M.setDoc(this.inst(),{principalUid:M.deleteField(),principalEmail:M.deleteField(),principalActivatedAt:M.deleteField(),updatedAt:this.now()},{merge:true});
  await M.updateDoc(this.memberRef(uid),{active:false,deleted:true,deletedAt:this.now(),deletedBy:this.fb.user.uid,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email){
    await M.setDoc(this.access(m.email),{active:false,deleted:true,deletedAt:this.now(),deletedBy:this.fb.user.uid,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
    try{await M.deleteDoc(this.secret(m.email));}catch(e){}
  }
  await this.audit?.('employee.delete.safe',{targetUid:uid,email:m.email,role:m.role,workspaceIds:m.workspaceIds||[]});
};

V.sysAdminRestoreEmployee=async function(uid){
  assertAdmin();
  const M=this.fb.M,s=await M.getDoc(this.memberRef(uid));if(!s.exists())throw new Error('Employee account not found.');
  const m=s.data();if(m.owner)throw new Error('System Admin owner account is already protected.');
  const info=await this.instituteInfo().catch(()=>({}));
  if(m.role==='principal'&&info?.principalUid&&info.principalUid!==uid)throw new Error('Another Principal is active. Restore this employee as another role by Edit Employee instead.');
  await M.updateDoc(this.memberRef(uid),{active:true,deleted:false,restoredAt:this.now(),restoredBy:this.fb.user.uid,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email)await M.setDoc(this.access(m.email),{email:this.email(m.email),displayName:m.displayName||m.email,role:m.role,workspaceIds:m.workspaceIds||[],active:true,deleted:false,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  if(m.role==='principal')await M.setDoc(this.inst(),{principalUid:uid,principalEmail:this.email(m.email),principalActivatedAt:this.now(),updatedAt:this.now()},{merge:true});
  await this.audit?.('employee.restore',{targetUid:uid,email:m.email});
};

V.sysAdminDeletePending=async function(email){
  assertAdmin();email=this.email(email);if(!email)throw new Error('Pending account email missing.');
  const M=this.fb.M;
  try{await M.deleteDoc(this.access(email));}catch(e){throw new Error('Could not revoke pending account: '+(e.message||e));}
  try{await M.deleteDoc(this.secret(email));}catch(e){}
  await this.audit?.('account.pending.revoke',{email});
};

V.sysAdminRegeneratePending=async function(a){
  assertAdmin();
  const wid=(a.workspaceIds||[])[0]||'';
  if(!ROLES[a.role])throw new Error('Only employee activation codes are handled here.');
  const r=await this.createOrUpdateAccount({name:a.displayName||a.email,email:a.email,accountRole:a.role,workspaceId:wid});
  return r.code;
};

function ensureModal(){
  if(document.getElementById('v15SysAdminModal'))return;
  const d=document.createElement('div');d.id='v15SysAdminModal';d.className='modal-overlay';d.style.display='none';
  d.innerHTML='<div class="modal-card" style="max-width:620px"><h3 id="saModalTitle">Edit</h3><div id="saModalBody"></div><div class="field-row" style="justify-content:flex-end"><button class="btn ghost" id="saCancel" type="button">Cancel</button><button class="btn primary" id="saSave" type="button">Save changes</button></div></div>';
  document.body.appendChild(d);d.querySelector('#saCancel').onclick=()=>{d.style.display='none';};d.addEventListener('click',e=>{if(e.target===d)d.style.display='none';});
}
function openWorkspaceEditor(w,all){
  ensureModal();const d=document.getElementById('v15SysAdminModal'),body=d.querySelector('#saModalBody'),save=d.querySelector('#saSave');d.querySelector('#saModalTitle').textContent='Edit Workspace';
  body.innerHTML='<div class="field"><label>Trade</label><input id="saWTrade"></div><div class="field"><label>Session</label><input id="saWSession"></div><div class="field"><label>Batch</label><input id="saWBatch"></div><div class="callout"><small>Workspace ID stays unchanged so existing attendance, marks, plans and assignments remain linked safely.</small></div>';
  body.querySelector('#saWTrade').value=w.trade||'';body.querySelector('#saWSession').value=w.session||'';body.querySelector('#saWBatch').value=w.batch||'A';
  save.textContent='Save workspace';save.onclick=async()=>{try{save.disabled=true;await V.sysAdminUpdateWorkspace(w.id,{trade:body.querySelector('#saWTrade').value,session:body.querySelector('#saWSession').value,batch:body.querySelector('#saWBatch').value});d.style.display='none';await V.renderAdminPanel();}catch(e){alert(e.message||e);}finally{save.disabled=false;}};
  d.style.display='flex';
}
function openEmployeeEditor(m,workspaces){
  ensureModal();const d=document.getElementById('v15SysAdminModal'),body=d.querySelector('#saModalBody'),save=d.querySelector('#saSave');d.querySelector('#saModalTitle').textContent='Edit Employee';
  body.innerHTML=`<div class="field"><label>Name</label><input id="saEName"></div><div class="field"><label>Google / Gmail</label><input value="${esc(m.email||'')}" disabled></div><div class="field"><label>Role</label><select id="saERole">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${m.role===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field" id="saEWs"><label>Assigned Trade workspaces</label><div class="sa-check-grid">${workspaces.map(w=>`<label class="sa-check"><input type="checkbox" value="${esc(w.id)}" ${(m.workspaceIds||[]).includes(w.id)?'checked':''}><span>${esc(label(w))}</span></label>`).join('')||'<span class="muted">No active workspace.</span>'}</div></div><div class="callout"><small>Principal is institute-wide. Instructor/Staff must have at least one Trade workspace.</small></div>`;
  body.querySelector('#saEName').value=m.displayName||'';const roleSel=body.querySelector('#saERole'),wsBox=body.querySelector('#saEWs');
  const toggle=()=>{wsBox.style.display=roleSel.value==='principal'?'none':'';};roleSel.onchange=toggle;toggle();
  save.textContent='Save employee';save.onclick=async()=>{try{save.disabled=true;const ids=[...body.querySelectorAll('#saEWs input:checked')].map(x=>x.value);await V.sysAdminUpdateEmployee(m.uid,{displayName:body.querySelector('#saEName').value,accountRole:roleSel.value,workspaceIds:ids});d.style.display='none';await V.renderAdminPanel();}catch(e){alert(e.message||e);}finally{save.disabled=false;}};
  d.style.display='flex';
}

V.renderAdminPanel=async function(){
  syncSession();if(!isAdmin())return;
  const {p}=this.ensureAdminTab?.()||{};if(!p)return;
  p.style.removeProperty('display');p.hidden=false;
  p.innerHTML='<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">MASTER CONTROL</span><h2>⚙️ System Admin</h2><p>Loading workspaces, employees, account health and audit history…</p></div></div></div><div class="card"><p class="muted">Please wait…</p></div>';
  let ws=[],dir={members:[],access:[]},audit=[],info={};
  const res=await Promise.allSettled([
    this.listTradeWorkspaces({includeArchived:true}),
    this.sysAdminDirectory(),
    this.sysAdminAudit(60),
    this.instituteInfo()
  ]);
  if(res[0].status==='fulfilled')ws=res[0].value||[];
  if(res[1].status==='fulfilled')dir=res[1].value||dir;
  if(res[2].status==='fulfilled')audit=res[2].value||[];
  if(res[3].status==='fulfilled')info=res[3].value||{};

  const activeWs=ws.filter(activeWorkspace),archivedWs=ws.filter(w=>!w.deleted&&w.status==='archived'),deletedWs=ws.filter(w=>w.deleted);
  const members=dir.members||[],employees=members.filter(employee),activeEmployees=employees.filter(m=>!m.deleted),deletedEmployees=employees.filter(m=>m.deleted);
  const knownEmails=new Set(members.map(m=>this.email(m.email)));
  const pending=(dir.access||[]).filter(a=>!knownEmails.has(this.email(a.email))&&!a.deleted&&ROLES[a.role]);
  const widSet=new Set(activeWs.map(w=>w.id)),assignmentIssues=activeEmployees.filter(m=>m.role!=='principal'&&(m.workspaceIds||[]).some(id=>!widSet.has(id)));
  const noPrincipal=!activeEmployees.some(m=>m.role==='principal'&&m.active!==false&&!m.deleted);
  const wsOpts=activeWs.map(w=>`<option value="${esc(w.id)}">${esc(label(w))}</option>`).join('');

  const workspaceRows=ws.map(w=>{
    const state=w.deleted?'Deleted':w.status==='archived'?'Archived':'Active';
    const actions=w.deleted
      ? `<button class="btn ghost small" data-wrestore="${esc(w.id)}">Restore</button>`
      : `<button class="btn ghost small" data-wedit="${esc(w.id)}">Edit</button> <button class="btn ghost small" data-warchive="${esc(w.id)}" data-next="${w.status==='archived'?'0':'1'}">${w.status==='archived'?'Activate':'Archive'}</button> <button class="btn danger small" data-wdelete="${esc(w.id)}">Delete</button>`;
    return `<tr><td><b>${esc(w.trade||'')}</b><br><small>${esc(w.id)}</small></td><td>${esc(w.session||'')}</td><td>${esc(w.batch||'')}</td><td><span class="badge">${state}</span></td><td class="sa-actions">${actions}</td></tr>`;
  }).join('')||'<tr><td colspan="5">No workspaces found.</td></tr>';

  const employeeRows=employees.map(m=>{
    const state=m.deleted?'Deleted':m.active===false?'Disabled':'Active';
    const names=(m.workspaceIds||[]).map(id=>ws.find(w=>w.id===id)).filter(Boolean).map(label);
    const actions=m.deleted
      ? `<button class="btn ghost small" data-erestore="${esc(m.uid)}">Restore</button>`
      : `<button class="btn ghost small" data-eedit="${esc(m.uid)}">Edit</button> <button class="btn ghost small" data-etoggle="${esc(m.uid)}" data-active="${m.active===false?'1':'0'}">${m.active===false?'Enable':'Disable'}</button> <button class="btn danger small" data-edelete="${esc(m.uid)}">Delete</button>`;
    return `<tr><td><b>${esc(m.displayName||m.email)}</b><br><small>${esc(m.email||'')}</small></td><td>${esc(ROLES[m.role]||m.role)}</td><td>${names.length?names.map(esc).join('<br>'):'—'}</td><td><span class="badge">${state}</span></td><td class="sa-actions">${actions}</td></tr>`;
  }).join('')||'<tr><td colspan="5">No employees found.</td></tr>';

  const pendingRows=pending.map(a=>`<tr><td><b>${esc(a.displayName||a.email)}</b><br><small>${esc(a.email)}</small></td><td>${esc(ROLES[a.role]||a.role)}</td><td>${esc((a.workspaceIds||[]).map(id=>label(ws.find(w=>w.id===id)||{trade:id})).join(', ')||'—')}</td><td class="sa-actions"><button class="btn ghost small" data-pregen="${esc(a.email)}">New Code</button> <button class="btn danger small" data-pdelete="${esc(a.email)}">Revoke</button></td></tr>`).join('')||'<tr><td colspan="4">No pending employee activations.</td></tr>';

  const auditRows=audit.map(a=>`<tr><td>${esc(when(a.createdAt))}</td><td><b>${esc(a.action||'')}</b></td><td>${esc(a.actorEmail||a.actorUid||'')}</td><td>${esc(a.workspaceId||'—')}</td></tr>`).join('')||'<tr><td colspan="4">No audit entries yet.</td></tr>';

  p.innerHTML=`
  <div class="hero"><div class="hero-content"><div><span class="showcase-kicker">MASTER CONTROL</span><h2>⚙️ System Admin Control Center</h2><p>Technical lifecycle management for workspaces, employees, access, recovery and system health.</p></div></div></div>
  <div class="callout cloud-ok"><b>Safe administration</b><br>Delete is recoverable. Employee access is immediately disabled and deleted workspaces disappear from normal use, but official records remain available for System Admin restore.</div>

  <div class="sa-stats">
    <div class="card"><span>🏭</span><b>${activeWs.length}</b><small>Active Workspaces</small></div>
    <div class="card"><span>👥</span><b>${activeEmployees.filter(x=>!x.deleted).length}</b><small>Employees</small></div>
    <div class="card"><span>⏳</span><b>${pending.length}</b><small>Pending Logins</small></div>
    <div class="card ${(assignmentIssues.length||noPrincipal)?'sa-warn':''}"><span>🩺</span><b>${assignmentIssues.length+(noPrincipal?1:0)}</b><small>Health Issues</small></div>
  </div>

  <div class="sa-grid">
    <div class="card"><h3>➕ Create / Approve Employee</h3>
      <div class="field"><label>Name</label><input id="saNewName" placeholder="Full name"></div>
      <div class="field"><label>Google / Gmail</label><input id="saNewEmail" type="email" inputmode="email" placeholder="name@gmail.com"></div>
      <div class="field"><label>Role</label><select id="saNewRole"><option value="principal">Principal</option><option value="instructor">Instructor</option><option value="staff">Staff (read-only)</option></select></div>
      <div class="field" id="saNewWsField"><label>Trade / Batch</label><select id="saNewWs"><option value="">Select…</option>${wsOpts}</select></div>
      <button class="btn primary full" id="saNewEmployee">Create / update employee</button><div id="saNewResult" class="callout" style="display:none;margin-top:10px"></div>
    </div>
    <div class="card"><h3>➕ Create Workspace</h3>
      <div class="field"><label>Trade</label><input id="saNewTrade" placeholder="DTP / COPA / Electrician"></div>
      <div class="field-row"><div class="field" style="flex:1"><label>Session</label><input id="saNewSession" value="${esc(DATA?.meta?.session||'2026-27')}"></div><div class="field" style="flex:1"><label>Batch</label><input id="saNewBatch" value="A"></div></div>
      <button class="btn primary full" id="saNewWorkspace">Create workspace</button>
      <div class="callout" style="margin-top:10px"><small>Use Archive at session end. Use Delete only for an accidental/unwanted workspace; it remains recoverable.</small></div>
    </div>
  </div>

  <div class="card"><div class="sa-head"><div><h3>🏭 Workspace Management</h3><p class="muted">Edit Trade/Session/Batch, archive completed batches, safely delete mistakes, or restore them.</p></div><span class="badge">${ws.length} total</span></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Workspace</th><th>Session</th><th>Batch</th><th>Status</th><th>Actions</th></tr></thead><tbody>${workspaceRows}</tbody></table></div></div>

  <div class="card"><div class="sa-head"><div><h3>👥 Employee Management</h3><p class="muted">Update name/role/workspace assignment, disable temporarily, delete safely, or restore.</p></div><span class="badge">${employees.length} total</span></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Employee</th><th>Role</th><th>Assigned Workspace(s)</th><th>Status</th><th>Actions</th></tr></thead><tbody>${employeeRows}</tbody></table></div></div>

  <div class="card"><h3>⏳ Pending First Login</h3><p class="muted">Regenerate an activation code or revoke an account that should no longer be allowed to activate.</p><div class="table-wrap"><table class="datatable"><thead><tr><th>Employee</th><th>Role</th><th>Workspace</th><th>Actions</th></tr></thead><tbody>${pendingRows}</tbody></table></div><div id="saPendingResult" class="callout" style="display:none;margin-top:8px"></div></div>

  <div class="card"><h3>🩺 System Health</h3>
    <div class="${noPrincipal?'callout cloud-error':'callout cloud-ok'}"><b>Official Principal:</b> ${esc(info?.principalEmail||'Not assigned')}${noPrincipal?' — assign an active Principal.':''}</div>
    <div class="${assignmentIssues.length?'callout cloud-error':'callout cloud-ok'}" style="margin-top:8px"><b>Workspace assignment integrity:</b> ${assignmentIssues.length?esc(assignmentIssues.map(x=>x.displayName||x.email).join(', ')+' has archived/deleted/missing workspace assignment(s).'):'No invalid active employee workspace assignments detected.'}</div>
    <div class="callout" style="margin-top:8px"><b>Lifecycle:</b> ${archivedWs.length} archived workspace(s), ${deletedWs.length} deleted workspace(s), ${deletedEmployees.length} deleted employee(s). All are recoverable by System Admin.</div>
  </div>

  <div class="card"><div class="sa-head"><div><h3>🧾 Audit Trail</h3><p class="muted">Latest technical and operational actions. Audit entries themselves cannot be edited or deleted.</p></div><button class="btn ghost small" id="saAuditRefresh">↻ Refresh</button></div><div class="table-wrap sa-audit"><table class="datatable"><thead><tr><th>Date/Time</th><th>Action</th><th>Actor</th><th>Workspace</th></tr></thead><tbody>${auditRows}</tbody></table></div></div>
  `;

  const newRole=p.querySelector('#saNewRole'),newWsField=p.querySelector('#saNewWsField');const updateNewRole=()=>newWsField.style.display=newRole.value==='principal'?'none':'';newRole.onchange=updateNewRole;updateNewRole();

  p.querySelector('#saNewEmployee').onclick=async()=>{const out=p.querySelector('#saNewResult'),btn=p.querySelector('#saNewEmployee');try{btn.disabled=true;const r=await V.createOrUpdateAccount({name:p.querySelector('#saNewName').value,email:p.querySelector('#saNewEmail').value,accountRole:newRole.value,workspaceId:p.querySelector('#saNewWs').value});out.style.display='block';out.className='callout cloud-ok';out.innerHTML=r.updated?'<b>Employee updated.</b>':`<b>Employee approved.</b><br>First-login activation code: <b>${esc(r.code||'')}</b>`;setTimeout(()=>V.renderAdminPanel().catch(console.error),900);}catch(e){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}finally{btn.disabled=false;}};

  p.querySelector('#saNewWorkspace').onclick=async()=>{try{await V.createTradeWorkspace({trade:p.querySelector('#saNewTrade').value,session:p.querySelector('#saNewSession').value,batch:p.querySelector('#saNewBatch').value});await V.renderAdminPanel();}catch(e){alert(e.message||e);}};

  p.querySelectorAll('[data-wedit]').forEach(b=>b.onclick=()=>openWorkspaceEditor(ws.find(x=>x.id===b.dataset.wedit),ws));
  p.querySelectorAll('[data-warchive]').forEach(b=>b.onclick=async()=>{try{await V.sysAdminArchiveWorkspace(b.dataset.warchive,b.dataset.next==='1');await V.renderAdminPanel();}catch(e){alert(e.message||e);}});
  p.querySelectorAll('[data-wdelete]').forEach(b=>b.onclick=async()=>{const w=ws.find(x=>x.id===b.dataset.wdelete);const typed=prompt(`Delete workspace "${label(w)}"?\n\nThis disables it but keeps all records recoverable.\nType DELETE to confirm:`);if(typed!=='DELETE')return;try{await V.sysAdminDeleteWorkspace(w.id);await V.renderAdminPanel();}catch(e){alert(e.message||e);}});
  p.querySelectorAll('[data-wrestore]').forEach(b=>b.onclick=async()=>{try{await V.sysAdminRestoreWorkspace(b.dataset.wrestore);await V.renderAdminPanel();}catch(e){alert(e.message||e);}});

  p.querySelectorAll('[data-eedit]').forEach(b=>b.onclick=()=>openEmployeeEditor(employees.find(x=>x.uid===b.dataset.eedit),activeWs));
  p.querySelectorAll('[data-etoggle]').forEach(b=>b.onclick=async()=>{try{await V.sysAdminSetEmployeeActive(b.dataset.etoggle,b.dataset.active==='1');await V.renderAdminPanel();}catch(e){alert(e.message||e);}});
  p.querySelectorAll('[data-edelete]').forEach(b=>b.onclick=async()=>{const m=employees.find(x=>x.uid===b.dataset.edelete);const typed=prompt(`Delete employee "${m.displayName||m.email}"?\n\nLogin access will be disabled immediately. The account remains recoverable.\nType DELETE to confirm:`);if(typed!=='DELETE')return;try{await V.sysAdminDeleteEmployee(m.uid);await V.renderAdminPanel();}catch(e){alert(e.message||e);}});
  p.querySelectorAll('[data-erestore]').forEach(b=>b.onclick=async()=>{try{await V.sysAdminRestoreEmployee(b.dataset.erestore);await V.renderAdminPanel();}catch(e){alert(e.message||e);}});

  p.querySelectorAll('[data-pdelete]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke this pending first-login account?'))return;try{await V.sysAdminDeletePending(b.dataset.pdelete);await V.renderAdminPanel();}catch(e){alert(e.message||e);}});
  p.querySelectorAll('[data-pregen]').forEach(b=>b.onclick=async()=>{const a=pending.find(x=>V.email(x.email)===V.email(b.dataset.pregen)),out=p.querySelector('#saPendingResult');try{const code=await V.sysAdminRegeneratePending(a);out.style.display='block';out.className='callout cloud-ok';out.innerHTML=`New activation code for <b>${esc(a.email)}</b>: <b>${esc(code)}</b>`;}catch(e){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}});
  p.querySelector('#saAuditRefresh').onclick=()=>V.renderAdminPanel();
};

function style(){
  if(document.getElementById('v15SystemAdminMasterStyle'))return;const s=document.createElement('style');s.id='v15SystemAdminMasterStyle';s.textContent=`
  .sa-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.sa-stats .card{display:grid;grid-template-columns:42px 1fr;grid-template-rows:auto auto;gap:0 10px;align-items:center;margin:0!important;padding:13px!important}.sa-stats .card>span{grid-row:1/3;font-size:1.35rem}.sa-stats .card>b{font:800 1.35rem Poppins,sans-serif;color:#123a5e}.sa-stats .card>small{color:#6b7785}.sa-stats .sa-warn{border-color:#f2c879!important;background:#fffaf0!important}
  .sa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.sa-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sa-head h3{margin-bottom:2px}.sa-actions{white-space:nowrap}.sa-actions .btn{margin:2px}.sa-check-grid{display:grid;gap:7px;max-height:260px;overflow:auto;padding:5px}.sa-check{display:flex;align-items:flex-start;gap:8px;padding:9px;border:1px solid #e2e8ed;border-radius:11px;background:#fafcfd}.sa-check input{width:18px!important;height:18px!important;min-height:18px!important;flex:0 0 auto}.sa-audit{max-height:420px;overflow:auto}
  @media(max-width:900px){.sa-stats{grid-template-columns:repeat(2,1fr)}.sa-grid{grid-template-columns:1fr}}
  @media(max-width:760px){.sa-stats{grid-template-columns:1fr 1fr;gap:7px}.sa-stats .card{padding:10px!important}.sa-actions{white-space:normal;min-width:185px}.sa-actions .btn{min-height:38px!important;padding:7px 9px!important;font-size:.72rem!important}#tab-admin-console .card{padding:13px!important}#tab-admin-console .table-wrap{margin-left:0;margin-right:0}.sa-head{align-items:center}.sa-audit{max-height:55vh}}
  `;document.head.appendChild(s);
}
style();ensureModal();
console.info('Universal ITI FINAL System Admin Master Control Center active.');
})(window.V15Sync);
