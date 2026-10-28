'use strict';
// Read-only staging preflight. No raw account identities, setup secrets or tokens.
const PROJECT='universal-iti-dk-staging',INSTITUTE='brdbagiti-mumbai-01';
const fail=code=>{throw Object.assign(Error(code),{code});};
async function inspect({db,readConfig,lookupUser}){
 const root=db.doc('institutes/'+INSTITUTE),snap=await root.get();if(!snap.exists)fail('INSTITUTE_MISSING');
 const ownerUid=snap.data().ownerUid;if(typeof ownerUid!=='string'||!ownerUid||ownerUid.includes('/'))fail('OWNER_MISSING');
 const principals=await root.collection('members').where('role','==','principal').get();
 const identities=[{uid:ownerUid,role:'owner'},...principals.docs.filter(d=>d.data().active===true&&d.id!==ownerUid).map(d=>({uid:d.id,role:'principal'}))];
 const config=await readConfig(),accounts=[];
 for(const row of identities){
  const user=await lookupUser(row.uid),mfa=Array.isArray(user?.mfaInfo)?user.mfaInfo:[];
  const address=String(user?.email||'').toLowerCase(),domain=address.split('@')[1]||'';
  accounts.push({role:row.role,accountExists:!!user,disabled:user?.disabled===true,verifiedEmail:user?.emailVerified===true,potentialRecoveryInbox:!!address&&!/\.(test|invalid|example)$/.test(domain),totpEnrolled:mfa.some(f=>Object.hasOwn(f,'totpInfo')),enrolledFactors:mfa.length});
 }
 return {ok:true,project:PROJECT,readOnly:true,dataChanged:false,totpProviderEnabled:config?.mfa?.providerConfigs?.some(p=>p.state==='ENABLED'&&Object.hasOwn(p,'totpProviderConfig'))===true,privilegedAccounts:accounts,
  allPrivilegedTotpEnrolled:accounts.length>0&&accounts.every(a=>a.accountExists&&!a.disabled&&a.verifiedEmail&&a.totpEnrolled),
  applicationPolicyEnforced:false,liveChallengeTested:false,recoveryTested:false,
  note:'Enrollment and configured provider do not prove enforced MFA, mailbox delivery or recovery. No enrollment, IAM grant, billing upgrade, reset or policy change was performed.'};
}
function readers({accessToken,request=fetch}){
 async function read(url,options={}){
  const response=await request(url,{...options,headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json','x-goog-user-project':PROJECT},signal:AbortSignal.timeout(30000)});
  if(!response.ok)fail(response.status===403?'AUTH_CONFIGURATION_PERMISSION_DENIED':response.status===401?'GCLOUD_LOGIN_REQUIRED':'AUTH_READ_UNAVAILABLE');
  return response.json();
 }
 return {readConfig:()=>read('https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT+'/config'),lookupUser:async uid=>{
  const out=await read('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+'/accounts:lookup',{method:'POST',body:JSON.stringify({localId:[uid]})});
  return out.users?.find(u=>u.localId===uid)||null;
 }};
}
async function main(){
 let db;try{
  if(process.argv.length!==2||process.env.FIRESTORE_EMULATOR_HOST)fail('INVALID_ARGUMENTS');
  const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
  const accessToken=async()=>{try{const token=execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();if(!token)fail('GCLOUD_LOGIN_REQUIRED');return token;}catch{fail('GCLOUD_LOGIN_REQUIRED');}};
  db=await require('./inspect-dtp-source').createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,projectId:PROJECT,accessToken});
  console.log(JSON.stringify(await inspect({db,...readers({accessToken})}),null,2));
 }catch(e){console.error(JSON.stringify({ok:false,project:PROJECT,readOnly:true,dataChanged:false,code:['AUTH_CONFIGURATION_PERMISSION_DENIED','AUTH_READ_UNAVAILABLE','GCLOUD_LOGIN_REQUIRED','INSTITUTE_MISSING','OWNER_MISSING','INVALID_ARGUMENTS'].includes(e?.code)?e.code:'SECURITY_READINESS_UNAVAILABLE',hint:'Use the existing authorised Google Cloud account. Auth configuration/account-read permission differs from Firestore access. Do not relax rules, grant IAM or enable billing automatically; share only this safe summary.'}));process.exitCode=1;}
 finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({ok:false,code:'SECURITY_READINESS_CLEANUP_FAILED',readOnly:true,dataChanged:false}));process.exitCode=1;});
module.exports={inspect,readers,PROJECT};
