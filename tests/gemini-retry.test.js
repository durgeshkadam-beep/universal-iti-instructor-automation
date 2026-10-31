'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {requestGemini}=require('../server/gemini-request');
const config={model:'synthetic',apiKey:'synthetic-test-only'};
test('teaching guidance follows full demonstration and four-phase lesson structures',()=>{
 const {geminiBody}=require('../server/gemini-request');
 const practical=geminiBody('Synthetic','Synthetic','practical').systemInstruction.parts[0].text,theory=geminiBody('Synthetic','Synthetic','theory').systemInstruction.parts[0].text;
 for(const value of ['6–10 substantive procedure rows','trainee practice','verification','key point or safety precaution','never invent those fields'])assert(practical.includes(value),value);
 for(const value of ['Preparation / Introduction','Presentation / Development','Application / Recapitulation','Consolidation / Checking'])assert(theory.includes(value),value);
 assert(!practical.includes('Desktop Publishing'));assert(!theory.includes('Desktop Publishing'));
});
test('temporary Gemini 503 retries once with the same request and total deadline',async()=>{
 const calls=[],waits=[];let released=false;
 const success={status:200,ok:true};
 const r=await requestGemini(config,'Synthetic system','Synthetic topic','practical',async(url,options)=>{calls.push({url,options});return calls.length===1?{status:503,body:{cancel:async()=>{released=true;}}}:success;},async signal=>{assert(released);waits.push(signal);});
 assert.equal(r,success);assert.equal(calls.length,2);assert.equal(waits.length,1);assert.equal(calls[0].options.signal,calls[1].options.signal);assert.equal(waits[0],calls[0].options.signal);assert.equal(calls[0].options.body,calls[1].options.body);
});
test('persistent Gemini 503 stops after two calls and retains the final error response',async()=>{
 let calls=0,waits=0;const final={status:503,ok:false};
 const r=await requestGemini(config,'Synthetic','Synthetic',null,async()=>{calls++;return final;},async()=>{waits++;});assert.equal(r,final);assert.equal(calls,2);assert.equal(waits,1);
});
for(const status of [200,400,401,403,404,429,500])test('Gemini '+status+' is never automatically repeated',async()=>{
 let calls=0;const response={status};assert.equal(await requestGemini(config,'Synthetic','Synthetic',null,async()=>{calls++;return response;},async()=>{throw Error('Unexpected retry');}),response);assert.equal(calls,1);
});
test('ambiguous network errors and cancelled backoff never issue a second generation',async()=>{
 let calls=0;await assert.rejects(requestGemini(config,'Synthetic','Synthetic',null,async()=>{calls++;throw Error('Synthetic network failure');}),/Synthetic network/);assert.equal(calls,1);
 calls=0;await assert.rejects(requestGemini(config,'Synthetic','Synthetic',null,async()=>{calls++;return {status:503};},async()=>{throw new DOMException('Synthetic cancellation','AbortError');}),e=>e.name==='AbortError');assert.equal(calls,1);
});
test('one recovered generation consumes only one application allowance',async()=>{
 const {createService}=require('../server/service');let count=0,calls=0;
 const ref={get:async()=>({exists:true,data:()=>({ownerUid:'synthetic'})}),collection(){return this;},doc(){return this;}};
 const db={doc:()=>ref,runTransaction:async fn=>fn({get:async()=>({exists:count>0,data:()=>({count})}),set:(r,value)=>{count=value.count;}})};
 const api=createService({db,verifyToken:async()=>({uid:'synthetic'}),config:{...config,provider:'gemini',dailyLimit:1},fetchImpl:async()=>{calls++;return calls===1?{status:503,ok:false}:{status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Synthetic reviewable draft'}]}}]})};}});
 const request={action:'ai',instituteId:'synthetic',workspaceId:'w',task:'career',language:'en',input:'Synthetic skill guidance',consent:true};
 assert.equal((await api.execute('synthetic',request)).mode,'ai-draft');assert.equal(count,1);assert.equal(calls,2);
 await assert.rejects(api.execute('synthetic',request),e=>e.status===429);assert.equal(calls,2);
});
