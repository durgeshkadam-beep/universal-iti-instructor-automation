'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><section id="tab-skill-gap"></section></body></html>',{
    url:'https://example.test/final/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window;
  w.DATA={practicals:[
    {no:1,title:'Layout basics'},{no:2,title:'Typography'},{no:3,title:'Print settings'}
  ]};
  const V={ready:true,workspaceId:'dtp-2026',member:{traineeId:'trainee-a'},
    fb:{user:{uid:'student-a'}},
    currentRole:()=> 'student',
    getStudentSkillProfile:async()=>({skills:{
      'practical-1':{status:'verified',verifiedBy:'instructor-1'},
      'practical-2':{status:'learning'}
    }})
  };
  w.V15Sync=V;V.INSTITUTE_ID=V.INSTITUTE_ID||'iti-a';V.member=V.member||{traineeId:'t1'};V.fb.app={options:{projectId:'project-a'}};w.eval(fs.readFileSync('v15/v15-student-storage.js','utf8'));
  w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-skill-gap.js'),'utf8'));
  await V.renderStudentSkillGap();
  let host=w.document.querySelector('#tab-skill-gap');
  assert.match(host.textContent,/1 \/ 3 verified/,'only one of three selected skills is verified');
  assert.match(host.textContent,/33% learning coverage/,'coverage is rounded and visible');
  const inputs=[...host.querySelectorAll('input[type="checkbox"]')];
  assert.equal(inputs.length,3,'real trade practicals drive plan items');
  inputs[2].checked=false;
  inputs[2].dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match(host.textContent,/1 \/ 2 verified/,'selecting a learning subset changes denominator');
  const role=host.querySelector('#v15CareerRole');
  role.value='Sample DTP Operator';
  const save=[...host.querySelectorAll('button')].find(x=>x.textContent.includes('Save personal'));
  save.click();
  const key=V.studentStorageKeys().goalKey;
  const saved=JSON.parse(w.localStorage.getItem(key));
  assert.equal(saved.roleName,'Sample DTP Operator');
  assert.deepEqual(saved.requiredIds,['practical-1','practical-2']);
  V.fb.user.uid='student-b';V.member.traineeId='trainee-b';
  V.getStudentSkillProfile=async()=>({skills:{}});
  await V.renderStudentSkillGap();
  host=w.document.querySelector('#tab-skill-gap');
  assert.equal(host.querySelector('#v15CareerRole').value,'','another student does not inherit role goal');
  assert.match(host.textContent,/0 \/ 3 verified/,'new student is not credited previous student verification');
  assert.equal(host.querySelectorAll('input[type="checkbox"]:checked').length,3,'new student defaults to full syllabus');
  w.close();
  console.log('PASS Skill Gap DOM: verified-only, dynamic selection and separate student plans.');
})().catch(e=>{console.error(e);process.exitCode=1;});