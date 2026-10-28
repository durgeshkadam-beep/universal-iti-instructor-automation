'use strict';
// One bounded sign-in check using an operator-private file. No credentials/tokens printed.
const PROJECT='universal-iti-dk-staging';
async function checkLogin({row,apiKey,request=fetch}){
 if(row?.role!=='instructor'||row.email!=='instructor@iti-staging.example.test'||typeof row.password!=='string'||row.status!=='reset')throw Error('Use the successfully reset Instructor row only');
 const response=await request('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({email:row.email,password:row.password,returnSecureToken:true}),signal:AbortSignal.timeout(30000)
 });
 const result={project:PROJECT,role:'instructor',passwordAccepted:false,memberReadable:false,roleMatches:false,firestoreChanged:false,credentialsPrinted:false};
 if(!response.ok){
  let body;try{body=await response.json();}catch{};
  const code=body?.error?.message;
  result.httpStatus=response.status;result.code=['INVALID_LOGIN_CREDENTIALS','INVALID_PASSWORD','EMAIL_NOT_FOUND','USER_DISABLED','TOO_MANY_ATTEMPTS_TRY_LATER','OPERATION_NOT_ALLOWED','API_KEY_INVALID','API_KEY_HTTP_REFERRER_BLOCKED'].includes(code)?code:'AUTH_REQUEST_REJECTED';return result;
 }
 const auth=await response.json();
 if(auth.localId!=='staging-instructor'||typeof auth.idToken!=='string'){result.code='IDENTITY_MISMATCH';return result;}
 result.passwordAccepted=true;
 const member=await request('https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents/institutes/brdbagiti-mumbai-01/members/staging-instructor',{
  headers:{Authorization:'Bearer '+auth.idToken},signal:AbortSignal.timeout(30000)
 });
 if(!member.ok){result.code='MEMBERSHIP_READ_REJECTED';result.httpStatus=member.status;return result;}
 const record=await member.json(),fields=record.fields||{};
 result.memberReadable=true;result.roleMatches=fields.role?.stringValue==='instructor'&&fields.active?.booleanValue===true&&fields.owner?.booleanValue!==true;
 result.code=result.roleMatches?'PASSWORD_AND_MEMBERSHIP_OK':'MEMBERSHIP_MISMATCH';return result;
}
async function main(){
 const fs=require('node:fs'),path=require('node:path'),runtime=require('../config/staging.public.json');
 if(runtime.firebaseConfig.projectId!==PROJECT)throw Error('Wrong project');
 const file=path.resolve(process.argv[2]||'');
 const root=path.resolve(__dirname,'..');
 if(!process.argv[2]||file===root||file.startsWith(root+path.sep))throw Error('Supply the existing private credentials file outside the repository');
 const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077))throw Error('Private credentials file must have mode 600');
 const rows=JSON.parse(fs.readFileSync(file,'utf8')),matches=rows.filter(x=>x.role==='instructor');
 if(matches.length!==1)throw Error('Expected one Instructor row');
 console.log(JSON.stringify(await checkLogin({row:matches[0],apiKey:runtime.firebaseConfig.apiKey}),null,2));
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({project:PROJECT,code:'LOCAL_FILE_OR_NETWORK_CHECK_FAILED',credentialsPrinted:false,firestoreChanged:false}));process.exitCode=1;});
module.exports={checkLogin};
