/* Universal ITI FINAL — System Admin Control Center
 * Safe lifecycle management for workspaces and institute employee accounts.
 * "Delete" is recoverable soft-delete: data remains in Firestore for audit/restore.
 */
(function(V){
'use strict';
if(!V)return;

const ROLE_LABEL={principal:'Principal',instructor:'Instructor',staff:'Staff (read-only)'};
let state={workspaces:[],members:[],access:[],info:{},audit:null};

function role(){try{return V.currentRole?.()||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}}
function isAdmin(){return !!V.member?.owner&&role()==='admin';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function label(w){return [w?.trade||'Unnamed Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
function activeWorkspaceIds(){return state.workspaces.filter(w=>w.status!=='deleted'&&w.status!=='archived').map(w=>w.id);}
function memberByUid(uid){return state.members.find(m=>m.uid===uid);}
function workspaceById(id){return state.workspaces.find(w=>w.id===id);}
function fmtDate(v){if(!v)return '—';try{const d=v?.toDate?v.toDate():new Date(v);return isNaN(d)?String(v):d.toLocaleString('en-IN');}catch(e){return String(v);}}
function M(){return V.fb.M;}
function instCol(name){return M().collection(V.fb.db,'institutes',V.INSTITUTE_ID,name);}
function wsRef(id){return M().doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',id);}

async function syncAccountAccess(m){
  if(!m?.email)return;
  await M().setDoc(V.access(m.email),{
    email:V.email(m.email),displayName:m.displayName||'',role:m.role,
    workspaceIds:Array.isArray(m.workspaceIds)?m.workspaceIds:[],
    traineeId:m.traineeId||null,active:m.active!==false&&m.status!=='deleted',
    updatedAt:V.now(),updatedBy:V.fb.user.uid
  },{merge:true});
}
async function audit(action,details,wid=null){try{await V.audit?.(action,details,wid||V.workspaceId);}catch(e){}}

V.adminDirectory=async function(){
  if(!isAdmin())throw new Error('System Admin access required.');
  const mm=M();
  const [wsSnap,mSnap,aSnap,infoSnap]=await Promise.all([
    mm.getDocs(instCol('workspaces')),
    mm.getDocs(instCol('members')),
    mm.getDocs(instCol('access')),
    mm.getDoc(V.inst())
  ]);
  const workspaces=[],members=[],access=[];
  wsSnap.forEach(d=>workspaces.push({id:d.id,...d.data()}));
  mSnap.forEach(d=>members.push({uid:d.id,...d.data()}));
  aSnap.forEach(d=>access.push({id:d.id,...d.data()}));
  workspaces.sort((a,b)=>String(a.session||'').localeCompare(String(b.session||''))||String(a.trade||'').localeCompare(String(b.trade||''),undefined,{numeric:true,sensitivity:'base'})||String(a.batch||'').localeCompare(String(b.batch||'')));
  members.sort((a,b)=>String(a.displayName||a.email||'').localeCompare(String(b.displayName||b.email||''),undefined,{sensitivity:'base'}));
  return {workspaces,members,access,info:infoSnap.exists()?infoSnap.data():{}};
};

V.adminCreateWorkspace=async function(){
  if(!isAdmin())return;
  const trade=document.getElementById('admWsTrade')?.value.trim()||'';
  const session=document.getElementById('admWsSession')?.value.trim()||'';
  const batch=document.getElementById('admWsBatch')?.value.trim()||'A';
  try{
    const id=await V.createTradeWorkspace({trade,session,batch});
    await audit('admin.workspace.create',{workspaceId:id,trade,session,batch},id);
    await V.renderAdminPanel(false);
  }catch(e){alert(e.message||e);}
};

V.adminEditWorkspace=async function(wid){
  if(!isAdmin())return;
  const w=workspaceById(wid);if(!w)return alert('Workspace not found.');
  const trade=prompt('Trade name:',w.trade||'');if(trade===null)return;
  const session=prompt('Session:',w.session||'');if(session===null)return;
  const batch=prompt('Batch:',w.batch||'A');if(batch===null)return;
  const threshold=prompt('Attendance threshold %:',String(w.attendanceThreshold??80));if(threshold===null)return;
  const n=Number(threshold);
  if(!trade.trim()||!session.trim())return alert('Trade and Session are required.');
  if(!Number.isFinite(n)||n<1||n>100)return alert('Attendance threshold must be 1–100.');
  await M().setDoc(wsRef(wid),{
    trade:trade.trim(),session:session.trim(),batch:(batch.trim()||'A'),attendanceThreshold:n,
    updatedAt:V.now(),updatedBy:V.fb.user.uid
  },{merge:true});
  await audit('admin.workspace.update',{before:{trade:w.trade,session:w.session,batch:w.batch,attendanceThreshold:w.attendanceThreshold},after:{trade:trade.trim(),session:session.trim(),batch:batch.trim()||'A',attendanceThreshold:n}},wid);
  await V.renderAdminPanel(false);
};

V.adminSetWorkspaceStatus=async function(wid,status){
  if(!isAdmin())return;
  const w=workspaceById(wid);if(!w)return;
  if(!['active','archived'].includes(status))return;
  if(!confirm((status==='archived'?'Archive':'Reactivate')+' '+label(w)+'?'))return;
  await M().setDoc(wsRef(wid),{status,updatedAt:V.now(),updatedBy:V.fb.user.uid},{merge:true});
  await audit('admin.workspace.'+status,{workspaceId:wid,label:label(w)},wid);
  await V.renderAdminPanel(false);
};

V.adminDeleteWorkspace=async function(wid){
  if(!isAdmin())return;
  const w=workspaceById(wid);if(!w||w.status==='deleted')return;
  const assigned=state.members.filter(m=>!m.owner&&(m.workspaceIds||[]).includes(wid));
  const msg='Delete workspace from active use?\n\n'+label(w)+'\nAssigned employee accounts: '+assigned.length+'\n\nThis is SAFE DELETE: records are retained and the workspace can be restored by System Admin.';
  if(!confirm(msg))return;
  const mm=M();
  const assignmentBackup=assigned.map(m=>({uid:m.uid,email:m.email||'',workspaceIds:[...(m.workspaceIds||[])]}));
  await mm.setDoc(wsRef(wid),{
    status:'deleted',deletedAt:V.now(),deletedBy:V.fb.user.uid,
    deletedAssignmentBackup:assignmentBackup,updatedAt:V.now(),updatedBy:V.fb.user.uid
  },{merge:true});
  for(const m of assigned){
    const ids=(m.workspaceIds||[]).filter(id=>id!==wid);
    await mm.updateDoc(V.memberRef(m.uid),{workspaceIds:ids,needsWorkspace:ids.length===0,updatedAt:V.now(),updatedBy:V.fb.user.uid});
    if(m.email)await mm.setDoc(V.access(m.email),{workspaceIds:ids,updatedAt:V.now(),updatedBy:V.fb.user.uid},{merge:true}).catch(()=>{});
  }
  await audit('admin.workspace.delete.safe',{workspaceId:wid,label:label(w),removedAssignments:assignmentBackup},wid);
  await V.renderAdminPanel(false);
};

V.adminRestoreWorkspace=async function(wid){
  if(!isAdmin())return;
  const w=workspaceById(wid);if(!w||w.status!=='deleted')return;
  if(!confirm('Restore workspace '+label(w)+' and restore its previous employee assignments where possible?'))return;
  const mm=M(),backup=Array.isArray(w.deletedAssignmentBackup)?w.deletedAssignmentBackup:[];
  await mm.setDoc(wsRef(wid),{
    status:'active',restoredAt:V.now(),restoredBy:V.fb.user.uid,deletedAt:mm.deleteField(),deletedBy:mm.deleteField(),
    updatedAt:V.now(),updatedBy:V.fb.user.uid
  },{merge:true});
  for(const b of backup){
    try{
      const s=await mm.getDoc(V.memberRef(b.uid));if(!s.exists())continue;
      const m=s.data();if(m.status==='deleted')continue;
      const ids=[...new Set([...(m.workspaceIds||[]),wid])];
      await mm.updateDoc(V.memberRef(b.uid),{workspaceIds:ids,needsWorkspace:false,updatedAt:V.now(),updatedBy:V.fb.user.uid});
      if(m.email)await mm.setDoc(V.access(m.email),{workspaceIds:ids,updatedAt:V.now(),updatedBy:V.fb.user.uid},{merge:true});
    }catch(e){}
  }
  await audit('admin.workspace.restore',{workspaceId:wid,label:label(w),assignmentCount:backup.length},wid);
  await V.renderAdminPanel(false);
};

V.adminCreateEmployee=async function(){
  if(!isAdmin())return;
  const name=document.getElementById('admEmpName')?.value.trim()||'';
  const email=V.email(document.getElementById('admEmpEmail')?.value||'');
  const r=document.getElementById('admEmpRole')?.value||'instructor';
  const wid=document.getElementById('admEmpWorkspace')?.value||'';
  const out=document.getElementById('admEmpResult');
  try{
    if(!name)throw new Error('Enter employee name.');
    if(!V.validEmail(email))throw new Error('Enter a valid Google/Gmail address.');
    if(!ROLE_LABEL[r])throw new Error('Invalid employee role.');
    if(r!=='principal'&&!wid)throw new Error('Select the employee Trade / Batch.');
    const existing=state.members.find(m=>V.email(m.email)===email);
    if(existing)throw new Error('This Gmail is already activated. Use Edit in Employee Management.');
    if(r==='principal'&&state.info?.principalUid)throw new Error('An official Principal is already assigned. Edit/transfer the current Principal first.');
    const code=V.code(),hash=await V.hash(code),ids=wid?[wid]:[];
    const mm=M();
    await mm.setDoc(V.access(email),{email,displayName:name,role:r,workspaceIds:ids,traineeId:null,active:true,createdAt:V.now(),createdBy:V.fb.user.uid,updatedAt:V.now()});
    await mm.setDoc(V.secret(email),{email,role:r,codeHash:hash,active:true,createdAt:V.now(),createdBy:V.fb.user.uid});
    await audit('admin.employee.invite',{email,displayName:name,role:r,workspaceIds:ids});
    if(out){out.style.display='block';out.className='callout cloud-ok';out.innerHTML='<b>Account approved.</b><br>'+esc(email)+'<br>First-login code: <b>'+esc(code)+'</b>';}
    await V.renderAdminPanel(false,{preserveResult:true});
  }catch(e){if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);}
};

function employeeEditHtml(m){
  const activeIds=new Set(m.workspaceIds||[]);
  const boxes=state.workspaces.filter(w=>w.status!=='deleted').map(w=>'<label class="adm-check"><input type="checkbox" value="'+esc(w.id)+'" '+(activeIds.has(w.id)?'checked':'')+'> <span>'+esc(label(w))+(w.status==='archived'?' <small>(Archived)</small>':'')+'</span></label>').join('');
  return '<div id="admEmployeeEditModal" class="modal-overlay" style="display:flex"><div class="modal-card" style="max-width:520px"><h3>Edit Employee</h3>'+
    '<div class="field"><label>Name</label><input id="admEditName" value="'+esc(m.displayName||'')+'"></div>'+
    '<div class="field"><label>Google / Gmail</label><input value="'+esc(m.email||'')+'" disabled></div>'+
    '<div class="field"><label>Role</label><select id="admEditRole">'+Object.entries(ROLE_LABEL).map(([k,v])=>'<option value="'+k+'" '+(m.role===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Status</label><select id="admEditActive"><option value="true" '+(m.active!==false?'selected':'')+'>Active</option><option value="false" '+(m.active===false?'selected':'')+'>Disabled</option></select></div>'+
    '<div class="field"><label>Assigned Trade / Batch</label><div class="adm-workspace-checks">'+boxes+'</div></div>'+
    '<div class="field-row" style="justify-content:flex-end"><button class="btn ghost" id="admEditCancel">Cancel</button><button class="btn primary" id="admEditSave">Save Changes</button></div></div></div>';
}
V.adminEditEmployee=function(uid){
  if(!isAdmin())return;
  const m=memberByUid(uid);if(!m)return;
  if(m.owner)return alert('System Admin creator account is protected.');
  document.getElementById('admEmployeeEditModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',employeeEditHtml(m));
  const modal=document.getElementById('admEmployeeEditModal');
  modal.querySelector('#admEditCancel').onclick=()=>modal.remove();
  modal.querySelector('#admEditSave').onclick=()=>V.adminSaveEmployee(uid).catch(e=>alert(e.message||e));
};
V.adminSaveEmployee=async function(uid){
  if(!isAdmin())return;
  const m=memberByUid(uid),modal=document.getElementById('admEmployeeEditModal');if(!m||!modal)return;
  const name=modal.querySelector('#admEditName').value.trim(),r=modal.querySelector('#admEditRole').value,active=modal.querySelector('#admEditActive').value==='true';
  const ids=[...modal.querySelectorAll('.adm-workspace-checks input:checked')].map(x=>x.value);
  if(!name)throw new Error('Name is required.');
  if(!ROLE_LABEL[r])throw new Error('Invalid role.');
  if(r!=='principal'&&!ids.length)throw new Error('Instructor/Staff must have at least one active Trade workspace.');
  const mm=M(),info=state.info||{};
  if(r==='principal'&&info.principalUid&&info.principalUid!==uid){
    const old=memberByUid(info.principalUid);
    if(!confirm('Another Principal is active'+(old?' ('+(old.displayName||old.email)+')':'')+'. Transfer Principal authority to this employee?'))return;
    if(old&&!old.owner){
      const oldRole='instructor',oldIds=(old.workspaceIds||[]).length?old.workspaceIds:(activeWorkspaceIds().slice(0,1));
      await mm.updateDoc(V.memberRef(old.uid),{role:oldRole,workspaceIds:oldIds,updatedAt:V.now(),updatedBy:V.fb.user.uid});
      if(old.email)await mm.setDoc(V.access(old.email),{role:oldRole,workspaceIds:oldIds,updatedAt:V.now(),updatedBy:V.fb.user.uid},{merge:true});
    }
  }
  if(info.principalUid===uid&&r!=='principal'){
    await mm.setDoc(V.inst(),{principalUid:mm.deleteField(),principalEmail:mm.deleteField(),updatedAt:V.now()},{merge:true});
  }
  await mm.updateDoc(V.memberRef(uid),{displayName:name,role:r,active,status:'active',workspaceIds:ids,needsWorkspace:false,updatedAt:V.now(),updatedBy:V.fb.user.uid});
  const updated={...m,displayName:name,role:r,active,status:'active',workspaceIds:ids};
  await syncAccountAccess(updated);
  if(r==='principal')await mm.setDoc(V.inst(),{principalUid:uid,principalEmail:V.email(m.email),principalActivatedAt:V.now(),updatedAt:V.now()},{merge:true});
  await audit('admin.employee.update',{targetUid:uid,email:m.email,before:{displayName:m.displayName,role:m.role,active:m.active,workspaceIds:m.workspaceIds},after:{displayName:name,role:r,active,workspaceIds:ids}});
  modal.remove();await V.renderAdminPanel(false);
};

V.adminToggleEmployee=async function(uid){
  if(!isAdmin())return;
  const m=memberByUid(uid);if(!m||m.owner||m.status==='deleted')return;
  const active=m.active===false;
  await M().updateDoc(V.memberRef(uid),{active,updatedAt:V.now(),updatedBy:V.fb.user.uid});
  if(m.email)await M().setDoc(V.access(m.email),{active,updatedAt:V.now(),updatedBy:V.fb.user.uid},{merge:true});
  await audit('admin.employee.'+(active?'enable':'disable'),{targetUid:uid,email:m.email});
  await V.renderAdminPanel(false);
};

V.adminDeleteEmployee=async function(uid){
  if(!isAdmin())return;
  const m=memberByUid(uid);if(!m||m.owner||m.status==='deleted')return;
  if(!confirm('Delete employee access?\n\n'+(m.displayName||m.email)+'\n'+(m.email||'')+'\n\nThis is SAFE DELETE. The account is disabled immediately and can be restored by System Admin.'))return;
  const mm=M();
  if(state.info?.principalUid===uid)await mm.setDoc(V.inst(),{principalUid:mm.deleteField(),principalEmail:mm.deleteField(),updatedAt:V.now()},{merge:true});
  await mm.updateDoc(V.memberRef(uid),{active:false,status:'deleted',deletedAt:V.now(),deletedBy:V.fb.user.uid,updatedAt:V.now(),updatedBy:V.fb.user.uid});
  if(m.email){
    await mm.deleteDoc(V.access(m.email)).catch(()=>{});
    await mm.deleteDoc(V.secret(m.email)).catch(()=>{});
  }
  await audit('admin.employee.delete.safe',{targetUid:uid,email:m.email,displayName:m.displayName,role:m.role,workspaceIds:m.workspaceIds});
  await V.renderAdminPanel(false);
};

V.adminRestoreEmployee=async function(uid){
  if(!isAdmin())return;
  const m=memberByUid(uid);if(!m||m.owner||m.status!=='deleted')return;
  if(m.role==='principal'&&state.info?.principalUid&&state.info.principalUid!==uid)return alert('Another Principal is already active. Change that role first.');
  if(!confirm('Restore employee '+(m.displayName||m.email)+'?'))return;
  const mm=M(),ids=(m.workspaceIds||[]).filter(id=>workspaceById(id)?.status!=='deleted');
  await mm.updateDoc(V.memberRef(uid),{active:true,status:'active',workspaceIds:ids,deletedAt:mm.deleteField(),deletedBy:mm.deleteField(),updatedAt:V.now(),updatedBy:V.fb.user.uid});
  await syncAccountAccess({...m,active:true,status:'active',workspaceIds:ids});
  if(m.role==='principal')await mm.setDoc(V.inst(),{principalUid:uid,principalEmail:V.email(m.email),principalActivatedAt:V.now(),updatedAt:V.now()},{merge:true});
  await audit('admin.employee.restore',{targetUid:uid,email:m.email});
  await V.renderAdminPanel(false);
};

V.adminDeletePending=async function(email){
  if(!isAdmin())return;
  email=V.email(email);if(!confirm('Delete pending first-login approval for '+email+'?'))return;
  await M().deleteDoc(V.access(email)).catch(()=>{});
  await M().deleteDoc(V.secret(email)).catch(()=>{});
  await audit('admin.invite.delete',{email});
  await V.renderAdminPanel(false);
};

V.adminLoadAudit=async function(){
  if(!isAdmin())return;
  const host=document.getElementById('admAuditBody');if(host)host.innerHTML='<tr><td colspan="4">Loading…</td></tr>';
  let rows=[];
  try{
    const mm=M(),q=mm.query(instCol('auditLog'),mm.orderBy('createdAt','desc'),mm.limit(30)),z=await mm.getDocs(q);
    z.forEach(d=>rows.push({id:d.id,...d.data()}));
  }catch(e){
    try{const z=await M().getDocs(instCol('auditLog'));z.forEach(d=>rows.push({id:d.id,...d.data()}));rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));rows=rows.slice(0,30);}catch(x){}
  }
  state.audit=rows;
  if(host)host.innerHTML=rows.map(a=>'<tr><td>'+esc(fmtDate(a.createdAt))+'</td><td>'+esc(a.action||'')+'</td><td>'+esc(a.actorEmail||a.actorRole||'')+'</td><td><small>'+esc(JSON.stringify(a.details||{}).slice(0,180))+'</small></td></tr>').join('')||'<tr><td colspan="4">No audit events found.</td></tr>';
};

V.adminExportConfiguration=function(){
  if(!isAdmin())return;
  const safeMembers=state.members.map(({activationProof,...m})=>m);
  const data={exportedAt:new Date().toISOString(),institute:state.info,workspaces:state.workspaces,members:safeMembers,access:state.access.map(a=>({...a,codeHash:undefined}))};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='universal-iti-admin-config-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

function health(){
  const existing=new Set(state.workspaces.filter(w=>w.status!=='deleted').map(w=>w.id));
  const employees=state.members.filter(m=>!m.owner);
  const orphan=employees.reduce((n,m)=>n+(m.workspaceIds||[]).filter(id=>!existing.has(id)).length,0);
  return {
    activeWs:state.workspaces.filter(w=>(w.status||'active')==='active').length,
    archivedWs:state.workspaces.filter(w=>w.status==='archived').length,
    deletedWs:state.workspaces.filter(w=>w.status==='deleted').length,
    activeEmp:employees.filter(m=>m.status!=='deleted'&&m.active!==false).length,
    disabledEmp:employees.filter(m=>m.status!=='deleted'&&m.active===false).length,
    deletedEmp:employees.filter(m=>m.status==='deleted').length,
    orphan
  };
}
function workspaceRows(){
  return state.workspaces.map(w=>{
    const assigned=state.members.filter(m=>!m.owner&&(m.workspaceIds||[]).includes(w.id)&&m.status!=='deleted').length;
    const status=w.status||'active';
    const actions=status==='deleted'
      ?'<button class="btn small primary" data-ws-restore="'+esc(w.id)+'">Restore</button>'
      :'<button class="btn small" data-ws-edit="'+esc(w.id)+'">Edit</button> <button class="btn ghost small" data-ws-status="'+esc(w.id)+'" data-status="'+(status==='archived'?'active':'archived')+'">'+(status==='archived'?'Reactivate':'Archive')+'</button> <button class="btn danger small" data-ws-delete="'+esc(w.id)+'">Delete</button>';
    return '<tr><td><b>'+esc(w.trade||'')+'</b><br><small>'+esc(w.id)+'</small></td><td>'+esc(w.session||'')+'</td><td>'+esc(w.batch||'')+'</td><td>'+assigned+'</td><td><span class="badge">'+esc(status)+'</span></td><td class="adm-actions">'+actions+'</td></tr>';
  }).join('')||'<tr><td colspan="6">No workspaces.</td></tr>';
}
function employeeRows(){
  return state.members.map(m=>{
    if(m.owner)return '<tr><td><b>'+esc(m.displayName||m.email)+'</b><br><small>'+esc(m.email||'')+'</small></td><td>System Admin / '+esc(ROLE_LABEL[m.role]||m.role||'')+'</td><td>'+esc((m.workspaceIds||[]).map(id=>label(workspaceById(id)||{trade:id})).join(', ')||'Institute-wide')+'</td><td><span class="badge">Protected</span></td><td>Protected creator account</td></tr>';
    const deleted=m.status==='deleted';
    const actions=deleted
      ?'<button class="btn small primary" data-emp-restore="'+esc(m.uid)+'">Restore</button>'
      :'<button class="btn small" data-emp-edit="'+esc(m.uid)+'">Edit</button> <button class="btn ghost small" data-emp-toggle="'+esc(m.uid)+'">'+(m.active===false?'Enable':'Disable')+'</button> <button class="btn danger small" data-emp-delete="'+esc(m.uid)+'">Delete</button>';
    return '<tr><td><b>'+esc(m.displayName||m.email||'Employee')+'</b><br><small>'+esc(m.email||'')+'</small></td><td>'+esc(ROLE_LABEL[m.role]||m.role||'')+'</td><td>'+esc((m.workspaceIds||[]).map(id=>label(workspaceById(id)||{trade:id})).join(', ')||'—')+'</td><td>'+(deleted?'<span class="badge">Deleted</span>':m.active===false?'<span class="badge">Disabled</span>':'<span class="badge">Active</span>')+'</td><td class="adm-actions">'+actions+'</td></tr>';
  }).join('')||'<tr><td colspan="5">No employee accounts.</td></tr>';
}
function pendingRows(){
  const activated=new Set(state.members.map(m=>V.email(m.email)));
  return state.access.filter(a=>!activated.has(V.email(a.email))).map(a=>'<tr><td>'+esc(a.displayName||a.email)+'</td><td>'+esc(a.email||'')+'</td><td>'+esc(ROLE_LABEL[a.role]||a.role||'')+'</td><td>'+esc((a.workspaceIds||[]).map(id=>label(workspaceById(id)||{trade:id})).join(', ')||'—')+'</td><td><button class="btn danger small" data-pending-delete="'+esc(a.email)+'">Delete</button></td></tr>').join('')||'<tr><td colspan="5" class="muted">No pending first-login accounts.</td></tr>';
}

V.renderAdminPanel=async function(showLoading=true,opts={}){
  if(!isAdmin())return;
  const panel=document.getElementById('tab-admin-console');if(!panel)return;
  if(showLoading)panel.innerHTML='<div class="card"><h2>⚙️ System Admin</h2><p class="muted">Loading control center…</p></div>';
  try{state=await V.adminDirectory();}catch(e){panel.innerHTML='<div class="card"><h2>⚙️ System Admin</h2><div class="callout cloud-error">'+esc(e.message||e)+'</div><button class="btn primary" id="admRetry">Retry</button></div>';panel.querySelector('#admRetry').onclick=()=>V.renderAdminPanel();return;}
  const h=health(),active=state.workspaces.filter(w=>w.status==='active'||!w.status);
  panel.innerHTML=`
    <div class="hero"><div class="hero-content"><div><span class="showcase-kicker">MASTER CONTROL</span><h2>⚙️ System Admin Control Center</h2><p>Technical administration, workspace lifecycle, employee access, recovery and audit. Principal remains the operational institute authority.</p></div><div><button class="btn ghost" id="admRefresh">↻ Refresh</button> <button class="btn secondary" id="admExport">Export Config</button></div></div></div>
    <div class="cards adm-health">
      <div class="card"><div class="stat">${h.activeWs}</div><div class="stat-label">Active Workspaces</div></div>
      <div class="card"><div class="stat">${h.activeEmp}</div><div class="stat-label">Active Employees</div></div>
      <div class="card"><div class="stat ${h.orphan?'bad':''}">${h.orphan}</div><div class="stat-label">Orphan Assignments</div></div>
      <div class="card"><div class="stat">${state.access.filter(a=>!new Set(state.members.map(m=>V.email(m.email))).has(V.email(a.email))).length}</div><div class="stat-label">Pending First Login</div></div>
    </div>
    <div class="callout ${h.orphan?'cloud-error':'cloud-ok'}"><b>System integrity:</b> ${h.orphan? h.orphan+' employee workspace assignment(s) point to deleted/missing workspaces. Edit those employees to repair assignments.':'No broken employee/workspace assignments detected.'} <span class="muted">Archived: ${h.archivedWs} • Deleted workspaces: ${h.deletedWs} • Disabled employees: ${h.disabledEmp} • Deleted employees: ${h.deletedEmp}</span></div>

    <div class="cards adm-create-grid" style="margin-top:14px">
      <div class="card"><h3>Create Workspace</h3>
        <div class="field"><label>Trade</label><input id="admWsTrade" placeholder="e.g. COPA"></div>
        <div class="field"><label>Session</label><input id="admWsSession" placeholder="2026-27"></div>
        <div class="field"><label>Batch</label><input id="admWsBatch" value="A"></div>
        <button class="btn primary full" id="admWsCreate">Create Workspace</button>
      </div>
      <div class="card"><h3>Create Employee Access</h3>
        <div class="field"><label>Name</label><input id="admEmpName" placeholder="Full name"></div>
        <div class="field"><label>Google / Gmail</label><input id="admEmpEmail" type="email" placeholder="name@gmail.com"></div>
        <div class="field"><label>Role</label><select id="admEmpRole"><option value="principal">Principal</option><option value="instructor" selected>Instructor</option><option value="staff">Staff (read-only)</option></select></div>
        <div class="field"><label>Primary Trade / Batch</label><select id="admEmpWorkspace"><option value="">Select workspace…</option>${active.map(w=>'<option value="'+esc(w.id)+'">'+esc(label(w))+'</option>').join('')}</select></div>
        <button class="btn primary full" id="admEmpCreate">Approve Google Account</button>
        <div id="admEmpResult" class="callout" style="display:none;margin-top:10px"></div>
      </div>
    </div>

    <div class="card"><div class="adm-section-head"><div><h3>Workspace Management</h3><p class="muted">Edit details, archive old sessions, safe-delete and restore. Workspace ID stays stable when Trade/Session/Batch text is edited, so records are preserved.</p></div></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Workspace</th><th>Session</th><th>Batch</th><th>Employees</th><th>Status</th><th>Actions</th></tr></thead><tbody>${workspaceRows()}</tbody></table></div></div>

    <div class="card"><div class="adm-section-head"><div><h3>Employee Management</h3><p class="muted">Update name, role, assigned workspaces and status. Delete is recoverable and immediately disables access.</p></div></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Employee</th><th>Role</th><th>Assigned Workspace(s)</th><th>Status</th><th>Actions</th></tr></thead><tbody>${employeeRows()}</tbody></table></div></div>

    <div class="card"><h3>Pending First-login Approvals</h3><div class="table-wrap"><table class="datatable"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Workspace</th><th>Action</th></tr></thead><tbody>${pendingRows()}</tbody></table></div></div>

    <div class="card"><div class="adm-section-head"><div><h3>Audit & Change History</h3><p class="muted">Latest technical/admin changes. Audit records themselves cannot be edited or deleted.</p></div><button class="btn ghost" id="admLoadAudit">Load last 30</button></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead><tbody id="admAuditBody"><tr><td colspan="4" class="muted">Press “Load last 30” when needed; audit history is lazy-loaded so login remains fast.</td></tr></tbody></table></div></div>
  `;

  const style=document.getElementById('admControlStyle')||document.createElement('style');style.id='admControlStyle';style.textContent=`
    .adm-health{grid-template-columns:repeat(4,minmax(150px,1fr))!important}.adm-create-grid{grid-template-columns:1fr 1fr!important}.adm-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.adm-actions{white-space:nowrap}.adm-actions .btn{margin:2px}.adm-workspace-checks{max-height:220px;overflow:auto;border:1px solid #e2e7ec;border-radius:12px;padding:8px}.adm-check{display:flex;gap:8px;align-items:flex-start;padding:8px;border-bottom:1px solid #eef1f3}.adm-check:last-child{border-bottom:0}.adm-check input{width:auto!important;min-height:auto!important;margin-top:3px}
    @media(max-width:900px){.adm-health{grid-template-columns:1fr 1fr!important}.adm-create-grid{grid-template-columns:1fr!important}}
    @media(max-width:760px){.adm-health{grid-template-columns:1fr 1fr!important;gap:8px!important}.adm-health .card{padding:12px!important}.adm-health .stat{font-size:1.45rem!important}.adm-section-head{align-items:center}.adm-actions{white-space:normal;min-width:190px}.adm-actions .btn{min-height:36px!important;padding:6px 9px!important}}
  `;if(!style.parentNode)document.head.appendChild(style);

  panel.querySelector('#admRefresh').onclick=()=>V.renderAdminPanel();
  panel.querySelector('#admExport').onclick=()=>V.adminExportConfiguration();
  panel.querySelector('#admWsCreate').onclick=()=>V.adminCreateWorkspace();
  panel.querySelector('#admEmpCreate').onclick=()=>V.adminCreateEmployee();
  panel.querySelector('#admLoadAudit').onclick=()=>V.adminLoadAudit();
  panel.querySelectorAll('[data-ws-edit]').forEach(b=>b.onclick=()=>V.adminEditWorkspace(b.dataset.wsEdit).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-ws-status]').forEach(b=>b.onclick=()=>V.adminSetWorkspaceStatus(b.dataset.wsStatus,b.dataset.status).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-ws-delete]').forEach(b=>b.onclick=()=>V.adminDeleteWorkspace(b.dataset.wsDelete).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-ws-restore]').forEach(b=>b.onclick=()=>V.adminRestoreWorkspace(b.dataset.wsRestore).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-emp-edit]').forEach(b=>b.onclick=()=>V.adminEditEmployee(b.dataset.empEdit));
  panel.querySelectorAll('[data-emp-toggle]').forEach(b=>b.onclick=()=>V.adminToggleEmployee(b.dataset.empToggle).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-emp-delete]').forEach(b=>b.onclick=()=>V.adminDeleteEmployee(b.dataset.empDelete).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-emp-restore]').forEach(b=>b.onclick=()=>V.adminRestoreEmployee(b.dataset.empRestore).catch(e=>alert(e.message||e)));
  panel.querySelectorAll('[data-pending-delete]').forEach(b=>b.onclick=()=>V.adminDeletePending(b.dataset.pendingDelete).catch(e=>alert(e.message||e)));
};

console.info('Universal ITI FINAL System Admin Control Center active.');
})(window.V15Sync);
