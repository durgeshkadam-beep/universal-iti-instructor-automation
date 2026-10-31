'use strict';
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs');
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
 w.DATA={};w.SESSION={role:'instructor'};let unblock,first=true,writes=[];
 const waiting=new Promise(r=>{unblock=r;});
 const V={INSTITUTE_ID:'test',workspaceId:'w1',ready:true,clone:x=>structuredClone(x),eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),now:()=>new Date().toISOString(),esc:x=>x,safe:x=>x,email:x=>x,badge(){},fb:{user:{uid:'teacher'},db:{},M:{doc:(...a)=>a.join('/'),setDoc:async(ref,data)=>{writes.push(data);if(first){first=false;await waiting;}}}}};
 w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));V.audit=async()=>{};
 const op=n=>({workspaceId:'w1',kind:'array',section:'notices',docId:'n'+n,action:'set',data:{data:{title:'Notice '+n}}});
 V.queuePush(op(1));const flushing=V.flushQueue();await Promise.resolve();V.queuePush(op(2));unblock();await flushing;
 assert.equal(V.queueRead().length,0);assert.equal(writes.length,2,'operation appended during flush is actually written');
 V.queuePush({...op(3),section:'attendance',key:'2026-10-01'});V.assertAttendanceWritable=async()=>{throw Error('locked');};await V.flushQueue();assert.equal(V.queueRead().length,1,'rejected locked write stays pending');
 V.fb.user.uid='other';assert.equal(V.queueRead().length,0,'another account cannot replay prior queue');V.fb.user.uid='teacher';assert.equal(V.queueRead().length,1,'original account retains pending operation');
 w.close();console.log('PASS offline queue concurrent appends, rejected lock writes, and account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
