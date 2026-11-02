'use strict';
/**
 * Explicit, staging-only Firebase Hosting release helper.
 *
 * Default is read-only preflight; passing --execute still requires a successful
 * full CI workflow for the exact commit and an authenticated Firebase operator.
 * Never deploys rules, Auth, Functions, databases or production Hosting.
 */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const PROJECT='universal-iti-dk-staging';
const BRANCH='phase1/security-student-career-20261021';
const REPO='durgeshkadam-beep/universal-iti-instructor-automation';
const BACKEND='https://universal-iti-staging-api.onrender.com/api';
const SHA=/^[a-f0-9]{40}$/;

function assertRelease({sha,head,branch,changes,runtime,config}){
 if(!SHA.test(String(sha||'')))throw Error('Require the complete, exact 40-character validated commit SHA.');
 if(head!==sha)throw Error('Checked-out HEAD differs from the requested validated commit.');
 if(branch&&branch!==BRANCH)throw Error('Release must come from the Instructor PR branch (or detached at that exact commit).');
 if(changes)throw Error('Tracked source files are modified; release only a clean committed build.');
 if(runtime?.staging!==true||runtime.firebaseConfig?.projectId!==PROJECT||runtime.apiUrl!==BACKEND)
  throw Error('Public runtime is not the explicitly isolated Firebase staging project/backend.');
 if(config?.hosting?.public!=='dist/web'||!config.hosting.predeploy?.includes('node scripts/build-web.js --require-runtime --runtime config/staging.public.json'))
  throw Error('Staging hosting build configuration does not match the reviewed release.');
 return {project:PROJECT,commit:sha,only:'hosting',production:false};
}
function run(file,args){
 return execFileSync(file,args,{cwd:ROOT,stdio:'inherit',env:process.env,timeout:15*60*1000});
}
function git(args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:15000}).trim();}
// Workflow identity is fixed to the existing full application validation workflow.
// Verify one exact GitHub Actions run when --ci-run is supplied; otherwise search
// that workflow (NOT a loose repo-wide 100-run listing).
const CI_WORKFLOW_ID=341087220;
const CI_WORKFLOW_FILE='v15-production-tests.yml';
function validatedRun(run,sha){
 return run&&run.head_sha===sha&&run.head_branch===BRANCH&&
  run.workflow_id===CI_WORKFLOW_ID&&
  ['push','workflow_dispatch'].includes(run.event)&&
  run.status==='completed'&&run.conclusion==='success';
}
async function requirePassedCI(sha,fetcher=fetch,runId=null){
 if(!SHA.test(String(sha||'')))throw Error('Invalid exact commit SHA for CI verification.');
 if(runId!==null&&!/^[1-9][0-9]*$/.test(String(runId)))throw Error('Invalid --ci-run ID.');
 const base='https://api.github.com/repos/'+REPO;
 const api=runId!==null?
   base+'/actions/runs/'+runId:
   base+'/actions/workflows/'+CI_WORKFLOW_FILE+'/runs?branch='+encodeURIComponent(BRANCH)+'&head_sha='+sha+'&per_page=100';
 const headers={'Accept':'application/vnd.github+json','User-Agent':'Universal-EduSkill-Staging-Release'};
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const r=await fetcher(api,{method:'GET',headers,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('GitHub CI verification HTTP '+r.status+' (check GitHub access; no deployment attempted).');
 const out=await r.json();
 const runs=runId!==null?[out]:Array.isArray(out.workflow_runs)?out.workflow_runs:[];
 if(runs.some(x=>validatedRun(x,sha)))return true;
 // Useful public metadata only. Do not print raw API responses, tokens or secrets.
 const found=runs.find(x=>x.head_sha===sha)||runs[0]||null;
 const detail=found?('run #'+found.id+', workflow='+found.workflow_id+
   ', branch='+String(found.head_branch||'missing')+
   ', event='+String(found.event||'missing')+
   ', status='+String(found.status||'missing')+
   ', conclusion='+String(found.conclusion||'missing')):'no matching runs returned';
 throw Error('No successful full Application CI for this exact commit ('+detail+
  '). View GitHub Actions for this SHA; if it passed, supply its run ID with --ci-run <id>.');
}
async function main(args=process.argv.slice(2)){
 const idx=args.indexOf('--commit'),sha=idx>=0?args[idx+1]:null,execute=args.includes('--execute');
 const ciIdx=args.indexOf('--ci-run'),ciRunId=ciIdx>=0?args[ciIdx+1]:null;
 if(!args.every((x,i)=>x==='--execute'||x==='--commit'||x==='--ci-run'||(i===idx+1&&x===sha)||(i===ciIdx+1&&x===ciRunId)))
  throw Error('Usage: node scripts/deploy-staging-hosting.js --commit <40-char SHA> [--ci-run <Actions run ID>] [--execute]');
 const runtime=JSON.parse(fs.readFileSync(path.join(ROOT,'config/staging.public.json'),'utf8'));
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,'firebase.staging.json'),'utf8'));
 const preflight=assertRelease({sha,head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),
   changes:git(['status','--porcelain','--untracked-files=no']),runtime,config});
 await requirePassedCI(sha,fetch,ciRunId);
 if(!execute){console.log(JSON.stringify({...preflight,mode:'preflight-only',deployed:false,next:'Rerun this exact command with --execute from an authenticated staging-only Firebase account.'},null,2));return;}
 // Explicit hosting-only, pinned project: never read or use production project IDs.
 run('npm',['ci','--ignore-scripts']);
 run('node',['scripts/build-web.js','--require-runtime','--runtime','config/staging.public.json']);
 run('npx',['--no-install','firebase','deploy','--only','hosting','--project',PROJECT,'--config','firebase.staging.json','--non-interactive']);
 run('node',['scripts/verify-hosted-staging.js','--source-dir',ROOT,'--expected-commit',sha]);
 console.log(JSON.stringify({...preflight,deployed:true,publicAssetsVerified:true,
  loginTested:false,realStudentDataChanged:false,note:'Authenticated Instructor MCQ/Records acceptance remains manual.'},null,2));
}
if(require.main===module)main().catch(e=>{console.error('Staging Hosting release blocked or unverified: '+e.message);process.exitCode=1;});
module.exports={assertRelease,requirePassedCI,validatedRun,CI_WORKFLOW_ID,PROJECT,BRANCH};
