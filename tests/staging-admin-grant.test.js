'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../scripts/grant-staging-admin');
const EMAIL='synthetic-admin@example.org';
function fixture(){
 const records=new Map([[G.BASE,{ownerUid:'staging-admin',schemaVersion:15,principalUid:'staging-principal'}],[G.BASE+'/members/real-user',{uid:'real-user',email:EMAIL,displayName:'Existing instructor',role:'instructor',owner:false,active:true,workspaceIds:['original-dtp'],traineeId:null}],[G.BASE+'/members/staging-admin',{owner:true,role:'instructor'}],[G.BASE+'/members/staging-principal',{owner:false,role:'principal'}]]);
 let transactions=0,auth={localId:'real-user',email:EMAIL,emailVerified:true,providerUserInfo:[{providerId:'google.com'}]};
 const snap=ref=>({exists:records.has(ref.path),data:()=>structuredClone(records.get(ref.path))}),db={projectId:G.PROJECT,doc:path=>({path}),getAll:async(...refs)=>refs.map(snap),runTransaction:async fn=>{transactions++;const changes=[];await fn({get:async ref=>snap(ref),set:(ref,v)=>changes.push([ref.path,v]),update:(ref,v)=>changes.push([ref.path,{...records.get(ref.path),...v}]),create:(ref,v)=>{assert(!records.has(ref.path));changes.push([ref.path,v]);}});for(const [p,v]of changes)records.set(p,v);}};
 return {db,records,lookup:async()=>auth,setUser:u=>auth=u,transactions:()=>transactions};
}
test('preview is read-only and apply preserves root/demo identities, existing role and assignments',async()=>{
 const f=fixture(),before=JSON.stringify([...f.records]),p=await G.prepare(f.db,f.lookup,EMAIL);assert.equal(JSON.stringify([...f.records]),before);assert.equal(G.summary(p).dataChanged,false);let checked=false;
 const out=await G.apply(f.db,p,{confirmProject:G.PROJECT,confirmEmail:EMAIL,expectedFingerprint:p.fingerprint,lookup:f.lookup,checkDeployment:async()=>{checked=true;}});
 assert(checked);assert.equal(out.verified,true);assert.equal(out.dataChanged,true);assert.equal(f.records.get(G.BASE).ownerUid,'staging-admin');assert.equal(f.records.get(G.BASE).principalUid,'staging-principal');
 const m=f.records.get(G.BASE+'/members/real-user');assert.equal(m.owner,true);assert.equal(m.role,'instructor');assert.equal(m.displayName,'Existing instructor');assert.deepEqual(m.workspaceIds,['original-dtp']);assert.equal(f.records.get(G.BASE+'/members/staging-admin').owner,true);assert.equal(f.records.get(G.BASE+'/members/staging-principal').role,'principal');
 assert.equal(f.records.get(G.BASE+'/systemAdmins/real-user').googleOnly,true);assert.equal([...f.records.keys()].filter(p=>p.includes('/auditLog/')).length,1);
 const repeat=await G.prepare(f.db,f.lookup,EMAIL);assert.equal(repeat.alreadyConfigured,true);const noChange=await G.apply(f.db,repeat,{confirmProject:G.PROJECT,confirmEmail:EMAIL,expectedFingerprint:repeat.fingerprint,lookup:f.lookup});assert.equal(noChange.dataChanged,false);assert.equal(f.transactions(),1);
 assert(!JSON.stringify(out).includes('real-user'));assert(!JSON.stringify(out).includes('original-dtp'));
});
test('wrong target/email/fingerprint, missing deployments and concurrent changes cannot grant access',async()=>{
 for(const override of [{confirmProject:'production'},{confirmEmail:'other@gmail.com'},{expectedFingerprint:'stale'},{checkDeployment:undefined},{checkDeployment:async()=>{throw Object.assign(Error('not ready'),{code:'RULES_NOT_DEPLOYED'});}}]){
  const f=fixture(),p=await G.prepare(f.db,f.lookup,EMAIL),before=JSON.stringify([...f.records]);await assert.rejects(G.apply(f.db,p,{confirmProject:G.PROJECT,confirmEmail:EMAIL,expectedFingerprint:p.fingerprint,lookup:f.lookup,checkDeployment:async()=>{},...override}));assert.equal(JSON.stringify([...f.records]),before);assert.equal(f.transactions(),0);
 }
 const f=fixture(),p=await G.prepare(f.db,f.lookup,EMAIL);f.records.get(G.BASE+'/members/real-user').active=false;await assert.rejects(G.apply(f.db,p,{confirmProject:G.PROJECT,confirmEmail:EMAIL,expectedFingerprint:p.fingerprint,lookup:f.lookup,checkDeployment:async()=>{}}));assert(!f.records.has(G.BASE+'/systemAdmins/real-user'));
});
test('only the explicitly named existing verified Google account and active privileged-capable member are eligible',async()=>{
 for(const patch of [{email:'other@gmail.com'},{disabled:true},{emailVerified:false},{providerUserInfo:[{providerId:'password'}]},{localId:'../bad'}])assert.throws(()=>G.validateUser({localId:'real-user',email:EMAIL,emailVerified:true,providerUserInfo:[{providerId:'google.com'}],...patch},EMAIL));
 const f=fixture();f.records.get(G.BASE+'/members/real-user').role='student';await assert.rejects(G.prepare(f.db,f.lookup,EMAIL),{code:'EXISTING_ACTIVE_MEMBERSHIP_REQUIRED'});
});
test('apply preflight verifies exact deployed rules, backend support and frontend hashes; OAuth never reaches public endpoints',async()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),files=['shared/admin-authority.js','v15/v15-admin-authority.js','v15/v15-auth-roles-v2.js','v15/index.html'];
 let scenario='ok',calls=[];
 const r=G.readers({email:EMAIL,accessToken:async()=> 'private-test-token',request:async(url,opts={})=>{
  calls.push(url);if(url.startsWith('https://firebaserules.googleapis.com/')){assert.equal(opts.headers.Authorization,'Bearer private-test-token');return {ok:true,json:async()=>url.endsWith('/cloud.firestore')?{rulesetName:'projects/'+G.PROJECT+'/rulesets/synthetic'}:{source:{files:[{name:'firestore.rules',content:scenario==='rules'?'old rules':fs.readFileSync('firestore.rules','utf8')}]}}};}
  assert.equal(opts.headers?.Authorization,undefined,'Google OAuth token is not sent to Render or public Hosting');
  if(url.endsWith('/security-version'))return {ok:scenario!=='backend',json:async()=>({adminDelegation:'v1'})};
  return {ok:true,json:async()=>({files:files.map(path=>({path,sha256:scenario==='hosting'?'stale':crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')}))})};
 }});
 await r.checkDeployment();assert.equal(calls.length,4);
 for(const [mode,code]of [['rules','RULES_NOT_DEPLOYED'],['backend','BACKEND_NOT_DEPLOYED'],['hosting','HOSTING_NOT_DEPLOYED']]){scenario=mode;await assert.rejects(r.checkDeployment(),{code});}
});
