'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('v15/v15-student-services.js','utf8');
async function main(){
 const dom=new JSDOM('<body></body>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 let release; const gate=new Promise(r=>{release=r}); const writes=[];
 const M={doc:(_db,...p)=>p.join('/'),getDoc:async()=>({exists:()=>false}),setDoc:async(ref,data)=>writes.push({ref,data}),serverTimestamp:()=>0};
 const V={ready:true,workspaceId:'batch',INSTITUTE_ID:'iti-a',member:{traineeId:'trainee-a'},fb:{user:{uid:'student-a'},M,db:{}},currentRole:()=> 'student',_planSave:gate};
 w.V15Sync=V;V.INSTITUTE_ID=V.INSTITUTE_ID||'iti-a';V.member=V.member||{traineeId:'t1'};V.fb.app={options:{projectId:'project-a'}};w.eval(fs.readFileSync('v15/v15-student-storage.js','utf8'));w.eval(source);await V.syncStudentPlan();
 const save=V.persistStudentPlan(); V.INSTITUTE_ID='iti-b'; V.fb.user={uid:'student-b'}; V.member={traineeId:'trainee-b'};
 release();await save.catch(()=>{});
 assert.equal(writes.length,0,'queued plan from previous identity must not write under new identity');
 assert.equal(w.localStorage.getItem('iti-v15-career-plan-v2-'+JSON.stringify(['project-a','iti-a','student-a','batch','trainee-a'])+'-pending'),'1','unsent edit remains pending');
 V.INSTITUTE_ID='iti-a'; V.fb.user={uid:'student-a'}; V.member={traineeId:'trainee-a'};
 await V.syncStudentPlan();
 assert.equal(writes.length,1,'pending edit syncs when original identity returns');
 assert.match(writes[0].ref,/institutes\/iti-a\/workspaces\/batch\/studentPlans\/student-a$/);
 assert.equal(w.localStorage.getItem('iti-v15-career-plan-v2-'+JSON.stringify(['project-a','iti-a','student-a','batch','trainee-a'])+'-pending'),null);
 let resolveRead; M.getDoc=()=>new Promise(r=>{resolveRead=r});
 const loading=V.syncStudentPlan(); V.INSTITUTE_ID='iti-b';
 resolveRead({exists:()=>true,data:()=>({selfRatings:{'practical-1':'learning'},plan:{roleName:'Old institute'}})}); await loading;
 assert.equal(w.localStorage.getItem('iti-v15-career-plan-v2-'+JSON.stringify(['project-a','iti-a','student-a','batch','trainee-a'])),null,'late data from old institute is not applied');
 dom.window.close();console.log('PASS queued student plan remains scoped to original identity.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
