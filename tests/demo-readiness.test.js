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
