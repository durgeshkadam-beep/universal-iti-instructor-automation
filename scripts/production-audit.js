'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function audit({run=spawnSync,sleep=pause,maxAttempts=3,includeDev=false}={}){
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const result=run(process.platform==='win32'?'npm.cmd':'npm',['audit',...(includeDev?['--include=dev']:['--omit=dev']),'--audit-level=moderate','--json','--fetch-retries=0','--fetch-timeout=20000'],{encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,shell:process.platform==='win32'});
  let report;try{report=JSON.parse(result.stdout||'');}catch{}
  const counts=report?.metadata?.vulnerabilities;
  const valid=counts&&['moderate','high','critical','total'].every(k=>Number.isInteger(counts[k])&&counts[k]>=0);
  if(valid){
   // Actual findings fail immediately. Registry retries must never hide them.
   if(counts.moderate+counts.high+counts.critical>0)return {passed:false,attempts:attempt,reason:'vulnerabilities',report};
   if(result.status===0&&!result.error&&!report.error)return {passed:true,attempts:attempt,report};
  }
  if(attempt===maxAttempts)return {passed:false,attempts:attempt,reason:'audit-unavailable'};
  await sleep(2000*attempt);
 }
}
const includeDev=process.argv.includes('--include-dev'),label=includeDev?'Dependency':'Production';
if(require.main===module)audit({includeDev}).then(result=>{
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/'+(includeDev?'dependency':'production')+'-audit.json',JSON.stringify(result,null,2)+'\n');
 if(result.passed)console.log(label+' audit passed on attempt '+result.attempts+': '+JSON.stringify(result.report.metadata.vulnerabilities));
 else console.error(result.reason==='vulnerabilities'?label+' vulnerabilities found: '+JSON.stringify(result.report.metadata.vulnerabilities):label+' audit unavailable after '+result.attempts+' attempts; validation remains failed.');
 process.exitCode=result.passed?0:1;
}).catch(()=>{console.error(label+' audit could not complete; validation remains failed.');process.exitCode=1;});
module.exports={audit};
