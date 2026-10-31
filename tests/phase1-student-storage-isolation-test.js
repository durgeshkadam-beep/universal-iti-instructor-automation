'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
async function main(){
 const d=new JSDOM('<section id="tab-skills"></section><section id="tab-skill-gap"></section>',{url:'https://example.test',runScripts:'outside-only'}),w=d.window;
 w.DATA={practicals:[{no:1,title:'Demo practical'}]};w.alert=()=>{};
 const V={ready:true,INSTITUTE_ID:'iti-a',workspaceId:'batch',member:{traineeId:'t1'},fb:{app:{options:{projectId:'project-a'}},user:{uid:'s1'}},currentRole:()=> 'student',getStudentSkillProfile:async()=>({skills:{}})};
 w.V15Sync=V;
 if(fs.existsSync('v15/v15-student-storage.js'))w.eval(fs.readFileSync('v15/v15-student-storage.js','utf8'));
 for(const f of ['v15-skill-passport.js','v15-skill-gap.js'])w.eval(fs.readFileSync('v15/'+f,'utf8'));
 V.renderSkillPassport();let select=w.document.querySelector('#tab-skills select');select.value='learning';select.dispatchEvent(new w.Event('change'));
 await V.renderStudentSkillGap();w.document.querySelector('#v15CareerRole').value='Institute A goal';[...w.document.querySelectorAll('#tab-skill-gap button')].find(x=>x.textContent.includes('Save personal')).click();
 V.INSTITUTE_ID='iti-b';V.renderSkillPassport();await V.renderStudentSkillGap();
 assert.equal(w.document.querySelector('#tab-skills select').value,'not-started','same UID/workspace in institute B must not inherit A self rating');
 assert.equal(w.document.querySelector('#v15CareerRole').value,'','institute B must not inherit A goal');
 V.INSTITUTE_ID='iti-a';V.fb.app.options.projectId='project-b';V.renderSkillPassport();await V.renderStudentSkillGap();
 assert.equal(w.document.querySelector('#tab-skills select').value,'not-started','different Firebase project must not inherit local data');
 V.fb.app.options.projectId='project-a';V.renderSkillPassport();await V.renderStudentSkillGap();
 assert.equal(w.document.querySelector('#tab-skills select').value,'learning');assert.equal(w.document.querySelector('#v15CareerRole').value,'Institute A goal');
 const legacy='iti-v15-career-plan-v1-s1-batch-t1';w.localStorage.setItem(legacy,JSON.stringify({roleName:'Unscoped old draft'}));w.localStorage.setItem(legacy+'-pending','1');
 V.INSTITUTE_ID='iti-b';let writes=0;V.fb.db={};V.fb.M={doc:(_db,...parts)=>parts.join('/'),getDoc:async()=>({exists:()=>true,data:()=>({selfRatings:{'practical-1':'can-demonstrate'},plan:{roleName:'Authorised B cloud goal'}})}),setDoc:async()=>{writes++},serverTimestamp:()=>0};
 w.eval(fs.readFileSync('v15/v15-student-services.js','utf8'));await V.syncStudentPlan();await V.renderStudentSkillGap();
 assert.equal(w.document.querySelector('#v15CareerRole').value,'Authorised B cloud goal');assert.equal(writes,0,'legacy pending draft must not be uploaded into current institute');assert.match(w.localStorage.getItem(legacy),/Unscoped old draft/);assert.equal(w.localStorage.getItem(legacy+'-pending'),'1');assert.match(w.document.body.textContent,/older browser draft is retained/);
 V.fb.app.options.projectId='';assert.equal(V.studentStorageKeys(),null,'missing project cannot produce a shared fallback key');
 d.window.close();console.log('PASS student browser records isolated by project and institute; original records retained.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
