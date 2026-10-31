'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../server/service');
function makeService(){
 const rows=new Map([
 ['institutes/synthetic',{ownerUid:'root'}],
 ['institutes/synthetic/workspaces/training',{status:'active'}],
 ['institutes/synthetic/members/teacher',{role:'instructor',active:true,workspaceIds:['training']}],
 ['institutes/synthetic/members/trainee',{role:'student',active:true,workspaceIds:['training'],traineeId:'t-001'}]
 ]);
 const budgets=new Map(),calls=[];
 function ref(path){return {path,get:async()=>({exists:rows.has(path),data:()=>rows.get(path)}),collection:n=>ref(path+'/'+n),doc:n=>ref(path+'/'+n)};}
 const db={doc:ref,runTransaction:async fn=>fn({get:async r=>({exists:budgets.has(r.path),data:()=>budgets.get(r.path)}),set:(r,v)=>budgets.set(r.path,v)})};
 const service=createService({db,config:{provider:'gemini',apiKey:'synthetic-private-key',model:'gemini-2.5-flash-lite',dailyLimit:5,globalAiDailyLimit:5},
  verifyToken:async token=>({uid:token}),fetchImpl:async(url,options)=>{
    calls.push({url,options});
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Synthetic Gemini coaching draft: practice the verified trade skill'}]}}]})};
  }});
 return {service,calls};
}
const common={instituteId:'synthetic',workspaceId:'training',action:'ai',task:'career',language:'mr',input:'Synthetic verified ITI skill practice',consent:true};
test('both active Instructor and Student can access the same server-key Gemini Free Tier adapter without exposing its key',async()=>{
 const f=makeService();
 for(const who of ['teacher','trainee']){
  const capabilities=await f.service.execute(who,{...common,action:'capabilities'});
  assert.deepEqual(capabilities,{aiConfigured:true});
  const draft=await f.service.execute(who,common);
  assert.equal(draft.mode,'ai-draft');assert.match(draft.text,/Synthetic Gemini coaching draft/);
  assert(!JSON.stringify(draft).includes('synthetic-private-key'));
 }
 assert.equal(f.calls.length,2);
 for(const call of f.calls){
  assert.match(call.url,/gemini-2\.5-flash-lite/);
  assert(!JSON.stringify(JSON.parse(call.options.body)).includes('synthetic-private-key'));
 }
});
test('student cannot send an Instructor teaching-plan request even when free Gemini is configured',async()=>{
 const f=makeService();
 await assert.rejects(f.service.execute('trainee',{...common,task:'teaching'}),e=>e.status===403);
 assert.equal(f.calls.length,0);
});
