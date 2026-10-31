'use strict';
// Explicit operator-only reset of five known synthetic identities. Never prints passwords.
const PROJECT='universal-iti-dk-staging',ROLES=['admin','principal','instructor','staff','student'];
async function resetPasswords({report,confirmProject,accessToken,request=fetch,savePrivate,randomPassword}){
 if(confirmProject!==PROJECT||report.project!==PROJECT||report.accountsConfigured!==true||report.workspace!=='staging-dtp-2026'||report.accounts?.length!==5||!ROLES.every(role=>report.accounts.some(a=>a.role===role&&a.ready===true)))throw Object.assign(Error('Demo readiness required'),{code:'RESET_PRECONDITION_FAILED'});
 const rows=ROLES.map(role=>({role,instituteId:role,email:role+'@iti-staging.example.test',password:randomPassword(),status:'pending'}));
 await savePrivate(rows,true); // A durable private copy must exist before any remote credential change.
 for(const row of rows){
  try{
   const response=await request('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+'/accounts:update',{
    method:'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body:JSON.stringify({localId:'staging-'+row.role,password:row.password}),signal:AbortSignal.timeout(30000)
   });
   if(!response.ok)throw Object.assign(Error('Demo reset rejected'),{code:'AUTH_RESET_REJECTED',httpStatus:response.status});
   // Discard response bodies: never retain provider tokens or credentials.
   row.status='reset';await savePrivate(rows,false);
  }catch(error){row.status='check-required';await savePrivate(rows,false);throw Object.assign(Error('Reset interrupted; retain the private file and inspect statuses before retrying'),{code:'RESET_INTERRUPTED',role:row.role,httpStatus:error.httpStatus});}
 }
 return {ok:true,project:PROJECT,resetAccounts:5,rolesChanged:false,firestoreChanged:false,passwordsPrinted:false,passwordSignInTested:false};
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==3||args[0]!=='--reset'||args[1]!=='--confirm-project'||args[2]!==PROJECT)throw Object.assign(Error('Use explicit --reset --confirm-project universal-iti-dk-staging'),{code:'EXPLICIT_RESET_REQUIRED'});
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
 const {createInventoryDatabase}=require('./inspect-dtp-source'),{databaseEdition}=require('./transfer-dtp-staging'),{inspectDemo,createAuthReader}=require('./inspect-demo-readiness');
 const {Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
 const accessToken=async()=>execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 let db;
 try{
  await databaseEdition(PROJECT,accessToken);db=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken,projectId:PROJECT});
  const report=await inspectDemo(db,createAuthReader({accessToken}));
  const dir=path.join(os.homedir(),'eduskill-demo-private');
  if(!fs.existsSync(dir))fs.mkdirSync(dir,{mode:0o700});
  const stat=fs.lstatSync(dir);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077))throw Object.assign(Error('Private directory must be a real directory with mode 700'),{code:'PRIVATE_DIRECTORY_REQUIRED'});
  const file=path.join(dir,'demo-logins-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.json');let fd;
  try{
   const result=await resetPasswords({report,confirmProject:PROJECT,accessToken,randomPassword:()=>crypto.randomBytes(24).toString('base64url'),savePrivate:async(rows,first)=>{
    if(first)fd=fs.openSync(file,'wx',0o600);
    const data=Buffer.from(JSON.stringify(rows,null,2)+'\n');let offset=0;while(offset<data.length)offset+=fs.writeSync(fd,data,offset,data.length-offset,offset);fs.ftruncateSync(fd,data.length);fs.fsyncSync(fd);
   }});
   console.log(JSON.stringify({...result,privateCredentialsFile:file},null,2));
  }finally{if(fd!==undefined)fs.closeSync(fd);}
 }finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(error=>{const allowed=['RESET_PRECONDITION_FAILED','EXPLICIT_RESET_REQUIRED','PRIVATE_DIRECTORY_REQUIRED','RESET_INTERRUPTED'];console.error(JSON.stringify({ok:false,project:PROJECT,code:allowed.includes(error.code)?error.code:'RESET_FAILED',passwordsPrinted:false,credentialsMayHaveChanged:error.code==='RESET_INTERRUPTED',hint:'Keep any private credentials file. Do not paste it into chat. Do not repeat reset blindly.'},null,2));process.exitCode=1;});
module.exports={resetPasswords};
