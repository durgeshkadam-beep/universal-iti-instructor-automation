'use strict';
// Read-only operator inventory. Never exports trainee details, tokens or record contents.
const PROJECT='universal-iti-auto-dk',INSTITUTE='brdbagiti-mumbai-01';
function summary(rows){
 const records=rows.map(x=>x?.data??x).filter(x=>x&&typeof x==='object');
 return {records:rows.length,withPlan:records.filter(x=>x.plan&&typeof x.plan==='object').length,completed:records.filter(x=>x.status==='completed').length};
}
async function inspect(db){
 const inst=db.doc('institutes/'+INSTITUTE),root=await inst.get();if(!root.exists)throw Error('Institute missing');
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
async function main(){
 const {execFileSync}=require('node:child_process'),{initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
 // Uses the operator's existing Google Cloud Shell login; no key creation or token output.
 const credential={getAccessToken:async()=>({access_token:execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),expires_in:300})};
 const app=initializeApp({projectId:PROJECT,credential},'read-only-dtp-inventory'),db=getFirestore(app);
 try{console.log(JSON.stringify(await inspect(db),null,2));}finally{await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error('Read-only inventory failed. Confirm this Cloud Shell Google account can read the original Firebase project. No data was changed.');process.exitCode=1;});
module.exports={summary,inspect};
