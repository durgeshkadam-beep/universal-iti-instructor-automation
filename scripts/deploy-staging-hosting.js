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
async function requirePassedCI(sha,fetcher=fetch){
 const api='https://api.github.com/repos/'+REPO+'/actions/runs?branch='+encodeURIComponent(BRANCH)+'&per_page=100';
 const headers={'Accept':'application/vnd.github+json','User-Agent':'Universal-EduSkill-Staging-Release'};
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const r=await fetcher(api,{method:'GET',headers,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Unable to verify exact-commit CI (GitHub HTTP '+r.status+'). No deployment attempted.');
 const out=await r.json();
 const runs=out.workflow_runs||[];
 const allowed=runs.some(x=>x.head_sha===sha&&x.status==='completed'&&x.conclusion==='success'&&
   x.path==='.github/workflows/v15-production-tests.yml');
 if(!allowed)throw Error('Full application CI must pass for this exact commit before staging deployment.');
 return true;
}
async function main(args=process.argv.slice(2)){
 const idx=args.indexOf('--commit'),sha=idx>=0?args[idx+1]:null,execute=args.includes('--execute');
 if(args.some(x=>x!=='--execute'&&x!=='--commit'&&x!==sha))throw Error('Usage: node scripts/deploy-staging-hosting.js --commit <full SHA> [--execute]');
 const runtime=JSON.parse(fs.readFileSync(path.join(ROOT,'config/staging.public.json'),'utf8'));
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,'firebase.staging.json'),'utf8'));
 const preflight=assertRelease({sha,head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),
   changes:git(['status','--porcelain','--untracked-files=no']),runtime,config});
 await requirePassedCI(sha);
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
module.exports={assertRelease,requirePassedCI,PROJECT,BRANCH};
