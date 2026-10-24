/* Atomic leave review and validated Student requests; no API key required. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.ITILeaveWorkflow=api;if(root.V15Sync&&typeof Leave!=='undefined')api.install(root.V15Sync,Leave);}})(globalThis,function(){
'use strict';
function dates(from,to){
 const parse=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Choose valid leave dates.');const n=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==s)throw Error('Choose valid leave dates.');return n;};
 const start=parse(from),end=parse(to),count=(end-start)/86400000+1;if(count<1||count>90)throw Error('Leave must cover 1–90 days, with To on or after From.');return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
}
function certificate(value){const s=String(value??'').trim();if(!s)return '';try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=2048)return u.href;}catch{}throw Error('Use an absolute HTTPS certificate link without login credentials, or leave it blank.');}
async function review({M,db,workspace,uid,role,leaveId,status,esc=x=>x,now=()=>new Date().toISOString(),current=()=>true}){
 if(role!=='instructor')throw Error('Only the assigned Instructor can review leave.');if(!['approved','rejected'].includes(status)||typeof leaveId!=='string'||!leaveId||leaveId.includes('/'))throw Error('Invalid leave review.');
 const ref=M.doc(workspace,'leaves',leaveId);
 return M.runTransaction(db,async tx=>{
  if(!current())throw Error('The account or workspace changed. Reopen Leave.');const z=await tx.get(ref);if(!z.exists())throw Error('Leave request is no longer available.');const leave=z.data().data;
  if(leave?.status===status)return {leave,dates:[],unchanged:true};if(leave?.status!=='pending')throw Error('This leave has already been reviewed.');
  if(typeof leave.traineeId!=='string'||!leave.traineeId||leave.traineeId.length>180)throw Error('Leave has no valid trainee identity.');
  const span=dates(leave.fromDate,leave.toDate),trainee=await tx.get(M.doc(workspace,'trainees',esc(leave.traineeId)));if(!trainee.exists()||trainee.data()?.data?.id!==leave.traineeId)throw Error('The linked trainee is no longer available.');
  if(status==='approved')for(const month of new Set(span.map(d=>d.slice(0,7)))){const lock=await tx.get(M.doc(workspace,'attendanceLocks',month));if(lock.exists()&&lock.data().status!=='reopened')throw Error('Attendance '+month+' is locked. Ask the Principal to reopen it before approving leave.');}
  if(!current())throw Error('The account or workspace changed. Reopen Leave.');const stamp=now(),reviewed={...leave,status,reviewedAt:stamp,reviewedBy:uid};
  if(status==='approved')for(const day of span)tx.set(M.doc(workspace,'attendance',esc(day+'--'+leave.traineeId)),{key:day,subKey:leave.traineeId,traineeId:leave.traineeId,data:'L',updatedAt:stamp,updatedBy:uid});
  tx.set(ref,{data:reviewed,updatedAt:stamp,updatedBy:uid});tx.set(workspace,{arraySections:M.arrayUnion('leaves'),mapSections:M.arrayUnion('attendance')},{merge:true});return {leave:reviewed,dates:status==='approved'?span:[],unchanged:false};
 });
}
function install(V,L){
 let busy=false;
 for(const [id,label] of [['leaveType','Leave type'],['leaveFrom','From date'],['leaveTo','To date'],['leaveReason','Reason'],['leaveCert','Certificate link']])document.getElementById(id)?.setAttribute('aria-label',label);
 const context=()=>({workspace:V.workspaceId,uid:V.fb.user?.uid,data:DATA,role:SESSION?.role});
 const same=c=>V.ready&&V.workspaceId===c.workspace&&V.fb.user?.uid===c.uid&&DATA===c.data&&SESSION?.role===c.role;
 const note=message=>{const host=document.getElementById('tab-leave');if(!host)return;let p=host.querySelector('#v15LeaveStatus');if(!p){p=document.createElement('p');p.id='v15LeaveStatus';p.setAttribute('role','status');p.className='callout';host.prepend(p);}p.textContent=message;};
 note('Each request can cover up to 90 calendar days. For longer leave, submit separate requests. Reviews require an online connection.');
 L.apply=async function(){
  try{
   if(!V.ready||SESSION?.role!=='student'||V.member?.role!=='student'||!V.member.traineeId)throw Error('Sign in as an activated Student to apply for leave.');
   const type=document.getElementById('leaveType').value,fromDate=document.getElementById('leaveFrom').value,toDate=document.getElementById('leaveTo').value,reason=document.getElementById('leaveReason').value.trim(),certNote=certificate(document.getElementById('leaveCert').value);dates(fromDate,toDate);
   if(!['Casual','Medical','Other'].includes(type)||!reason||reason.length>2000)throw Error('Choose a leave type and enter a reason of 1–2000 characters.');
   const c=context(),id=crypto.randomUUID(),leave={id,traineeId:V.member.traineeId,type,fromDate,toDate,reason,certNote,status:'pending',appliedDate:new Date().toISOString().slice(0,10)};
   DATA.leaves.unshift(leave);saveData();await V.diff();if(!same(c))return;document.getElementById('leaveReason').value='';document.getElementById('leaveCert').value='';L.render();note(navigator.onLine?'Leave request saved; pending Instructor review. Check sync status.':'Leave request saved on this device; reconnect to sync it for review.');
  }catch(e){note(e.message||'Leave could not be saved.');}
 };
 async function handle(id,status){
  const c=context();if(busy){note('A leave review is already in progress.');return;}busy=true;
  try{
   if(!V.ready||c.role!=='instructor'||V.member?.role!=='instructor')throw Error('Only the assigned Instructor can review leave.');if(!navigator.onLine)throw Error('Reconnect before reviewing leave; no attendance or approval has been changed.');
   note('Checking leave and attendance locks…');await V.diff();await V.flushQueue();if(!same(c))return;
   if(V.queueRead().some(o=>o.workspaceId===c.workspace&&['leaves','attendance'].includes(o.section)))throw Error('Sync pending leave/attendance changes before reviewing this request.');
   const result=await review({M:V.fb.M,db:V.fb.db,workspace:V.ws(),uid:c.uid,role:c.role,leaveId:V.esc(id),status,esc:x=>V.esc(x),current:()=>same(c)});
   if(!same(c))return;const i=DATA.leaves.findIndex(x=>x.id===result.leave.id);if(i>=0)DATA.leaves[i]=result.leave;for(const day of result.dates){DATA.attendance[day]=DATA.attendance[day]||{};DATA.attendance[day][result.leave.traineeId]='L';}L.render();Trainees.render();Dashboard.render();note(result.unchanged?'This request was already '+status+'.':status==='approved'?'Leave approved and all requested attendance dates saved together.':'Leave rejected; attendance unchanged.');
  }catch(e){if(same(c))note(e.message||'Review failed; no approval or attendance was saved.');}finally{busy=false;}
 }
 L.approve=id=>handle(id,'approved');L.reject=id=>handle(id,'rejected');
}
return {dates,certificate,review,install};
});
