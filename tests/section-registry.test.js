'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs');
test('saving a new section queues its discovery metadata even when institute metadata is unchanged',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://synthetic.example',runScripts:'outside-only'}),w=dom.window;
 try{
  Object.defineProperty(w.navigator,'onLine',{value:false});w.SESSION={role:'instructor'};
  w.DATA={meta:{trade:'Synthetic'},modules:[{id:'module-one',name:'Synthetic module'}]};
  const V={ready:true,workspaceId:'synthetic-workspace',INSTITUTE_ID:'synthetic-institute',member:{role:'instructor'},arraySections:new Set(),mapSections:new Set(),shadow:{meta:{trade:'Synthetic'},modules:[]},fb:{user:{uid:'synthetic-instructor'}},clone:x=>structuredClone(x),eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),safe:x=>x,now:()=> '2026-10-23T00:00:00Z',itemId:(_,x)=>x.id,badge(){}};
  w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));
  await V.diff();const pending=V.queueRead(),record=pending.find(o=>o.section==='modules'),metadata=pending.find(o=>o.kind==='meta');
  assert(record,'new module record must be queued');assert(metadata,'the new section must remain discoverable after fresh login');
  assert(metadata.data.arraySections.includes('modules'));assert.equal(metadata.data.trade,'Synthetic');assert.equal(metadata.workspaceId,record.workspaceId);
 }finally{w.close();}
});
test('a slow network flush cannot discard subsequent local syllabus saves',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://synthetic.example',runScripts:'outside-only'}),w=dom.window;let release;
 try{
  w.SESSION={role:'instructor'};w.DATA={meta:{trade:'Synthetic'},practicals:[{no:1,title:'First'}],theory:[]};
  const V={ready:true,workspaceId:'w',INSTITUTE_ID:'synthetic',member:{role:'instructor'},arraySections:new Set(['practicals','theory']),mapSections:new Set(),shadow:{meta:{trade:'Synthetic'},practicals:[],theory:[]},fb:{user:{uid:'i'}},clone:x=>structuredClone(x),eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),safe:x=>x,now:()=> '2026-10-23T00:00:00Z',itemId:(_,x)=>String(x.no),badge(){}};
  w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));
  const held=new Promise(r=>{release=r;});V.flushQueue=()=>held;
  const first=V.diff();assert(V.queueRead().some(o=>o.section==='practicals'));
  w.DATA.theory.push({no:1,title:'Second save during slow flush'});const second=V.diff();
  assert(V.queueRead().some(o=>o.section==='theory'&&o.value.title==='Second save during slow flush'),'new work must be durable before the first network flush finishes');
  release();await Promise.all([first,second]);
 }finally{release?.();w.close();}
});
test('a save is durable before a deferred cloud callback or page close can replace its record',()=>{
 const dom=new JSDOM('',{url:'https://synthetic.example',runScripts:'outside-only'}),w=dom.window;
 try{
  Object.defineProperty(w.navigator,'onLine',{value:false});w.SESSION={role:'instructor'};
  const original={no:1,title:'Synthetic',materials:{pdfLink:'https://example.test/notes.pdf'}};
  w.DATA={practicals:[structuredClone(original)],meta:{}};
  const V={ready:true,workspaceId:'w',INSTITUTE_ID:'synthetic',member:{role:'instructor'},arraySections:new Set(['practicals']),mapSections:new Set(),shadow:structuredClone(w.DATA),fb:{user:{uid:'i'}},clone:structuredClone,eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),safe:structuredClone,now:()=>new Date().toISOString(),itemId:(_,x)=>String(x.no),badge(){}};
  w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));
  w.DATA.practicals[0].plan={objective:['Synthetic latest plan']};V.schedule();
  assert.equal(V.queueRead()[0]?.value.plan.objective[0],'Synthetic latest plan','save must reach durable storage in the same task');
  V.receiveSyllabusSnapshot('practicals',[original]);assert.equal(w.DATA.practicals[0].plan.objective[0],'Synthetic latest plan');
 }finally{w.close();}
});
