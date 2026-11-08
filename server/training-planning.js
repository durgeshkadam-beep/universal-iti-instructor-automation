'use strict';
const {createHash}=require('node:crypto'),P=require('../shared/syllabus-planning');
class PlanningError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(ok,status,message)=>{if(!ok)throw new PlanningError(status,message);};
const hash=x=>createHash('sha256').update(P.canonical(x)).digest('hex');
const esc=x=>String(x??'').trim().toLowerCase().replace(/[^a-z0-9._@-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,180)||'record';
const topicId=x=>x.id!=null?esc(x.id):'n-'+esc(x.no);
const fingerprint=(meta,p,t,h)=>hash(P.sourceState(meta,p,t,h));
function sanitize(body){
 try{fail(typeof body.expectedSourceHash==='string'&&/^[a-f0-9]{64}$/.test(body.expectedSourceHash),400,'Generate and review a current workspace preview first.');const items=P.validateItems(body.items),settings=P.settings(body.settings);return {items,settings,source:String(body.source||'Reviewed syllabus').slice(0,160)};}catch(e){if(e instanceof PlanningError)throw e;throw new PlanningError(400,e.message);}
}
async function saveTrainingPlan({db,ws,uid,body,now=()=>Date.now()}){
 const input=sanitize(body),inputHash=hash(input),institute=ws.parent.parent;
 return db.runTransaction(async tx=>{
  const [member,workspace]=await Promise.all([tx.get(institute.collection('members').doc(uid)),tx.get(ws)]);
  const m=member.exists?member.data():null;fail(m?.active===true&&m.role==='instructor'&&Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(ws.id),403,'Only the active assigned Instructor can save this year plan.');fail(workspace.exists,404,'Workspace missing.');
  const snapshots={};for(const section of ['practicals','theory','holidays'])snapshots[section]=await tx.get(ws.collection(section));
  const data=Object.fromEntries(Object.entries(snapshots).map(([section,snap])=>[section,snap.docs.map(d=>d.data().data)]));
  fail(Object.values(data).every(rows=>rows.every(x=>x&&typeof x==='object')),409,'A saved syllabus record is malformed. Review the workspace before importing.');
  const meta=workspace.data();fail(meta.status!=='archived',409,'This workspace is archived. Reopen it before revising year planning.');const beforeHash=fingerprint(meta,data.practicals,data.theory,data.holidays),currentRevision=Number(meta.trainingPlanRevision||0);
  fail(Number.isSafeInteger(currentRevision)&&currentRevision>=0&&currentRevision<100000,409,'The saved year-plan revision needs operator review.');
  if(meta.trainingPlan?.inputHash===inputHash&&currentRevision>0){
   const previous=await tx.get(ws.collection('planningRevisions').doc('r'+String(currentRevision).padStart(6,'0')));
   if(previous.exists&&previous.data().afterHash===beforeHash&&(previous.data().beforeHash===body.expectedSourceHash||beforeHash===body.expectedSourceHash))return {revision:currentRevision,planId:meta.trainingPlan.planId,alreadySaved:true};
  }
  fail(beforeHash===body.expectedSourceHash,409,'The workspace syllabus, holidays or year plan changed after preview. Reload it and review a fresh preview.');
  let result;try{result=P.candidate(input.items,input.settings,data);}catch(e){throw new PlanningError(400,e.message);}
  const revision=currentRevision+1,revisionRef=ws.collection('planningRevisions').doc('r'+String(revision).padStart(6,'0'));
  fail(!(await tx.get(revisionRef)).exists,409,'This year-plan revision already exists. Reload before retrying.');
  const stamp=new Date(now()).toISOString(),planId=meta.trainingPlan?.planId||'YP-'+input.settings.startDate.slice(0,4);
  const plan={planId,revision,inputHash,createdAt:stamp,source:input.source,startDate:input.settings.startDate,endDate:input.settings.endDate,hoursPerDay:input.settings.practicalHours+input.settings.theoryHours,practicalHoursPerDay:input.settings.practicalHours,theoryHoursPerDay:input.settings.theoryHours,settings:input.settings,calendarRows:result.rows.length,dayPlan:result.rows,summary:result.summary};
  const nextMeta={...meta,trainingPlan:plan,trainingPlanRevision:revision,scheduleMode:'training-plan',scheduleStartDate:plan.startDate,scheduleEndDate:plan.endDate,tradeSource:input.source,syllabusImportedAt:stamp.slice(0,10)};
  const afterHash=fingerprint(nextMeta,result.practicals,result.theory,result.holidays);
  const compact=rows=>rows.map(x=>Object.fromEntries(['no','sourceNo','title','hours','unit','sequence','plannedDate','plannedEndDate'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]])));
  const history={schemaVersion:1,revision,createdAt:stamp,createdBy:uid,inputHash,beforeHash,afterHash,plan,topics:{practicals:compact(result.practicals),theory:compact(result.theory)},previousTopics:{practicals:compact(data.practicals),theory:compact(data.theory)}};
  // Preserve a legacy calendar as the predecessor of the first managed revision.
  if(!currentRevision&&meta.trainingPlan)history.previousPlan=meta.trainingPlan;
  fail(Buffer.byteLength(JSON.stringify(nextMeta))<900000&&Buffer.byteLength(JSON.stringify(history))<900000,413,'This plan is too large to save safely. Shorten the planning period or topic descriptions.');
  const writes=[];
  for(const section of ['practicals','theory','holidays']){
   const old=snapshots[section].docs,byNumber=new Map(),used=new Set();
   if(section!=='holidays')for(const d of old){const number=String(d.data().data.no).toLowerCase();fail(!byNumber.has(number),409,'Existing duplicate topic numbers need review before import.');byNumber.set(number,d);}
   for(const row of result[section]){
    const previous=section==='holidays'?old.find(d=>P.canonical(d.data().data)===P.canonical(row)):byNumber.get(String(row.no).toLowerCase());
    const docId=previous?.id||(section==='holidays'?row.id!=null?esc(row.id):'date-'+esc(row.date+'-'+row.label):topicId(row));
    fail(!used.has(docId),409,'Two syllabus records resolve to the same document. Review their identifiers.');used.add(docId);
    if(previous&&P.canonical(previous.data().data)===P.canonical(row))continue;
    if(!previous)fail(!old.some(d=>d.id===docId),409,'A new syllabus number conflicts with an existing document.');
    writes.push({ref:ws.collection(section).doc(docId),value:{...(previous?.data()||{}),data:row,updatedAt:stamp,updatedBy:uid}});
   }
  }
  fail(writes.length+2<=450,413,'Too many changed records for one atomic save. Reduce the imported syllabus or planning period.');
  // All transaction reads and all validation precede writes. No record is deleted.
  for(const w of writes)tx.set(w.ref,w.value);
  tx.create(revisionRef,history);
  tx.set(ws,{trainingPlan:plan,trainingPlanRevision:revision,scheduleMode:'training-plan',scheduleStartDate:plan.startDate,scheduleEndDate:plan.endDate,tradeSource:input.source,syllabusImportedAt:stamp.slice(0,10),arraySections:[...new Set([...(meta.arraySections||[]),'practicals','theory','holidays'])],updatedAt:stamp},{merge:true});
  return {revision,planId,alreadySaved:false,addedTopics:result.added,retainedTopics:result.retained,summary:result.summary};
 });
}
module.exports={saveTrainingPlan,fingerprint,hash,PlanningError};
