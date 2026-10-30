'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const ROOT_ASSETS=['index.html','start.html','style.css','app.js','ai.js','cloud.js','security-patch.js','admission-import.js','instructor-templates.js','instructor-plan-safety.js','trainee-bulk-import.js','other-printable-records.js','official-plans.js','sw.js','manifest.json','icon.svg','logo.png'];
function validateRuntime(runtime,{required=false}={}){
 if(!runtime&&required)throw Error('Explicit staging Firebase config and HTTPS API URL are required before release');
 if(!runtime||typeof runtime!=='object'||Array.isArray(runtime))throw Error('Public runtime must be an object');
 if(Object.keys(runtime).some(k=>!['apiUrl','firebaseConfig','staging','institutePasswordEnabled','instituteLoginDomain','quickPinEnabled'].includes(k)))throw Error('Only public API URL, Firebase web config and staging flag are accepted; never supply secrets');
 if(runtime.staging!==undefined&&(runtime.staging!==true||!runtime.firebaseConfig?.projectId?.endsWith('-staging')))throw Error('Staging mode requires an explicitly isolated *-staging project');
 if(required&&(!runtime.firebaseConfig||(!runtime.apiUrl&&runtime.staging!==true)))throw Error('Explicit staging Firebase config and HTTPS API URL are required before release');
 if(runtime.quickPinEnabled!==undefined&&typeof runtime.quickPinEnabled!=='boolean')throw Error('Quick PIN flag must be boolean');
 if(runtime.institutePasswordEnabled!==undefined&&typeof runtime.institutePasswordEnabled!=='boolean')throw Error('Password login flag must be boolean');
 if(runtime.instituteLoginDomain!==undefined&&(!/^[a-z0-9](?:[a-z0-9.-]{1,180})\.[a-z]{2,24}$/.test(runtime.instituteLoginDomain)||runtime.instituteLoginDomain.includes('..')||(!runtime.staging&&/\.(invalid|test)$/.test(runtime.instituteLoginDomain))))throw Error('Institute login domain invalid or untrusted');
 if(runtime.apiUrl){const u=new URL(runtime.apiUrl);if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('API URL must be HTTPS without credentials or a fragment');}
 if(runtime.firebaseConfig){
  const cfg=runtime.firebaseConfig,keys=['apiKey','authDomain','projectId','appId','storageBucket','messagingSenderId','measurementId'];
  if(typeof cfg!=='object'||Array.isArray(cfg)||Object.keys(cfg).some(k=>!keys.includes(k))||Object.values(cfg).some(v=>typeof v!=='string'))throw Error('Only public Firebase web configuration fields are accepted');
  if(!cfg.apiKey||!cfg.authDomain||!cfg.appId||!cfg.projectId||!/^[-a-z0-9]+$/.test(cfg.projectId))throw Error('Incomplete Firebase web configuration');
 }
 return runtime;
}
function buildWeb({sourceDir=ROOT,outputDir=path.join(ROOT,'dist','web'),runtime=null}={}){
 sourceDir=path.resolve(sourceDir);outputDir=path.resolve(outputDir);
 if(outputDir===sourceDir||sourceDir.startsWith(outputDir+path.sep))throw Error('Build output must not replace the source tree');
 if(runtime)validateRuntime(runtime);
 const loader=fs.readFileSync(path.join(sourceDir,'v15/index.html'),'utf8');
 const scripts=[...loader.matchAll(/src="(v15\/[^"?]+\.js)/g)].map(m=>m[1]);
 if(!scripts.length)throw Error('Cannot identify V15 runtime scripts');
 const files=[...new Set([...ROOT_ASSETS,...scripts,'v15/index.html','v15/recover.html','v15/sw.js','v15/manifest.json','final/index.html','shared/guidance.js','shared/leave.js','shared/admin-authority.js','config/runtime.js'])].sort();
 // Build in a new directory first; never publish a partially copied source tree.
 fs.mkdirSync(path.dirname(outputDir),{recursive:true});const staging=fs.mkdtempSync(path.join(path.dirname(outputDir),'.web-build-'));
 try{
  for(const file of files){
   const original=path.join(sourceDir,file);if(fs.lstatSync(original).isSymbolicLink()||!fs.statSync(original).isFile())throw Error('Regular source file required: '+file);
   const dest=path.join(staging,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(original,dest);
  }
  if(runtime)fs.writeFileSync(path.join(staging,'config/runtime.js'),'// Public configuration only.\nwindow.ITI_RUNTIME=Object.assign('+JSON.stringify(runtime)+',window.ITI_RUNTIME||{});\n');
  const manifest={files:files.map(file=>({path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(staging,file))).digest('hex')}))};
  fs.writeFileSync(path.join(staging,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.rmSync(outputDir,{recursive:true,force:true});fs.renameSync(staging,outputDir);return manifest;
 }catch(e){fs.rmSync(staging,{recursive:true,force:true});throw e;}
}
function runtimeFromEnv(){const option=process.argv.indexOf('--runtime');const file=(option>=0?process.argv[option+1]:null)||process.env.ITI_PUBLIC_RUNTIME_FILE;return file?JSON.parse(fs.readFileSync(file,'utf8')):null;}
if(require.main===module){try{const runtime=runtimeFromEnv();if(process.argv.includes('--require-runtime'))validateRuntime(runtime,{required:true});const result=buildWeb({runtime});console.log('Built '+result.files.length+' public files in dist/web; backend, tests, credentials and repository metadata excluded.');}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={buildWeb,validateRuntime};
