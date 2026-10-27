'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const {createService}=require('../server/service');
function service(answer,finishReason='STOP'){
 let request;const d={exists:true,data:()=>({ownerUid:'u'})};const ref={get:async()=>d,collection(){return this},doc(){return this}};
 const db={doc:()=>ref,runTransaction:async fn=>fn({get:async()=>({exists:false}),set(){}})};
 return {api:createService({db,verifyToken:async()=>({uid:'u'}),config:{provider:'gemini',model:'synthetic',apiKey:'synthetic-test-only'},fetchImpl:async(url,init)=>{request=JSON.parse(init.body);return {ok:true,json:async()=>({candidates:[{finishReason,content:{parts:[{text:answer}]}}]})}}}),request:()=>request};
}
const req={action:'ai',instituteId:'i',workspaceId:'w',task:'teaching',teachingType:'theory',language:'en',input:'Synthetic theory lesson',consent:true};
test('malformed teaching JSON never reaches the browser as a successful AI draft',async()=>{const s=service('{"questions":[ What are the hazards? ]}');await assert.rejects(s.api.execute('token',req),e=>e.status===503&&!e.message.includes('hazards'));});
test('invalid manual JSON hides the old preview instead of displaying it as current',()=>{
 const dom=new JSDOM('<textarea id="aiResultText">{"questions":[ What are the hazards? ]}</textarea><div id="aiPreviewBox" style="display:block">Old preview</div><div id="aiModalStatus"></div>',{runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync('ai.js','utf8')+'\nwindow.ai=InstructorAI;');w.ai.state.pending={kind:'plan',type:'theory',item:{title:'Synthetic'}};w.ai.previewResult();
 assert.equal(w.document.querySelector('#aiPreviewBox').style.display,'none');dom.window.close();
});
const {schemas,parseTeaching,providerSchema}=require('../server/teaching-json');
function sample(s){if(s.type==='object')return Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,sample(v)]));if(s.type==='array')return [sample(s.items)];if(s.type==='number')return 1;return s.enum?.[0]||'Synthetic text';}
for(const type of ['theory','practical','syllabus'])test('Gemini receives fixed '+type+' schema and returns validated JSON',async()=>{
 const value=sample(schemas[type]),s=service(JSON.stringify(value));const out=await s.api.execute('token',{...req,teachingType:type});assert.deepEqual(JSON.parse(out.text),value);assert.deepEqual(s.request().generationConfig.responseJsonSchema,providerSchema(type));assert.equal(s.request().generationConfig.responseMimeType,'application/json');
});
test('wrong field types, extra fields and cut-off provider drafts are rejected',async()=>{
 const value=sample(schemas.theory);assert.throws(()=>parseTeaching(JSON.stringify({...value,questions:'bad'}),'theory'));assert.throws(()=>parseTeaching(JSON.stringify({...value,unexpected:'bad'}),'theory'));
 const s=service(JSON.stringify(value),'MAX_TOKENS');await assert.rejects(s.api.execute('token',req),e=>e.status===503&&e.message.includes('incomplete'));
});
test('older clients with the appended practical schema keep the correct format',async()=>{const value=sample(schemas.practical),s=service(JSON.stringify(value));const {teachingType,...legacy}=req;await s.api.execute('token',{...legacy,input:'Synthetic practical\nSchema: '+JSON.stringify(schemas.practical)});assert(s.request().generationConfig.responseJsonSchema.properties.nextDemo);});
test('generation failure hides an old preview and preserves prior text for manual review',async()=>{
 const dom=new JSDOM('<textarea id="aiPromptText">Synthetic</textarea><textarea id="aiResultText">Previous manual text</textarea><div id="aiPreviewBox" style="display:block">Old preview</div><div id="aiModalStatus"></div><button id="aiGenerateBtn"></button>',{runScripts:'outside-only'}),w=dom.window;
 w.confirm=()=>true;w.ITI_RUNTIME={apiUrl:'https://example.test'};w.V15Sync={backendRequest:async()=>{throw Error('Invalid lesson draft')}};
 w.eval(fs.readFileSync('ai.js','utf8')+'\nwindow.ai=InstructorAI;');w.ai.state.pending={kind:'plan',type:'theory',item:{title:'Synthetic'}};await w.ai.generatePending();assert.equal(w.document.querySelector('#aiPreviewBox').style.display,'none');assert.equal(w.document.querySelector('#aiResultText').value,'Previous manual text');assert.match(w.document.querySelector('#aiModalStatus').textContent,/No new draft was generated/);assert.equal(w.document.querySelector('#aiGenerateBtn').disabled,false);dom.window.close();
});
test('Gemini thought parts cannot corrupt the structured teaching JSON',async()=>{
 const value=sample(schemas.theory),d={exists:true,data:()=>({ownerUid:'u'})},ref={get:async()=>d,collection(){return this},doc(){return this}};
 const api=createService({db:{doc:()=>ref,runTransaction:async fn=>fn({get:async()=>({exists:false}),set(){}})},verifyToken:async()=>({uid:'u'}),config:{provider:'gemini',model:'synthetic',apiKey:'synthetic-test-only'},fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'Non-JSON internal commentary'},{text:JSON.stringify(value)}]}}]})})});
 assert.deepEqual(JSON.parse((await api.execute('token',req)).text),value);
});

test('provider schema omits unsupported length keywords while local validation stays bounded',()=>{
 assert(!JSON.stringify(providerSchema('theory')).includes('maxLength'));
 const value=sample(schemas.theory);value.summary='x'.repeat(4001);assert.throws(()=>parseTeaching(JSON.stringify(value),'theory'));
});
