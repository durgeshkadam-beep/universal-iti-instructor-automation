'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
async function main(){
 const dom=new JSDOM('<section id="tab-skill-gap"></section>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
 w.DATA={practicals:[{no:1,title:'Print'}]};let finish;
 const profile=new Promise(r=>finish=r);const V={ready:true,INSTITUTE_ID:'iti-a',workspaceId:'batch',member:{traineeId:'t1'},fb:{user:{uid:'s1'}},currentRole:()=> 'student',getStudentSkillProfile:()=>profile};
 w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-skill-gap.js','utf8'));
 const running=V.renderStudentSkillGap();V.INSTITUTE_ID='iti-b';finish({skills:{'practical-1':{status:'verified'}}});await running;
 assert.doesNotMatch(w.document.body.textContent,/1 \/ 1 verified/,'old institute verification cannot appear after switch');
 V.INSTITUTE_ID='iti-a';V.getStudentSkillProfile=async()=>({skills:{}});await V.renderStudentSkillGap();
 const save=[...w.document.querySelectorAll('button')].find(x=>x.textContent.includes('Save personal'));
 w.document.querySelector('#v15CareerRole').value='Old institute goal';V.INSTITUTE_ID='iti-b';save.click();
 assert.equal(w.localStorage.getItem('iti-v15-career-plan-v1-s1-batch-t1'),null,'stale save must not write after institute switch');
 V.INSTITUTE_ID='iti-a';await V.renderStudentSkillGap();w.document.querySelector('#v15CareerRole').value='Active goal';
 [...w.document.querySelectorAll('button')].find(x=>x.textContent.includes('Save personal')).click();
 assert.match(w.localStorage.getItem('iti-v15-career-plan-v1-s1-batch-t1'),/Active goal/);
 dom.window.close();console.log('PASS skill gap rejects old institute verification response.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
