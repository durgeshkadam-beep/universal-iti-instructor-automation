const assert=require('assert');
global.sessionStorage={getItem(){return 'test-key'},setItem(){},removeItem(){}};
global.document={getElementById(id){if(id==='aiModel')return {value:'gemini-3.6-flash'};return null},addEventListener(){}};
let captured=null;
global.fetch=async (url,opt)=>{captured={url,opt,body:JSON.parse(opt.body)};return {ok:true,async json(){return {steps:[{type:'model_output',content:[{type:'text',text:'{"ok":true}'}]}]}}}};
const {InstructorAI}=require('../ai.js');
(async()=>{const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok']};const r=await InstructorAI.geminiJSON('test',schema);assert.deepStrictEqual(r,{ok:true});assert(captured.url.endsWith('/v1beta/interactions'));assert.strictEqual(captured.opt.headers['x-goog-api-key'],'test-key');assert.strictEqual(captured.body.model,'gemini-3.6-flash');assert.strictEqual(captured.body.input,'test');assert.strictEqual(captured.body.response_format.mime_type,'application/json');assert.deepStrictEqual(captured.body.response_format.schema,schema);console.log('PASS: V12 Gemini Interactions request/response test');})().catch(e=>{console.error(e);process.exit(1)});
