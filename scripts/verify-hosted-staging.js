'use strict';
// Public, credential-free checks only. Never signs in or accesses Firestore/Drive.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ORIGIN='https://universal-iti-dk-staging.web.app';
const API='https://universal-iti-staging-api.onrender.com';
const RELEASE='2a1a3c11a50c73a91839fd8d0138fc7394e4169d';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function entries(manifest){
 if(!manifest||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>150)throw Error('Invalid public manifest');
 const result=new Map();
 for(const f of manifest.files){
  if(!f||typeof f.path!=='string'||! /^[a-zA-Z0-9_.\/-]+$/.test(f.path)||f.path.startsWith('/')||f.path.split('/').some(x=>!x||x==='.'||x==='..')||!/^[a-f0-9]{64}$/.test(f.sha256)||result.has(f.path))throw Error('Invalid or duplicate manifest entry');
  result.set(f.path,f.sha256);
 }
 return result;
}
function compareManifest(expected,actual){
 const a=entries(expected),b=entries(actual);
 if(a.size!==b.size||[...a].some(([p,h])=>b.get(p)!==h))throw Error('Published manifest differs from the expected release');
 return a;
}
async function bytes(url,fetcher=fetch){
 const u=new URL(url);
 if(![ORIGIN,API].includes(u.origin)||u.username||u.password||u.hash)throw Error('Only the approved public staging origins are allowed');
 const response=await fetcher(u.href,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Public request failed: '+u.pathname+' HTTP '+response.status);
 if(Number(response.headers.get('content-length')||0)>8*1024*1024)throw Error('Public asset too large');
 const result=Buffer.from(await response.arrayBuffer());
 if(result.length>8*1024*1024)throw Error('Public asset too large');
 return result;
}
async function verifyFiles(expected,fetcher=fetch){
 const actual=JSON.parse((await bytes(ORIGIN+'/build-manifest.json',fetcher)).toString('utf8'));
 const files=[...compareManifest(expected,actual)],results=[];let index=0;
 await Promise.all(Array.from({length:Math.min(6,files.length)},async()=>{
  for(;;){const next=index++;if(next>=files.length)return;const [file,wanted]=files[next];
   const body=await bytes(ORIGIN+'/'+file,fetcher);
   if(hash(body)!==wanted)throw Error('Published asset differs: '+file);
   results.push(file);
  }
 }));
 return {files:results.length,allHashesMatch:true};
}
async function browserCheck(){
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});const results=[];
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();const errors=[],firstPartyFailures=[];
   // The hosted shell is inspected without permitting account/API mutations.
   await context.route('**/*',route=>{
    const request=route.request(),u=new URL(request.url());
    const publicHosts=[new URL(ORIGIN).hostname,'cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com','apis.google.com'];
    return request.method()==='GET'&&u.protocol==='https:'&&publicHosts.includes(u.hostname)?route.continue():route.abort();
   });
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(new URL(r.url()).origin===ORIGIN&&r.status()>=400)firstPartyFailures.push(new URL(r.url()).pathname);});
   try{
    const response=await page.goto(ORIGIN+'/v15/',{waitUntil:'domcontentloaded',timeout:60000});
    if(response?.status()!==200)throw Error('Hosted login shell unavailable');
    await page.waitForFunction(()=>!!window.V15Sync&&!!window.ITISyllabusPlanning&&!!window.CloudCenter&&typeof Chart==='function'&&typeof V15Sync.workplaceDraftPrompt==='function'&&typeof V15Sync.parseWorkplaceDraft==='function'&&typeof window.ITITeachingPlan?.validatePlan==='function'&&typeof V15Sync.saveReviewedTeachingPlan==='function'&&typeof V15Sync.openTeachingHistory==='function'&&typeof V15Sync.reviewPendingTeachingDraft==='function'&&typeof V15Sync.parseSecureExamJSON==='function',{},{timeout:30000});
    await page.locator('#loginScreen').waitFor({state:'visible',timeout:15000});
    const result=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;
     const chart=new Chart(canvas,{type:'doughnut',data:{labels:['Synthetic complete','Synthetic pending'],datasets:[{data:[1,2],backgroundColor:['#16834a','#dd4035']}]},options:{responsive:false,animation:false}});
     const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0;
     for(let i=3;i<rgba.length;i+=4)if(rgba[i])painted++;
     // Exercise only pure draft helpers with synthetic text; do not open a role or sign in.
     const input={practicalId:'practical-smoke',title:'Synthetic layout operation',trade:'DTP',sourceUrl:'https://example.org/synthetic-source',excerpt:'Synthetic demonstration text describes arranging a page layout and reviewing a print proof.',language:'mr'};
     const prompt=V15Sync.workplaceDraftPrompt(input),draft={supported:true,practicalId:input.practicalId,sourceUrl:input.sourceUrl,industry:'Synthetic source example',applicationText:'A synthetic source describes this layout operation before reviewing a print proof.'};
     const parsed=V15Sync.parseWorkplaceDraft(JSON.stringify(draft),input);let wrongSourceRejected=false;
     try{V15Sync.parseWorkplaceDraft(JSON.stringify({...draft,sourceUrl:'https://example.org/wrong-source'}),input);}catch{wrongSourceRejected=true;}
     const workplace={marathiPrompt:prompt.includes('Marathi'),reviewedSourceRetained:parsed.sourceUrl===input.sourceUrl,wrongSourceRejected};
     const plan=ITITeachingPlan.validatePlan('practicals',{objective:['Synthetic inspection'],steps:[['Inspect the synthetic diagram.','Check its label.','Point to the diagram.']]});
     let invalidDraftRejected=false;try{ITITeachingPlan.validatePlan('practicals',{objective:'Invalid list shape'});}catch{invalidDraftRejected=true;}
     const teaching={objectRows:!Array.isArray(plan.steps[0])&&plan.steps[0].procedure==='Inspect the synthetic diagram.',invalidDraftRejected};
     const t=Date.now(),sampleExam={id:'synthetic-hosted-validation',title:' Synthetic reviewed question set ',durationMinutes:10,opensAt:t-60000,closesAt:t+3600000,questions:[{text:' Synthetic question ',options:[' First ',' Second '],correctIndex:1}]};
     const exam=V15Sync.parseSecureExamJSON(JSON.stringify(sampleExam));let weightedMarksRejected=false,closedScheduleRejected=false;
     try{V15Sync.parseSecureExamJSON(JSON.stringify({...sampleExam,questions:[{...sampleExam.questions[0],marks:5}]}));}catch{weightedMarksRejected=true;}
     try{V15Sync.parseSecureExamJSON(JSON.stringify({...sampleExam,closesAt:t-1}));}catch{closedScheduleRejected=true;}
     const examinations={normalized:exam.title==='Synthetic reviewed question set'&&exam.questions[0].options[1]==='Second'&&exam.questions[0].correctIndex===1,weightedMarksRejected,closedScheduleRejected};
     const result={version:Chart.version,paintedPixels:painted,localChart:[...document.scripts].some(s=>s.src===location.origin+'/assets/vendor/chart.umd.js'),oldChartCDN:[...document.scripts].some(s=>/cdnjs.*Chart\.js/.test(s.src)),contained:document.documentElement.scrollWidth<=innerWidth+1,workplace,teaching,examinations};
     chart.destroy();return result;
    });
    if(result.version!=='4.4.4'||result.paintedPixels<200||!result.localChart||result.oldChartCDN||!result.contained||!Object.values(result.workplace).every(x=>x===true)||!Object.values(result.teaching).every(x=>x===true)||!Object.values(result.examinations).every(x=>x===true)||errors.length||firstPartyFailures.length)throw Error('Hosted browser checks failed: '+JSON.stringify({viewport,result,pageErrors:errors.length,firstPartyFailures}));
    results.push({viewport,...result,pageErrors:errors.length});
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 return results;
}
async function main(){
 const args=process.argv.slice(2),option=(name,fallback)=>{const n=args.indexOf(name);return n<0?fallback:args[n+1];};
 const release=option('--expected-commit',RELEASE),source=path.resolve(option('--source-dir',path.join(__dirname,'..')));
 if(!/^[a-f0-9]{40}$/.test(release))throw Error('Expected full release commit required');
 if(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==release)throw Error('Source checkout must match the expected release commit');
 const runtime=JSON.parse(fs.readFileSync(path.join(source,'config/staging.public.json'),'utf8'));
 if(runtime.staging!==true||runtime.firebaseConfig?.projectId!=='universal-iti-dk-staging'||runtime.apiUrl!==API+'/api')throw Error('Expected staging public runtime required');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'iti-hosted-check-'));let expected;
 try{expected=require(path.join(source,'scripts/build-web.js')).buildWeb({sourceDir:source,outputDir:path.join(temporary,'web'),runtime});}finally{fs.rmSync(temporary,{recursive:true,force:true});}
 const assets=await verifyFiles(expected);
 const health=JSON.parse((await bytes(API+'/healthz')).toString('utf8')),version=JSON.parse((await bytes(API+'/security-version')).toString('utf8'));
 if(health.ok!==true||version.yearPlanning!=='v1'||version.adminDelegation!=='v1'||version.teachingPlans!=='v1'||version.secureExams!=='v2')throw Error('Staging backend version or health does not match');
 const browsers=args.includes('--browser')?await browserCheck():[];
 console.log(JSON.stringify({ok:true,project:'universal-iti-dk-staging',release,readOnly:true,credentialsUsed:false,dataChanged:false,assets,backend:{healthy:true,...version},browsers,loginTested:false,firestoreRulesReadBack:false,driveUploadTested:false},null,2));
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({ok:false,readOnly:true,dataChanged:false,error:e.message}));process.exitCode=1;});
module.exports={compareManifest,verifyFiles,bytes,hash,ORIGIN,API};
