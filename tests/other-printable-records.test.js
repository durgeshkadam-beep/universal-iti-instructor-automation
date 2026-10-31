'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<section id="tab-record-formats" class="panel"><div class="card"><p>These are the next templates to be mapped to your supplied official examples.</p></div></section>',{url:'https://synthetic.example',runScripts:'outside-only'});
 const w=dom.window;
 w.Reports={};w.alert=()=>{};
 w.DATA={meta:{trade:'DTP'},trainees:[{id:'t1',roll:'001',name:'Original student'}],practicals:[{no:1,title:'Original practical'}],visits:[{id:'v1',date:'2026-10-01',type:'OJT',title:'Original visit'}],undertakings:[],projects:[]};
 w.eval(fs.readFileSync('other-printable-records.js','utf8'));
 w.OtherPrintableRecords.init();
 return {w,dom,O:w.OtherPrintableRecords,options:id=>[...w.document.getElementById(id).options].map(x=>({value:x.value,label:x.textContent}))};
}
test('print selectors refresh for the current workspace and discard stale trainee records',()=>{
 const f=setup();try{
  assert.equal(f.options('otherPrintAdmissionProfile')[0].value,'t1');
  assert.match(f.options('otherPrintEvalSelect')[0].label,/Original practical/);
  f.w.DATA={meta:{trade:'COPA'},trainees:[{id:'t2',roll:'004',name:'New student'}],practicals:[{no:5,title:'New practical'}],visits:[],undertakings:[],projects:[]};
  f.O.refresh();
  for(const id of ['otherPrintAdmissionProfile','otherPrintTraineeSelect','otherPrintWarningTrainee']){
   assert.deepEqual(f.options(id).map(x=>x.value),['t2']);assert.match(f.options(id)[0].label,/New student/);
  }
  assert.deepEqual(f.options('otherPrintEvalSelect').map(x=>x.value),['5']);
  assert.deepEqual(f.options('otherPrintVisitLetter').map(x=>x.value),['']);
 }finally{f.dom.window.close();}
});
test('reopening print formats is idempotent and an old selected trainee ID is never retained',()=>{
 const f=setup();try{
  f.O.init();assert.equal(f.w.document.querySelectorAll('#otherPrintableRecords').length,1);
  f.w.DATA.trainees=[{id:'t3',roll:'003',name:'Third student'}];
  f.O.refresh();assert.equal(f.options('otherPrintAdmissionProfile')[0].value,'t3');
  assert.equal(f.options('otherPrintAdmissionProfile').length,1);
  f.O.refresh();assert.equal(f.options('otherPrintAdmissionProfile').length,1);
 }finally{f.dom.window.close();}
});
