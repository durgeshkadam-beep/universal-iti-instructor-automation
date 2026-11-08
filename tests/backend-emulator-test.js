'use strict';
const assert=require('node:assert/strict');
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {createService}=require('../server/service');
(async()=>{
 assert(process.env.FIRESTORE_EMULATOR_HOST,'Emulator required');
 const db=getFirestore(initializeApp({projectId:'demo-universal-iti'},'backend-test'));
 const base='institutes/backend-test';await db.doc(base).set({ownerUid:'owner'});await db.doc(base+'/workspaces/w1').set({trade:'Synthetic'});
 for(const [uid,role] of [['teacher','instructor'],['student','student'],['other','student'],['staff','staff']])await db.doc(base+'/members/'+uid).set({role,active:true,workspaceIds:['w1'],traineeId:uid});
 let t=1800000000000;const service=createService({db,verifyToken:async uid=>({uid}),now:()=>t});
 const request=(uid,b)=>service.execute(uid,{instituteId:'backend-test',workspaceId:'w1',...b});
 // Trusted leave review checks the server record, current membership and every month lock.
 const ws=base+'/workspaces/w1',leave=(id,changes={})=>({data:{id,traineeId:'student',type:'Medical',fromDate:'2033-01-31',toDate:'2033-02-01',reason:'Synthetic server-authority review',certNote:'',status:'pending',appliedDate:'2033-01-01',...changes},updatedAt:'2033-01-01T00:00:00Z',updatedBy:'student'});
 await db.doc(ws+'/trainees/student').set({data:{id:'student',name:'Synthetic student'}});
 await db.doc(ws+'/leaves/server').set(leave('server'));
 await db.doc(ws+'/attendanceLocks/2033-02').set({status:'submitted'});
 const review=(id,status='approved',extra={})=>request('teacher',{action:'reviewLeave',leaveId:id,status,...extra});
 for(const uid of ['student','staff','other'])await assert.rejects(request(uid,{action:'reviewLeave',leaveId:'server',status:'approved',role:'instructor'}),e=>e.status===403);
 await assert.rejects(review('server'),/locked/);assert.equal((await db.doc(ws+'/leaves/server').get()).data().data.status,'pending');assert.equal((await db.doc(ws+'/attendance/2033-01-31--student').get()).exists,false);
 await db.doc(ws+'/attendanceLocks/2033-02').set({status:'reopened'});
 const reviews=await Promise.all([review('server','approved',{reviewedBy:'forged',reviewedAt:'forged',traineeId:'other'}),review('server')]);assert(reviews.some(r=>r.unchanged));
 const saved=(await db.doc(ws+'/leaves/server').get()).data().data;assert.equal(saved.reviewedBy,'teacher');assert.equal(saved.reviewedAt,new Date(t).toISOString());assert.equal(saved.traineeId,'student');
 for(const day of ['2033-01-31','2033-02-01'])assert.equal((await db.doc(ws+'/attendance/'+day+'--student').get()).data().data,'L');
 await assert.rejects(review('server','rejected'),/already/);
 for(const [leaveId,status] of [['../other','approved'],['','approved'],['server','pending'],['server',null]])await assert.rejects(request('teacher',{action:'reviewLeave',leaveId,status}),e=>e.status===400);
 await db.doc(ws+'/leaves/bad-date').set(leave('bad-date',{fromDate:'2033-02-30',toDate:'2033-03-01'}));await assert.rejects(review('bad-date'),/valid leave dates/);
 await db.doc(ws+'/leaves/too-long').set(leave('too-long',{fromDate:'2033-01-01',toDate:'2033-04-01'}));await assert.rejects(review('too-long'),/90 days/);
 await db.doc(ws+'/leaves/bad-schema').set(leave('bad-schema',{extra:'forged'}));await assert.rejects(review('bad-schema'),/schema/);
 await db.doc(ws+'/leaves/removed-trainee').set(leave('removed-trainee',{traineeId:'missing'}));await assert.rejects(review('removed-trainee'),/linked trainee/);
 await db.doc(ws+'/leaves/revoke').set(leave('revoke'));
 const delayed=require('../server/service').createService({db:{doc:p=>db.doc(p),runTransaction:async fn=>{await db.doc(base+'/members/teacher').update({active:false});return db.runTransaction(fn);}},verifyToken:async uid=>({uid}),now:()=>t});
 await assert.rejects(delayed.execute('teacher',{action:'reviewLeave',instituteId:'backend-test',workspaceId:'w1',leaveId:'revoke',status:'approved'}),e=>e.status===403);
 assert.equal((await db.doc(ws+'/leaves/revoke').get()).data().data.status,'pending');await db.doc(base+'/members/teacher').update({active:true});
 await db.doc(base+'/members/owner').set({role:'instructor',active:true,workspaceIds:[]});await db.doc(ws+'/leaves/owner-review').set(leave('owner-review'));const ownerReview=await request('owner',{action:'reviewLeave',leaveId:'owner-review',status:'rejected'});assert.equal(ownerReview.leave.reviewedBy,'owner');
 await assert.rejects(service.execute('teacher',{action:'reviewLeave',instituteId:'unknown-tenant',workspaceId:'w1',leaveId:'server',status:'approved',owner:true}),e=>e.status===403);
 console.log('PASS server-only leave review: roles, atomic locked months, concurrent idempotence, server actor/time, strict dates/schema, trainee link and in-transaction revocation.');
 assert.deepEqual(await request('student',{action:'capabilities'}),{aiConfigured:false});
 const exam={id:'exam1',title:'Synthetic MCQ',durationMinutes:1,opensAt:t-1000,closesAt:t+3600000,questions:[{text:'2+2?',options:['3','4'],correctIndex:1},{text:'Safe PPE?',options:['Goggles','None'],correctIndex:0}]};
 await assert.rejects(request('student',{action:'publishExam',exam}),/Instructor/);
 await request('teacher',{action:'publishExam',exam});
 const pub=(await db.doc(base+'/workspaces/w1/secureExams/exam1').get()).data();assert(!JSON.stringify(pub).includes('correctIndex'));assert(!('answers'in pub));
 await assert.rejects(request('teacher',{action:'publishExam',exam}),/immutable/);
 await assert.rejects(request('student',{action:'submitExam',examId:'exam1',answers:[1,0]}),/Start/);
 const start=await request('student',{action:'startExam',examId:'exam1'});assert.equal(start.deadline,t+60000);
 t+=30000;assert.equal((await request('student',{action:'startExam',examId:'exam1'})).deadline,start.deadline);
 await assert.rejects(request('student',{action:'submitExam',examId:'exam1',answers:[99,0]}),/Invalid/);
 const submitted=await Promise.all([request('student',{action:'submitExam',examId:'exam1',answers:[1,0],score:999}),request('student',{action:'submitExam',examId:'exam1',answers:[1,0]})]);assert(submitted.every(x=>x.result.score===2));
 const retry=await request('student',{action:'submitExam',examId:'exam1',answers:[0,1]});assert.equal(retry.result.score,2);
 await request('other',{action:'startExam',examId:'exam1'});t+=60001;await assert.rejects(request('other',{action:'submitExam',examId:'exam1',answers:[1,0]}),/expired/);
 await assert.rejects(request('other',{action:'startExam',examId:'exam1'}),/expired/);
 await assert.rejects(request('staff',{action:'startExam',examId:'exam1'}),/student/);
 // Mutate authority after the initial authorization, immediately before the
 // examination transaction. No client-side role assertion can close this race.
 const raced=async(uid,body,change,identity)=>{
  let transactions=0;const guarded=Object.create(db),target=body.action==='publishExam'?2:1;
  guarded.runTransaction=async fn=>{if(++transactions===target)await change();return db.runTransaction(fn);};
  return createService({db:guarded,verifyToken:async()=>identity||{uid},now:()=>t}).execute(uid,{instituteId:'backend-test',workspaceId:'w1',...body});
 };
 const teacherRef=db.doc(base+'/members/teacher'),teacherData=(await teacherRef.get()).data();
 for(const [label,change]of [['inactive',{active:false}],['role',{role:'staff'}],['assignment',{workspaceIds:[]}]]){
  const body={action:'publishExam',exam:{...exam,id:'revoked-'+label}};
  await assert.rejects(raced('teacher',body,()=>teacherRef.update(change)),e=>e.status===403);
  assert.equal((await db.doc(ws+'/secureExams/'+body.exam.id).get()).exists,false);assert.equal((await db.doc(ws+'/examKeys/'+body.exam.id).get()).exists,false);await teacherRef.set(teacherData);
 }
 await assert.rejects(raced('teacher',{action:'publishExam',exam:{...exam,id:'archived-exam'}},()=>db.doc(ws).update({status:'archived'})),e=>e.status===409);await db.doc(ws).update({status:'active'});
 const beforeExpiry=t;await assert.rejects(raced('teacher',{action:'publishExam',exam:{...exam,id:'closed-during-publish'}},async()=>{t=exam.closesAt+1;}),e=>e.status===409);assert.equal((await db.doc(ws+'/secureExams/closed-during-publish').get()).exists,false);t=beforeExpiry;
 await db.doc(base+'/members/principal').set({role:'principal',active:true,workspaceIds:['w1']});await assert.rejects(raced('principal',{action:'publishExam',exam:{...exam,id:'principal-downgrade'}},()=>db.doc(base+'/members/principal').update({role:'staff'})),e=>e.status===403);
 await assert.rejects(raced('owner',{action:'publishExam',exam:{...exam,id:'old-root-owner'}},()=>db.doc(base).update({ownerUid:'new-root-owner'})),e=>e.status===403);await db.doc(base).update({ownerUid:'owner'});
 const identity={uid:'google-delegate',email:'delegate@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}},grant={uid:identity.uid,email:identity.email,active:true,googleOnly:true,schemaVersion:1,createdAt:new Date(t).toISOString(),createdBy:'owner',updatedAt:new Date(t).toISOString(),updatedBy:'owner'};
 await db.doc(base+'/members/'+identity.uid).set({uid:identity.uid,email:identity.email,role:'instructor',active:true,owner:true,workspaceIds:[]});await db.doc(base+'/systemAdmins/'+identity.uid).set(grant);
 await assert.rejects(raced(identity.uid,{action:'publishExam',exam:{...exam,id:'revoked-google-grant'}},()=>db.doc(base+'/systemAdmins/'+identity.uid).update({active:false}),identity),e=>e.status===403);
 for(const [label,change]of [['inactive',{active:false}],['role',{role:'staff'}],['assignment',{workspaceIds:[]}]]){
  const uid='start-'+label,memberRef=db.doc(base+'/members/'+uid);await memberRef.set({role:'student',active:true,workspaceIds:['w1'],traineeId:uid});
  await assert.rejects(raced(uid,{action:'startExam',examId:'exam1'},()=>memberRef.update(change)),e=>e.status===403);assert.equal((await db.doc(ws+'/examSessions/exam1--'+uid).get()).exists,false);
 }
 const linked='atomic-linked',linkedRef=db.doc(base+'/members/'+linked);await linkedRef.set({role:'student',active:true,workspaceIds:['w1'],traineeId:'old-link'});
 await raced(linked,{action:'startExam',examId:'exam1'},()=>linkedRef.update({traineeId:'current-link'}));assert.equal((await db.doc(ws+'/examSessions/exam1--'+linked).get()).data().traineeId,'current-link');
 for(const change of [{active:false},{role:'staff'},{workspaceIds:[]}]){await assert.rejects(raced(linked,{action:'submitExam',examId:'exam1',answers:[1,0]},()=>linkedRef.update(change)),e=>e.status===403);await linkedRef.set({role:'student',active:true,workspaceIds:['w1'],traineeId:'current-link'});}
 await assert.rejects(raced(linked,{action:'submitExam',examId:'exam1',answers:[1,0]},()=>linkedRef.update({traineeId:'another-link'})),e=>e.status===409);assert.equal((await db.doc(ws+'/secureResults/exam1--'+linked).get()).exists,false);
 await db.doc(base+'/members/student').update({traineeId:'replacement-link'});await assert.rejects(request('student',{action:'startExam',examId:'exam1'}),e=>e.status===409);await db.doc(base+'/members/student').update({traineeId:'student'});
 console.log('PASS MCQ transactional authority: publish/start/submit revocation, role/assignment/root/Google-grant changes, archived workspaces, current trainee linkage, expired resume and no leaked answer/result writes.');
 for(const language of ['en','mr','hi']){const g=await request('student',{action:'ai',task:'interview',language,input:''});assert.equal(g.mode,'guided');assert(g.text.length>80);}
 await db.doc(base+'/members/student').update({active:false});await assert.rejects(request('student',{action:'startExam',examId:'exam1'}),/denied/);await assert.rejects(request('student',{action:'capabilities'}),/denied/);
 console.log('PASS backend with Firestore Emulator: publish, protected payload, server time, concurrent grading/idempotence, expiry, role/revocation, multilingual no-key assistance.');
 await db.terminate();
})().catch(e=>{console.error(e);process.exitCode=1;});
