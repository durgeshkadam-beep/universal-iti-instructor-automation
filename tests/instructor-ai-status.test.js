'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(){const w=new JSDOM('<p id="aiConnectionBadge"></p><p id="aiConnectionHelp"></p><button id="aiCheckConnection"></button>',{url:'https://example.test',runScripts:'outside-only'}).window;
 w.ITI_RUNTIME={apiUrl:'https://api.example.test'};w.V15Sync={ready:true,workspaceId:'one',INSTITUTE_ID:'institute',fb:{user:{uid:'teacher'}}};
 w.eval(fs.readFileSync('ai.js','utf8').replace("if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>InstructorAI.init());",'')+';window.ai=InstructorAI;');return w;}
test('an API URL alone does not claim AI is connected; authenticated capability checks generate nothing',async()=>{
 const w=setup();try{let calls=[];w.V15Sync.backendRequest=async body=>{calls.push(body);return {aiConfigured:false};};w.ai.refreshStatus();assert.equal(w.ai.getKey(),false);assert.match(w.document.body.textContent,/not checked/);await w.ai.testConnection();assert.equal(w.ai.getKey(),false);assert.equal(calls.length,1);assert.equal(calls[0].action,'capabilities');assert.match(w.document.body.textContent,/generative AI is disabled/);
 w.V15Sync.backendRequest=async()=>({aiConfigured:true});await w.ai.testConnection();assert.equal(w.ai.getKey(),true);assert.match(w.document.body.textContent,/remaining quota are only tested/);w.ai.state.connection.checkedAt=Date.now()-300001;w.ai.refreshStatus();assert.equal(w.ai.getKey(),false);assert.match(w.document.querySelector('#aiConnectionBadge').textContent,/not checked/);w.ai.disconnect();assert.equal(w.ai.getKey(),false);assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);
 }finally{w.close();}
});
test('late capability results, other workspaces and failed checks cannot enable AI for another context',async()=>{
 const w=setup();try{let finish;w.V15Sync.backendRequest=()=>new Promise(r=>finish=r);const checking=w.ai.testConnection();w.V15Sync.workspaceId='two';finish({aiConfigured:true});await checking;assert.equal(w.ai.getKey(),false);
 w.V15Sync.backendRequest=async()=>({aiConfigured:true});await w.ai.testConnection();assert.equal(w.ai.getKey(),true);w.V15Sync.fb.user.uid='different';assert.equal(w.ai.getKey(),false);w.V15Sync.backendRequest=async()=>{throw Error('Reconnect and retry.');};await w.ai.testConnection();assert.equal(w.ai.getKey(),false);assert.match(w.document.body.textContent,/check failed/);assert.equal(w.document.querySelector('#aiCheckConnection').disabled,false);
 }finally{w.close();}
});
