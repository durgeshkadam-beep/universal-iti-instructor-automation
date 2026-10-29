'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds:yes,assertFails:no}=require('@firebase/rules-unit-testing');
const F=require('firebase/firestore'),{Firestore}=require('firebase-admin/firestore'),{createService}=require('../server/service');
test('delegated Google Admin has authoritative access while root/demo users remain; clients cannot grant or forge authority',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-universal-iti',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}}),db=new Firestore({projectId:'demo-universal-iti'}),base='institutes/delegation-test',ws=base+'/workspaces/unassigned';
 const g={uid:'delegate',email:'delegate@example.test',active:true,googleOnly:true,schemaVersion:1,createdAt:'2026-10-29T00:00:00.000Z',createdBy:'operator',updatedAt:'2026-10-29T00:00:00.000Z',updatedBy:'operator'};
 const claims=(provider='google.com',email='delegate@example.test',verified=true)=>({email,email_verified:verified,firebase:{sign_in_provider:provider}});
 try{
  await db.doc(base).set({ownerUid:'root',schemaVersion:15});await db.doc(ws).set({trade:'Synthetic'});
  for(const [uid,role,owner,ids]of [['root','instructor',true,[]],['delegate','instructor',true,['assigned']],['forged','instructor',true,[]],['teacher','instructor',false,['assigned']],['principal','principal',false,[]],['student','student',false,['assigned']]])await db.doc(base+'/members/'+uid).set({uid,email:uid+'@example.test',active:true,owner,role,workspaceIds:ids});
  await db.doc(base+'/systemAdmins/delegate').set(g);await db.doc(ws+'/notices/one').set({data:{title:'Synthetic'}});
  const google=env.authenticatedContext('delegate',claims()).firestore(),password=env.authenticatedContext('delegate',claims('password')).firestore();
  await yes(F.getDoc(F.doc(google,ws)));await yes(F.getDocs(F.collection(google,base+'/members')));
  for(const who of [password,env.authenticatedContext('forged',claims('google.com','forged@example.test')).firestore(),env.authenticatedContext('delegate',claims('google.com','wrong@example.test')).firestore(),env.authenticatedContext('delegate',claims('google.com','delegate@example.test',false)).firestore(),env.unauthenticatedContext().firestore()])await no(F.getDoc(F.doc(who,ws)));
  for(const who of [google,env.authenticatedContext('root',{email:'root@example.test'}).firestore(),env.authenticatedContext('teacher',{email:'teacher@example.test'}).firestore()]){
   await no(F.setDoc(F.doc(who,base+'/systemAdmins/forged'),{...g,uid:'forged'}));await no(F.updateDoc(F.doc(who,base+'/systemAdmins/delegate'),{active:false}));await no(F.deleteDoc(F.doc(who,base+'/systemAdmins/delegate')));await no(F.getDocs(F.collection(who,base+'/systemAdmins')));
  }
  await yes(F.getDoc(F.doc(google,base+'/systemAdmins/delegate')));await no(F.getDoc(F.doc(env.authenticatedContext('teacher').firestore(),base+'/systemAdmins/delegate')));
  await no(F.updateDoc(F.doc(google,base),{ownerUid:'delegate'}));
  const identity={uid:'delegate',...claims()},service=createService({db,verifyToken:async()=>identity});
  assert.deepEqual(await service.execute('token',{action:'capabilities',instituteId:'delegation-test',workspaceId:'unassigned'}),{aiConfigured:false});
  await assert.rejects(createService({db,verifyToken:async()=>({uid:'delegate',...claims('password')})}).execute('token',{action:'capabilities',instituteId:'delegation-test',workspaceId:'unassigned'}),e=>e.status===403);
  for(const changes of [{active:false},{email:'other@example.test'},{googleOnly:false},{schemaVersion:2}]){await db.doc(base+'/systemAdmins/delegate').set({...g,...changes});await no(F.getDoc(F.doc(google,ws)));await assert.rejects(service.execute('token',{action:'capabilities',instituteId:'delegation-test',workspaceId:'unassigned'}),e=>e.status===403);}
  await db.doc(base+'/systemAdmins/delegate').set(g);await db.doc(base+'/members/delegate').update({active:false});await no(F.getDoc(F.doc(google,ws)));await db.doc(base+'/members/delegate').update({active:true});
  // A grant revoked after API authorisation must be rechecked inside leave review.
  await db.doc(ws+'/trainees/student').set({data:{id:'student',name:'Synthetic'}});
  await db.doc(ws+'/leaves/one').set({data:{id:'one',traineeId:'student',type:'Other',fromDate:'2031-01-01',toDate:'2031-01-01',reason:'Synthetic',certNote:'',status:'pending',appliedDate:'2031-01-01'},updatedAt:'2031-01-01',updatedBy:'student'});
  const delayed=createService({db:{doc:p=>db.doc(p),runTransaction:async fn=>{await db.doc(base+'/systemAdmins/delegate').update({active:false});return db.runTransaction(fn);}},verifyToken:async()=>identity});
  await assert.rejects(delayed.execute('token',{action:'reviewLeave',instituteId:'delegation-test',workspaceId:'unassigned',leaveId:'one',status:'approved'}),e=>e.status===403);assert.equal((await db.doc(ws+'/leaves/one').get()).data().data.status,'pending');
  await yes(F.getDoc(F.doc(env.authenticatedContext('root').firestore(),ws)));await yes(F.getDoc(F.doc(env.authenticatedContext('principal').firestore(),ws)));assert.equal((await db.doc(base).get()).data().ownerUid,'root');
 }finally{await env.cleanup();await db.terminate();}
});
