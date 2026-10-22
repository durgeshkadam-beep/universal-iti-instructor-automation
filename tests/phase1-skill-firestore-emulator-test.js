'use strict';
// Integration test: requires FIRESTORE_EMULATOR_HOST and firebase rules-unit-testing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,serverTimestamp}=require('firebase/firestore');

(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Run under Firebase Firestore Emulator.');
  const [host,portText]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env=await initializeTestEnvironment({
    projectId:'demo-universal-iti',
    firestore:{host:host||'127.0.0.1',port:Number(portText)||8080,rules:fs.readFileSync('firestore.rules','utf8')}
  });
  const base='institutes/test-iti';
  const profilePath=(wid,uid)=>[base,'workspaces',wid,'skillVerifications',uid].join('/');
  try{
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await setDoc(doc(db,base),{ownerUid:'owner-1',schemaVersion:15});
      await setDoc(doc(db,base+'/workspaces/ws1'),{name:'DTP 2026'});
      await setDoc(doc(db,base+'/workspaces/ws2'),{name:'COPA 2026'});
      const members=[
        ['instructor-1',{role:'instructor',active:true,workspaceIds:['ws1']}],
        ['instructor-2',{role:'instructor',active:true,workspaceIds:['ws2']}],
        ['student-a',{role:'student',active:true,traineeId:'t-a',workspaceIds:['ws1']}],
        ['student-b',{role:'student',active:true,traineeId:'t-b',workspaceIds:['ws1']}]
      ];
      for(const [uid,m] of members)await setDoc(doc(db,base+'/members/'+uid),m);
    });
    const ins=env.authenticatedContext('instructor-1').firestore();
    const outside=env.authenticatedContext('instructor-2').firestore();
    const student=env.authenticatedContext('student-a').firestore();
    const otherStudent=env.authenticatedContext('student-b').firestore();
    const profile=doc(ins,profilePath('ws1','student-a'));
    const valid={
      studentUid:'student-a',traineeId:'t-a',workspaceId:'ws1',
      skills:{'practical-1':{status:'verified',title:'Layout design',evidence:'Assessed print layout',verifiedBy:'instructor-1',verifiedAt:serverTimestamp()}},
      updatedAt:serverTimestamp(),updatedBy:'instructor-1'
    };
    await assertSucceeds(setDoc(profile,valid));
    await assertSucceeds(getDoc(doc(student,profilePath('ws1','student-a'))));
    await assertFails(getDoc(doc(otherStudent,profilePath('ws1','student-a'))));
    await assertFails(getDocs(collection(student,base+'/workspaces/ws1/skillVerifications')));
    await assertFails(setDoc(doc(student,profilePath('ws1','student-a')),{
      ...valid,updatedBy:'student-a',updatedAt:serverTimestamp()
    }));
    await assertFails(setDoc(doc(outside,profilePath('ws1','student-a')),{
      ...valid,updatedBy:'instructor-2',updatedAt:serverTimestamp()
    }));
    await assertFails(setDoc(doc(ins,profilePath('ws1','student-b')),{
      ...valid,studentUid:'student-b',traineeId:'t-a'
    }));
    await assertFails(setDoc(doc(ins,profilePath('ws1','student-b')),{
      ...valid,studentUid:'student-b',traineeId:'t-b',workspaceId:'ws2'
    }));
    await assertFails(setDoc(doc(ins,profilePath('ws1','student-a')),{
      ...valid,studentUid:'student-b'
    }));
    await assertSucceeds(setDoc(profile,{
      ...valid,skills:{'practical-1':{status:'verified',title:'Layout design',evidence:'Updated assessed project',verifiedBy:'instructor-1',verifiedAt:serverTimestamp()}},
      updatedAt:serverTimestamp()
    }));
    assert.equal((await getDoc(doc(student,profilePath('ws1','student-a')))).data().skills['practical-1'].status,'verified');
    console.log('PASS skill verification: instructor writes, own student reads, others denied, immutable identity.');
  }finally{
    await env.cleanup();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});