'use strict';
const {spawn,spawnSync}=require('node:child_process'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const esbuild=require('esbuild'),{randomBytes}=require('node:crypto');
(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Both emulators required');
 const repeat=Number(process.env.ITI_E2E_REPEAT||1);if(!Number.isInteger(repeat)||repeat<1||repeat>10)throw Error('ITI_E2E_REPEAT must be between 1 and 10.');
 const testPassword=randomBytes(32).toString('base64url');
 fs.mkdirSync('.tmp',{recursive:true});
 await esbuild.build({stdin:{contents:"export * from 'firebase/app'; export * from 'firebase/auth'; export * from 'firebase/firestore';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'ITITestFirebase',outfile:'.tmp/test-sdk.js'});
 const {initializeApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getFirestore}=require('firebase-admin/firestore');
 const admin=initializeApp({projectId:'demo-universal-iti'}),db=getFirestore(admin),auth=getAuth(admin),base='institutes/brdbagiti-mumbai-01';
 await db.doc(base).set({ownerUid:'admin',schemaVersion:15,name:'Synthetic ITI',code:'TEST'});
 await db.doc(base+'/workspaces/w1').set({name:'Synthetic Workspace',trade:'DTP',session:'2026-27',batch:'A',schemaVersion:15,arraySections:['trainees','practicals','theory','notices','holidays','leaves'],mapSections:['attendance','marks','submissions']});
 for(const role of ['admin','principal','instructor','staff','student']){
  try{await auth.createUser({uid:role,email:role+'@example.test',password:testPassword,emailVerified:true,displayName:'Synthetic '+role});}catch(e){if(e.code!=='auth/uid-already-exists')throw e;await auth.updateUser(role,{password:testPassword});}
  await db.doc(base+'/members/'+role).set({uid:role,email:role+'@example.test',role:role==='admin'?'instructor':role,owner:role==='admin',active:true,workspaceIds:['instructor','student'].includes(role)?['w1','planning-demo']:['w1'],traineeId:role==='student'?'t1':null,displayName:'Synthetic '+role});
 }
 try{await auth.createUser({uid:'google-admin',email:'google-admin@example.test',emailVerified:true,displayName:'Synthetic Google Admin'});}catch(e){if(e.code!=='auth/uid-already-exists')throw e;}
 await auth.updateUser('google-admin',{providerToLink:{providerId:'google.com',uid:'synthetic-google-admin',email:'google-admin@example.test'}});
 await db.doc(base+'/members/google-admin').set({uid:'google-admin',email:'google-admin@example.test',role:'instructor',owner:true,active:true,workspaceIds:[],displayName:'Synthetic Google Admin'});
 await db.doc(base+'/systemAdmins/google-admin').set({uid:'google-admin',email:'google-admin@example.test',active:true,googleOnly:true,schemaVersion:1,createdAt:'2026-10-29T00:00:00.000Z',createdBy:'emulator',updatedAt:'2026-10-29T00:00:00.000Z',updatedBy:'emulator'});
 await db.doc(base+'/workspaces/w1/trainees/t1').set({data:{id:'t1',roll:'01',name:'Synthetic Student',gender:'Male'}});
 await db.doc(base+'/workspaces/w1/practicals/n-1').set({data:{no:1,title:'Layout basics',hours:7}});
 await db.doc(base+'/workspaces/w1/practicals/n-2').set({data:{no:2,title:'Typography',hours:7}});
 await db.doc(base+'/workspaces/w1/theory/n-1').set({data:{no:1,title:'Synthetic theory safety',hours:3}});
 await db.doc(base+'/workspaces/w1/notices/n1').set({data:{id:'n1',title:'Synthetic notice',body:'Training update'}});
 await db.doc(base+'/workspaces/planning-demo').set({name:'Synthetic planning only',trade:'DTP',session:'2026-27',batch:'P',schemaVersion:15,arraySections:['practicals','theory','holidays','trainees'],mapSections:[]});
 await db.doc(base+'/workspaces/planning-demo/practicals/n-seed-001').set({data:{no:'seed-001',title:'Original saved practical',hours:2,status:'completed',doneDate:'2026-10-20',plan:{objective:['Preserved original objective']},planMeta:{status:'approved',version:2}}});
 await db.doc(base+'/workspaces/planning-demo/trainees/t1').set({data:{id:'t1',roll:'01',name:'Synthetic planning student'}});
 const api=spawn(process.execPath,['server/index.js'],{stdio:'inherit',env:{...process.env,GCLOUD_PROJECT:'demo-universal-iti',AI_PROVIDER:'none',ALLOWED_ORIGINS:'http://127.0.0.1:4173',PORT:'8787'}});
 const webRoot=path.resolve('dist/web');require('./build-web').buildWeb({outputDir:webRoot});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/.tmp/test-sdk.js'?path.resolve('.tmp/test-sdk.js'):path.resolve(webRoot,'.'+pathname);if((!file.startsWith(webRoot+path.sep)&&pathname!=='/.tmp/test-sdk.js')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 try{
  const {createService}=require('../server/service');const service=createService({db,verifyToken:t=>auth.verifyIdToken(t)});
  const exam={id:'browser-exam',title:'Synthetic browser test',durationMinutes:10,opensAt:Date.now()-1000,closesAt:Date.now()+3600000,questions:[{text:'Two plus two?',options:['Three','Four'],correctIndex:1}]};
  await service.execute(await (async()=>{const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'instructor@example.test',password:testPassword,returnSecureToken:true})});return (await r.json()).idToken;})(),{action:'publishExam',instituteId:'brdbagiti-mumbai-01',workspaceId:'w1',exam});
  // Spawn asynchronously so the in-process static server remains responsive.
  const result=await new Promise(resolve=>{const c=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...(process.env.ITI_E2E_GREP?['--grep',process.env.ITI_E2E_GREP,...(repeat>1?['--repeat-each',String(repeat)]:[])]:[])],{stdio:'inherit',env:{...process.env,ITI_EMULATOR_TEST_PASSWORD:testPassword}});c.once('error',()=>resolve(1));c.once('exit',(code,signal)=>{if(signal)console.error('Browser runner terminated by '+signal);resolve(typeof code==='number'?code:1);});});
  process.exitCode=result;
 }finally{api.kill();server.close();await db.terminate();}
})().catch(e=>{console.error(e);process.exitCode=1;});
