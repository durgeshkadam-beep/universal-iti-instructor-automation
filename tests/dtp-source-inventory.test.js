'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{summary,inspect}=require('../scripts/inspect-dtp-source');
test('inventory summaries never emit student names, contacts or plan content',()=>{
 const s=summary([{data:{name:'Private learner',phone:'Private contact',plan:{objective:['Private note']},status:'completed'}}]);
 assert.deepEqual(s,{records:1,withPlan:1,completed:1});assert(!JSON.stringify(s).includes('Private'));
});
test('inventory discovers shared and legacy DTP records using read methods only',async()=>{
 const snap=rows=>({docs:rows.map(data=>({data:()=>data}))}),section={id:'trainees',get:async()=>snap([{data:{name:'Private learner'}}])};
 const ws={id:'dtp',data:()=>({trade:'DTPO'}),ref:{listCollections:async()=>[section]}};
 const legacy={id:'legacy-dtp',collection:name=>{assert.equal(name,'sections');return {get:async()=>snap([{key:'meta',value:{trade:'Desktop Publishing Operator'}},{key:'trainees',value:[{name:'Private learner'}]}])};}};
 const inst={get:async()=>({exists:true,data:()=>({ownerUid:'owner'})}),collection:name=>{assert.equal(name,'workspaces');return {get:async()=>({docs:[ws,{id:'other',data:()=>({trade:'Electrician'})}]})};}};
 const db={doc:path=>{assert.equal(path,'institutes/brdbagiti-mumbai-01');return inst;},collection:path=>{assert.equal(path,'itiInstructorUsers/owner/workspaces');return {listDocuments:async()=>[legacy]};}};
 const r=await inspect(db);assert.equal(r.readOnly,true);assert.equal(r.shared.length,1);assert.equal(r.shared[0].sections.trainees.records,1);assert.equal(r.legacy[0].sections.trainees.records,1);assert(!JSON.stringify(r).includes('Private'));
});
test('missing institute stops inventory without further access',async()=>{
 await assert.rejects(inspect({doc:()=>({get:async()=>({exists:false})})}),/Institute missing/);
});
