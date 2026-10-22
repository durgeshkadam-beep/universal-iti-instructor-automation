'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildWeb,validateRuntime}=require('../scripts/build-web');
const runtime={apiUrl:'https://staging-api.example.test/api',firebaseConfig:{apiKey:'synthetic-public-web-key',projectId:'synthetic-staging',authDomain:'synthetic-staging.firebaseapp.com',appId:'synthetic-web-app'}};
test('public bundle includes executable app assets but no backend/test/env/repository files',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iti-web-'));
 try{const out=path.join(temp,'web'),result=buildWeb({outputDir:out,runtime});assert(result.files.length>30);for(const f of ['index.html','final/index.html','v15/index.html','v15/v15-student-services.js','shared/guidance.js'])assert(fs.existsSync(path.join(out,f)));for(const name of ['server','tests','scripts','.git','node_modules','Dockerfile','package.json','firestore.rules'])assert(!fs.existsSync(path.join(out,name)),name+' must not be hosted');assert(fs.readFileSync(path.join(out,'config/runtime.js'),'utf8').includes(runtime.apiUrl));assert(result.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)));fs.writeFileSync(path.join(out,'unwanted.env'),'synthetic');buildWeb({outputDir:out,runtime});assert(!fs.existsSync(path.join(out,'unwanted.env')),'stale files are removed');}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('release configuration cannot silently fall back to production Firebase',()=>{assert.throws(()=>validateRuntime(null,{required:true}),/Explicit staging/);assert.throws(()=>validateRuntime({apiUrl:''},{required:true}),/Explicit staging/);assert.doesNotThrow(()=>validateRuntime(runtime,{required:true}));});
test('backend keys and service account fields cannot enter public configuration',()=>{for(const extra of [{AI_API_KEY:'synthetic'}, {private_key:'synthetic'}])assert.throws(()=>validateRuntime({...runtime,...extra}),/Only public/);assert.throws(()=>validateRuntime({...runtime,firebaseConfig:{...runtime.firebaseConfig,private_key:'synthetic'}}),/Only public/);});
test('API URLs cannot contain credentials or insecure transport',()=>{for(const apiUrl of ['http://api.example.test/api','https://user:password@example.test/api','https://api.example.test/api#secret'])assert.throws(()=>validateRuntime({...runtime,apiUrl}));});
test('backend-free staging release requires an isolated staging project',()=>{
 assert.doesNotThrow(()=>validateRuntime({...runtime,staging:true,apiUrl:''},{required:true}));
 assert.throws(()=>validateRuntime({...runtime,staging:true,firebaseConfig:{...runtime.firebaseConfig,projectId:'real-production'}},{required:true}),/isolated/);
 assert.throws(()=>validateRuntime({...runtime,staging:'true'},{required:true}),/isolated/);
 assert.throws(()=>validateRuntime({...runtime,apiUrl:''},{required:true}),/Explicit staging/);
});
