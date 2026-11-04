'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomBytes,randomUUID}=require('node:crypto');
const {createService}=require('../server/service');
function fixture(config={},patch={}){
 const session=randomUUID(),calls={provider:0,writes:0};
 const rows={'institutes/i':{ownerUid:'different-owner'},'institutes/i/members/student':{role:'student',active:true,workspaceIds:['w'],traineeId:'t',...patch},'institutes/i/workspaces/w':{name:'Synthetic'}};
 const ref=path=>({get:async()=>({exists:!!rows[path],data:()=>rows[path]}),collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)})});
 const db={doc:ref,runTransaction:async()=>{calls.writes++;throw Error('No write expected');}};
 return {session,calls,service:createService({db,config,verifyToken:async token=>{if(token!==session)throw Error('Invalid session');return {uid:'student'};},fetchImpl:async()=>{calls.provider++;throw Error('No provider request expected');}})};
}
const request={action:'capabilities',instituteId:'i',workspaceId:'w'};
test('no-key capability status is authenticated, read-only and calls no AI provider',async()=>{
 const {service,session,calls}=fixture({provider:'none'});assert.deepEqual(await service.execute(session,request),{aiConfigured:false});assert.deepEqual(calls,{provider:0,writes:0});
});
test('configured providers reveal only a boolean, never their model, URL or key',async()=>{
 const secret=randomBytes(24).toString('hex');
 for(const config of [{provider:'gemini',model:'synthetic-model',apiKey:secret},{provider:'ollama',model:'synthetic-model',ollamaUrl:'http://127.0.0.1:11434'}]){
  const {service,session,calls}=fixture(config),out=await service.execute(session,request);assert.deepEqual(out,{aiConfigured:true});assert(!JSON.stringify(out).includes(secret));assert.deepEqual(calls,{provider:0,writes:0});
 }
});
test('partial or invalid provider configuration does not enable AI controls',async()=>{
 const credentialed=new URL('https://synthetic.example');credentialed.username='synthetic';credentialed.password=randomBytes(16).toString('hex');
 for(const config of [{provider:'gemini',model:'synthetic'},{provider:'gemini',apiKey:randomUUID()},{provider:'gemini',model:' ',apiKey:randomUUID()},{provider:'unsupported',model:'x'},{provider:'ollama',model:'x',ollamaUrl:'file:///tmp/model'},{provider:'ollama',model:'x',ollamaUrl:String(credentialed)}]){
  const {service,session}=fixture(config);assert.deepEqual(await service.execute(session,request),{aiConfigured:false});
 }
});
test('capability status cannot bypass token, active membership or workspace authorization',async()=>{
 let f=fixture({provider:'none'});await assert.rejects(f.service.execute(randomUUID(),request),e=>e.status===401);
 f=fixture({provider:'none'},{active:false});await assert.rejects(f.service.execute(f.session,request),e=>e.status===403);
 f=fixture({provider:'none'},{workspaceIds:['another-workspace']});await assert.rejects(f.service.execute(f.session,request),e=>e.status===403);
});
