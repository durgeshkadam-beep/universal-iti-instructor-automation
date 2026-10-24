'use strict';
// CI-only Docker smoke check: no credentials, external APIs or database writes.
const {spawnSync}=require('node:child_process');
const name='iti-api-smoke-'+process.pid;
function docker(args){const result=spawnSync('docker',args,{encoding:'utf8',timeout:180000});if(result.status!==0)throw Error(result.stderr||result.error?.message||'Docker failed');return result.stdout;}
(async()=>{
 docker(['build','-t','iti-api:smoke','.']);
 try{
  docker(['run','-d','--rm','--name',name,'-e','GCLOUD_PROJECT=demo-universal-iti','-p','127.0.0.1:18080:8080','iti-api:smoke']);
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){
   try{const response=await fetch('http://127.0.0.1:18080/healthz',{signal:AbortSignal.timeout(1000)});if(response.ok&&(await response.json()).ok===true){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,200));
  }
  if(!ready)throw Error('Container health check did not become ready');
  const response=await fetch('http://127.0.0.1:18080/api',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(response.status!==401)throw Error('Unauthenticated API request was not rejected');
  console.log('Container passed health and unauthenticated API checks without credentials.');
 }finally{spawnSync('docker',['rm','-f',name],{encoding:'utf8',timeout:10000});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
