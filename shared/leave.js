/* Shared leave validation and atomic transaction policy; authority is supplied by the server. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ITILeavePolicy=factory();})(globalThis,function(){
'use strict';
class LeaveError extends Error{constructor(message,status=409){super(message);this.status=status;}}
function validateRecord(record,docId,esc=x=>x){
 const d=record?.data,keys=['id','traineeId','type','fromDate','toDate','reason','certNote','status','appliedDate','reviewedAt','reviewedBy'];
 const string=(x,min,max)=>typeof x==='string'&&x.length>=min&&x.length<=max;
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!['data','updatedAt','updatedBy'].includes(k))||!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!keys.includes(k))||!string(d.id,1,180)||esc(d.id)!==docId||!string(d.traineeId,1,180)||!['Casual','Medical','Other'].includes(d.type)||!['pending','approved','rejected'].includes(d.status)||!string(d.reason,1,2000)||!string(d.certNote,0,2048)||!string(record.updatedAt,1,40)||!string(record.updatedBy,1,128))throw new LeaveError('Stored leave request has an invalid schema. Ask the administrator to review it.');
 dates(d.fromDate,d.toDate);dates(d.appliedDate,d.appliedDate);certificate(d.certNote);
 if(d.status==='pending'?('reviewedAt'in d||'reviewedBy'in d):(!string(d.reviewedAt,1,40)||!string(d.reviewedBy,1,128)))throw new LeaveError('Stored leave review metadata is invalid. Ask the administrator to review it.');
 return d;
}
function dates(from,to){
 const parse=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number(s.slice(0,4))<1)throw new LeaveError('Choose valid leave dates.');const n=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==s)throw new LeaveError('Choose valid leave dates.');return n;};
 const start=parse(from),end=parse(to),count=(end-start)/86400000+1;if(count<1||count>90)throw new LeaveError('Leave must cover 1–90 days, with To on or after From.');return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
}
function certificate(value){const s=String(value??'').trim();if(!s)return '';try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=2048)return u.href;}catch{}throw new LeaveError('Use an absolute HTTPS certificate link without login credentials, or leave it blank.');}
async function review({M,db,workspace,uid,role,leaveId,status,esc=x=>x,now=()=>new Date().toISOString(),current=()=>true,authorize=async()=>{}}){
 if(role!=='instructor')throw new LeaveError('Only the assigned Instructor can review leave.');if(!['approved','rejected'].includes(status)||typeof leaveId!=='string'||!leaveId||leaveId.includes('/'))throw new LeaveError('Invalid leave review.');
 const ref=M.doc(workspace,'leaves',leaveId);
 return M.runTransaction(db,async tx=>{
  if(!current())throw new LeaveError('The account or workspace changed. Reopen Leave.');await authorize(tx);const z=await tx.get(ref);if(!z.exists())throw new LeaveError('Leave request is no longer available.');const record=z.data();validateRecord(record,leaveId,esc);const leave=record.data;
  if(leave?.status===status)return {leave,dates:[],unchanged:true};if(leave?.status!=='pending')throw new LeaveError('This leave has already been reviewed.');
  if(typeof leave.traineeId!=='string'||!leave.traineeId||leave.traineeId.length>180)throw new LeaveError('Leave has no valid trainee identity.');
  const span=dates(leave.fromDate,leave.toDate),trainee=await tx.get(M.doc(workspace,'trainees',esc(leave.traineeId)));if(!trainee.exists()||trainee.data()?.data?.id!==leave.traineeId)throw new LeaveError('The linked trainee is no longer available.');
  if(status==='approved')for(const month of new Set(span.map(d=>d.slice(0,7)))){const lock=await tx.get(M.doc(workspace,'attendanceLocks',month));if(lock.exists()&&lock.data().status!=='reopened')throw new LeaveError('Attendance '+month+' is locked. Ask the Principal to reopen it before approving leave.');}
  if(!current())throw new LeaveError('The account or workspace changed. Reopen Leave.');const stamp=now(),reviewed={...leave,status,reviewedAt:stamp,reviewedBy:uid};
  if(status==='approved')for(const day of span)tx.set(M.doc(workspace,'attendance',esc(day+'--'+leave.traineeId)),{key:day,subKey:leave.traineeId,traineeId:leave.traineeId,data:'L',updatedAt:stamp,updatedBy:uid});
  tx.set(ref,{data:reviewed,updatedAt:stamp,updatedBy:uid});tx.set(workspace,{arraySections:M.arrayUnion('leaves'),mapSections:M.arrayUnion('attendance')},{merge:true});return {leave:reviewed,dates:status==='approved'?span:[],unchanged:false};
 });
}
return {dates,certificate,validateRecord,review,LeaveError};
});
