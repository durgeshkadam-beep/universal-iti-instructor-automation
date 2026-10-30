'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><section id="tab-career-lens"></section><section id="tab-skill-applications"></section></body></html>',{
    url:'https://example.test/v15/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window;w.confirm=()=>true;
  w.DATA={practicals:[{no:1,title:'Text layout'},{no:2,title:'Print proofing'}]};
  let uid='student-a',workspace='dtp-2026',role='student';
  const records=[
    {title:'DTP Apprentice',employer:'Sample Press',city:'Mumbai',skills:['layout'],kind:'apprenticeship',
      status:'active',practicalIds:['practical-1'],sourceUrl:'https://example.org/career/1',expiresAt:'2026-12-20'},
    {title:'Prepress trainee',employer:'Proofers',city:'Pune',skills:['proofing'],kind:'job',
      status:'active',practicalIds:['practical-2'],sourceUrl:'https://example.org/career/2',expiresAt:'2026-12-15'}
  ];
  let application={practicalId:'practical-1',industry:'Printing and packaging',
    applicationText:'Production layout used in a cited printing workflow.',
    sourceUrl:'https://example.org/workplace-practical-1'};
  const M={
    doc:(_db,...args)=>({id:args.at(-1)}),
    async getDoc(ref){return {exists:()=>ref.id==='practical-1',data:()=>({...application})};},
    async setDoc(ref,data){assert.equal(ref.id,'practical-1');application={...data};},
    async runTransaction(_db,fn){return fn({get:ref=>M.getDoc(ref),set:(ref,data)=>{assert.equal(ref.id,'practical-1');application={...data};}});},
    serverTimestamp:()=>new Date('2026-10-27T05:00:00Z'),
    collection:(_db,...paths)=>({path:paths.join('/')}),
    where:(field,operator,value)=>({field,operator,value}),
    query:(col,where)=>({...col,where}),
    async getDocs(){return {forEach(cb){for(const r of records)cb({data:()=>({...r})});}};}
  };
  const V={ready:true,INSTITUTE_ID:'test-institute',workspaceId:workspace,
    member:{traineeId:'trainee-a'},fb:{user:{uid},M,db:{}},
    currentRole:()=>role,
    async getStudentSkillProfile(){return uid==='student-a'?{skills:{'practical-1':{status:'verified'}}}:{skills:{}};},
    finalOpenTab:async name=>{V.lastRoute=name;}
  };
  w.V15Sync=V;
  w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-local-market.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-career-lens.js'),'utf8'));
  await V.renderSkillCareerLens();
  const host=w.document.querySelector('#tab-career-lens');
  const results=w.document.querySelector('#v15LensResults');
  assert.match(results.textContent,/Instructor-verified skill/);
  assert.match(results.textContent,/Printing and packaging/,'instructor-cited real-world practical application visible');
  assert.match(results.textContent,/1 active institute-reviewed example/);
  assert.ok(results.querySelector('a[href="https://example.org/career/1"]'),'source-linked vacancy remains separate from workplace-use citation');
  assert.ok(results.querySelector('a[href="https://example.org/workplace-practical-1"]'),'independent workplace application citation exists');
  w.document.querySelector('#v15LensCity').value='Ratnagiri';
  w.document.querySelector('#tab-career-lens button').click();
  await tick();
  assert.match(results.textContent,/This does NOT mean the skill has no industry value/,'no data is not negative labour-market evidence');
  assert.equal(results.querySelectorAll('a[href="https://example.org/career/1"]').length,0,'no wrong-city vacancy');
  assert.equal(results.querySelectorAll('a[href="https://example.org/workplace-practical-1"]').length,1,'workplace use remains educational regardless of selected city');
  w.document.querySelector('#v15LensCity').value='Pune';
  w.document.querySelector('#v15LensPractical').value='practical-2';
  w.document.querySelector('#tab-career-lens button').click();
  await tick();
  assert.match(results.textContent,/Instructor verification not yet recorded/);
  assert.match(results.textContent,/Prepress trainee/,'exact linked practical appears');
  assert.doesNotMatch(results.textContent,/DTP Apprentice/,'wrong-city source is hidden');
  const next=[...host.querySelectorAll('button')].find(b=>b.textContent==='My Learning Plan');
  next.click();assert.equal(V.lastRoute,'skill-gap');
  uid='student-b';V.fb.user.uid=uid;V.member.traineeId='trainee-b';
  await V.renderSkillCareerLens();
  assert.match(w.document.querySelector('#v15LensResults').textContent,/Instructor verification not yet recorded/,'second student cannot inherit first verification');
  role='instructor';V.fb.user.uid='instructor-a';
  await V.renderInstructorSkillApplications();
  const editor=w.document.getElementById('tab-skill-applications');
  assert.match(editor.textContent,/Skill Applications/);
  const industry=w.document.getElementById('v15AppIndustry');
  industry.value='Packaging design';
  w.document.getElementById('v15AppExplanation').value='Instructor-reviewed packaging application for practical work.';
  w.document.getElementById('v15AppSource').value='https://example.org/workplace-reviewed';
  editor.querySelector('button').click();await tick();
  assert.equal(application.industry,'Packaging design','instructor may publish a sourced real-world use case');
  assert.equal(application.reviewedBy,'instructor-a');
  await V.renderSkillCareerLens();
  w.close();
  console.log('PASS Career Lens DOM: reviewed sources, verified status, city filtering, no-data warning, routes and account switch.');
})().catch(e=>{console.error(e);process.exitCode=1;});
