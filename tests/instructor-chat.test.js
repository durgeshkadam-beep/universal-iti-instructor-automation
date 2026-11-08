'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../server/service');
const {validateInstructorChat}=require('../server/instructor-chat');
function fixture(config={},workspace='trade'){
 const rows=new Map([
  ['institutes/iti',{ownerUid:'root'}],
  ['institutes/iti/workspaces/'+workspace,{status:'active'}],
  ['institutes/iti/members/i',{role:'instructor',active:true,workspaceIds:[workspace]}],
  ['institutes/iti/members/s',{role:'student',active:true,traineeId:'student-one',workspaceIds:[workspace]}],
  ['institutes/iti/members/p',{role:'principal',active:true,workspaceIds:[workspace]}],
  ['institutes/iti/members/inactive',{role:'instructor',active:false,workspaceIds:[workspace]}]
 ]);
 const counters=new Map(),calls=[];
 const ref=path=>({path,get:async()=>({exists:rows.has(path),data:()=>rows.get(path)}),doc:x=>ref(path+'/'+x),collection:x=>ref(path+'/'+x)});
 const db={doc:ref,runTransaction:async fn=>fn({get:async r=>({exists:counters.has(r.path),data:()=>counters.get(r.path)}),set:(r,value)=>counters.set(r.path,value)})};
 const service=createService({db,config:{provider:'gemini',apiKey:'synthetic-private-key',model:'synthetic-model',dailyLimit:5,globalAiDailyLimit:6,...config},
  verifyToken:async uid=>({uid}),fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'Use a clear demonstration, supervised practice and review questions.'}]}}]})};}});
 return {service,calls,rows,counters};
}
const q={action:'instructorChat',instituteId:'iti',workspaceId:'trade',language:'mr',input:'How to explain page layout to trainees?',history:[],consent:true};
test('Instructor can have real multi-turn teaching chat with server-key model and recent history',async()=>{
 const f=fixture(),first=await f.service.execute('i',q);
 assert.deepEqual(first,{mode:'ai-chat',text:'Use a clear demonstration, supervised practice and review questions.'});
 const history=[{role:'user',text:q.input},{role:'assistant',text:first.text}];
 const two=await f.service.execute('i',{...q,language:'hi',input:'How can I check understanding?',history});
 assert.equal(two.mode,'ai-chat');
 assert.equal(f.calls.length,2);
 const call=f.calls[1];
 assert.match(call.url,/synthetic-model/);
 assert.equal(call.options.headers['x-goog-api-key'],'synthetic-private-key');
 const payload=JSON.parse(call.options.body);
 assert.deepEqual(payload.contents.map(x=>x.role),['user','model','user']);
 assert.match(payload.systemInstruction.parts[0].text,/official syllabus|official record|approved/i);
 assert.equal(payload.generationConfig.maxOutputTokens,1200);
 assert(!JSON.stringify(payload).includes('synthetic-private-key'));
 assert(!JSON.stringify(two).includes('synthetic-private-key'));
});
test('Student, Principal, inactive Instructor and root are denied Instructor Chat',async()=>{
 const f=fixture();
 for(const who of ['s','p','inactive','root']){
  await assert.rejects(f.service.execute(who,q),e=>e.status===403);
 }
 assert.equal(f.calls.length,0);
});
test('Missing consent, contact details, invalid history and cross-workspace access are rejected before any provider calls',async()=>{
 const f=fixture();
 const bad=[
  {...q,consent:false},
  {...q,input:'Call 9876543210 to confirm'},
  {...q,input:'Aadhaar 1234 5678 9012'},
  {...q,input:'Send to trainee@example.org'},
  {...q,input:'A'.repeat(1201)},
  {...q,input:' '},
  {...q,language:'fr'},
  {...q,history:[{role:'user',text:'A'}]},
  {...q,history:[{role:'assistant',text:'Fake answer'}]},
  {...q,history:[{role:'user',text:'A'},{role:'assistant',text:'B',uid:'other-account'}]},
  {...q,history:Array.from({length:10},(_,i)=>({role:i%2?'assistant':'user',text:'Safe content'}))},
  {...q,workspaceId:'other-trade'}
 ];
 for(const input of bad)await assert.rejects(f.service.execute('i',input),e=>[400,403].includes(e.status));
 assert.equal(f.calls.length,0);
});
test('AI disabled returns explicitly guided text without external provider calls',async()=>{
 const f=fixture({provider:'none'});const result=await f.service.execute('i',q);
 assert.equal(result.mode,'guided');
 assert.equal(typeof result.text,'string');
 assert.equal(f.calls.length,0);
 assert.throws(()=>validateInstructorChat({...q,history:[{role:'user',text:'A'}]}),/complete question-and-answer pairs/);
});
test('The real dotted ITI workspace slug is allowed only for an assigned Instructor',async()=>{
 const wid='bharat-ratna-dr.-babasaheb-ambedkar-government-iti-mumbai-01-desktop-publishing-operator-dtpo-10-08-2026-to-31-05-2027';
 const f=fixture({},wid);const result=await f.service.execute('i',{...q,workspaceId:wid});
 assert.equal(result.mode,'ai-chat');
 await assert.rejects(f.service.execute('i',{...q,workspaceId:wid+'-unassigned'}),e=>e.status===403);
 assert.equal(f.calls.length,1);
});
