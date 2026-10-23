'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {generateKeyPairSync}=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {once}=require('node:events');
const {validateStagingRuntime}=require('../server/staging-runtime');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iti-runtime-'));
after(()=>fs.rmSync(dir,{recursive:true,force:true}));
const project='universal-iti-dk-staging';
const credential={type:'service_account',project_id:project,client_email:`synthetic@${project}.iam.gserviceaccount.com`,private_key:generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}),token_uri:'https://oauth2.googleapis.com/token'};
const file=path.join(dir,'synthetic.json');fs.writeFileSync(file,JSON.stringify(credential),{mode:0o600});
const valid={GCLOUD_PROJECT:project,ALLOWED_ORIGINS:`https://${project}.web.app`,GOOGLE_APPLICATION_CREDENTIALS:file,AI_PROVIDER:'none'};
test('staging runtime accepts a valid mounted staging identity',()=>{
 assert.equal(validateStagingRuntime(valid).projectId,project);
});
test('staging runtime accepts a backend environment secret and rejects conflicting or invalid sources',()=>{
 const env={...valid,GOOGLE_APPLICATION_CREDENTIALS:undefined,ITI_STAGING_SERVICE_ACCOUNT_JSON:JSON.stringify(credential)};
 assert.equal(validateStagingRuntime(env).credential.client_email,credential.client_email);
 assert.throws(()=>validateStagingRuntime({...env,GOOGLE_APPLICATION_CREDENTIALS:file}),/one credential source/);
 for(const value of ['SECRET_MARKER',JSON.stringify({...credential,project_id:'production'}),JSON.stringify({...credential,private_key:'SECRET_MARKER'})])assert.throws(()=>validateStagingRuntime({...env,ITI_STAGING_SERVICE_ACCOUNT_JSON:value}),e=>/Staging configuration/.test(e.message)&&!e.message.includes('SECRET_MARKER'));
});
test('staging runtime rejects foreign projects, origins and emulator overrides',()=>{
 for(const patch of [{GCLOUD_PROJECT:'production'},{GOOGLE_CLOUD_PROJECT:'production'},{ALLOWED_ORIGINS:'https://other.example'},{ALLOWED_ORIGINS:'*'},{FIRESTORE_EMULATOR_HOST:'localhost:8080'},{FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099'},{FIREBASE_CONFIG:'{}'}])assert.throws(()=>validateStagingRuntime({...valid,...patch}),/Staging configuration/);
});
test('staging runtime rejects missing, foreign and invalid credentials without leaking their contents',()=>{
 assert.throws(()=>validateStagingRuntime({...valid,GOOGLE_APPLICATION_CREDENTIALS:'/missing/SECRET_MARKER'}),e=>!e.message.includes('SECRET_MARKER'));
 for(const patch of [{project_id:'production'},{client_email:'other@production.iam.gserviceaccount.com'},{type:'authorized_user'},{private_key:'SECRET_MARKER'}]){
  const name=path.join(dir,'invalid.json');fs.writeFileSync(name,JSON.stringify({...credential,...patch}),{mode:0o600});
  assert.throws(()=>validateStagingRuntime({...valid,GOOGLE_APPLICATION_CREDENTIALS:name}),e=>/Staging configuration/.test(e.message)&&!e.message.includes('SECRET_MARKER'));
 }
});
test('staging runtime validates optional AI configuration',()=>{
 for(const patch of [{AI_PROVIDER:'unknown'},{AI_PROVIDER:'gemini'},{AI_PROVIDER:'ollama',OLLAMA_URL:'file:///tmp/model',AI_MODEL:'x'},{AI_DAILY_LIMIT:'0'},{AI_DAILY_LIMIT:'2.5'},{AI_DAILY_LIMIT:'1001'}])assert.throws(()=>validateStagingRuntime({...valid,...patch}),/Staging configuration/);
 assert.equal(validateStagingRuntime({...valid,AI_PROVIDER:'gemini',AI_MODEL:'synthetic',AI_API_KEY:'synthetic'}).provider,'gemini');
});
test('actual server refuses unsafe staging configuration before listening',()=>{
 const child=spawnSync(process.execPath,['server/index.js'],{env:{...process.env,...valid,ITI_STAGING_ONLY:'true',GCLOUD_PROJECT:'production',AI_API_KEY:'SECRET_MARKER'},encoding:'utf8',timeout:10000});
 assert.equal(child.status,1);assert.match(child.stderr,/isolated staging project/);assert(!child.stderr.includes('SECRET_MARKER'));assert(!child.stdout.includes('ready'));
});
for(const source of ['file','environment'])test('actual server starts with a synthetic '+source+' credential and protects the HTTP boundary',{timeout:15000},async()=>{
 const net=require('node:net'),probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const env={...process.env,...valid,ITI_STAGING_ONLY:'true',HOST:'127.0.0.1',PORT:String(port)};
 if(source==='environment'){delete env.GOOGLE_APPLICATION_CREDENTIALS;env.ITI_STAGING_SERVICE_ACCOUNT_JSON=JSON.stringify(credential);}
 for(const key of ['FIREBASE_CONFIG','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','GOOGLE_CLOUD_PROJECT'])delete env[key];
 const child=spawn(process.execPath,['server/index.js'],{env,stdio:['ignore','pipe','pipe']});const closed=once(child,'exit');let errors='';child.stderr.on('data',b=>{errors+=b;});
 try{
  let ready=false;for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('Server exited: '+errors);
   try{const r=await fetch(`http://127.0.0.1:${port}/healthz`);if(r.ok){assert.deepEqual(await r.json(),{ok:true});ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert(ready,'HTTP server must start');
  const r=await fetch(`http://127.0.0.1:${port}/api`,{method:'POST',headers:{Origin:valid.ALLOWED_ORIGINS,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401);
  const denied=await fetch(`http://127.0.0.1:${port}/healthz`,{headers:{Origin:'https://other.example'}});assert.equal(denied.status,403);
 }finally{child.kill();await closed;}
});
