'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{inspectStudentAccess}=require('../scripts/inspect-student-access');
const email='synthetic-student@example.org',BASE='institutes/brdbagiti-mumbai-01';
function fixture(){
 const user={localId:'synthetic-student',email,emailVerified:true,providerUserInfo:[{providerId:'google.com'}]},records=new Map([
  [BASE+'/access/'+email,{email,role:'student',active:true,workspaceIds:['demo-workspace'],traineeId:'synthetic-trainee'}],
  [BASE+'/inviteSecrets/'+email,{role:'student',active:true,codeHash:'DO_NOT_PRINT_SECRET_HASH'}],
  [BASE+'/workspaces/demo-workspace',{}],[BASE+'/workspaces/demo-workspace/trainees/synthetic-trainee',{data:{id:'synthetic-trainee',name:'DO_NOT_PRINT_TRAINEE_NAME'}}]
 ]);
 const db={projectId:'universal-iti-dk-staging',doc:p=>p,getAll:async(...paths)=>paths.map(p=>({exists:records.has(p),data:()=>records.get(p)}))};
 return {db,user,records,lookup:async()=>user};
}
test('diagnosis distinguishes missing approval from configured invitation without printing private data',async()=>{
 const f=fixture();let r=await inspectStudentAccess(f.db,f.lookup,email);assert.equal(r.code,'FIRST_ACTIVATION_READY');assert.equal(r.readyForFirstActivation,true);assert.equal(r.dataChanged,false);assert.doesNotMatch(JSON.stringify(r),/DO_NOT_PRINT|synthetic-trainee|synthetic-student|demo-workspace|codeHash/);
 f.records.delete(BASE+'/access/'+email);r=await inspectStudentAccess(f.db,f.lookup,email);assert.equal(r.code,'APPROVAL_MISSING');assert.equal(r.readyForFirstActivation,false);
});
test('consumed code requires reapproval before first activation but not for an existing matching student',async()=>{
 const f=fixture();f.records.get(BASE+'/inviteSecrets/'+email).active=false;
 assert.equal((await inspectStudentAccess(f.db,f.lookup,email)).code,'INSTRUCTOR_REAPPROVAL_REQUIRED');
 f.records.set(BASE+'/members/'+f.user.localId,{uid:f.user.localId,email,role:'student',active:true,owner:false,workspaceIds:['demo-workspace'],traineeId:'synthetic-trainee'});
 assert.equal((await inspectStudentAccess(f.db,f.lookup,email)).readyExistingStudent,true);
});
test('diagnosis rejects wrong roles and missing workspace/trainee links',async()=>{
 const f=fixture(),a=f.records.get(BASE+'/access/'+email);a.role='instructor';assert.equal((await inspectStudentAccess(f.db,f.lookup,email)).code,'APPROVAL_ROLE_OR_EMAIL_MISMATCH');a.role='student';a.workspaceIds=['other-workspace'];assert.equal((await inspectStudentAccess(f.db,f.lookup,email)).code,'TRAINEE_ASSIGNMENT_MISSING');
});
test('absent Auth account is reported without creating one; unexpected lookup errors propagate',async()=>{
 const f=fixture();assert.equal((await inspectStudentAccess(f.db,async()=>{throw Object.assign(Error(),{code:'EXACT_ACCOUNT_NOT_FOUND'});},email)).code,'GOOGLE_FIRST_SIGN_IN_REQUIRED');await assert.rejects(()=>inspectStudentAccess(f.db,async()=>{throw Error('denied');},email),/denied/);
});
test('diagnostic cannot read another project, use path injection or accept a different identity',async()=>{
 const f=fixture();f.db.projectId='production';await assert.rejects(()=>inspectStudentAccess(f.db,f.lookup,email),{code:'TARGET_MISMATCH'});f.db.projectId='universal-iti-dk-staging';await assert.rejects(()=>inspectStudentAccess(f.db,f.lookup,'a/b@example.org'),{code:'INVALID_EMAIL'});await assert.rejects(()=>inspectStudentAccess(f.db,async()=>({...f.user,email:'other@example.org'}),email),{code:'ACCOUNT_MISMATCH'});
});
