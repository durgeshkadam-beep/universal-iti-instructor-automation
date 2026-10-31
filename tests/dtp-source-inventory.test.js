'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{summary,inspect}=require('../scripts/inspect-dtp-source');
test('inventory summaries never emit student names, contacts or plan content',()=>{
 const s=summary([{data:{name:'Private learner',phone:'Private contact',plan:{objective:['Private note']},status:'completed'}}]);
 assert.deepEqual(s,{records:1,withPlan:1,completed:1});assert(!JSON.stringify(s).includes('Private'));
});
test('inventory discovers shared and legacy DTP records using read methods only',async()=>{
 const snap=rows=>({docs:rows.map(data=>({data:()=>data}))}),section={id:'trainees',get:async()=>snap([{data:{name:'Private learner'}}])};
 const ws={id:'dtp',data:()=>({trade:'DTPO'}),ref:{listCollections:async()=>[section]}};
 const legacy={id:'legacy-dtp',collection:name=>{assert.equal(name,'sections');return {get:async()=>snap([{key:'meta',value:{trade:'Desktop Publishing Operator'}},{key:'trainees',value:[{name:'Private learner'}]}])};}};
 const inst={get:async()=>({exists:true,data:()=>({ownerUid:'owner'})}),collection:name=>{assert.equal(name,'workspaces');return {get:async()=>({docs:[ws,{id:'other',data:()=>({trade:'Electrician'})}]})};}};
 const db={doc:path=>{assert.equal(path,'institutes/brdbagiti-mumbai-01');return inst;},collection:path=>{assert.equal(path,'itiInstructorUsers/owner/workspaces');return {listDocuments:async()=>[legacy]};}};
 const r=await inspect(db);assert.equal(r.readOnly,true);assert.equal(r.shared.length,1);assert.equal(r.shared[0].sections.trainees.records,1);assert.equal(r.legacy[0].sections.trainees.records,1);assert(!JSON.stringify(r).includes('Private'));
});
test('missing institute stops inventory without further access',async()=>{
 await assert.rejects(inspect({doc:()=>({get:async()=>({exists:false})})}),/Institute missing/);
});

const {failureReport}=require('../scripts/inspect-dtp-source');
test('safe inventory diagnostics classify permission, auth, dependencies and service errors',()=>{
 for(const [code,expected] of [[7,'PERMISSION_DENIED'],[16,'UNAUTHENTICATED'],['MODULE_NOT_FOUND','MODULE_NOT_FOUND'],['GCLOUD_LOGIN_REQUIRED','GCLOUD_LOGIN_REQUIRED'],['INSTITUTE_MISSING','INSTITUTE_MISSING']]){
  const result=failureReport({code,message:'secret token and private learner'},'firestore-read');
  assert.equal(result.code,expected);assert.equal(result.dataChanged,false);assert(!JSON.stringify(result).includes('secret'));
 }
 assert.equal(failureReport({message:'SERVICE_DISABLED private path'},'firestore-read').code,'FIRESTORE_API_DISABLED');
});
test('unknown diagnostics never reflect arbitrary error codes, messages or stacks',()=>{
 const result=failureReport({code:'PRIVATE_CREDENTIAL',message:'private student',stack:'secret'},'dependencies');
 assert.equal(result.code,'UNKNOWN');assert(!JSON.stringify(result).includes('PRIVATE_CREDENTIAL'));assert(!JSON.stringify(result).includes('private student'));
});

test('Google Cloud OAuth adapter initializes the real Firestore SDK without Admin custom credentials',async()=>{
 const {createInventoryDatabase}=require('../scripts/inspect-dtp-source');
 const {Firestore}=require('firebase-admin/firestore');
 const {GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
 let calls=0;
 const db=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken:async()=>{calls++;return 'synthetic-test-token';}});
 try{
  assert.equal(db.projectId,'universal-iti-auto-dk');
  const client=await db._settings.auth.getClient();
  assert(client instanceof OAuth2Client);assert.equal(client.credentials.access_token,'synthetic-test-token');
  const headers=await client.getRequestHeaders('https://firestore.googleapis.com');
  assert.equal(typeof headers.forEach,'function');
  let authorization;headers.forEach((value,key)=>{if(key==='authorization')authorization=value;});
  assert.equal(authorization,'Bearer synthetic-test-token');
  assert.equal((await client.refreshHandler()).access_token,'synthetic-test-token');assert.equal(calls,2);
 }finally{await db.terminate();}
});
test('adapter preserves login failures and recognizes namespaced SDK errors safely',async()=>{
 const {createInventoryDatabase}=require('../scripts/inspect-dtp-source');
 const {Firestore}=require('firebase-admin/firestore');const {GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
 await assert.rejects(createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken:async()=>{throw Object.assign(Error('private'),{code:'GCLOUD_LOGIN_REQUIRED'});}}),{code:'GCLOUD_LOGIN_REQUIRED'});
 assert.equal(failureReport({code:'firestore/invalid-credential',message:'private'},'firestore-read').code,'INVALID_CREDENTIAL');
});
