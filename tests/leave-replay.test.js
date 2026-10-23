'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function fixture(status='approved'){
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
 const pending={id:'leave1',traineeId:'student1',type:'Casual',fromDate:'2043-01-01',toDate:'2043-01-01',reason:'Synthetic retry',certNote:'',status:'pending',appliedDate:'2042-12-01'};
 const reviewed={...pending,status,reviewedBy:'instructor',reviewedAt:'2042-12-02'};
 w.DATA={leaves:[reviewed]};w.SESSION={role:'student'};let writes=0,reads=0;
 const V={INSTITUTE_ID:'test',workspaceId:'w1',ready:true,member:{role:'student',traineeId:'student1'},clone:structuredClone,eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),now:()=>new Date().toISOString(),itemId:(s,x)=>x.id,badge(){},fb:{user:{uid:'student'},db:{},M:{doc:(...a)=>a.join('/'),setDoc:async(ref)=>{writes++;if(ref.endsWith('/leaves/leave1'))throw Object.assign(Error('reviewed request is immutable'),{code:'permission-denied'});},getDocFromServer:async()=>{reads++;return {exists:()=>true,data:()=>({data:reviewed})};}}}};
 w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));V.audit=async()=>{};
 const op={workspaceId:'w1',kind:'array',section:'leaves',docId:'leave1',action:'set',value:pending,data:{data:pending,updatedBy:'student'}};
 V.queuePush(op);return {dom,w,V,pending,reviewed,op,counts:()=>({writes,reads})};
}
test('remote approved/rejected leave is never overlaid by an old pending retry',()=>{
 for(const status of ['approved','rejected']){const f=fixture(status);try{f.V.applyQueuedToSection('leaves');assert.equal(f.w.DATA.leaves[0].status,status);assert.equal(f.V.queueRead().length,1,'display must not itself acknowledge a queued write');}finally{f.dom.window.close();}}
});
test('exact reviewed application acknowledges denied replay and lets the next queued write sync',async()=>{
 const f=fixture();try{f.V.queuePush({...f.op,section:'submissions',kind:'map',docId:'next',data:{data:'answer'}});await f.V.flushQueue();assert.equal(f.V.queueRead().length,0);assert.deepEqual(f.counts(),{writes:2,reads:1});assert.equal(f.w.DATA.leaves[0].status,'approved');}finally{f.dom.window.close();}
});
test('different original content remains queued, with the authoritative reviewed status visible',async()=>{
 const f=fixture();try{f.reviewed.reason='Different server application';await f.V.flushQueue();f.V.applyQueuedToSection('leaves');assert.equal(f.V.queueRead().length,1);assert.equal(f.w.DATA.leaves[0].reason,'Different server application');assert.equal(f.w.DATA.leaves[0].status,'approved');}finally{f.dom.window.close();}
});
test('unavailable server confirmation cannot acknowledge a denied operation',async()=>{
 const f=fixture();try{f.V.fb.M.getDocFromServer=async()=>{throw Error('unavailable');};await f.V.flushQueue();assert.equal(f.V.queueRead().length,1);}finally{f.dom.window.close();}
});
test('switching accounts during a server acknowledgement cannot clear the new account queue',async()=>{
 const f=fixture();try{f.V.fb.M.getDocFromServer=async()=>{f.V.fb.user.uid='other';f.V.queuePush({...f.op,docId:'other-record'});return {exists:()=>true,data:()=>({data:f.reviewed})};};await f.V.flushQueue();assert.equal(f.V.queueRead().length,1);f.V.fb.user.uid='student';assert.equal(f.V.queueRead().length,1,'original account retry retained for its next session');}finally{f.dom.window.close();}
});
