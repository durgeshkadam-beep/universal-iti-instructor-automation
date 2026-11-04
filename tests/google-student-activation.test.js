'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function fixture({source=fs.readFileSync('v15/v15-auth-roles-v2.js','utf8')}={}){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/v15/',runScripts:'outside-only'}),w=dom.window;
 const state={signouts:0,popup:0,reads:[],writes:[],records:new Map()},user={uid:'synthetic-student',email:'student@example.test'},auth={currentUser:null,authStateReady:async()=>{}};
 const app={name:'iti-v15'},M={getApps:()=>[app],getAuth:()=>auth,setPersistence:async()=>{},getRedirectResult:async()=>null,browserLocalPersistence:'local',GoogleAuthProvider:class{setCustomParameters(){}},signInWithPopup:async()=>{state.popup++;auth.currentUser=user;return {user};},signOut:async()=>{state.signouts++;auth.currentUser=null;},getDoc:async()=>({exists:()=>false,data:()=>undefined}),setDoc:async(ref,data)=>{state.writes.push(ref);state.records.set(ref,data);}};
 const V={ready:true,fb:{M,auth,user},modules:async()=>M,config:()=>({}),firestore:()=>({}),email:v=>String(v).trim().toLowerCase(),now:()=>new Date().toISOString(),hash:async v=>'hash-'+v,memberRef:()=>'/member',access:e=>'/access/'+e,secret:e=>'/secret/'+e,startupRead:async ref=>{state.reads.push(ref);return {exists:()=>state.records.has(ref),data:()=>state.records.get(ref)};}};
 w.App={};w.V15Sync=V;w.eval(source);w.localStorage.setItem('iti-v15-email-v2',user.email);w.prompt=()=> '123456';
 return {dom,w,V,M,auth,user,state,close:()=>w.close()};
}
for(const method of ['popup','saved','redirect'])test('Google '+method+' rejects an account different from the entered email before institute access',async()=>{
 const f=fixture();try{
  const other={uid:'wrong',email:'other@example.test'};
  if(method==='popup')f.M.signInWithPopup=async()=>{f.auth.currentUser=other;return {user:other};};
  if(method==='saved')f.auth.currentUser=other;
  if(method==='redirect')f.M.getRedirectResult=async()=>({user:other});
  await assert.rejects(()=>f.V.googleAuthority(true),/Google account mismatch/);
  assert.equal(f.state.signouts,1);assert.equal(f.auth.currentUser,null);assert.equal(f.V.fb.user,null);assert.deepEqual(f.state.reads,[]);
 }finally{f.close();}
});
test('matching popup Google account is accepted with its original Firebase UID',async()=>{
 const f=fixture();try{const user=await f.V.googleAuthority(true);assert.equal(user.uid,f.user.uid);assert.equal(f.V.fb.user,user);assert.equal(f.state.signouts,0);}finally{f.close();}
});
test('first Student activation succeeds despite a stale cached miss and preserves assigned workspace/trainee',async()=>{
 const f=fixture();try{
  f.V.fb.user=f.user;f.state.records.set('/access/'+f.user.email,{role:'student',active:true,workspaceIds:['synthetic-workspace'],traineeId:'synthetic-trainee'});
  const m=await f.V.activateApprovedAccount('student');assert.equal(m.uid,f.user.uid);assert.equal(m.owner,false);assert.equal(m.traineeId,'synthetic-trainee');assert.deepEqual(Array.from(m.workspaceIds),['synthetic-workspace']);assert.deepEqual(f.state.reads,['/access/'+f.user.email]);assert.equal(m.activationProof,'hash-123456');
 }finally{f.close();}
});
test('missing server approval and denied server reads cannot create a membership',async()=>{
 const f=fixture();try{
  f.V.fb.user=f.user;await assert.rejects(()=>f.V.activateApprovedAccount('student'),/same website/);assert.deepEqual(f.state.writes,[]);
  f.V.startupRead=async()=>{throw Error('unavailable');};await assert.rejects(()=>f.V.activateApprovedAccount('student'),/unavailable/);assert.deepEqual(f.state.writes,[]);
 }finally{f.close();}
});
for(const mismatch of ['approval','secret','unavailable'])test('Instructor does not report a first-login code without '+mismatch+' server confirmation',async()=>{
 const f=fixture({source:fs.readFileSync('v15/v15-access.js','utf8')});try{
  f.w.SESSION={role:'instructor'};Object.assign(f.V,{member:{active:true,owner:false},workspaceId:'synthetic-workspace',validEmail:()=>true,code:()=> '123456'});
  f.M.getDocFromServer=async ref=>{if(mismatch==='unavailable')throw Error('unavailable');const value=f.state.records.get(ref);return {exists:()=>true,data:()=>ref.startsWith('/'+(mismatch==='approval'?'access':mismatch))?{...value,active:false}:value};};
  await assert.rejects(()=>f.V.invite(f.user.email,'student','synthetic-trainee','Synthetic Student'));
 }finally{f.close();}
});
test('Instructor reports the code only after both saved approval and secret match the server',async()=>{
 const f=fixture({source:fs.readFileSync('v15/v15-access.js','utf8')});try{
  f.w.SESSION={role:'instructor'};Object.assign(f.V,{member:{active:true,owner:false},workspaceId:'synthetic-workspace',validEmail:()=>true,code:()=> '123456'});
  f.M.getDocFromServer=async ref=>({exists:()=>f.state.records.has(ref),data:()=>f.state.records.get(ref)});
  assert.equal(await f.V.invite(f.user.email,'student','synthetic-trainee','Synthetic Student'),'123456');
  assert.equal(f.state.records.get('/access/'+f.user.email).traineeId,'synthetic-trainee');
 }finally{f.close();}
});
