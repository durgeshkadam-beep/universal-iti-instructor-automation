'use strict';
const {spawn,spawnSync}=require('node:child_process'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const esbuild=require('esbuild');
(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Both emulators required');
 fs.mkdirSync('.tmp',{recursive:true});
 await esbuild.build({stdin:{contents:"export * from 'firebase/app'; export * from 'firebase/auth'; export * from 'firebase/firestore';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'ITITestFirebase',outfile:'.tmp/test-sdk.js'});
 const {initializeApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getFirestore}=require('firebase-admin/firestore');
 const admin=initializeApp({projectId:'demo-universal-iti'}),db=getFirestore(admin),auth=getAuth(admin),base='institutes/brdbagiti-mumbai-01';
 await db.doc(base).set({ownerUid:'admin',schemaVersion:15,name:'Synthetic ITI',code:'TEST'});
 await db.doc(base+'/workspaces/w1').set({name:'Synthetic Workspace',trade:'DTP',session:'2026-27',batch:'A',schemaVersion:15,arraySections:['trainees','practicals','theory','notices','holidays','leaves'],mapSections:['attendance','marks','submissions']});
 for(const role of ['admin','principal','instructor','staff','student']){
  try{await auth.createUser({uid:role,email:role+'@example.test',password:'Synthetic-Test-Password-49!',emailVerified:true,displayName:'Synthetic '+role});}catch(e){if(e.code!=='auth/uid-already-exists')throw e;}
  await db.doc(base+'/members/'+role).set({uid:role,email:role+'@example.test',role:role==='admin'?'instructor':role,owner:role==='admin',active:true,workspaceIds:['w1'],traineeId:role==='student'?'t1':null,displayName:'Synthetic '+role});
 }
 await db.doc(base+'/workspaces/w1/trainees/t1').set({data:{id:'t1',roll:'01',name:'Synthetic Student',gender:'Male'}});
 await db.doc(base+'/workspaces/w1/practicals/n-1').set({data:{no:1,title:'Layout basics',hours:7}});
 await db.doc(base+'/workspaces/w1/practicals/n-2').set({data:{no:2,title:'Typography',hours:7}});
 await db.doc(base+'/workspaces/w1/notices/n1').set({data:{id:'n1',title:'Synthetic notice',body:'Training update'}});
 const api=spawn(process.execPath,['server/index.js'],{stdio:'inherit',env:{...process.env,GCLOUD_PROJECT:'demo-universal-iti',AI_PROVIDER:'none',ALLOWED_ORIGINS:'http://127.0.0.1:4173',PORT:'8787'}});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
 const server=http.createServer((req,res)=>{const file=path.resolve('.','.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 try{
  const {createService}=require('../server/service');const service=createService({db,verifyToken:t=>auth.verifyIdToken(t)});
  const exam={id:'browser-exam',title:'Synthetic browser test',durationMinutes:10,opensAt:Date.now()-1000,closesAt:Date.now()+3600000,questions:[{text:'Two plus two?',options:['Three','Four'],correctIndex:1}]};
  await service.execute(await (async()=>{const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'instructor@example.test',password:'Synthetic-Test-Password-49!',returnSecureToken:true})});return (await r.json()).idToken;})(),{action:'publishExam',instituteId:'brdbagiti-mumbai-01',workspaceId:'w1',exam});
  // Spawn asynchronously so the in-process static server remains responsive.
  const result=await new Promise(resolve=>{const c=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{stdio:'inherit',env:process.env});c.on('exit',resolve);});
  process.exitCode=result||0;
 }finally{api.kill();server.close();await db.terminate();}
})().catch(e=>{console.error(e);process.exitCode=1;});
