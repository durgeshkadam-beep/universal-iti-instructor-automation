'use strict';
// Operator-only read checks; never changes accounts, passwords or records.
const {createInventoryDatabase,failureReport,summary}=require('./inspect-dtp-source');
const {databaseEdition}=require('./transfer-dtp-staging');
const PROJECT='universal-iti-dk-staging',BASE='institutes/brdbagiti-mumbai-01',WORKSPACE='staging-dtp-2026';
const ROLES=['admin','principal','instructor','staff','student'];
async function inspectDemo(db,auth,{onStage=()=>{}}={}){
 if(db.projectId!==PROJECT)throw Object.assign(Error('Target mismatch'),{code:'TARGET_MISMATCH'});
 onStage('firestore-institute');
 const institute=await db.doc(BASE).get(),workspace=await db.doc(BASE+'/workspaces/'+WORKSPACE).get();
 const accounts=[];let studentTraineeId=null;
 for(const role of ROLES){
  onStage('firestore-membership');
  const uid='staging-'+role,snap=await db.doc(BASE+'/members/'+uid).get(),m=snap.data()||{};
  onStage('auth-account-lookup');
  let user;try{user=await auth.getUser(uid);}catch(error){if(error.code!=='auth/user-not-found')throw error;}
  const accountMatches=!!user&&user.email===role+'@iti-staging.example.test';
  const memberMatches=snap.exists&&m.email===role+'@iti-staging.example.test'&&m.uid===uid;
  const roleMatches=role==='admin'?m.owner===true&&m.role==='instructor'&&institute.data()?.ownerUid===uid:m.owner!==true&&m.role===role;
  const workspaceAssigned=Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(WORKSPACE);
  const otherWorkspaceAssignments=Array.isArray(m.workspaceIds)?m.workspaceIds.filter(x=>x!==WORKSPACE).length:0;
  const passwordProvider=!!user?.providerData?.some(p=>p.providerId==='password');
  const active=!!user&&!user.disabled&&m.active===true;
  onStage('firestore-trainee-link');
  const traineeId=role==='student'&&typeof m.traineeId==='string'&&!m.traineeId.includes('/')?m.traineeId:null;
  if(role==='student')studentTraineeId=traineeId;
  const traineeLinked=role!=='student'||!!traineeId&&(await db.doc(BASE+'/workspaces/'+WORKSPACE+'/trainees/'+traineeId).get()).exists;
  accounts.push({role,instituteId:role,accountExists:!!user,accountMatches,memberMatches,roleMatches,active,passwordProvider,
   emailVerified:!!user?.emailVerified,workspaceAssigned,otherWorkspaceAssignments,traineeLinked,
   ready:accountMatches&&memberMatches&&roleMatches&&active&&passwordProvider&&!!user?.emailVerified&&workspaceAssigned&&traineeLinked&&otherWorkspaceAssignments===0});
 }
 onStage('firestore-demo-records');
 const ws=db.doc(BASE+'/workspaces/'+WORKSPACE),sections={};
 for(const section of ['trainees','practicals','theory']){const snap=await ws.collection(section).get();sections[section]=summary(snap.docs.map(d=>d.data()));}
 const review=await ws.collection('skillVerifications').doc('staging-student').get();
 const v=review.data()||{},linked=accounts.find(x=>x.role==='student').traineeLinked;
 const verificationLinked=review.exists&&v.studentUid==='staging-student'&&v.workspaceId===WORKSPACE&&v.traineeId===studentTraineeId&&linked;
 return {project:PROJECT,workspace:WORKSPACE,readOnly:true,dataChanged:false,accounts,
  accountsConfigured:workspace.exists&&accounts.every(a=>a.ready),passwordSignInTested:false,
  fixtureSections:sections,savedPracticalPlanAvailable:sections.practicals.withPlan>0,savedLessonPlanAvailable:sections.theory.withPlan>0,
  verificationLinked,fullLiveDemoAccepted:false,
  note:'Configuration checks do not prove password login, AI generation or save/reload. Admin and Principal retain their existing institute-wide authority; other roles must remain in the synthetic workspace. No credentials are printed.'};
}
function createAuthReader({accessToken,request=fetch}){
 return {getUser:async uid=>{
  if(!ROLES.some(role=>uid==='staging-'+role))throw Object.assign(Error('Unexpected account'),{code:'AUTH_ACCOUNT_NOT_ALLOWLISTED'});
  const response=await request('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+'/accounts:lookup',{
   method:'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},body:JSON.stringify({localId:[uid]}),signal:AbortSignal.timeout(30000)
  });
  if(!response.ok){
   // Never return provider error text, resource identifiers, tokens or account details.
   const code=response.status===403?'PERMISSION_DENIED':response.status===401?'UNAUTHENTICATED':'AUTH_LOOKUP_FAILED';
   throw Object.assign(Error('Account lookup unavailable'),{code,httpStatus:response.status});
  }
  const result=await response.json(),users=result.users||[];
  if(!users.length)throw Object.assign(Error('Demo account missing'),{code:'auth/user-not-found'});
  if(users.length!==1||users[0].localId!==uid)throw Object.assign(Error('Account mismatch'),{code:'AUTH_RESPONSE_MISMATCH'});
  const user=users[0];return {uid:user.localId,email:user.email,disabled:user.disabled===true,emailVerified:user.emailVerified===true,
   providerData:(user.providerUserInfo||[]).map(p=>({providerId:p.providerId}))};
 }};
}
async function main(){
 let stage='dependencies',db;
 try{
  const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore');
  const {GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
  const accessToken=async()=>{try{return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{throw Object.assign(Error('Login unavailable'),{code:'GCLOUD_LOGIN_REQUIRED'});}};
  stage='database-metadata';await databaseEdition(PROJECT,accessToken);
  stage='firestore-initialization';db=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken,projectId:PROJECT});
  console.log(JSON.stringify(await inspectDemo(db,createAuthReader({accessToken}),{onStage:value=>{stage=value;}}),null,2));
 }catch(error){
  const result=failureReport(error,stage);result.project=PROJECT;
  if(['AUTH_LOOKUP_FAILED','AUTH_RESPONSE_MISMATCH','AUTH_ACCOUNT_NOT_ALLOWLISTED','TARGET_MISMATCH'].includes(error.code)){result.code=error.code;result.hint='Read-only demo inspection stopped; share only this diagnostic summary.';}
  if(Number.isInteger(error.httpStatus)&&error.httpStatus>=100&&error.httpStatus<=599)result.httpStatus=error.httpStatus;
  if(result.code==='UNKNOWN')result.errorKind=['TypeError','RangeError','SyntaxError','Error'].includes(error.name)?error.name:'Other';
  console.error(JSON.stringify(result,null,2));process.exitCode=1;
 }finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({project:PROJECT,readOnly:true,ok:false,stage:'cleanup',code:'CLEANUP_FAILED',dataChanged:false}));process.exitCode=1;});
module.exports={inspectDemo,createAuthReader};
