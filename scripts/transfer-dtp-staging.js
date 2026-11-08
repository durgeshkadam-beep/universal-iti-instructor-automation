'use strict';
// Private operator transfer. Default is preview; never writes to the source project.
const {createHash}=require('node:crypto');
const {createInventoryDatabase,failureReport,summary}=require('./inspect-dtp-source');
const SOURCE='universal-iti-auto-dk',TARGET='universal-iti-dk-staging',INSTITUTE='brdbagiti-mumbai-01';
const WORKSPACE='bharat-ratna-dr.-babasaheb-ambedkar-government-iti-mumbai-01-desktop-publishing-operator-dtpo--10-08-2026-to-31-05-2027';
const COLLECTIONS=new Set(['holidays','map_signatures','practicals','state','theory','trainees']);
function fail(code){throw Object.assign(Error(code),{code});}
function clean(value){
 if(Array.isArray(value))return value.map(clean);
 if(value&&Object.getPrototypeOf(value)===Object.prototype){const out={};for(const [key,v]of Object.entries(value)){
  if(/password|activationProof|token|secret|apiKey|credential|^(?:pin|instructorPin|principalPin|quickPin|pinHash)$/i.test(key))continue;out[key]=clean(v);
 }return out;}return value;
}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value.toJSON==='function')return canonical(value.toJSON());
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
const child=(workspace,path)=>{const [section,id]=path.split('/');return workspace.collection(section).doc(id);};
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function prepare(source,target,{verifyExisting=false}={}){
 if(source.projectId!==SOURCE||target.projectId!==TARGET)fail('TARGET_MISMATCH');
 const base='institutes/'+INSTITUTE,src=source.doc(base),root=await src.get();if(!root.exists)fail('SOURCE_MISSING');
 const owner=root.data().ownerUid;if(typeof owner!=='string'||!owner||owner.includes('/'))fail('SOURCE_OWNER_MISSING');
 const ownerDoc=await src.collection('members').doc(owner).get(),email=String(ownerDoc.data()?.email||'').trim().toLowerCase();
 if(!email||ownerDoc.data()?.active===false)fail('SOURCE_OWNER_MISSING');
 const dst=target.doc(base);if(!(await dst.get()).exists)fail('TARGET_INSTITUTE_MISSING');
 const members=await dst.collection('members').where('email','==',email).get();
 if(members.size!==1)fail('TARGET_ACCOUNT_MISSING');
 const account=members.docs[0],member=account.data();
 if(member.active===false||member.role!=='instructor'||!Array.isArray(member.workspaceIds))fail('TARGET_ACCOUNT_NOT_INSTRUCTOR');
 const ws=src.collection('workspaces').doc(WORKSPACE),snap=await ws.get();
 if(!snap.exists||!/desktop publishing|\bdtpo\b/i.test(String(snap.data().trade||'')))fail('SOURCE_DTP_MISSING');
 const destination=dst.collection('workspaces').doc(WORKSPACE);
 if(!verifyExisting&&((await destination.get()).exists||(await destination.listCollections()).length))fail('DESTINATION_EXISTS');
 const rows=[],counts={};
 for(const collection of await ws.listCollections()){
  if(!COLLECTIONS.has(collection.id))fail('UNREVIEWED_SOURCE_COLLECTION');
  const docs=await collection.get();counts[collection.id]=summary(docs.docs.map(d=>d.data()));
  for(const doc of docs.docs)rows.push({path:collection.id+'/'+doc.id,data:clean(doc.data())});
 }
 rows.sort((a,b)=>a.path.localeCompare(b.path));
 if(!counts.trainees?.records||!counts.practicals?.withPlan||!counts.theory?.withPlan)fail('SOURCE_INCOMPLETE');
 if(rows.length+2>450)fail('ATOMIC_TRANSFER_TOO_LARGE');
 const metadata={...clean(snap.data()),workspaceId:WORKSPACE,instituteId:INSTITUTE};
 const bundle={metadata,rows,memberId:account.id,member:clean(member)};
 return {destination,account,bundle,fingerprint:digest(bundle),counts};
}
function preview(plan){return {ok:true,mode:'preview',source:SOURCE,target:TARGET,institute:INSTITUTE,workspace:WORKSPACE,sections:plan.counts,
 fingerprint:plan.fingerprint,existingWorkspacePreserved:true,existingInstructorMatched:true,roleChanges:false,dataChanged:false};}
