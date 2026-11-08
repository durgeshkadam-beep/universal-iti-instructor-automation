'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {assertRelease,requirePassedCI,PROJECT,BRANCH}=require('../scripts/deploy-staging-hosting');
const sha='4ff336915a15bc3c7716f3a8a36eb7ce4c53f826';
function fixture(){
 return {sha,head:sha,branch:BRANCH,changes:'',
  runtime:{staging:true,apiUrl:'https://universal-iti-staging-api.onrender.com/api',firebaseConfig:{projectId:PROJECT}},
  config:{hosting:{public:'dist/web',predeploy:['node scripts/build-web.js --require-runtime --runtime config/staging.public.json']}}};
}
test('staging preflight requires clean exact-commit checkout and only the isolated project',()=>{
 assert.equal(assertRelease(fixture()).project,PROJECT);
 const x=fixture();
 for(const v of [
  {...x,sha:'4ff3369'},
  {...x,head:'0'.repeat(40)},
  {...x,branch:'main'},
  {...x,changes:' M app.js'},
  {...x,runtime:{...x.runtime,staging:false}},
  {...x,runtime:{...x.runtime,firebaseConfig:{projectId:'universal-iti-auto-dk'}}},
  {...x,runtime:{...x.runtime,apiUrl:'https://prod.example.com/api'}},
  {...x,config:{hosting:{public:'public',predeploy:x.config.hosting.predeploy}}},
  {...x,config:{hosting:{public:'dist/web',predeploy:[]}}}
 ])assert.throws(()=>assertRelease(v));
});
test('release CI check requires successful full workflow for the exact SHA (not earlier green checks)',async()=>{
 const f=items=>async()=>({ok:true,status:200,json:async()=>({workflow_runs:items})});
 const passed={id:41477866352,head_sha:sha,head_branch:BRANCH,
  workflow_id:341087220,event:'push',status:'completed',conclusion:'success'};
 assert.equal(await requirePassedCI(sha,f([passed])),true);
 assert.equal(await requirePassedCI(sha,async()=>({ok:true,status:200,json:async()=>({...passed})}),41477866352),true);
 for(const runs of [[],[{...passed,head_sha:'f'.repeat(40)}],
  [{...passed,workflow_id:123}], [{...passed,head_branch:'main'}],
  [{...passed,event:'schedule'}], [{...passed,conclusion:'failure'}],
  [{...passed,status:'in_progress'}]]){
  await assert.rejects(requirePassedCI(sha,f(runs)),/No successful full Application CI/);
 }
 await assert.rejects(requirePassedCI(sha,async()=>({ok:false,status:403})),/GitHub CI verification HTTP 403/);
});
test('release helper never invokes production, rules or database deploy',()=>{
 const src=fs.readFileSync('scripts/deploy-staging-hosting.js','utf8');
 assert.match(src,/run\('npx',\['--no-install','firebase','deploy','--only','hosting','--project',PROJECT,'--config','firebase.staging.json','--non-interactive'\]\)/);
 assert.doesNotMatch(src,/firebase deploy --only firestore|--only','functions|--only','firestore/);
 assert.match(src,/if\(!execute\)/);
 assert.match(src,/await requirePassedCI\(sha,fetch,ciRunId\)/);
});
