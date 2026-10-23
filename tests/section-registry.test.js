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
