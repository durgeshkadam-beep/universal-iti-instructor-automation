'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function safety(){
 const w={};vm.runInNewContext(fs.readFileSync('instructor-plan-safety.js','utf8'),{window:w});
 return w.InstructorPlanSafety;
}
const topics=[{seq:1,type:'practical',sourceNo:'1.01',title:'Graphic design',hours:5},{seq:2,type:'theory',sourceNo:'1.01',title:'Layout fundamentals',hours:3}];
test('empty new workspace permits initial planning without touching records',()=>{
 const v=safety().assess({meta:{trade:'DTP'},practicals:[],theory:[],modules:[]},topics,'DTP');
 assert.equal(v.ok,true);assert.equal(v.mode,'create');
});
test('matching syllabus revision keeps original objects, IDs and approved lesson evidence',()=>{
 const practical={id:'stable-42',no:42,title:'Graphic design',hours:5,plan:{approved:true},doneDate:'2026-10-27',status:'completed'};
 const theory={id:'stable-15',no:15,title:'Layout fundamentals',hours:3,marks:{trainee:35}};
 const data={meta:{trade:'DTP'},practicals:[practical],theory:[theory],modules:[{id:'saved'}]};
 const v=safety().assess(data,topics,'DTP');
 assert.equal(v.ok,true);assert.equal(v.mode,'revise');assert.equal(v.practicals[0],practical);assert.equal(v.theory[0],theory);
});
test('different trade, topic, duration or count blocks rewriting saved records',()=>{
 const p={title:'Graphic design',hours:5,sourceNo:'1.01'};
 const t={title:'Layout fundamentals',hours:3,sourceNo:'1.01'};
 const base={meta:{trade:'DTP'},practicals:[p],theory:[t]};
 for(const [data,items,trade] of [
  [base,topics,'COPA'],
  [base,[{...topics[0],title:'Different work'},topics[1]],'DTP'],
  [base,[{...topics[0],hours:7},topics[1]],'DTP'],
  [base,[topics[0]],'DTP'],
  [base,[...topics,{seq:3,type:'practical',title:'New unit',hours:3}], 'DTP']
 ]){
  const before=JSON.stringify(data);
  assert.equal(safety().assess(data,items,trade).ok,false);
  assert.equal(JSON.stringify(data),before);
 }
});
test('duplicate exercise numbers within a subject fail closed',()=>{
 const v=safety().assess({meta:{},practicals:[],theory:[],modules:[]},[
  {type:'practical',seq:1,sourceNo:'1.1.01',title:'One',hours:5},
  {type:'practical',seq:2,sourceNo:'1.1.01',title:'Two',hours:5}
 ],'');
 assert.equal(v.ok,false);assert.match(v.reason,/Duplicate/);
});
test('existing modules or previous plan prohibit empty-registry replacement',()=>{
 const s=safety();
 assert.equal(s.assess({meta:{},practicals:[],theory:[],modules:[{id:'old'}]},topics,'DTP').ok,false);
 assert.equal(s.assess({meta:{trainingPlan:{dayPlan:[{date:'2026-10-28'}]}},practicals:[],theory:[],modules:[]},topics,'DTP').ok,false);
});
