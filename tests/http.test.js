'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createHandler}=require('../server/http');
async function fixture(fn,execute=async(token,body)=>({tokenSeen:token==='synthetic-token',action:body.action})){
 const server=http.createServer(createHandler({service:{execute},origins:['https://staging.example.test']}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}
}
const options=body=>({method:'POST',headers:{Authorization:'Bearer synthetic-token','Content-Type':'application/json',Origin:'https://staging.example.test'},body:JSON.stringify(body)});
test('health endpoint works without identity/database access and exposes no config',()=>fixture(async base=>{const r=await fetch(base+'/healthz');assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});assert.equal(r.headers.get('cache-control'),'no-store');},()=>{throw Error('must not access service');}));
test('allowed origin reaches authenticated API and receives CORS headers',()=>fixture(async base=>{const r=await fetch(base+'/api',options({action:'ai'}));assert.equal(r.status,200);assert.deepEqual(await r.json(),{tokenSeen:true,action:'ai'});assert.equal(r.headers.get('access-control-allow-origin'),'https://staging.example.test');}));
test('unlisted origin cannot execute service',()=>fixture(async base=>{const opts=options({});opts.headers.Origin='https://untrusted.example.test';assert.equal((await fetch(base+'/api',opts)).status,403);},()=>{throw Error('must not execute');}));
test('preflight only advertises POST and token/JSON headers',()=>fixture(async base=>{const r=await fetch(base+'/api',{method:'OPTIONS',headers:{Origin:'https://staging.example.test','Access-Control-Request-Method':'POST'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-methods'),'POST');}));
test('unknown paths, methods and missing tokens are rejected',()=>fixture(async base=>{assert.equal((await fetch(base+'/server/.env')).status,404);assert.equal((await fetch(base+'/api')).status,405);assert.equal((await fetch(base+'/api',{method:'POST'})).status,401);}));
test('malformed JSON and non-object JSON are rejected',()=>fixture(async base=>{const o=options({});o.body='{bad';assert.equal((await fetch(base+'/api',o)).status,400);for(const body of [null,[],false])assert.equal((await fetch(base+'/api',options(body))).status,400);}));
test('content type and oversized body are rejected before service execution',()=>fixture(async base=>{const o=options({});o.headers['Content-Type']='text/plain';assert.equal((await fetch(base+'/api',o)).status,415);assert.equal((await fetch(base+'/api',options({text:'x'.repeat(200001)}))).status,413);},()=>{throw Error('must not execute');}));
test('unexpected internal failures do not disclose secrets',()=>fixture(async base=>{const r=await fetch(base+'/api',options({}));assert.equal(r.status,500);assert.deepEqual(await r.json(),{error:'Request failed. Retry later.'});},()=>{throw Error('synthetic-private-error');}));
