'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Firestore,Timestamp,GeoPoint}=require('firebase-admin/firestore'),B=require('../scripts/firestore-recovery');
test('encrypted full-database capture restores protected data and orphan subcollections into a fresh emulator only',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const source=new Firestore({projectId:B.PROJECT}),target=new Firestore({projectId:'demo-eduskill-recovery'});
 try{
  for(const col of await target.listCollections())await target.recursiveDelete(col);
  const base='recoverySynthetic/'+crypto.randomUUID();
  await source.doc(base).set({when:new Timestamp(1700000000,123456789),location:new GeoPoint(19,73),bytes:Buffer.from('synthetic'),reference:source.doc(base+'/trainees/one')});
  for(const [s,data]of Object.entries({trainees:{name:'Synthetic'},attendance:{present:true},marks:{score:73},examKeys:{answers:[0]},secureResults:{score:1},studentSkillPlans:{goal:'Synthetic goal'}}))await source.doc(base+'/'+s+'/one').set(data);
  await source.doc(base+'/missing/parent/children/one').set({orphan:true});
  const p=await B.capture(source),key=crypto.randomBytes(32),decrypted=B.decrypt(B.encrypt(p,key),key);
  const result=await B.restoreEmulator(target,decrypted,{host:process.env.FIRESTORE_EMULATOR_HOST,confirmSource:B.PROJECT});assert.equal(result.matchedDocuments,p.documents.length);assert(result.matchedDocuments>=8);
  assert.equal((await target.doc(base+'/marks/one').get()).data().score,73);assert.equal((await target.doc(base+'/missing/parent/children/one').get()).data().orphan,true);
  assert.equal((await target.doc(base).get()).data().when.nanoseconds,(await source.doc(base).get()).data().when.nanoseconds);assert.equal((await source.doc(base+'/trainees/one').get()).data().name,'Synthetic');
  await assert.rejects(B.restoreEmulator(target,decrypted,{host:process.env.FIRESTORE_EMULATOR_HOST,confirmSource:B.PROJECT}),/DESTINATION_NOT_EMPTY/);
  await source.recursiveDelete(source.doc(base));
 }finally{await source.terminate();await target.terminate();}
});
