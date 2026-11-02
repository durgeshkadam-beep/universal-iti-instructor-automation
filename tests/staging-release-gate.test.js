'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {requirePassedCI,validatedRun,CI_WORKFLOW_ID}=require('../scripts/deploy-staging-hosting');
const SHA='a'.repeat(40),BRANCH='phase1/security-student-career-20261021';
const okRun=(overrides={})=>({id:41477866352,head_sha:SHA,head_branch:BRANCH,
 workflow_id:CI_WORKFLOW_ID,event:'push',status:'completed',conclusion:'success',...overrides});
function response(data){return {ok:true,status:200,json:async()=>data};}
test('exact successful staging CI workflow and commit are required',async()=>{
 assert(validatedRun(okRun(),SHA));
 for(const change of [{head_sha:'b'.repeat(40)},{head_branch:'main'},{workflow_id:1234},
   {event:'pull_request'},{status:'in_progress',conclusion:null},{conclusion:'failure'}]){
  assert.equal(validatedRun(okRun(change),SHA),false);
 }
});
test('explicit successful GitHub Actions run verifies SHA and workflow without scanning unrelated recent runs',async()=>{
 const urls=[];
 const getter=async(url,opts)=>{urls.push(url);assert.equal(opts.method,'GET');return response(okRun());};
 assert.equal(await requirePassedCI(SHA,getter,41477866352),true);
 assert.equal(urls.length,1);
 assert(urls[0].endsWith('/actions/runs/41477866352'));
 for(const bad of [{head_sha:'b'.repeat(40)},{status:'in_progress',conclusion:null},
     {workflow_id:5},{head_branch:'main'},{conclusion:'failure'}]){
  await assert.rejects(requirePassedCI(SHA,async()=>response(okRun(bad)),41477866352),
    /No successful full Application CI for this exact commit/);
 }
});
test('default CI lookup is filtered by workflow, branch, exact commit and fail-closed',async()=>{
 const urls=[];
 const getter=async(url)=>{urls.push(url);return response({workflow_runs:[okRun()]});};
 assert.equal(await requirePassedCI(SHA,getter),true);
 assert(urls[0].includes('/actions/workflows/v15-production-tests.yml/runs?'));
 assert(urls[0].includes('head_sha='+SHA));
 assert(urls[0].includes('branch=phase1%2Fsecurity-student-career-20261021'));
 await assert.rejects(requirePassedCI(SHA,async()=>response({workflow_runs:[]})),/no matching runs returned/);
 await assert.rejects(requirePassedCI(SHA,async()=>({ok:false,status:403})),/GitHub CI verification HTTP 403/);
 await assert.rejects(requirePassedCI(SHA,getter,'not-an-id'),/Invalid --ci-run ID/);
});
