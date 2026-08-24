/* V15 multi-trade institute model.
 * One Firestore workspace = one Trade + Session + Batch.
 * Principal sees institute-wide trade/trainee/attendance summaries.
 * Admin/Principal can create trade workspaces and assign Instructor/Staff accounts.
 * Instructor/Staff with more than one workspace gets an explicit workspace switcher.
 */
(function(V){
'use strict';
if(!V) return;

const ROLE_LABEL={principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student'};
const WORKSPACE_PREF='iti-v15-workspace-pref';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function role(){return SESSION?.role||'';}
function canManageTrades(){return !!V.member?.owner&&role()==='admin' || role()==='principal';}
function labelWorkspace(w){return [w.trade||'Unnamed trade',w.session||'',w.batch||''].filter(Boolean).join(' • ');}
function pct(n){return Number.isFinite(n)?Math.round(n)+'%':'—';}
function statusValue(v){
  if(v&&typeof v==='object') return String(v.status??v.value??v.attendance??'').trim().toUpperCase();
  return String(v??'').trim().toUpperCase();
}
function attendanceStats(trainees,attendanceDocs){
  const by=new Map((trainees||[]).map(t=>[String(t.id),{present:0,total:0}]));
  for(const x of attendanceDocs||[]){
    const id=String(x.traineeId??x.subKey??''); if(!id) continue;
    const s=by.get(id)||{present:0,total:0};
    const val=statusValue(x.data);
    if(!val) continue;
    s.total++; if(val==='P'||val==='PRESENT'||val.startsWith('PRESENT')) s.present++;
    by.set(id,s);
  }
  const rows=(trainees||[]).map(t=>{
    const s=by.get(String(t.id))||{present:0,total:0};
    const value=s.total?100*s.present/s.total:null;
    return {trainee:t,attendance:value,present:s.present,total:s.total};
  });
  const valid=rows.filter(x=>Number.isFinite(x.attendance));
  const avg=valid.length?valid.reduce((a,x)=>a+x.attendance,0)/valid.length:null;
  return {rows,avg};
}

V.listTradeWorkspaces=async function(){
  if(!this.fb?.db) return [];
  const M=this.fb.M,ref=M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces');
  const z=await M.getDocs(ref),out=[];
  z.forEach(d=>out.push({id:d.id,...d.data()}));
  out.sort((a,b)=>String(a.trade||'').localeCompare(String(b.trade||''),undefined,{numeric:true,sensitivity:'base'})||String(a.session||'').localeCompare(String(b.session||''))||String(a.batch||'').localeCompare(String(b.batch||'')));
  return out;
};

V.workspaceMembers=async function(){
  try{return (await this.staffDirectory?.())?.members||[];}catch(e){}
  const M=this.fb.M,z=await M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members')),a=[];
  z.forEach(d=>a.push({uid:d.id,...d.data()}));return a;
};

V.createTradeWorkspace=async function(source='admin'){
  if(!canManageTrades()) throw new Error('System Admin or Principal access required.');
  const p=source==='principal'?'v15PrincipalTrade':'v15AdminTrade';
  const s=source==='principal'?'v15PrincipalSession':'v15AdminSession';
  const b=source==='principal'?'v15PrincipalBatch':'v15AdminBatch';
  const trade=String(document.getElementById(p)?.value||'').trim();
  const session=String(document.getElementById(s)?.value||DATA?.meta?.session||'').trim();
  const batch=String(document.getElementById(b)?.value||'').trim();
  if(!trade) throw new Error('Enter the trade name.');
  if(!session) throw new Error('Enter the session, for example 2026-27.');
  const base=DATA?.meta?.instituteCode||'mumbai-01';
  const wid=this.esc(`${base}-${trade}-${session}-${batch||'batch'}`).slice(0,120);
  const M=this.fb.M,ref=M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid),old=await M.getDoc(ref);
  if(old.exists()) throw new Error('This Trade / Session / Batch workspace already exists.');
  await M.setDoc(ref,{institute:DATA?.meta?.institute||this.INSTITUTE_NAME,instituteCode:base,trade,session,batch:batch||'A',schemaVersion:15,appVersion:'V15',workspaceId:wid,instituteId:this.INSTITUTE_ID,arraySections:[],mapSections:[],attendanceThreshold:Number(DATA?.meta?.attendanceThreshold)||80,createdAt:this.now(),createdBy:this.fb.user.uid,updatedAt:this.now()});
  await this.refreshTradeWorkspaceUI();
  return wid;
};

V.setAccountTrade=async function(mode='only',source='admin'){
  if(!canManageTrades()) throw new Error('System Admin or Principal access required.');
  const userId=document.getElementById(source==='principal'?'v15PrincipalAssignUser':'v15AdminAssignUser')?.value||'';
  const wid=document.getElementById(source==='principal'?'v15PrincipalAssignWorkspace':'v15AdminAssignWorkspace')?.value||'';
  if(!userId||!wid) throw new Error('Select both an account and a trade workspace.');
  const M=this.fb.M,ref=this.memberRef(userId),snap=await M.getDoc(ref);
  if(!snap.exists()) throw new Error('Activated account not found.');
  const m=snap.data();
  if(m.owner) throw new Error('Creator/System Admin account workspace is managed separately.');
  if(role()==='principal'&&!['instructor','staff'].includes(m.role)) throw new Error('Principal can assign Trade workspaces only to Instructor or Staff accounts.');
  const current=Array.isArray(m.workspaceIds)?m.workspaceIds:[];
  const workspaceIds=mode==='add'?[...new Set([...current,wid])]:[wid];
  await M.updateDoc(ref,{workspaceIds,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email){
    try{await M.setDoc(this.access(m.email),{workspaceIds,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});}catch(e){}
  }
  await this.refreshTradeWorkspaceUI();
};

V.removeAccountTrade=async function(source='admin'){
  if(!canManageTrades()) throw new Error('System Admin or Principal access required.');
  const userId=document.getElementById(source==='principal'?'v15PrincipalAssignUser':'v15AdminAssignUser')?.value||'';
  const wid=document.getElementById(source==='principal'?'v15PrincipalAssignWorkspace':'v15AdminAssignWorkspace')?.value||'';
  if(!userId||!wid) throw new Error('Select both an account and a trade workspace.');
  const M=this.fb.M,ref=this.memberRef(userId),snap=await M.getDoc(ref);if(!snap.exists())return;
  const m=snap.data(),current=Array.isArray(m.workspaceIds)?m.workspaceIds:[];
  const workspaceIds=current.filter(x=>x!==wid);
  if(!workspaceIds.length) throw new Error('An activated Instructor/Staff account must keep at least one Trade workspace. Use “Set only this trade” on another workspace first.');
  await M.updateDoc(ref,{workspaceIds,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(m.email)try{await M.setDoc(this.access(m.email),{workspaceIds,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});}catch(e){}
  await this.refreshTradeWorkspaceUI();
};

V.tradeManagementHtml=async function(source='admin'){
  const [ws,members]=await Promise.all([this.listTradeWorkspaces(),this.workspaceMembers()]);
  const allowedMembers=members.filter(m=>!m.owner && (source==='admin'?['instructor','staff','student'].includes(m.role):['instructor','staff'].includes(m.role)));
  const wsOptions=ws.map(w=>`<option value="${esc(w.id)}">${esc(labelWorkspace(w))}</option>`).join('');
  const memberOptions=allowedMembers.map(m=>`<option value="${esc(m.uid)}">${esc(m.displayName||m.email||'Account')} — ${esc(ROLE_LABEL[m.role]||m.role)}</option>`).join('');
  const id=source==='principal'?'Principal':'Admin';
  return `<div class="card" id="v15${id}TradeManagement"><h3>🏭 Trade & Batch Workspaces</h3><p class="muted">Each Trade + Session + Batch has its own trainees, attendance, theory, practical and reports. This prevents DTP records from mixing with another trade.</p>
    <div class="cards" style="grid-template-columns:1fr 1fr">
      <div><h4>Create Trade workspace</h4><div class="field"><label>Trade</label><input id="v15${id}Trade" placeholder="e.g. COPA / Electrician / DTP"></div><div class="field-row"><div class="field" style="flex:1"><label>Session</label><input id="v15${id}Session" value="${esc(DATA?.meta?.session||'2026-27')}"></div><div class="field" style="flex:1"><label>Batch</label><input id="v15${id}Batch" placeholder="A"></div></div><button class="btn primary" data-create-trade="${source}">Create Trade Workspace</button></div>
      <div><h4>Assign existing account to Trade</h4><div class="field"><label>Account</label><select id="v15${id}AssignUser"><option value="">Select account…</option>${memberOptions}</select></div><div class="field"><label>Trade workspace</label><select id="v15${id}AssignWorkspace"><option value="">Select trade…</option>${wsOptions}</select></div><div class="field-row" style="flex-wrap:wrap"><button class="btn primary" data-set-trade="only" data-source="${source}">Set only this Trade</button><button class="btn secondary" data-set-trade="add" data-source="${source}">Add another Trade</button><button class="btn ghost" data-remove-trade="${source}">Remove this Trade</button></div></div>
    </div>
    <div class="table-wrap" style="margin-top:12px"><table class="datatable"><thead><tr><th>Trade</th><th>Session</th><th>Batch</th><th>Assigned Instructor / Staff</th></tr></thead><tbody>${ws.map(w=>{const names=members.filter(m=>Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(w.id)&&['instructor','staff'].includes(m.role)&&m.active!==false).map(m=>(m.displayName||m.email)+' ('+(ROLE_LABEL[m.role]||m.role)+')');return `<tr><td><b>${esc(w.trade||'—')}</b></td><td>${esc(w.session||'—')}</td><td>${esc(w.batch||'—')}</td><td>${esc(names.join(', ')||'Not assigned')}</td></tr>`;}).join('')||'<tr><td colspan="4" class="muted">No Trade workspaces found.</td></tr>'}</tbody></table></div></div>`;
};

V.bindTradeManagement=function(host){
  if(!host)return;
  host.querySelectorAll('[data-create-trade]').forEach(b=>b.onclick=async()=>{try{await V.createTradeWorkspace(b.dataset.createTrade);alert('Trade workspace created. Now assign the Instructor to it.');}catch(e){alert(e.message||e);}});
  host.querySelectorAll('[data-set-trade]').forEach(b=>b.onclick=async()=>{try{await V.setAccountTrade(b.dataset.setTrade,b.dataset.source);alert('Trade assignment updated.');}catch(e){alert(e.message||e);}});
  host.querySelectorAll('[data-remove-trade]').forEach(b=>b.onclick=async()=>{try{await V.removeAccountTrade(b.dataset.removeTrade);alert('Trade assignment removed.');}catch(e){alert(e.message||e);}});
};

V.refreshTradeWorkspaceUI=async function(){
  if(role()==='admin'){
    const panel=document.getElementById('tab-admin-console');if(panel){document.getElementById('v15AdminTradeManagement')?.remove();const h=await this.tradeManagementHtml('admin');panel.insertAdjacentHTML('beforeend',h);this.bindTradeManagement(panel);await this.injectAdminWorkspaceSelect();}
  }
  if(role()==='principal'){
    await this.renderPrincipalInstituteDashboard();
    const panel=document.getElementById('tab-users');if(panel){document.getElementById('v15PrincipalTradeManagement')?.remove();const h=await this.tradeManagementHtml('principal');panel.insertAdjacentHTML('beforeend',h);this.bindTradeManagement(panel);await this.injectPrincipalWorkspaceSelect();}
  }
};

V.injectAdminWorkspaceSelect=async function(){
  if(role()!=='admin')return;
  const roleEl=document.getElementById('v15AdminRole');if(!roleEl)return;
  let field=document.getElementById('v15AdminWorkspaceField');
  if(!field){field=document.createElement('div');field.className='field';field.id='v15AdminWorkspaceField';field.innerHTML='<label>Trade workspace</label><select id="v15AdminWorkspace"></select><small class="muted">Principal receives institute-wide oversight. Instructor/Staff/Student is linked to the selected Trade workspace.</small>';roleEl.closest('.field')?.insertAdjacentElement('afterend',field);}
  const ws=await this.listTradeWorkspaces();const sel=document.getElementById('v15AdminWorkspace');if(sel)sel.innerHTML=ws.map(w=>`<option value="${esc(w.id)}">${esc(labelWorkspace(w))}</option>`).join('');
};

V.injectPrincipalWorkspaceSelect=async function(){
  if(role()!=='principal')return;
  const roleEl=document.getElementById('v15StaffRole');if(!roleEl)return;
  let field=document.getElementById('v15StaffWorkspaceField');
  if(!field){field=document.createElement('div');field.className='field';field.id='v15StaffWorkspaceField';field.innerHTML='<label>Trade workspace</label><select id="v15StaffWorkspace"></select><small class="muted">Choose the Trade/Batch this Instructor or Staff member belongs to.</small>';roleEl.closest('.field')?.insertAdjacentElement('afterend',field);}
  const ws=await this.listTradeWorkspaces();const sel=document.getElementById('v15StaffWorkspace');if(sel)sel.innerHTML=ws.map(w=>`<option value="${esc(w.id)}">${esc(labelWorkspace(w))}</option>`).join('');
};

// Keep invitation hierarchy from v15-access.js, but replace the default DTP-only workspace assignment.
const inviteBase=V.invite?.bind(V);
if(inviteBase){
  V.invite=async function(email,accountRole,traineeId=null,name=''){
    const code=await inviteBase(email,accountRole,traineeId,name);
    let ids=[];
    if(accountRole==='principal') ids=(await this.listTradeWorkspaces()).map(w=>w.id);
    else if(role()==='admin'){
      const x=document.getElementById('v15AdminWorkspace')?.value;ids=x?[x]:[this.workspaceId];
    }else if(role()==='principal'){
      const x=document.getElementById('v15StaffWorkspace')?.value;ids=x?[x]:[this.workspaceId];
    }else ids=[this.workspaceId];
    ids=[...new Set(ids.filter(Boolean))];
    if(!ids.length) ids=[this.workspaceId].filter(Boolean);
    try{await this.fb.M.setDoc(this.access(email),{workspaceIds:ids,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});}catch(e){}
    return code;
  };
}

async function docsFor(M,db,inst,wid,section){
  const z=await M.getDocs(M.collection(db,'institutes',inst,'workspaces',wid,section)),a=[];z.forEach(d=>a.push({id:d.id,...d.data()}));return a;
}

V.principalTradeSummaries=async function(){
  if(role()!=='principal')return [];
  const M=this.fb.M,[workspaces,members]=await Promise.all([this.listTradeWorkspaces(),this.workspaceMembers()]);
  const out=[];
  for(const w of workspaces){
    const [td,ad]=await Promise.all([docsFor(M,this.fb.db,this.INSTITUTE_ID,w.id,'trainees'),docsFor(M,this.fb.db,this.INSTITUTE_ID,w.id,'attendance')]);
    const trainees=td.map(x=>x.data).filter(Boolean);
    const stats=attendanceStats(trainees,ad);
    const threshold=Number(w.attendanceThreshold)||80;
    const low=stats.rows.filter(x=>Number.isFinite(x.attendance)&&x.attendance<threshold);
    const instructors=members.filter(m=>m.active!==false&&m.role==='instructor'&&Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(w.id)).map(m=>m.displayName||m.email);
    out.push({workspace:w,trainees,stats,low,instructors,threshold});
  }
  return out;
};

V.renderPrincipalInstituteDashboard=async function(){
  if(role()!=='principal')return;
  const panel=document.getElementById('tab-dashboard');if(!panel)return;
  panel.innerHTML='<div class="card"><h2>📊 Principal Dashboard</h2><p class="muted">Loading Trade-wise institute attendance…</p></div>';
  try{
    const sums=await this.principalTradeSummaries();
    const all=sums.flatMap(s=>s.stats.rows.map(r=>({...r,summary:s})));
    const valid=all.filter(x=>Number.isFinite(x.attendance));
    const overall=valid.length?valid.reduce((a,x)=>a+x.attendance,0)/valid.length:null;
    const low=all.filter(x=>Number.isFinite(x.attendance)&&x.attendance<x.summary.threshold);
    const totalTrainees=sums.reduce((a,s)=>a+s.trainees.length,0);
    const tradeRows=sums.map(s=>`<tr><td><b>${esc(s.workspace.trade||'—')}</b></td><td>${esc(s.workspace.session||'—')}</td><td>${esc(s.workspace.batch||'—')}</td><td>${esc(s.instructors.join(', ')||'Not assigned')}</td><td>${s.trainees.length}</td><td>${pct(s.stats.avg)}</td><td>${s.low.length}</td></tr>`).join('');
    const traineeRows=all.map(x=>`<tr data-wid="${esc(x.summary.workspace.id)}"><td>${esc(x.summary.workspace.trade||'—')}</td><td>${esc(x.summary.workspace.batch||'—')}</td><td>${esc(x.trainee.roll||'—')}</td><td><b>${esc(x.trainee.name||'—')}</b><br><small class="muted">${esc(x.trainee.prn||'')}</small></td><td>${pct(x.attendance)}</td><td>${Number.isFinite(x.attendance)&&x.attendance<x.summary.threshold?'<span class="badge pending">Attention</span>':'<span class="badge signed">OK</span>'}</td></tr>`).join('');
    panel.innerHTML=`<div class="hero" style="margin-bottom:16px"><div class="hero-content"><div><span class="showcase-kicker">INSTITUTE-WIDE OVERSIGHT</span><h2>Principal Dashboard</h2><p>Every Trade/Batch is separate. Principal sees Trade-wise and trainee-wise attendance without entering the Instructor's daily attendance screen.</p></div></div></div>
      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:16px"><div class="card"><div class="muted">TRADES / BATCHES</div><div style="font-size:30px;font-weight:800">${sums.length}</div></div><div class="card"><div class="muted">TOTAL TRAINEES</div><div style="font-size:30px;font-weight:800">${totalTrainees}</div></div><div class="card"><div class="muted">OVERALL ATTENDANCE</div><div style="font-size:30px;font-weight:800">${pct(overall)}</div></div><div class="card"><div class="muted">ATTENDANCE ATTENTION</div><div style="font-size:30px;font-weight:800">${low.length}</div></div></div>
      <div class="card"><h3>🏭 Trade-wise Attendance</h3><div class="table-wrap"><table class="datatable"><thead><tr><th>Trade</th><th>Session</th><th>Batch</th><th>Instructor</th><th>Trainees</th><th>Avg Attendance</th><th>Below Threshold</th></tr></thead><tbody>${tradeRows||'<tr><td colspan="7" class="muted">No Trade workspaces found.</td></tr>'}</tbody></table></div></div>
      <div class="card"><div class="field-row" style="justify-content:space-between;align-items:end"><div><h3>👥 Trainees by Trade</h3><p class="muted">Roll numbers can repeat across trades, so every trainee is shown with Trade + Batch.</p></div><div class="field" style="min-width:260px"><label>Filter Trade</label><select id="v15PrincipalTradeFilter"><option value="">All Trades</option>${sums.map(s=>`<option value="${esc(s.workspace.id)}">${esc(labelWorkspace(s.workspace))}</option>`).join('')}</select></div></div><div class="table-wrap"><table class="datatable"><thead><tr><th>Trade</th><th>Batch</th><th>Roll</th><th>Trainee / PRN</th><th>Attendance</th><th>Status</th></tr></thead><tbody id="v15PrincipalTraineeRows">${traineeRows||'<tr><td colspan="6" class="muted">No trainees found.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Principal Actions</h3><div class="field-row" style="flex-wrap:wrap"><button class="btn primary" data-go="users">👥 Staff & Trade Assignment</button><button class="btn secondary" data-go="reports">📄 Reports</button><button class="btn secondary" data-go="inspection">🛡️ Inspection & Compliance</button><button class="btn ghost" data-go="notices">📰 Notices</button></div></div>`;
    panel.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>App.switchTab(b.dataset.go));
    document.getElementById('v15PrincipalTradeFilter')?.addEventListener('change',e=>{const v=e.target.value;document.querySelectorAll('#v15PrincipalTraineeRows tr[data-wid]').forEach(tr=>tr.style.display=!v||tr.dataset.wid===v?'':'none');});
  }catch(e){
    panel.innerHTML=`<div class="card"><h2>📊 Principal Dashboard</h2><div class="callout cloud-error">${esc(e.message||e)}</div><p class="muted">If this says permission denied, publish the latest Firestore rules from the repository. Principal needs institute-wide read access to all Trade workspaces.</p></div>`;
  }
};

V.ensureWorkspaceSwitcher=async function(){
  if(!V.ready||!['instructor','staff'].includes(role()))return;
  const ids=Array.isArray(V.member?.workspaceIds)?V.member.workspaceIds:[];
  document.getElementById('v15WorkspaceSwitcher')?.remove();
  if(ids.length<2)return;
  const all=await V.listTradeWorkspaces(),mine=all.filter(w=>ids.includes(w.id));if(mine.length<2)return;
  const host=document.querySelector('.topbar .who');if(!host)return;
  const wrap=document.createElement('div');wrap.id='v15WorkspaceSwitcher';wrap.style.cssText='display:flex;align-items:center;gap:6px';
  wrap.innerHTML=`<small class="muted">Trade:</small><select style="max-width:260px">${mine.map(w=>`<option value="${esc(w.id)}" ${w.id===V.workspaceId?'selected':''}>${esc(labelWorkspace(w))}</option>`).join('')}</select>`;
  host.insertBefore(wrap,host.firstChild);
  wrap.querySelector('select').onchange=async e=>{const wid=e.target.value;if(!wid||wid===V.workspaceId)return;localStorage.setItem(WORKSPACE_PREF+'-'+V.fb.user.uid,wid);V.unsubscribers.forEach(f=>{try{f();}catch(_){}});V.unsubscribers=[];V.workspaceId=wid;await V.load(role());V.shadow=V.clone(DATA);V.realtime(role());V.refresh();const w=mine.find(x=>x.id===wid);const sub=document.getElementById('brandSub');if(sub&&w)sub.textContent=`${V.INSTITUTE_NAME} • ${labelWorkspace(w)}`;};
};

// Add workspace management below existing Admin/Principal account panels.
const adminRenderBase=V.renderAdminPanel?.bind(V);
if(adminRenderBase){V.renderAdminPanel=async function(...args){const r=await adminRenderBase(...args);if(role()==='admin'){await this.injectAdminWorkspaceSelect();const p=document.getElementById('tab-admin-console');if(p&&!document.getElementById('v15AdminTradeManagement')){p.insertAdjacentHTML('beforeend',await this.tradeManagementHtml('admin'));this.bindTradeManagement(p);}}return r;};}
const authorityStaffBase=V.renderAuthorityStaffPanel?.bind(V);
if(authorityStaffBase){V.renderAuthorityStaffPanel=async function(...args){const r=await authorityStaffBase(...args);if(role()==='principal'){await this.injectPrincipalWorkspaceSelect();const p=document.getElementById('tab-users');if(p&&!document.getElementById('v15PrincipalTradeManagement')){p.insertAdjacentHTML('beforeend',await this.tradeManagementHtml('principal'));this.bindTradeManagement(p);}}return r;};}
const staffRenderBase=V.renderStaffPanel?.bind(V);
if(staffRenderBase){V.renderStaffPanel=async function(...args){const r=await staffRenderBase(...args);if(role()==='principal'){await this.injectPrincipalWorkspaceSelect();const p=document.getElementById('tab-users');if(p&&!document.getElementById('v15PrincipalTradeManagement')){p.insertAdjacentHTML('beforeend',await this.tradeManagementHtml('principal'));this.bindTradeManagement(p);}}return r;};}

// Principal dashboard from role-matrix is single-workspace; replace it with institute-wide view.
const matrixBase=V.enforceRoleMatrix?.bind(V);
if(matrixBase){V.enforceRoleMatrix=async function(...args){const r=await matrixBase(...args);if(role()==='principal')await this.renderPrincipalInstituteDashboard();await this.ensureWorkspaceSwitcher();return r;};}

const applyBase=V.applySelectedRoleUI?.bind(V);
if(applyBase){V.applySelectedRoleUI=async function(...args){const r=await applyBase(...args);if(role()==='principal')await this.renderPrincipalInstituteDashboard();await this.ensureWorkspaceSwitcher();return r;};}

setTimeout(()=>{if(V.ready){if(role()==='principal')V.renderPrincipalInstituteDashboard().catch(console.error);V.ensureWorkspaceSwitcher().catch(console.error);}},0);
console.info('V15 multi-trade workspaces + Principal institute overview active.');
})(window.V15Sync);
