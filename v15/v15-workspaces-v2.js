/* V15 Production Workspaces
 * Trade + Session + Batch isolation, archive lifecycle, assignments and fast Principal summaries.
 */
(function(V){
'use strict';
if(!V)return;
const PREF='iti-v15-workspace-pref-';
function role(){return V.currentRole?.()||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function label(w){return [w?.trade||'Unnamed Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
function norm(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function canManage(){return (!!V.member?.owner&&role()==='admin')||role()==='principal';}
function statusVal(v){if(v&&typeof v==='object')return String(v.status??v.value??v.attendance??'').trim().toUpperCase();return String(v??'').trim().toUpperCase();}

V.listTradeWorkspaces=async function(opts={}){
  const M=this.fb.M,out=[],r=role();
  // Principal/Admin are institute-wide. Instructor/Staff/Student only see explicitly assigned workspaceIds,
  // even when the same Google account is the technical creator/owner.
  if(['admin','principal'].includes(r)){
    const z=await M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces'));z.forEach(d=>out.push({id:d.id,...d.data()}));
  }else{
    const ids=[...new Set((this.member?.workspaceIds||[]).filter(Boolean))];
    for(const id of ids){try{const s=await M.getDoc(M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',id));if(s.exists())out.push({id:s.id,...s.data()});}catch(e){}}
  }
  const filtered=opts.includeArchived?out:out.filter(x=>x.status!=='archived');
  filtered.sort((a,b)=>String(a.session||'').localeCompare(String(b.session||''))||String(a.trade||'').localeCompare(String(b.trade||''),undefined,{numeric:true,sensitivity:'base'})||String(a.batch||'').localeCompare(String(b.batch||'')));
  return filtered;
};

V.createTradeWorkspace=async function({trade,session,batch='A'}={}){
  if(!canManage())throw new Error('System Admin or Principal access required.');
  trade=String(trade||'').trim();session=String(session||'').trim();batch=String(batch||'A').trim()||'A';
  if(!trade)throw new Error('Enter Trade name.');if(!session)throw new Error('Enter Session, for example 2026-27.');
  const all=await this.listTradeWorkspaces({includeArchived:true});
  const dup=all.find(w=>norm(w.trade)===norm(trade)&&norm(w.session)===norm(session)&&norm(w.batch||'A')===norm(batch));
  if(dup)throw new Error(`This workspace already exists: ${label(dup)}${dup.status==='archived'?' (Archived)':''}.`);
  const base=DATA?.meta?.instituteCode||'mumbai-01',wid=this.esc(`${base}-${trade}-${session}-${batch}`).slice(0,120),M=this.fb.M;
  await M.setDoc(M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid),{institute:DATA?.meta?.institute||this.INSTITUTE_NAME,instituteCode:base,trade,session,batch,status:'active',schemaVersion:15,appVersion:'V15',workspaceId:wid,instituteId:this.INSTITUTE_ID,arraySections:[],mapSections:[],attendanceThreshold:Number(DATA?.meta?.attendanceThreshold)||80,createdAt:this.now(),createdBy:this.fb.user.uid,updatedAt:this.now()});
  await this.audit?.('workspace.create',{workspaceId:wid,trade,session,batch});return wid;
};

V.setWorkspaceStatus=async function(wid,status){
  if(!canManage())throw new Error('System Admin or Principal access required.');if(!['active','archived'].includes(status))throw new Error('Invalid workspace status.');
  await this.fb.M.setDoc(this.fb.M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid),{status,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.('workspace.'+status,{workspaceId:wid});
};

V.findMemberByEmail=async function(e){
  e=this.email(e);const z=await this.fb.M.getDocs(this.fb.M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members'));let hit=null;z.forEach(d=>{const x=d.data();if(!hit&&this.email(x.email)===e)hit={uid:d.id,...x};});return hit;
};

V.assignAccountWorkspaces=async function(uid,workspaceIds,{replace=true}={}){
  if(!canManage())throw new Error('System Admin or Principal access required.');const M=this.fb.M,s=await M.getDoc(this.memberRef(uid));if(!s.exists())throw new Error('Activated account not found.');
  const m=s.data();if(m.owner)throw new Error('Creator/System Admin workspace assignment is protected.');if(role()==='principal'&&!['instructor','staff'].includes(m.role))throw new Error('Principal can assign Trade workspaces only to Instructor or Staff.');
  const current=Array.isArray(m.workspaceIds)?m.workspaceIds:[],ids=replace?[...new Set(workspaceIds.filter(Boolean))]:[...new Set([...current,...workspaceIds.filter(Boolean)])];if(!ids.length)throw new Error('At least one Trade workspace is required.');
  await M.updateDoc(this.memberRef(uid),{workspaceIds:ids,updatedAt:this.now(),updatedBy:this.fb.user.uid});if(m.email)await M.setDoc(this.access(m.email),{workspaceIds:ids,updatedAt:this.now(),updatedBy:this.fb.user.uid},{merge:true});
  await this.audit?.('account.workspace.assign',{targetUid:uid,email:m.email,workspaceIds:ids});
};

V.switchWorkspace=async function(wid){
  if(!wid||wid===this.workspaceId)return;const elevated=['admin','principal'].includes(role()),ids=elevated?null:(this.member?.workspaceIds||[]);if(ids&&!ids.includes(wid))throw new Error('This account is not assigned to that Trade workspace.');
  this.unsubscribers?.forEach?.(f=>{try{f();}catch(e){}});this.unsubscribers=[];this.workspaceId=wid;localStorage.setItem(PREF+this.fb.user.uid,wid);
  // Clear old trade data before loading the new workspace.
  if(window.DATA&&typeof DATA==='object')for(const k of Object.keys(DATA)){if(['meta','gallery','users'].includes(k))continue;if(Array.isArray(DATA[k]))DATA[k]=[];else if(DATA[k]&&typeof DATA[k]==='object')DATA[k]={};}
  await this.load(role()==='admin'?'instructor':role());this.shadow=this.clone(DATA);this.realtime(role()==='admin'?'instructor':role());this.refresh?.();await this.applyRolePortal?.();
};

V.ensureWorkspaceSwitcher=async function(){
  document.getElementById('v15WorkspaceSwitcher')?.remove();if(!['instructor','staff'].includes(role()))return;
  const ws=await this.listTradeWorkspaces({includeArchived:false});if(ws.length<2)return;const host=document.querySelector('.topbar .who');if(!host)return;
  const d=document.createElement('div');d.id='v15WorkspaceSwitcher';d.style.cssText='display:flex;align-items:center;gap:6px';d.innerHTML=`<small class="muted">Trade:</small><select style="max-width:290px">${ws.map(w=>`<option value="${esc(w.id)}" ${w.id===this.workspaceId?'selected':''}>${esc(label(w))}</option>`).join('')}</select>`;host.insertBefore(d,host.firstChild);d.querySelector('select').onchange=e=>this.switchWorkspace(e.target.value).catch(x=>alert(x.message||x));
};

V.workspaceAttendanceSummary=function(){
  const trainees=DATA?.trainees||[],attendance=DATA?.attendance||{},rows=[];
  for(const t of trainees){let p=0,total=0;for(const day of Object.values(attendance)){const v=day?.[t.id];if(v==null)continue;const s=statusVal(v);if(!s)continue;total++;if(s==='P'||s==='PRESENT'||s.startsWith('PRESENT'))p++;}rows.push({id:t.id,roll:t.roll||'',name:t.name||'',prn:t.prn||t.PRN||'',present:p,total,attendance:total?Math.round(100*p/total):null});}
  const valid=rows.filter(x=>Number.isFinite(x.attendance)),avg=valid.length?Math.round(valid.reduce((a,x)=>a+x.attendance,0)/valid.length):null,threshold=Number(DATA?.meta?.attendanceThreshold)||80;
  return {rows,avg,below:rows.filter(x=>Number.isFinite(x.attendance)&&x.attendance<threshold).length,threshold};
};

V.rebuildWorkspaceSummary=async function(){
  if(!this.ready||!this.workspaceId||!['instructor','principal','admin'].includes(role()))return;
  const a=this.workspaceAttendanceSummary(),summary={workspaceId:this.workspaceId,trade:DATA?.meta?.trade||'',session:DATA?.meta?.session||'',batch:DATA?.meta?.batch||'',status:DATA?.meta?.status||'active',trainees:(DATA?.trainees||[]).length,attendanceAvg:a.avg,belowAttendance:a.below,attendanceThreshold:a.threshold,traineeAttendance:a.rows,practicals:(DATA?.practicals||[]).length,theory:(DATA?.theory||[]).length,tests:(DATA?.exams||[]).length,projects:(DATA?.projects||[]).length,holidays:(DATA?.holidays||[]).length,updatedAt:this.now(),updatedBy:this.fb.user.uid};
  await this.fb.M.setDoc(this.state('principalSummary'),summary,{merge:false});return summary;
};

V.principalSummaries=async function({session='',includeArchived=false}={}){
  const ws=await this.listTradeWorkspaces({includeArchived:true}),out=[];
  for(const w of ws){if(!includeArchived&&w.status==='archived')continue;if(session&&String(w.session)!==String(session))continue;let s=null;try{const z=await this.fb.M.getDoc(this.state('principalSummary',w.id));if(z.exists())s=z.data();}catch(e){}out.push({workspace:w,summary:s||{workspaceId:w.id,trade:w.trade,session:w.session,batch:w.batch,status:w.status||'active',trainees:null,attendanceAvg:null,belowAttendance:null,updatedAt:null}});}
  return out;
};

// Keep summaries fresh after a successful sync or when entering an Instructor workspace.
const diffBase=V.diff?.bind(V);if(diffBase)V.diff=async function(...args){const r=await diffBase(...args);if(this.ready&&navigator.onLine&&['instructor','principal'].includes(role()))try{await this.rebuildWorkspaceSummary();}catch(e){}return r;};

console.info('V15 consolidated multi-trade workspace engine active.');
})(window.V15Sync);
