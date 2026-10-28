'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Firestore}=require('firebase-admin/firestore');
const {prepare,preview,apply,SOURCE,TARGET,WORKSPACE}=require('../scripts/transfer-dtp-staging');
test('DTP transfer preserves source, creates isolated workspace atomically and retains instructor role',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const source=new Firestore({projectId:SOURCE}),target=new Firestore({projectId:TARGET}),base='institutes/brdbagiti-mumbai-01';
 try{
  await source.recursiveDelete(source.doc(base));await target.recursiveDelete(target.doc(base));
  await source.doc(base).set({ownerUid:'source-owner'});
  await source.doc(base+'/members/source-owner').set({email:'synthetic@example.test',role:'instructor',active:true});
  const ws=source.doc(base+'/workspaces/'+WORKSPACE);
  await ws.set({trade:'Desktop Publishing Operator',arraySections:['trainees','practicals','theory'],instructorPin:'private-pin'});
  for(const [section,data]of Object.entries({trainees:{id:'learner',name:'Synthetic learner',pin:'1234'},practicals:{plan:{objective:['Synthetic demo']}},theory:{plan:{objective:['Synthetic lesson']}}}))await ws.collection(section).doc('one').set({data});
  await target.doc(base).set({ownerUid:'different-owner'});
  const member=target.doc(base+'/members/target-instructor');
  await member.set({email:'synthetic@example.test',role:'instructor',active:true,workspaceIds:['electrician-test']});
  const old=target.doc(base+'/workspaces/electrician-test');await old.set({trade:'Electrician',keep:true});
  const plan=await prepare(source,target);assert.equal(preview(plan).sections.trainees.records,1);
  assert.equal((await target.doc(base+'/workspaces/'+WORKSPACE).get()).exists,false);
  const before=JSON.stringify((await ws.collection('trainees').doc('one').get()).data());
  // A changed account invalidates the preview and leaves the destination absent.
  await member.update({active:false});
  await assert.rejects(apply(target,plan,{target:TARGET,fingerprint:plan.fingerprint}),{code:'TARGET_ACCOUNT_CHANGED'});
  assert.equal((await target.doc(base+'/workspaces/'+WORKSPACE).get()).exists,false);
  await member.update({active:true});
  const fresh=await prepare(source,target);
  const result=await apply(target,fresh,{target:TARGET,fingerprint:fresh.fingerprint});assert.equal(result.verifiedDocuments,3);
  const m=(await member.get()).data();assert.equal(m.role,'instructor');assert.deepEqual(m.workspaceIds,[WORKSPACE,'electrician-test']);
  assert.deepEqual((await old.get()).data(),{trade:'Electrician',keep:true});
  assert.equal(JSON.stringify((await ws.collection('trainees').doc('one').get()).data()),before);
  const imported=target.doc(base+'/workspaces/'+WORKSPACE);
  assert.equal((await imported.get()).data().instructorPin,undefined);
  assert.equal((await imported.collection('trainees').doc('one').get()).data().data.pin,undefined);
  await assert.rejects(prepare(source,target),{code:'DESTINATION_EXISTS'});
 }finally{await source.terminate();await target.terminate();}
});
