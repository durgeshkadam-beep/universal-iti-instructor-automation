'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
async function main(){
 const dom=new JSDOM('<section id="tab-skills"></section>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
 w.alert=()=>{};w.DATA={practicals:[{no:1,title:'Print'}]};let saves=0;
 const V={ready:true,workspaceId:'batch',INSTITUTE_ID:'iti-a',fb:{user:{uid:'student-a'}},currentRole:()=> 'student',persistStudentPlan:async()=>{saves++}};
 w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-skill-passport.js','utf8'));V.renderSkillPassport();
 const old=w.document.querySelector('select');V.fb.user={uid:'student-b'};old.value='learning';old.dispatchEvent(new w.Event('change'));
 assert.equal(w.localStorage.getItem('iti-v15-student-skill-self-v1-student-b-batch'),null,'stale control cannot write another account');assert.equal(saves,0);
 V.renderSkillPassport();const fresh=w.document.querySelector('select');fresh.value='learning';fresh.dispatchEvent(new w.Event('change'));
 assert.match(w.localStorage.getItem('iti-v15-student-skill-self-v1-student-b-batch'),/learning/);assert.equal(saves,1);
 dom.window.close();console.log('PASS student self assessment rejects stale controls and accepts active edits.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