async function apply(target,plan,confirmation){
 if(target.projectId!==TARGET||confirmation.target!==TARGET||confirmation.fingerprint!==plan.fingerprint)fail('CONFIRMATION_MISMATCH');
 await target.runTransaction(async tx=>{
  const workspace=await tx.get(plan.destination),account=await tx.get(plan.account.ref);
  if(workspace.exists)fail('DESTINATION_EXISTS');
  if(!account.exists||digest(clean(account.data()))!==digest(plan.bundle.member))fail('TARGET_ACCOUNT_CHANGED');
  const now=new Date().toISOString();
  tx.create(plan.destination,{...plan.bundle.metadata,stagingImportedFrom:SOURCE,stagingImportedAt:now,stagingImportFingerprint:plan.fingerprint});
  for(const row of plan.bundle.rows)tx.create(child(plan.destination,row.path),row.data);
  tx.update(plan.account.ref,{workspaceIds:[WORKSPACE,...plan.bundle.member.workspaceIds.filter(x=>x!==WORKSPACE)]});
 });
 // Verify contents after commit without printing private records.
 const actual=[];for(const row of plan.bundle.rows){const s=await child(plan.destination,row.path).get();if(!s.exists||digest(s.data())!==digest(row.data))fail('POST_IMPORT_VERIFICATION_FAILED');actual.push(row.path);}
 return {...preview(plan),mode:'applied',dataChanged:true,verifiedDocuments:actual.length};
}
async function verify(plan,expectedFingerprint){
 if(!/^[a-f0-9]{64}$/.test(String(expectedFingerprint||'')))fail('CONFIRMATION_MISMATCH');
 const root=await plan.destination.get(),metadata=root.data()||{};
 const actual=new Map(),sections={};
 for(const collection of await plan.destination.listCollections()){
  const snap=await collection.get();sections[collection.id]=summary(snap.docs.map(d=>d.data()));
  for(const doc of snap.docs)actual.set(collection.id+'/'+doc.id,doc.data());
 }
 let missingDocuments=0,changedDocuments=0,matchedDocuments=0;
 for(const row of plan.bundle.rows){
  if(!actual.has(row.path))missingDocuments++;
  else if(digest(actual.get(row.path))!==digest(row.data))changedDocuments++;
  else matchedDocuments++;
  actual.delete(row.path);
 }
 const importFingerprintMatches=metadata.stagingImportFingerprint===expectedFingerprint;
 const metadataMatches=root.exists&&Object.keys(plan.bundle.metadata).every(key=>digest(metadata[key]??null)===digest(plan.bundle.metadata[key]??null));
 const instructorAssigned=plan.bundle.member.workspaceIds.includes(WORKSPACE);
 return {ok:!!(root.exists&&importFingerprintMatches&&metadataMatches&&instructorAssigned&&!missingDocuments&&!changedDocuments&&!actual.size),
  mode:'verify',readOnly:true,source:SOURCE,target:TARGET,workspace:WORKSPACE,workspaceExists:root.exists,
  importFingerprintMatches,metadataMatches,instructorAssigned,instructorRole:plan.bundle.member.role,
  sourceSections:plan.counts,targetSections:sections,matchedDocuments,missingDocuments,changedDocuments,extraDocuments:actual.size,dataChanged:false};
}
async function databaseEdition(project,accessToken){
 const response=await fetch('https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)',{headers:{Authorization:'Bearer '+await accessToken()},signal:AbortSignal.timeout(30000)});
 if(!response.ok)fail(response.status===403?'PERMISSION_DENIED':response.status===401?'UNAUTHENTICATED':'DATABASE_METADATA_UNAVAILABLE');
 const data=await response.json();
 // STANDARD is the API default when the edition field is omitted.
 if((data.databaseEdition||'STANDARD')!=='STANDARD'||data.type!=='FIRESTORE_NATIVE')fail('UNSUPPORTED_DATABASE_EDITION');
}
async function main(){
 const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore');
 const {GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
 const args=process.argv.slice(2),write=args.includes('--apply'),verifyOnly=args.includes('--verify');
 if(write&&verifyOnly)fail('INVALID_ARGUMENT');
 const value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:undefined;
 if(args.some((x,i)=>!['--apply','--verify','--confirm-target','--expected-fingerprint'].includes(x)&&!['--confirm-target','--expected-fingerprint'].includes(args[i-1])))fail('INVALID_ARGUMENT');
 const accessToken=async()=>{try{return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{fail('GCLOUD_LOGIN_REQUIRED');}};
 let source,target;
 try{
  await databaseEdition(SOURCE,accessToken);await databaseEdition(TARGET,accessToken);
  source=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken});
  // The same credential accesses the explicitly fixed staging project.
  target=await createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,accessToken,projectId:TARGET});
  const plan=await prepare(source,target,{verifyExisting:verifyOnly});
  const result=verifyOnly?await verify(plan,value('--expected-fingerprint')):write?await apply(target,plan,{target:value('--confirm-target'),fingerprint:value('--expected-fingerprint')}):preview(plan);
  console.log(JSON.stringify(result,null,2));if(result.ok===false)process.exitCode=1;
 }finally{if(source)await source.terminate();if(target)await target.terminate();}
}
if(require.main===module)main().catch(error=>{
 const report={...failureReport(error,'staging-transfer'),source:SOURCE,target:TARGET};
 const safe=['TARGET_MISMATCH','SOURCE_MISSING','SOURCE_OWNER_MISSING','TARGET_INSTITUTE_MISSING','TARGET_ACCOUNT_MISSING','TARGET_ACCOUNT_NOT_INSTRUCTOR','SOURCE_DTP_MISSING','DESTINATION_EXISTS','UNREVIEWED_SOURCE_COLLECTION','SOURCE_INCOMPLETE','ATOMIC_TRANSFER_TOO_LARGE','CONFIRMATION_MISMATCH','TARGET_ACCOUNT_CHANGED','POST_IMPORT_VERIFICATION_FAILED','DATABASE_METADATA_UNAVAILABLE','UNSUPPORTED_DATABASE_EDITION','INVALID_ARGUMENT'];
 if(safe.includes(error.code)){report.code=error.code;report.hint='Transfer stopped. Share only this summary for review.';}
 // A failed post-commit verification must never claim that no data changed.
 if(process.argv.includes('--apply')){report.readOnly=false;report.dataChanged=error.code==='POST_IMPORT_VERIFICATION_FAILED'?true:['DESTINATION_EXISTS','CONFIRMATION_MISMATCH','TARGET_ACCOUNT_CHANGED'].includes(error.code)?false:'unknown';}
 console.error(JSON.stringify(report,null,2));process.exitCode=1;
});
module.exports={SOURCE,TARGET,WORKSPACE,clean,digest,prepare,preview,apply,verify,databaseEdition};
