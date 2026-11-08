'use strict';
// Staging-only, read-only operator diagnosis. No code hashes, UID, tokens or student records printed.
const {PROJECT,BASE,normalizeEmail,readers}=require('./grant-staging-admin');
const fail=code=>{throw Object.assign(Error(code),{code});};
async function inspectStudentAccess(db,lookup,rawEmail){
 if(db.projectId!==PROJECT)fail('TARGET_MISMATCH');
 const email=normalizeEmail(rawEmail);if(email.includes('/'))fail('INVALID_EMAIL');
 let user=null;try{user=await lookup();}catch(e){if(e.code!=='EXACT_ACCOUNT_NOT_FOUND')throw e;}
 if(user&&(typeof user.localId!=='string'||!user.localId||user.localId.includes('/')||user.email!==email))fail('ACCOUNT_MISMATCH');
 const [access,secret,member]=await db.getAll(db.doc(BASE+'/access/'+email),db.doc(BASE+'/inviteSecrets/'+email),db.doc(BASE+'/members/'+(user?.localId||'__missing_student_diagnostic__')));
 const a=access.exists?access.data():null,s=secret.exists?secret.data():null,m=user&&member.exists?member.data():null;
 const ids=Array.isArray(a?.workspaceIds)?a.workspaceIds:[];
 const validId=x=>typeof x==='string'&&x.length>0&&!x.includes('/')&&x!=='.'&&x!=='..';
 const assignment=ids.length===1&&validId(ids[0])&&validId(a?.traineeId);
 let workspaceExists=false,traineeLinked=false;
 if(assignment){const [w,t]=await db.getAll(db.doc(BASE+'/workspaces/'+ids[0]),db.doc(BASE+'/workspaces/'+ids[0]+'/trainees/'+a.traineeId));workspaceExists=w.exists;traineeLinked=t.exists&&t.data()?.data?.id===a.traineeId;}
 const googleProvider=!!user?.providerUserInfo?.some(p=>p.providerId==='google.com'),emailVerified=user?.emailVerified===true,disabled=user?.disabled===true;
 const approvalStudent=a?.role==='student'&&a?.email===email,approvalActive=a?.active===true,activationCodeActive=s?.active===true&&s?.role==='student'&&typeof s.codeHash==='string'&&s.codeHash.length>0;
 const membershipMatches=!!m&&m.uid===user.localId&&m.email===email&&m.role==='student'&&m.owner===false&&m.active===true&&m.traineeId===a?.traineeId&&JSON.stringify(m.workspaceIds)===JSON.stringify(ids);
 const configured=approvalStudent&&approvalActive&&workspaceExists&&traineeLinked;
 const readyForFirstActivation=configured&&googleProvider&&emailVerified&&!disabled&&!m&&activationCodeActive,readyExistingStudent=configured&&membershipMatches&&googleProvider&&emailVerified&&!disabled;
 const code=!access.exists?'APPROVAL_MISSING':!approvalStudent?'APPROVAL_ROLE_OR_EMAIL_MISMATCH':!approvalActive?'APPROVAL_DISABLED':!assignment||!workspaceExists||!traineeLinked?'TRAINEE_ASSIGNMENT_MISSING':!user?'GOOGLE_FIRST_SIGN_IN_REQUIRED':disabled?'AUTH_ACCOUNT_DISABLED':!googleProvider||!emailVerified?'VERIFIED_GOOGLE_IDENTITY_REQUIRED':m&&!membershipMatches?'MEMBERSHIP_MISMATCH':readyExistingStudent?'EXISTING_STUDENT_CONFIGURED':!activationCodeActive?'INSTRUCTOR_REAPPROVAL_REQUIRED':'FIRST_ACTIVATION_READY';
 return {ok:true,project:PROJECT,readOnly:true,dataChanged:false,code,accountExists:!!user,googleProvider,emailVerified,disabled,approvalExists:access.exists,approvalStudent,approvalActive,activationCodeActive,assignedWorkspaceCount:ids.length,workspaceExists,traineeLinked,membershipExists:!!m,membershipMatches,readyForFirstActivation,readyExistingStudent,loginTested:false};
}
async function main(){
 let db;try{
  if(process.argv.length!==4||process.argv[2]!=='--email'||process.env.FIRESTORE_EMULATOR_HOST)fail('INVALID_ARGUMENTS');
  const email=normalizeEmail(process.argv[3]);if(email.includes('/'))fail('INVALID_EMAIL');
  const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
  const accessToken=async()=>{try{return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{fail('GCLOUD_LOGIN_REQUIRED');}};
  db=await require('./inspect-dtp-source').createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,projectId:PROJECT,accessToken});
  console.log(JSON.stringify(await inspectStudentAccess(db,readers({accessToken,email}).lookup,email),null,2));
 }catch(e){const allowed=['TARGET_MISMATCH','EXPLICIT_APPROVED_EMAIL_REQUIRED','INVALID_EMAIL','INVALID_ARGUMENTS','ACCOUNT_MISMATCH','GCLOUD_LOGIN_REQUIRED','OPERATOR_READ_DENIED'];console.error(JSON.stringify({ok:false,project:PROJECT,readOnly:true,dataChanged:false,code:allowed.includes(e?.code)?e.code:'READ_ONLY_CHECK_UNAVAILABLE'}));process.exitCode=1;
 }finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({ok:false,project:PROJECT,readOnly:true,dataChanged:false,code:'CLEANUP_FAILED'}));process.exitCode=1;});
module.exports={inspectStudentAccess};
