'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../server/service');
const request={action:'ai',instituteId:'synthetic',workspaceId:'w',task:'career',language:'en',input:'Synthetic skill guidance',consent:true};
function fixture({dailyLimit=5,fail=false,provider='gemini'}={}){
 let time=Date.parse('2026-10-27T23:59:00Z'),calls=0;
 const records=new Map();
 function ref(path){return {path,collection:n=>ref(path+'/'+n),doc:n=>ref(path+'/'+n),get:async()=>({exists:true,data:()=>({ownerUid:'u',active:true,role:'student',workspaceIds:['w']})})};}
 const db={doc:ref,runTransaction:async fn=>fn({get:async r=>({exists:records.has(r.path),data:()=>records.get(r.path)}),set:(r,v)=>records.set(r.path,v)})};
 const config={provider,model:'synthetic',apiKey:'synthetic',dailyLimit};
 const api=createService({db,now:()=>time,verifyToken:async token=>{if(token==='invalid')throw Error('invalid');return {uid:token};},config,fetchImpl:async()=>{calls++;if(fail)throw Error('synthetic provider failure');return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Synthetic reviewable draft'}]}}]})};}});
 return {api,calls:()=>calls,setLimit:n=>{config.dailyLimit=n;},nextDay:()=>{time+=86400000;}};
}
test('AI cap blocks provider calls and explains failed attempts and the UTC reset',async()=>{
 const f=fixture({fail:true});for(let i=0;i<5;i++)await assert.rejects(f.api.execute('u',request),e=>e.status===503);
 await assert.rejects(f.api.execute('u',request),e=>e.status===429&&e.message.includes('5 attempts, including failed requests')&&e.message.includes('2026-10-28 00:00 UTC')&&e.message.includes('manual mode'));
 assert.equal(f.calls(),5);
});
test('configured staging allowance adds only five attempts without clearing existing counts',async()=>{
 const f=fixture();for(let i=0;i<5;i++)await f.api.execute('u',request);
 await assert.rejects(f.api.execute('u',request),e=>e.status===429);f.setLimit(10);for(let i=0;i<5;i++)await f.api.execute('u',request);
 await assert.rejects(f.api.execute('u',request),e=>e.status===429&&e.message.includes('10 attempts'));
 assert.equal(f.calls(),10);
});
test('AI allowance is per authenticated user and resets on the next UTC day',async()=>{
 const f=fixture({dailyLimit:1});await f.api.execute('u',request);await assert.rejects(f.api.execute('u',request),e=>e.status===429);
 await f.api.execute('other',request);f.nextDay();await f.api.execute('u',request);assert.equal(f.calls(),3);
});
test('missing consent, invalid authentication and keyless guidance never consume provider calls',async()=>{
 const f=fixture({dailyLimit:1});await assert.rejects(f.api.execute('invalid',request),e=>e.status===401);await assert.rejects(f.api.execute('u',{...request,consent:false}),e=>e.status===400);await f.api.execute('u',request);assert.equal(f.calls(),1);
 const guided=fixture({provider:'none'});for(let i=0;i<12;i++)assert.equal((await guided.api.execute('u',request)).mode,'guided');assert.equal(guided.calls(),0);
});

test('Free Tier external AI blocks obvious student personal identifiers before consuming provider quota',async()=>{
 const f=fixture({dailyLimit:1});
 for(const input of [
  'Please write a resume for 9123456789',
  'My email is trainee@example.org. Help with interview.',
  'Aadhaar 1234 5678 9012 to submit a form',
  'Please check number +91 9876543210',
 ]){
  await assert.rejects(f.api.execute('u',{...request,input}),e=>e.status===400&&/Remove/.test(e.message));
 }
 assert.equal(f.calls(),0);
 await f.api.execute('u',{...request,input:'Help practise a synthetic workshop interview'});
 assert.equal(f.calls(),1);
 await assert.rejects(f.api.execute('u',{...request,input:'Another synthetic interview'}),e=>e.status===429);
});
