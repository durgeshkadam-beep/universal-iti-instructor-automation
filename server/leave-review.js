'use strict';
const {FieldValue}=require('firebase-admin/firestore');
const {review,LeaveError}=require('../shared/leave');
const {allowed:adminAllowed}=require('../shared/admin-authority');
const escapeId=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9._@-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,180)||'record';
async function reviewLeave({db,ws,uid,identity,leaveId,status,now}){
 const M={doc:(ref,section,key)=>ref.collection(section).doc(key),arrayUnion:(...values)=>FieldValue.arrayUnion(...values),runTransaction:(_db,fn)=>db.runTransaction(tx=>fn({get:async ref=>{const z=await tx.get(ref);return {exists:()=>z.exists,data:()=>z.data()};},set:(...args)=>tx.set(...args)}))};
 const root=ws.parent.parent;
 return review({M,db,workspace:ws,uid,role:'instructor',leaveId,status,esc:escapeId,now:()=>new Date(now()).toISOString(),authorize:async tx=>{
  const [inst,member]=await Promise.all([tx.get(root),tx.get(root.collection('members').doc(uid))]);const d=member.exists()?member.data():null;
  let allowed=inst.exists()&&inst.data().ownerUid===uid;
  if(!allowed&&d?.owner===true){const grant=await tx.get(root.collection('systemAdmins').doc(uid));allowed=adminAllowed(grant.exists()?grant.data():null,d,identity);}
  if(!inst.exists()||d?.active!==true||d.role!=='instructor'||!(allowed||Array.isArray(d.workspaceIds)&&d.workspaceIds.includes(ws.id)))throw new LeaveError('Only the active assigned Instructor can review leave.',403);
 }});
}
module.exports={reviewLeave};
