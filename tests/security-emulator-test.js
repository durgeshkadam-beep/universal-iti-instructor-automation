'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds:yes,assertFails:no}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,deleteDoc,getDocs,collection,serverTimestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-universal-iti',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}}),base='institutes/security-test',ws=base+'/workspaces/w1';
 try{
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();await setDoc(doc(d,base),{ownerUid:'owner',schemaVersion:15});await setDoc(doc(d,ws),{trade:'Synthetic'});for(const [uid,role,ids] of [['principal','principal',[]],['teacher','instructor',['w1']],['other','instructor',['w2']],['staff','staff',['w1']],['s1','student',['w1']],['s2','student',['w1']]])await setDoc(doc(d,base+'/members/'+uid),{uid,email:uid+'@example.test',role,active:true,owner:false,workspaceIds:ids,traineeId:uid});await setDoc(doc(d,base+'/access/principal@example.test'),{role:'principal',workspaceIds:[]});await setDoc(doc(d,ws+'/examKeys/e'),{answers:[1]});await setDoc(doc(d,ws+'/examSessions/e--s1'),{deadline:100});await setDoc(doc(d,ws+'/attendance/old'),{key:'2026-10-01',subKey:'s1',traineeId:'s1',data:'P'});await setDoc(doc(d,ws+'/submissions/private'),{key:'1',subKey:'s2',traineeId:'s2',data:'private'});});
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
