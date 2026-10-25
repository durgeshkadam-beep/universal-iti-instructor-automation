/* Atomic leave review and validated Student requests; no API key required. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.ITILeaveWorkflow=api;if(root.V15Sync&&typeof Leave!=='undefined')api.install(root.V15Sync,Leave);}})(globalThis,function(){
'use strict';
const policy=typeof module==='object'&&module.exports?require('../shared/leave'):globalThis.ITILeavePolicy;
const {dates,certificate,review}=policy;
function install(V,L){
 let busy=false;
 for(const [id,label] of [['leaveType','Leave type'],['leaveFrom','From date'],['leaveTo','To date'],['leaveReason','Reason'],['leaveCert','Certificate link']])document.getElementById(id)?.setAttribute('aria-label',label);
 const context=()=>({workspace:V.workspaceId,uid:V.fb.user?.uid,data:DATA,role:SESSION?.role});
 const same=c=>V.ready&&V.workspaceId===c.workspace&&V.fb.user?.uid===c.uid&&DATA===c.data&&SESSION?.role===c.role;
 const note=message=>{const host=document.getElementById('tab-leave');if(!host)return;let p=host.querySelector('#v15LeaveStatus');if(!p){p=document.createElement('p');p.id='v15LeaveStatus';p.setAttribute('role','status');p.className='callout';host.prepend(p);}p.textContent=message;};
 note('Each request can cover up to 90 calendar days. For longer leave, submit separate requests. Reviews require an online connection to the secure backend.');
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
   if(typeof V.backendRequest!=='function')throw Error('Secure leave review backend is not configured. Ask the administrator.');
   const result=await V.backendRequest({action:'reviewLeave',leaveId:V.esc(id),status});
   if(!same(c))return;const i=DATA.leaves.findIndex(x=>x.id===result.leave.id);if(i>=0)DATA.leaves[i]=result.leave;for(const day of result.dates){DATA.attendance[day]=DATA.attendance[day]||{};DATA.attendance[day][result.leave.traineeId]='L';}L.render();Trainees.render();Dashboard.render();note(result.unchanged?'This request was already '+status+'.':status==='approved'?'Leave approved and all requested attendance dates saved together.':'Leave rejected; attendance unchanged.');
  }catch(e){if(same(c))note(e.message||'Review failed; no approval or attendance was saved.');}finally{busy=false;}
 }
 L.approve=id=>handle(id,'approved');L.reject=id=>handle(id,'rejected');
}
return {dates,certificate,review,install};
});
