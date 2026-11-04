'use strict';
// Operator-only fixture creation. No passwords/tokens are embedded or published.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),runtime=require('../config/staging.public.json');
const PROJECT=runtime.firebaseConfig.projectId,roles=['admin','principal','instructor','staff','student'];
async function seed(){
 if(PROJECT!=='universal-iti-dk-staging'||process.env.GCLOUD_PROJECT!==PROJECT||process.env.ALLOW_STAGING_BOOTSTRAP!=='true')throw Error('Explicit isolated staging project and bootstrap acknowledgement required');
 const target=path.resolve(process.env.ITI_STAGING_CREDENTIALS_FILE||'');
 if(!process.env.ITI_STAGING_CREDENTIALS_FILE||target===ROOT||target.startsWith(ROOT+path.sep))throw Error('Credentials output must be outside the repository');
 const authTools=require('firebase-tools/lib/auth'),api=require('firebase-tools/lib/api'),account=authTools.getGlobalDefaultAccount();
 if(!account?.tokens?.refresh_token)throw Error('Firebase CLI login required');
 const credentials={type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token};
 const {initializeApp,refreshToken,deleteApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{Firestore}=require('@google-cloud/firestore');
 const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 const agent=proxy?new (require('https-proxy-agent').HttpsProxyAgent)(proxy):undefined;
 const {GoogleAuth}=require(require.resolve('google-auth-library',{paths:[require.resolve('google-gax')]}));
 const googleAuth=new GoogleAuth({credentials,projectId:PROJECT,scopes:['https://www.googleapis.com/auth/cloud-platform']});
 // Google GAX supplies its own keepalive agent; retain this environment's required proxy.
 if(agent){const fetch=googleAuth.fetch.bind(googleAuth);googleAuth.fetch=(url,options)=>fetch(url,{...options,agent});}
 const app=initializeApp({projectId:PROJECT,credential:refreshToken(credentials,agent),httpAgent:agent},'staging-fixtures');
 const db=new Firestore({projectId:PROJECT,auth:googleAuth,preferRest:true}),auth=getAuth(app),base='institutes/brdbagiti-mumbai-01',workspace='staging-dtp-2026';
 try{
  const existing=await db.doc(base).get(),rotate=process.argv.includes('--rotate-test-passwords');
  if(existing.exists&&(!rotate||existing.data().ownerUid!=='staging-admin'))throw Error('Staging institute already exists; refusing to overwrite any records');
  if(rotate&&!existing.exists)throw Error('Password rotation requires existing synthetic staging institute');
  let logins=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):roles.map(role=>({role,uid:'staging-'+role,email:role+'@iti-staging.example.test',password:crypto.randomBytes(18).toString('base64url')}));
  if(logins.length!==roles.length||!roles.every(role=>logins.some(x=>x.role===role&&x.uid==='staging-'+role&&x.email===role+'@iti-staging.example.test'&&typeof x.password==='string'&&x.password.length>=20)))throw Error('Unexpected existing fixture credentials');
  fs.writeFileSync(target,JSON.stringify(logins,null,2)+'\n',{mode:0o600});fs.chmodSync(target,0o600);
  for(const login of logins){
   try{const user=await auth.getUser(login.uid);if(user.email!==login.email||user.disabled)throw Error('Existing Auth fixture identity mismatch');if(rotate)await auth.updateUser(login.uid,{password:login.password});}
   catch(error){if(error.code!=='auth/user-not-found')throw error;await auth.createUser({uid:login.uid,email:login.email,password:login.password,emailVerified:true,displayName:'Synthetic '+login.role});}
  }
  if(rotate){console.log('Rotated passwords for five known synthetic Auth users; no Firestore records modified.');return;}
  await db.runTransaction(async tx=>{
   if((await tx.get(db.doc(base))).exists)throw Error('Institute created concurrently; refusing overwrite');
   tx.create(db.doc(base),{name:'STAGING ITI — Synthetic Data',code:'STAGING',ownerUid:'staging-admin',schemaVersion:15});
   tx.create(db.doc(base+'/workspaces/'+workspace),{name:'Synthetic DTP workspace',trade:'DTP',session:'2026-27',batch:'TEST',status:'active',schemaVersion:15,arraySections:['trainees','practicals','theory','notices','holidays','leaves'],mapSections:['attendance','marks','submissions']});
   for(const login of logins)tx.create(db.doc(base+'/members/'+login.uid),{uid:login.uid,email:login.email,displayName:'Synthetic '+login.role,role:login.role==='admin'?'instructor':login.role,active:true,owner:login.role==='admin',workspaceIds:[workspace],traineeId:login.role==='student'?'test-student-1':null});
   const ws=base+'/workspaces/'+workspace;
   tx.create(db.doc(ws+'/trainees/test-student-1'),{data:{id:'test-student-1',roll:'TEST-01',name:'Synthetic Student One',gender:'Male'}});
   tx.create(db.doc(ws+'/practicals/n-1'),{data:{no:1,title:'Page layout fundamentals',hours:7}});
   tx.create(db.doc(ws+'/practicals/n-2'),{data:{no:2,title:'Typography and text alignment',hours:7}});
   tx.create(db.doc(ws+'/notices/staging-welcome'),{data:{id:'staging-welcome',title:'Staging test workspace',body:'All records here are synthetic. Try the skill passport, learning plan, attendance and guidance screens. No live job vacancies are seeded.'}});
   tx.create(db.doc(ws+'/skillVerifications/staging-student'),{studentUid:'staging-student',traineeId:'test-student-1',workspaceId:workspace,skills:{'practical-1':{status:'verified',title:'Page layout fundamentals',evidence:'Synthetic assessed practice exercise',verifiedBy:'staging-instructor',verifiedAt:new Date()}},updatedAt:new Date(),updatedBy:'staging-instructor'});
  });
  console.log('Created five synthetic staging accounts and isolated fixture records. Credentials saved privately outside the repository.');
 }finally{await db.terminate();await deleteApp(app);}
}
if(require.main===module)seed().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={seed};
