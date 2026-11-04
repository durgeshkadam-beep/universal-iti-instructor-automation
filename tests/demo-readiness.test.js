'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {inspectDemo}=require('../scripts/inspect-demo-readiness');
function fixture(change={}){
 const roles=['admin','principal','instructor','staff','student'];
 const data={'institutes/brdbagiti-mumbai-01':{ownerUid:'staging-admin'},'institutes/brdbagiti-mumbai-01/workspaces/staging-dtp-2026':{trade:'Synthetic DTP'}};
 const auth={getUser:async uid=>({uid,email:uid.slice(8)+'@iti-staging.example.test',emailVerified:true,providerData:[{providerId:'password'}],...(change.auth||{})})};
 for(const role of roles)data['institutes/brdbagiti-mumbai-01/members/staging-'+role]={uid:'staging-'+role,email:role+'@iti-staging.example.test',role:role==='admin'?'instructor':role,owner:role==='admin',active:true,workspaceIds:['staging-dtp-2026'],traineeId:role==='student'?'synthetic-learner':null,...(role===change.role?change.member:{})};
 data['institutes/brdbagiti-mumbai-01/workspaces/staging-dtp-2026/trainees/synthetic-learner']={data:{name:'Private learner',pin:'secret'}};
 const db={projectId:'universal-iti-dk-staging',doc:path=>({
  get:async()=>({exists:!!data[path],data:()=>data[path]}),
  collection:()=>({get:async()=>({docs:[]}),doc:()=>({get:async()=>({exists:false,data:()=>undefined})})})
 })};return {db,auth};
}
test('readiness uses only read APIs and never claims a real login or complete demo acceptance',async()=>{const f=fixture(),r=await inspectDemo(f.db,f.auth);assert(r.accountsConfigured);assert.equal(r.accounts.length,5);assert.equal(r.passwordSignInTested,false);assert.equal(r.fullLiveDemoAccepted,false);assert.equal(r.dataChanged,false);assert(!JSON.stringify(r).includes('Private learner'));assert(!JSON.stringify(r).includes('secret'));});
test('role mismatch, disabled account, missing password provider and cross-workspace assignment block readiness',async()=>{
 for(const change of [{role:'student',member:{role:'principal'}},{auth:{disabled:true}},{auth:{providerData:[]}},{role:'instructor',member:{workspaceIds:['staging-dtp-2026','private-real-workspace']}}]){const f=fixture(change);assert.equal((await inspectDemo(f.db,f.auth)).accountsConfigured,false);}
});
test('missing Auth accounts are reported without creating accounts or exposing provider errors',async()=>{const f=fixture();f.auth.getUser=async()=>{throw Object.assign(Error('private error'),{code:'auth/user-not-found'});};const r=await inspectDemo(f.db,f.auth);assert.equal(r.accountsConfigured,false);assert(r.accounts.every(x=>!x.accountExists));assert(!JSON.stringify(r).includes('private error'));});
test('foreign project is rejected before any account or database read',async()=>{await assert.rejects(inspectDemo({projectId:'production'},{}),{code:'TARGET_MISMATCH'});});
const {createAuthReader}=require('../scripts/inspect-demo-readiness');
test('Auth reader uses fixed read lookup endpoint and strips hashes and provider private fields',async()=>{
 const auth=createAuthReader({accessToken:async()=>'synthetic-token',request:async(url,options)=>{
  assert.equal(url,'https://identitytoolkit.googleapis.com/v1/projects/universal-iti-dk-staging/accounts:lookup');assert.equal(options.headers['x-goog-user-project'],'universal-iti-dk-staging');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{localId:['staging-student']});
  return {ok:true,json:async()=>({users:[{localId:'staging-student',email:'student@iti-staging.example.test',emailVerified:true,passwordHash:'private-hash',providerUserInfo:[{providerId:'password',rawId:'private-id'}]}]})};
 }});
 const result=await auth.getUser('staging-student');assert.equal(result.providerData[0].providerId,'password');assert(!JSON.stringify(result).includes('private'));
});
test('Auth lookup rejection reports only HTTP status and fixed codes; never raw provider errors',async()=>{
 for(const status of [401,403,500]){const auth=createAuthReader({accessToken:async()=>'synthetic-token',request:async()=>({ok:false,status,json:async()=>{throw Error('Never parse private provider errors');}})});
 await assert.rejects(auth.getUser('staging-instructor'),e=>e.httpStatus===status&&!JSON.stringify(e).includes('private'));
 }
});
test('missing accounts and mismatched responses fail safely before exposing account data',async()=>{
 for(const [users,code]of [[[],'auth/user-not-found'],[[{localId:'other',email:'private'}],'AUTH_RESPONSE_MISMATCH']]){
 const auth=createAuthReader({accessToken:async()=>'synthetic-token',request:async()=>({ok:true,json:async()=>({users})})});await assert.rejects(auth.getUser('staging-student'),{code});
 }
 const auth=createAuthReader({accessToken:()=>{throw Error('Must not request a token');}});await assert.rejects(auth.getUser('real-user'),{code:'AUTH_ACCOUNT_NOT_ALLOWLISTED'});
});

test('403 diagnostics retain allowlisted reason only, without private provider messages',async()=>{
 for(const [body,reason]of [[{error:{details:[{reason:'IAM_PERMISSION_DENIED',metadata:{private:'secret'}}],message:'private project data'}},'IAM_PERMISSION_DENIED'],[{error:{details:[{reason:'private-credential'}],message:'private secret'}},'UNSPECIFIED'],[{error:{message:'End user credentials require quota project: private account'}},'USER_CREDENTIALS_QUOTA_PROJECT']]){
  const reader=createAuthReader({accessToken:async()=>'synthetic',request:async()=>({ok:false,status:403,json:async()=>body})});
  await assert.rejects(reader.getUser('staging-admin'),e=>e.reason===reason&&!JSON.stringify(e).includes('private')&&!JSON.stringify(e).includes('secret'));
 }
});
