'use strict';
// Read-only operator inventory. Never exports trainee details, tokens or record contents.
const PROJECT='universal-iti-auto-dk',INSTITUTE='brdbagiti-mumbai-01';
function summary(rows){
 const records=rows.map(x=>x?.data??x).filter(x=>x&&typeof x==='object');
 return {records:rows.length,withPlan:records.filter(x=>x.plan&&typeof x.plan==='object').length,completed:records.filter(x=>x.status==='completed').length};
}
async function inspect(db){
 const inst=db.doc('institutes/'+INSTITUTE),root=await inst.get();if(!root.exists)throw Object.assign(Error('Institute missing'),{code:'INSTITUTE_MISSING'});
 const result={project:PROJECT,readOnly:true,shared:[],legacy:[]};
 const workspaces=await inst.collection('workspaces').get();
 for(const ws of workspaces.docs){
  if(!/desktop publishing|\bdtpo\b|\bdtp\b/i.test(String(ws.data().trade||'')))continue;
  const sections={};for(const collection of await ws.ref.listCollections()){const snap=await collection.get();sections[collection.id]=summary(snap.docs.map(d=>d.data()));}
  result.shared.push({workspace:ws.id,sections});
 }
 const owner=root.data().ownerUid;
 if(typeof owner==='string'&&owner&&!owner.includes('/')){
  const refs=await db.collection('itiInstructorUsers/'+owner+'/workspaces').listDocuments();
  for(const ref of refs){const snap=await ref.collection('sections').get(),rows=snap.docs.map(d=>d.data()),meta=rows.find(x=>x.key==='meta')?.value;
   if(!/desktop publishing|\bdtpo\b|\bdtp\b/i.test(String(meta?.trade||'')))continue;
   const sections={};for(const row of rows){if(typeof row.key!=='string'||row.key.startsWith('_'))continue;const v=row.value;sections[row.key]=Array.isArray(v)?summary(v):{entries:v&&typeof v==='object'?Object.keys(v).length:0};}
   result.legacy.push({workspace:ref.id,sections});
  }
 }
 return result;
}
function failureReport(error,stage){
 // Never print raw provider errors: they can contain resource paths or credentials.
 const raw=String(error?.code||'UNKNOWN').toUpperCase().replace(/^FIRESTORE\//,'').replace(/-/g,'_');
 const codes={'7':'PERMISSION_DENIED','16':'UNAUTHENTICATED','5':'NOT_FOUND','14':'UNAVAILABLE','4':'DEADLINE_EXCEEDED'};
 let code=codes[raw]||(['PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND','UNAVAILABLE','DEADLINE_EXCEEDED','MODULE_NOT_FOUND','INSTITUTE_MISSING','GCLOUD_LOGIN_REQUIRED','INVALID_CREDENTIAL'].includes(raw)?raw:'UNKNOWN');
 if(/SERVICE_DISABLED|accessNotConfigured|API has not been used/i.test(String(error?.message||'')))code='FIRESTORE_API_DISABLED';
 const hints={
  INVALID_CREDENTIAL:'The Firestore SDK rejected the credential adapter. Update this inventory script; changing database permissions will not fix this SDK error.',
  PERMISSION_DENIED:'The active Google Cloud account lacks Firestore read access. Firebase CLI login alone does not authorize gcloud. Do not change database rules.',
  UNAUTHENTICATED:'The Google Cloud credential was rejected. Authenticate gcloud with the existing authorized project account.',
  GCLOUD_LOGIN_REQUIRED:'gcloud could not obtain an access token. Run gcloud auth login with your existing authorized project account, then retry.',
  MODULE_NOT_FOUND:'Install the pinned dependencies with npm ci --ignore-scripts, then retry.',
  INSTITUTE_MISSING:'The expected institute document was not found in the original project.',
  NOT_FOUND:'The original project database or requested resource was not found.',
  FIRESTORE_API_DISABLED:'The original project Firestore API is unavailable or disabled. Review the project configuration; do not enable paid services automatically.',
  UNAVAILABLE:'The Firestore service could not be reached. Retry when the connection is available.',
  DEADLINE_EXCEEDED:'The read timed out. Retry when the connection is available.',
  UNKNOWN:'An unclassified error occurred. Share only this diagnostic summary; do not paste tokens, credentials or trainee records.'
 };
 return {project:PROJECT,readOnly:true,ok:false,stage,code,hint:hints[code],dataChanged:false};
}
async function createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken}){
 // Use the Google Cloud client's supported OAuth adapter, not an Admin custom credential.
 const refresh=async()=>({access_token:await accessToken(),expiry_date:Date.now()+300000});
 const client=new OAuth2Client();
 client.refreshHandler=refresh;
 client.setCredentials(await refresh());
 const auth=new GoogleAuth({projectId:PROJECT,authClient:client});
 return new Firestore({projectId:PROJECT,auth});
}
async function main(){
 let stage='dependencies',db;
 try{
  const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-auth-library');
  const accessToken=async()=>{
   try{const token=execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    if(!token)throw Error('Empty token');return token;
   }catch{throw Object.assign(Error('Google Cloud login unavailable'),{code:'GCLOUD_LOGIN_REQUIRED'});}
  };
  stage='google-cloud-login';
  db=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken});
  stage='firestore-read';
  console.log(JSON.stringify(await inspect(db),null,2));
 }catch(error){console.error(JSON.stringify(failureReport(error,stage),null,2));process.exitCode=1;}
 finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify(failureReport(null,'cleanup'),null,2));process.exitCode=1;});
module.exports={summary,inspect,failureReport,createInventoryDatabase};
