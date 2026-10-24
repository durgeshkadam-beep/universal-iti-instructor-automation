'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds:yes,assertFails:no}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,deleteDoc,getDocs,collection,serverTimestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-universal-iti',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}}),base='institutes/security-test',ws=base+'/workspaces/w1';
 try{
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();await setDoc(doc(d,base),{ownerUid:'owner',schemaVersion:15});await setDoc(doc(d,ws),{trade:'Synthetic'});for(const [uid,role,ids] of [['principal','principal',[]],['teacher','instructor',['w1']],['other','instructor',['w2']],['staff','staff',['w1']],['s1','student',['w1']],['s2','student',['w1']]])await setDoc(doc(d,base+'/members/'+uid),{uid,email:uid+'@example.test',role,active:true,owner:false,workspaceIds:ids,traineeId:uid});await setDoc(doc(d,base+'/access/principal@example.test'),{role:'principal',workspaceIds:[]});await setDoc(doc(d,ws+'/examKeys/e'),{answers:[1]});await setDoc(doc(d,ws+'/examSessions/e--s1'),{deadline:100});await setDoc(doc(d,ws+'/attendance/old'),{key:'2026-10-01',subKey:'s1',traineeId:'s1',data:'P'});await setDoc(doc(d,ws+'/submissions/private'),{key:'1',subKey:'s2',traineeId:'s2',data:'private'});});

 // Leave ownership/schema attacks and the actual atomic review transaction.
 const FM=require('firebase/firestore'),workflow=require('../v15/v15-leave-workflow');
 const studentLeave=env.authenticatedContext('s1',{email:'s1@example.test'}).firestore(),instructorLeave=env.authenticatedContext('teacher',{email:'teacher@example.test'}).firestore();
 // Actual maximum-size training restore and backend authority, independent of client UI guards.
 const training=require('../v15/v15-training-backup'),trainingItems=Array.from({length:50},(_,i)=>({section:'notices',id:'backup-limit-'+i,data:{id:'backup-limit-'+i,title:'Synthetic maximum restore '+i,body:'Training only'}}));
 const trainingOptions={M:FM,db:instructorLeave,workspace:doc(instructorLeave,ws),items:trainingItems,uid:'teacher',allowed:()=>true,current:()=>true};
 assert.deepEqual(await training.restore(trainingOptions),{created:50,existing:0});
 await updateDoc(doc(instructorLeave,ws+'/notices/backup-limit-0'),{'data.title':'Newer existing resource'});
 assert.deepEqual(await training.restore(trainingOptions),{created:0,existing:50});
 assert.equal((await getDoc(doc(instructorLeave,ws+'/notices/backup-limit-0'))).data().data.title,'Newer existing resource');
 assert((await getDoc(doc(instructorLeave,ws))).data().arraySections.includes('notices'));
 const deniedItem={section:'notices',id:'backup-denied',data:{id:'backup-denied',title:'Synthetic denied restore'}};
 await assert.rejects(training.restore({...trainingOptions,db:studentLeave,workspace:doc(studentLeave,ws),items:[deniedItem],uid:'s1'}),e=>e.code==='permission-denied');
 const otherTraining=env.authenticatedContext('other',{email:'other@example.test'}).firestore();
 await assert.rejects(training.restore({...trainingOptions,db:otherTraining,workspace:doc(otherTraining,ws),items:[deniedItem],uid:'other'}),e=>e.code==='permission-denied');
 assert.equal((await getDoc(doc(instructorLeave,ws+'/notices/backup-denied'))).exists(),false);
 // Report register access is checked by Firebase, independently of client print/signature guards.
 await yes(setDoc(doc(instructorLeave,ws+'/map_signatures/report-role-test'),{key:'report-role-test',data:{status:'pending',label:'Synthetic report',date:'2026-10-24'},updatedBy:'teacher'}));
 for(const uid of ['s1','staff','other']){const deniedDb=env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();await no(setDoc(doc(deniedDb,ws+'/map_signatures/forged-'+uid),{key:'forged-'+uid,data:{status:'signed',signedBy:uid,label:'Synthetic denied sign'},updatedBy:uid}));}
 await no(getDoc(doc(studentLeave,ws+'/map_signatures/report-role-test')));
 await no(getDoc(doc(env.unauthenticatedContext().firestore(),ws+'/map_signatures/report-role-test')));
 await yes(getDoc(doc(env.authenticatedContext('staff',{email:'staff@example.test'}).firestore(),ws+'/map_signatures/report-role-test')));
 const wrapper=(id,changes={})=>({data:{id,traineeId:'s1',type:'Medical',fromDate:'2031-01-31',toDate:'2031-02-01',reason:'Synthetic leave reason',certNote:'',status:'pending',appliedDate:'2031-01-01',...changes},updatedAt:'2031-01-01T00:00:00Z',updatedBy:'s1'});
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),ws+'/trainees/s1'),{data:{id:'s1',name:'Synthetic'}}));
 for(const [id,changes] of [['forged',{status:'approved'}],['foreign',{traineeId:'s2'}],['large',{reason:'x'.repeat(2001)}],['extra',{role:'principal'}],['badtype',{reason:123}],['reviewer',{reviewedBy:'teacher'}]])await no(setDoc(doc(studentLeave,ws+'/leaves/'+id),wrapper(id,changes)));
 await yes(setDoc(doc(studentLeave,ws+'/leaves/atomic'),wrapper('atomic')));
 await yes(setDoc(doc(studentLeave,ws+'/leaves/atomic'),wrapper('atomic'))); // idempotent pending retry
 await no(updateDoc(doc(studentLeave,ws+'/leaves/atomic'),{'data.status':'approved'}));
 await no(deleteDoc(doc(studentLeave,ws+'/leaves/atomic')));
 await no(getDoc(doc(env.authenticatedContext('s2').firestore(),ws+'/leaves/atomic')));
 await no(FM.getDocs(FM.collection(env.unauthenticatedContext().firestore(),ws+'/leaves')));
 const reviewLeave=(id,status='approved')=>workflow.review({M:FM,db:instructorLeave,workspace:doc(instructorLeave,ws),uid:'teacher',role:'instructor',leaveId:id,status});
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),ws+'/attendanceLocks/2031-02'),{status:'submitted'}));
 await assert.rejects(reviewLeave('atomic'),/locked/);
 assert.equal((await getDoc(doc(instructorLeave,ws+'/leaves/atomic'))).data().data.status,'pending');
 assert.equal((await getDoc(doc(instructorLeave,ws+'/attendance/2031-01-31--s1'))).exists(),false);
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),ws+'/attendanceLocks/2031-02'),{status:'reopened'}));
 await reviewLeave('atomic');for(const day of ['2031-01-31','2031-02-01'])assert.equal((await getDoc(doc(instructorLeave,ws+'/attendance/'+day+'--s1'))).data().data,'L');
 assert.equal((await getDoc(doc(instructorLeave,ws+'/leaves/atomic'))).data().data.status,'approved');
 const registered=(await getDoc(doc(instructorLeave,ws))).data();assert(registered.arraySections.includes('leaves'));assert(registered.mapSections.includes('attendance'));
 await reviewLeave('atomic');await assert.rejects(reviewLeave('atomic','rejected'),/already/);
 await no(updateDoc(doc(instructorLeave,ws+'/leaves/atomic'),{'data.status':'pending',updatedBy:'teacher'}));
 await no(updateDoc(doc(instructorLeave,ws+'/leaves/atomic'),{'data.traineeId':'s2',updatedBy:'teacher'}));
 await yes(setDoc(doc(studentLeave,ws+'/leaves/rejected'),wrapper('rejected')));await reviewLeave('rejected','rejected');
 await no(updateDoc(doc(studentLeave,ws+'/leaves/rejected'),{'data.reason':'altered'}));
 await no(setDoc(doc(env.unauthenticatedContext().firestore(),ws+'/leaves/anonymous'),wrapper('anonymous')));
 await no(updateDoc(doc(instructorLeave,ws+'/leaves/atomic'),{'data.reason':'x'.repeat(2001),updatedBy:'teacher'}));
 await no(updateDoc(doc(instructorLeave,ws+'/leaves/atomic'),{'data.type':FM.deleteField(),updatedBy:'teacher'}));
 await yes(setDoc(doc(studentLeave,ws+'/leaves/long-span'),wrapper('long-span',{fromDate:'2032-01-31',toDate:'2032-04-29'})));
 await env.withSecurityRulesDisabled(async c=>{for(const month of new Set(workflow.dates('2032-01-31','2032-04-29').map(d=>d.slice(0,7))))await setDoc(doc(c.firestore(),ws+'/attendanceLocks/'+month),{status:'reopened'});});
 await reviewLeave('long-span');assert.equal((await getDoc(doc(instructorLeave,ws+'/attendance/2032-04-29--s1'))).data().data,'L');
 console.log('PASS leave rules/transaction: forged statuses, owner/type/size/schema, immutable reviews, locked cross-month atomicity, reopened approval and retry.');
 const db=x=>env.authenticatedContext(x,{email:x+'@example.test',email_verified:true}).firestore(),teacher=db('teacher'),principal=db('principal'),student=db('s1');
 // Every sensitive named match must resist the generic match, for every privileged client too.
 for(const who of ['owner','principal','teacher','staff','s1','other']){
  const d=db(who);for(const section of ['examKeys','examSessions','secureResults','secureExams'])await no(setDoc(doc(d,ws+'/'+section+'/forged'),{studentUid:who,score:100,published:true}));
  await no(getDoc(doc(d,ws+'/examKeys/e')));await no(getDoc(doc(d,ws+'/examSessions/e--s1')));
 }
 await yes(setDoc(doc(teacher,ws+'/attendanceLocks/2026-10'),{month:'2026-10',status:'submitted',submittedBy:'teacher'}));
 const att=doc(teacher,ws+'/attendance/old');await no(updateDoc(att,{data:'A'}));await no(deleteDoc(att));await no(setDoc(doc(teacher,ws+'/attendance/new'),{key:'2026-10-02',traineeId:'s1',subKey:'s1',data:'P'}));
 await no(updateDoc(doc(teacher,ws+'/attendanceLocks/2026-10'),{status:'approved'}));
 await yes(updateDoc(doc(principal,ws+'/attendanceLocks/2026-10'),{status:'reopened'}));
 await yes(updateDoc(att,{data:'A'}));
 await yes(updateDoc(doc(teacher,ws+'/attendanceLocks/2026-10'),{status:'submitted',submittedBy:'teacher',updatedAt:'test'}));
 await no(updateDoc(doc(teacher,base+'/access/principal@example.test'),{role:'student',workspaceIds:['w1']}));
 // Instructors must not inspect, delete, or replace another workspace's invitation.
 await env.withSecurityRulesDisabled(async c=>{for(const [mail,ids] of [['own@example.test',['w1']],['foreign@example.test',['w2']]]){await setDoc(doc(c.firestore(),base+'/access/'+mail),{role:'student',workspaceIds:ids,active:true});await setDoc(doc(c.firestore(),base+'/inviteSecrets/'+mail),{role:'student',codeHash:'synthetic-proof',active:true});}});
 for(const collection of ['access','inviteSecrets']){
  const foreign=doc(teacher,base+'/'+collection+'/foreign@example.test');
  await no(getDoc(foreign));await no(deleteDoc(foreign));await no(updateDoc(foreign,{active:false}));
  await yes(getDoc(doc(teacher,base+'/'+collection+'/own@example.test')));
 }
 await no(setDoc(doc(teacher,base+'/inviteSecrets/foreign@example.test'),{role:'student',codeHash:'forged',active:true}));
 await no(getDocs(collection(teacher,base+'/access')));
 await yes(setDoc(doc(teacher,base+'/access/new-own@example.test'),{role:'student',workspaceIds:['w1'],active:true}));
 await yes(setDoc(doc(teacher,base+'/inviteSecrets/new-own@example.test'),{role:'student',codeHash:'new-synthetic-proof',active:true}));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),base+'/access/foreign-new@example.test'),{role:'student',workspaceIds:['w2'],active:true}));
 await no(setDoc(doc(teacher,base+'/inviteSecrets/foreign-new@example.test'),{role:'student',codeHash:'forged',active:true}));
 await yes(updateDoc(doc(teacher,base+'/inviteSecrets/own@example.test'),{codeHash:'rotated-synthetic-proof'}));
 await yes(deleteDoc(doc(teacher,base+'/inviteSecrets/own@example.test')));
 await yes(deleteDoc(doc(teacher,base+'/access/own@example.test')));
 await no(updateDoc(doc(student,ws+'/submissions/private'),{traineeId:'s1',data:'stolen'}));
 await no(setDoc(doc(db('staff'),ws+'/notices/new'),{data:{text:'forged'}}));
 await no(setDoc(doc(db('other'),ws+'/notices/new'),{data:{text:'forged'}}));
 await yes(setDoc(doc(teacher,ws+'/notices/new'),{data:{text:'published'}}));
 await yes(getDoc(doc(student,ws+'/notices/new')));
 const plan={selfRatings:{'practical-1':'learning'},plan:{roleName:'Operator'},updatedAt:serverTimestamp()};
 await yes(setDoc(doc(student,ws+'/studentPlans/s1'),plan));await no(setDoc(doc(student,ws+'/studentPlans/s2'),plan));await no(getDoc(doc(db('s2'),ws+'/studentPlans/s1')));
 await no(setDoc(doc(student,ws+'/studentPlans/s1'),{...plan,score:100}));
 await no(getDoc(doc(env.unauthenticatedContext().firestore(),ws+'/notices/new')));
 // Member activation may never mint owner status, even using a valid invitation proof.
 await env.withSecurityRulesDisabled(async c=>{for(const section of ['access','inviteSecrets'])await setDoc(doc(c.firestore(),base+'/'+section+'/new@example.test'),section==='access'?{role:'student',workspaceIds:['w1'],traineeId:'new',active:true}:{codeHash:'hash',active:true});});
 const newDb=env.authenticatedContext('new',{email:'new@example.test',email_verified:true}).firestore(),member={uid:'new',email:'new@example.test',role:'student',workspaceIds:['w1'],traineeId:'new',active:true,owner:false,activationProof:'hash'};
 await no(setDoc(doc(newDb,base+'/members/new'),{...member,owner:true}));await yes(setDoc(doc(newDb,base+'/members/new'),member));
 console.log('PASS security emulator: sensitive collection bypasses, 6 identities, locks/reopen/resubmit, invitation downgrade, submission theft, private plans, activation owner forgery.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
