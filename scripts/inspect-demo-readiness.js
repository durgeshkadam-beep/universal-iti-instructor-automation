'use strict';
// Operator-only read checks; never changes accounts, passwords or records.
const {createInventoryDatabase,failureReport,summary}=require('./inspect-dtp-source');
const {databaseEdition}=require('./transfer-dtp-staging');
const PROJECT='universal-iti-dk-staging',BASE='institutes/brdbagiti-mumbai-01',WORKSPACE='staging-dtp-2026';
const ROLES=['admin','principal','instructor','staff','student'];
async function inspectDemo(db,auth){
 if(db.projectId!==PROJECT)throw Object.assign(Error('Target mismatch'),{code:'TARGET_MISMATCH'});
 const institute=await db.doc(BASE).get(),workspace=await db.doc(BASE+'/workspaces/'+WORKSPACE).get();
 const accounts=[];let studentTraineeId=null;
 for(const role of ROLES){
  const uid='staging-'+role,snap=await db.doc(BASE+'/members/'+uid).get(),m=snap.data()||{};
  let user;try{user=await auth.getUser(uid);}catch(error){if(error.code!=='auth/user-not-found')throw error;}
  const accountMatches=!!user&&user.email===role+'@iti-staging.example.test';
  const memberMatches=snap.exists&&m.email===role+'@iti-staging.example.test'&&m.uid===uid;
  const roleMatches=role==='admin'?m.owner===true&&m.role==='instructor'&&institute.data()?.ownerUid===uid:m.owner!==true&&m.role===role;
  const workspaceAssigned=Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(WORKSPACE);
  const otherWorkspaceAssignments=Array.isArray(m.workspaceIds)?m.workspaceIds.filter(x=>x!==WORKSPACE).length:0;
  const passwordProvider=!!user?.providerData?.some(p=>p.providerId==='password');
  const active=!!user&&!user.disabled&&m.active===true;
  const traineeId=role==='student'&&typeof m.traineeId==='string'&&!m.traineeId.includes('/')?m.traineeId:null;
  if(role==='student')studentTraineeId=traineeId;
  const traineeLinked=role!=='student'||!!traineeId&&(await db.doc(BASE+'/workspaces/'+WORKSPACE+'/trainees/'+traineeId).get()).exists;
  accounts.push({role,instituteId:role,accountExists:!!user,accountMatches,memberMatches,roleMatches,active,passwordProvider,
   emailVerified:!!user?.emailVerified,workspaceAssigned,otherWorkspaceAssignments,traineeLinked,
   ready:accountMatches&&memberMatches&&roleMatches&&active&&passwordProvider&&!!user?.emailVerified&&workspaceAssigned&&traineeLinked&&otherWorkspaceAssignments===0});
 }
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
async function main(){
 const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{initializeApp,deleteApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth');
 const {GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
 const accessToken=async()=>{try{return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{throw Object.assign(Error('Login unavailable'),{code:'GCLOUD_LOGIN_REQUIRED'});}};
 let db,app;try{
  await databaseEdition(PROJECT,accessToken);
  db=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken,projectId:PROJECT});
  app=initializeApp({projectId:PROJECT,credential:{getAccessToken:async()=>({access_token:await accessToken(),expires_in:300})}},'read-only-demo-readiness');
  console.log(JSON.stringify(await inspectDemo(db,getAuth(app)),null,2));
 }finally{if(db)await db.terminate();if(app)await deleteApp(app);}
}
if(require.main===module)main().catch(error=>{const result=failureReport(error,'demo-readiness');result.project=PROJECT;console.error(JSON.stringify(result,null,2));process.exitCode=1;});
module.exports={inspectDemo};
