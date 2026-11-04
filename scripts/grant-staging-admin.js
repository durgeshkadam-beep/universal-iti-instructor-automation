'use strict';
// Explicit operator action for an approved email supplied privately on the CLI. Preview is read-only.
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const PROJECT='universal-iti-dk-staging',BASE='institutes/brdbagiti-mumbai-01',API='https://universal-iti-staging-api.onrender.com';
const fail=code=>{throw Object.assign(Error(code),{code});};
function normalizeEmail(v){const email=typeof v==='string'?v.trim().toLowerCase():'';if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/\.(test|invalid|example)$/.test(email.split('@')[1]))fail('EXPLICIT_APPROVED_EMAIL_REQUIRED');return email;}
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));return x;}
const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify(canonical(JSON.parse(JSON.stringify(x))))).digest('hex');
function validateUser(u,expectedEmail){
 const email=normalizeEmail(expectedEmail);
 if(!u||typeof u.localId!=='string'||!u.localId||u.localId.length>128||u.localId.includes('/')||u.email!==email||u.disabled===true||u.emailVerified!==true||!u.providerUserInfo?.some(p=>p.providerId==='google.com'))fail('VERIFIED_GOOGLE_ACCOUNT_REQUIRED');
 return {uid:u.localId,email,verified:true,google:true};
}
function validateState(user,state){
 if(!state.institute||typeof state.institute.ownerUid!=='string'||!state.institute.ownerUid)fail('INSTITUTE_MISSING');
 const m=state.member;
 if(!m||m.uid!==user.uid||m.email!==user.email||m.active!==true||m.deleted===true||!['instructor','principal'].includes(m.role)||!Array.isArray(m.workspaceIds))fail('EXISTING_ACTIVE_MEMBERSHIP_REQUIRED');
 if(state.grant&&(typeof state.grant.active!=='boolean'||!require('../shared/admin-authority').validGrant({...state.grant,active:true})||state.grant.uid!==user.uid||state.grant.email!==user.email))fail('EXISTING_GRANT_CONFLICT');
}
async function prepare(db,lookup,email){
 if(db.projectId!==PROJECT)fail('TARGET_MISMATCH');const user=validateUser(await lookup(),email);
 const [i,m,g]=await db.getAll(db.doc(BASE),db.doc(BASE+'/members/'+user.uid),db.doc(BASE+'/systemAdmins/'+user.uid));
 const state={institute:i.exists?i.data():null,member:m.exists?m.data():null,grant:g.exists?g.data():null};validateState(user,state);
 const bound={rootOwnerUid:state.institute.ownerUid,user,member:state.member,grant:state.grant};
 return {user,state,fingerprint:fingerprint(bound),alreadyConfigured:state.institute.ownerUid===user.uid&&state.member.owner===true||require('../shared/admin-authority').allowed(state.grant,state.member,{uid:user.uid,email:user.email,email_verified:true,firebase:{sign_in_provider:'google.com'}})};
}
function summary(p,mode='preview'){
 return {ok:true,mode,project:PROJECT,targetEmail:p.user.email,existingGoogleAccountMatched:true,existingMembershipMatched:true,requestedViews:['admin','principal'],instructorRoleRetained:p.state.member.role==='instructor',uidRetained:true,workspaceAssignmentsRetained:true,existingRootOwnerPreserved:true,demoAccountsPreserved:true,alreadyConfigured:p.alreadyConfigured,fingerprint:p.fingerprint,dataChanged:false,passwordChanged:false,mfaEnrolled:false,
  note:'Preview does not grant access. Rules, Hosting and backend delegation support must be deployed to staging before apply. Production and MFA enrollment are separate.'};
}
async function apply(db,p,{confirmProject,confirmEmail,expectedFingerprint,lookup,checkDeployment,onWriteAttempt=()=>{}}={}){
 if(db.projectId!==PROJECT||confirmProject!==PROJECT||confirmEmail!==p.user.email||expectedFingerprint!==p.fingerprint)fail('CONFIRMATION_MISMATCH');
 const currentUser=validateUser(await lookup(),p.user.email);if(currentUser.uid!==p.user.uid)fail('ACCOUNT_CHANGED');
 if(p.alreadyConfigured)return {...summary(p,'apply'),verified:true};
 if(typeof checkDeployment!=='function')fail('DEPLOYMENT_CHECK_REQUIRED');await checkDeployment();
 const when=new Date().toISOString(),grant={uid:p.user.uid,email:p.user.email,active:true,googleOnly:true,schemaVersion:1,createdAt:p.state.grant?.createdAt||when,createdBy:p.state.grant?.createdBy||'authorised-staging-operator',updatedAt:when,updatedBy:'authorised-staging-operator'};
 const audit=db.doc(BASE+'/auditLog/admin-grant-'+crypto.randomUUID());
 await db.runTransaction(async tx=>{
  const [i,m,g]=await Promise.all([tx.get(db.doc(BASE)),tx.get(db.doc(BASE+'/members/'+p.user.uid)),tx.get(db.doc(BASE+'/systemAdmins/'+p.user.uid))]);
  const state={institute:i.exists?i.data():null,member:m.exists?m.data():null,grant:g.exists?g.data():null};validateState(p.user,state);
  if(fingerprint({rootOwnerUid:state.institute.ownerUid,user:p.user,member:state.member,grant:state.grant})!==p.fingerprint)fail('PREVIEW_CHANGED');
  onWriteAttempt();
  tx.set(db.doc(BASE+'/systemAdmins/'+p.user.uid),grant);
  // Keep the same Firebase UID, saved role, name and assignments. Root owner is untouched.
  tx.update(db.doc(BASE+'/members/'+p.user.uid),{owner:true,updatedAt:when,updatedBy:'authorised-staging-operator'});
  tx.create(audit,{action:'systemAdmin.grant.operator',targetUid:p.user.uid,requestedViews:['admin','principal'],createdAt:when,createdBy:'authorised-staging-operator'});
 });
 const after=await prepare(db,lookup,p.user.email);
 if(!after.alreadyConfigured||after.state.institute.ownerUid!==p.state.institute.ownerUid||JSON.stringify(after.state.member.workspaceIds)!==JSON.stringify(p.state.member.workspaceIds)||after.state.member.role!==p.state.member.role)fail('READBACK_MISMATCH');
 return {...summary(after,'apply'),verified:true,dataChanged:true};
}
function readers({accessToken,request=fetch,email}){
 const targetEmail=normalizeEmail(email);
 async function read(url,options={}){
  const r=await request(url,{...options,headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json','x-goog-user-project':PROJECT},signal:AbortSignal.timeout(30000)});
  if(!r.ok)fail('OPERATOR_READ_DENIED');return r.json();
 }
 return {lookup:async()=>{
  const data=await read('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+'/accounts:lookup',{method:'POST',body:JSON.stringify({email:[targetEmail]})});
  if(data.users?.length!==1)fail('EXACT_ACCOUNT_NOT_FOUND');return data.users[0];
 },checkDeployment:async()=>{
  const release=await read('https://firebaserules.googleapis.com/v1/projects/'+PROJECT+'/releases/cloud.firestore');
  if(typeof release.rulesetName!=='string'||!release.rulesetName.startsWith('projects/'+PROJECT+'/rulesets/'))fail('RULES_NOT_DEPLOYED');
  const ruleset=await read('https://firebaserules.googleapis.com/v1/'+release.rulesetName),content=ruleset.source?.files?.find(f=>f.name==='firestore.rules')?.content;
  if(typeof content!=='string'||crypto.createHash('sha256').update(content).digest('hex')!==crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../firestore.rules'))).digest('hex'))fail('RULES_NOT_DEPLOYED');
  const marker=await request(API+'/security-version',{signal:AbortSignal.timeout(45000)});
  if(!marker.ok||(await marker.json()).adminDelegation!=='v1')fail('BACKEND_NOT_DEPLOYED');
  const response=await request('https://'+PROJECT+'.web.app/build-manifest.json',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)fail('HOSTING_NOT_DEPLOYED');const manifest=await response.json();
  for(const p of ['shared/admin-authority.js','v15/v15-admin-authority.js','v15/v15-auth-roles-v2.js','v15/index.html'])if(manifest.files?.find(f=>f.path===p)?.sha256!==crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex'))fail('HOSTING_NOT_DEPLOYED');
 }};
}
async function main(){
 let db,writing=false;try{
  const args=process.argv.slice(2),applyMode=args[0]==='--apply';if(applyMode)args.shift();const options={};
  while(args.length){const k=args.shift(),v=args.shift();if(!['--email','--confirm-project','--confirm-email','--expected-fingerprint'].includes(k)||!v||k in options)fail('INVALID_ARGUMENTS');options[k]=v;}
  if(!options['--email']||!applyMode&&Object.keys(options).length!==1||applyMode&&Object.keys(options).length!==4||process.env.FIRESTORE_EMULATOR_HOST)fail('INVALID_ARGUMENTS');normalizeEmail(options['--email']);
  const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
  const accessToken=async()=>{try{return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{fail('GCLOUD_LOGIN_REQUIRED');}};
  db=await require('./inspect-dtp-source').createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,projectId:PROJECT,accessToken});const remote=readers({accessToken,email:options['--email']}),p=await prepare(db,remote.lookup,options['--email']);
  if(!applyMode){console.log(JSON.stringify(summary(p),null,2));return;}
  console.log(JSON.stringify(await apply(db,p,{confirmProject:options['--confirm-project'],confirmEmail:options['--confirm-email'],expectedFingerprint:options['--expected-fingerprint'],onWriteAttempt:()=>{writing=true;},...remote}),null,2));
 }catch(e){const allowed=['GCLOUD_LOGIN_REQUIRED','EXPLICIT_APPROVED_EMAIL_REQUIRED','EXACT_ACCOUNT_NOT_FOUND','VERIFIED_GOOGLE_ACCOUNT_REQUIRED','EXISTING_ACTIVE_MEMBERSHIP_REQUIRED','EXISTING_GRANT_CONFLICT','OPERATOR_READ_DENIED','RULES_NOT_DEPLOYED','BACKEND_NOT_DEPLOYED','HOSTING_NOT_DEPLOYED','CONFIRMATION_MISMATCH','PREVIEW_CHANGED','ACCOUNT_CHANGED','TARGET_MISMATCH','INVALID_ARGUMENTS','DEPLOYMENT_CHECK_REQUIRED','READBACK_MISMATCH'];console.error(JSON.stringify({ok:false,project:PROJECT,code:allowed.includes(e?.code)?e.code:'ADMIN_GRANT_FAILED',dataChanged:writing?'unknown':false,hint:'Share only this safe summary. Preview is read-only. Do not change account email/password or transfer the existing root owner. No production grant is supported.'}));process.exitCode=1;}
 finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({ok:false,code:'GRANT_CLEANUP_FAILED',dataChanged:'unknown'}));process.exitCode=1;});
module.exports={PROJECT,BASE,normalizeEmail,validateUser,prepare,summary,apply,readers,fingerprint};
