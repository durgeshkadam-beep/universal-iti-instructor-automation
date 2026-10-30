'use strict';
const {createHash}=require('node:crypto'),P=require('../shared/teaching-plan');
class TeachingPlanError extends Error{constructor(status,message){super(message);this.status=status;}}
const check=(ok,status,message)=>{if(!ok)throw new TeachingPlanError(status,message);};
const hash=x=>createHash('sha256').update(P.canonical(x)).digest('hex');
async function saveTeachingPlan({db,ws,uid,body,now=()=>Date.now()}){
 check(['practicals','theory'].includes(body.section)&&typeof body.topicId==='string'&&/^[a-z0-9._@-]{1,200}$/.test(body.topicId)&&!['.','..'].includes(body.topicId),400,'Invalid teaching topic.');
 check(typeof body.expectedHash==='string'&&/^[a-f0-9]{64}$/.test(body.expectedHash),400,'Open the current plan before saving.');
 check(['instructor-edited','ai-draft','approved'].includes(body.status)&&['patch','replace'].includes(body.mode),400,'Invalid plan save mode.');
 let input;try{input=P.validatePlan(body.section,body.plan,body.mode==='patch');}catch(e){throw new TeachingPlanError(400,e.message);}
 const inputHash=hash({plan:input,mode:body.mode,status:body.status}),ref=ws.collection(body.section).doc(body.topicId),institute=ws.parent.parent;
 return db.runTransaction(async tx=>{
  const [member,workspace,snapshot]=await Promise.all([tx.get(institute.collection('members').doc(uid)),tx.get(ws),tx.get(ref)]);
  const m=member.exists?member.data():null;check(m?.active===true&&m.role==='instructor'&&Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(ws.id),403,'Only the active assigned Instructor can save teaching plans.');
  check(workspace.exists&&workspace.data().status!=='archived',409,'Workspace missing or archived.');check(snapshot.exists,404,'Teaching topic missing.');
  const record=snapshot.data().data;check(record&&typeof record==='object'&&!Array.isArray(record)&&record.no!=null&&typeof record.title==='string'&&record.title.length>0&&record.title.length<=5000,409,'Saved topic needs operator review.');
  check(typeof record.no==='string'&&record.no.length>0&&record.no.length<=180||typeof record.no==='number'&&Number.isFinite(record.no)&&record.no>=0&&record.no<=1000000000,409,'Saved topic number needs operator review.');
  const revision=record.teachingPlanRevision??0;check(Number.isSafeInteger(revision)&&revision>=0&&revision<99999,409,'Saved plan revision needs operator review.');
  const beforeHash=hash(record);
  if(revision){const latest=await tx.get(ref.collection('teachingPlanRevisions').doc('r'+String(revision).padStart(6,'0')));if(latest.exists){const d=latest.data();if(d.createdBy===uid&&d.inputHash===inputHash&&d.afterHash===beforeHash&&(d.beforeHash===body.expectedHash||beforeHash===body.expectedHash))return {revision,alreadySaved:true};}}
  check(beforeHash===body.expectedHash,409,'This topic or plan changed after you opened it. Your draft is retained; reopen the latest plan before applying it.');
  check(body.mode!=='patch'||record.plan==null||typeof record.plan==='object'&&!Array.isArray(record.plan),409,'Legacy plan structure needs review before editing.');
  const version=record.planMeta?.version==null?0:Number(record.planMeta.version);check(Number.isSafeInteger(version)&&version>=0&&version<999999999,409,'Legacy plan version needs operator review.');
  const stamp=new Date(now()).toISOString(),nextRevision=revision+1,plan=body.mode==='patch'?{...(record.plan||{}),...input}:input;
  const next={...record,plan,teachingPlanRevision:nextRevision,planMeta:{status:body.status,version:version+1,savedAt:stamp,savedBy:uid,context:P.topicContext(record),source:body.mode==='patch'?'instructor-editor':'reviewed-json',approvedAt:body.status==='approved'?stamp:null,approvedBy:body.status==='approved'?String(m.displayName||uid).slice(0,120):null}};
  delete next.planReviewRequired;
  const history={schemaVersion:1,revision:nextRevision,createdBy:uid,createdAt:stamp,inputHash,beforeHash,afterHash:hash(next),topic:P.clean({no:record.no,sourceNo:record.sourceNo,title:record.title,unit:record.unit,hours:record.hours,plannedDate:record.plannedDate,section:body.section,topicId:body.topicId}),previous:P.protectedState(record),plan,planMeta:next.planMeta};
  const historyRef=ref.collection('teachingPlanRevisions').doc('r'+String(nextRevision).padStart(6,'0'));check(!(await tx.get(historyRef)).exists,409,'This plan revision already exists; reload it.');
  check(Buffer.byteLength(JSON.stringify(history))<900000&&Buffer.byteLength(JSON.stringify(next))<900000,413,'Saved plan is too large to archive safely.');
  tx.create(historyRef,history);tx.set(ref,{...snapshot.data(),data:next,updatedAt:stamp,updatedBy:uid});
  return {revision:nextRevision,alreadySaved:false};
 });
}
module.exports={saveTeachingPlan,TeachingPlanError,hash};
