'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const settle=()=>new Promise(r=>setTimeout(r,15));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(){
 const dom=new JSDOM('<section id="tab-skill-applications"></section>',{url:'https://example.test/v15/',runScripts:'outside-only'}),w=dom.window;
 const records=new Map(),calls=[],writes=[],control={confirm:()=>true};
 const base='institutes/i1/workspaces/w1/skillApplications/';
 const original={practicalId:'practical-01.2',skillTitle:'Synthetic page layout',industry:'Original workplace',applicationText:'Original source-supported layout explanation.',sourceUrl:'https://example.org/original',reviewedBy:'instructor',reviewedAt:'original-stamp'};
 records.set(base+'practical-01.2',structuredClone(original));
 const snapshot=ref=>({exists:()=>records.has(ref.path),data:()=>structuredClone(records.get(ref.path))});
 const M={doc:(_db,...p)=>({path:p.join('/')}),getDoc:async ref=>control.read?control.read(ref,snapshot):snapshot(ref),serverTimestamp:()=>new Date('2026-10-30T12:00:00Z'),runTransaction:async(_db,fn)=>{calls.push('transaction');if(control.transaction)await control.transaction();const pending=[];const result=await fn({get:async ref=>snapshot(ref),set:(ref,value)=>pending.push([ref,value])});for(const [ref,value]of pending){records.set(ref.path,structuredClone(value));writes.push({path:ref.path,value});}return result;}};
 const V={ready:true,INSTITUTE_ID:'i1',workspaceId:'w1',fb:{user:{uid:'instructor'},db:{},M},currentRole:()=>control.role||'instructor',backendRequest:async body=>{calls.push(body);return control.backend?control.backend(body):{aiConfigured:false};}};
 w.confirm=message=>control.confirm(message);w.DATA={meta:{trade:'DTP'},practicals:[{no:'01.2',title:'Synthetic page layout'},{no:2,title:'Synthetic proofing'}],trainees:[{name:'PRIVATE TRAINEE NEVER SEND'}]};w.V15Sync=V;
 for(const name of ['v15-local-market.js','v15-career-lens.js'])w.eval(fs.readFileSync('v15/'+name,'utf8'));
 const el=id=>w.document.getElementById(id),button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text),input=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new w.Event('input'));};
 const fill=()=>{input('v15AppIndustry','Reviewed workplace');input('v15AppExplanation','Reviewed source-supported practical use in a synthetic workplace.');input('v15AppSource','https://example.org/reviewed');};
 const prepare=()=>{input('v15AppSource','https://example.org/reviewed');input('v15AppExcerpt','The supplied document describes a page layout operation in the original production workflow.');button('Prepare prompt').click();};
 const response=(changes={})=>JSON.stringify({supported:true,practicalId:'practical-01.2',sourceUrl:'https://example.org/reviewed',industry:'Source-supported workplace',applicationText:'A reviewed source explains this practical operation in the workplace.',...changes});
 return {dom,w,V,M,records,base,original,calls,writes,control,el,button,input,fill,prepare,response,close:()=>w.close()};
}
const run=(name,fn)=>test(name,async()=>{const x=setup();try{await fn(x);}finally{x.close();}});
run('manual publication is explicit, transactional and retains the existing student-readable schema',async x=>{
 await x.V.renderInstructorSkillApplications();assert.equal(x.calls.length,0);assert.equal(x.writes.length,0);x.fill();x.button('Publish reviewed application').click();await settle();
 assert.equal(x.writes.length,1);assert.equal(x.writes[0].path,x.base+'practical-01.2');assert.equal(x.writes[0].value.reviewedBy,'instructor');assert.equal(Object.keys(x.writes[0].value).length,7);assert.match(x.el('tab-skill-applications').textContent,/Students can read it/);
});
run('failed initial reads cannot become blind writes and a later explicit reload recovers',async x=>{
 x.control.read=async()=>{throw Error('offline');};await x.V.renderInstructorSkillApplications();x.fill();assert(x.button('Publish reviewed application').disabled);x.button('Publish reviewed application').click();assert.equal(x.writes.length,0);
 delete x.control.read;x.button('Reload saved example').click();await settle();assert(!x.button('Publish reviewed application').disabled);assert.equal(x.el('v15AppIndustry').value,'Original workplace');
});
run('institute, project database and superseded render contexts cannot publish',async x=>{
 await x.V.renderInstructorSkillApplications();x.fill();x.control.confirm=()=>{x.V.INSTITUTE_ID='i2';return true;};x.button('Publish reviewed application').click();await settle();assert.equal(x.calls.length,0);
 x.V.INSTITUTE_ID='i1';x.control.confirm=()=>true;await x.V.renderInstructorSkillApplications();x.fill();x.V.fb.db={};x.button('Publish reviewed application').click();assert.equal(x.calls.length,0);
 await x.V.renderInstructorSkillApplications();const old=x.button('Publish reviewed application');await x.V.renderInstructorSkillApplications();old.click();assert.equal(x.calls.length,0);
});
run('a context switch during a transaction prevents its staged write',async x=>{
 await x.V.renderInstructorSkillApplications();x.fill();const pending=deferred();x.control.transaction=()=>pending.promise;x.button('Publish reviewed application').click();x.V.workspaceId='w2';pending.resolve();await settle();assert.equal(x.writes.length,0);
});
run('concurrent source review is not overwritten and conflict retains unsaved form fields',async x=>{
 await x.V.renderInstructorSkillApplications();x.fill();x.records.set(x.base+'practical-01.2',{...x.original,industry:'Other session review',reviewedAt:'new-stamp'});x.button('Publish reviewed application').click();await settle();
 assert.equal(x.writes.length,0);assert.equal(x.el('v15AppIndustry').value,'Reviewed workplace');assert.match(x.el('tab-skill-applications').textContent,/changed in another session/);assert(x.button('Publish reviewed application').disabled);
 x.control.confirm=()=>false;x.button('Reload saved example').click();await settle();assert.equal(x.el('v15AppIndustry').value,'Reviewed workplace');x.control.confirm=()=>true;x.button('Reload saved example').click();await settle();assert.equal(x.el('v15AppIndustry').value,'Other session review');
});
run('double publish clicks start one transaction and a form changed inside confirmation is not submitted',async x=>{
 await x.V.renderInstructorSkillApplications();x.fill();x.control.confirm=()=>{x.el('v15AppExplanation').value='Changed while reviewing confirmation';return true;};x.button('Publish reviewed application').click();assert.equal(x.calls.length,0);
 x.control.confirm=()=>true;const pending=deferred();x.control.transaction=()=>pending.promise;x.button('Publish reviewed application').click();x.button('Publish reviewed application').click();assert.equal(x.calls.filter(c=>c==='transaction').length,1);pending.resolve();await settle();assert.equal(x.writes.length,1);
});
run('copy/paste workflow supports all three languages and applying a preview does not publish',async x=>{
 await x.V.renderInstructorSkillApplications();x.prepare();for(const [value,label]of [['en','English'],['mr','Marathi'],['hi','Hindi']]){x.input('v15AppLanguage',value);x.button('Prepare prompt').click();assert.match(x.el('v15AppPrompt').value,new RegExp(label));}
 assert(!x.el('v15AppPrompt').value.includes('PRIVATE TRAINEE'));x.input('v15AppDraftJson',x.response());x.button('Preview workplace JSON').click();assert(!x.button('Use reviewed draft in form').disabled);x.button('Use reviewed draft in form').click();assert.equal(x.el('v15AppIndustry').value,'Source-supported workplace');assert.equal(x.writes.length,0);assert.equal(x.calls.length,0);
});
run('invalid JSON, unsupported evidence and invented source/practical fields cannot fill the form',async x=>{
 await x.V.renderInstructorSkillApplications();x.prepare();for(const raw of ['{broken','[]',JSON.stringify({supported:false,reason:'No evidence'}),x.response({sourceUrl:'https://example.org/invented'}),x.response({practicalId:'practical-2'}),x.response({salary:90000})]){x.input('v15AppDraftJson',raw);x.button('Preview workplace JSON').click();assert.equal(x.el('v15AppDraftJson').value,raw);assert(x.button('Use reviewed draft in form').disabled);assert.equal(x.el('v15AppDraftPreview').children.length,0);}
 assert.equal(x.writes.length,0);
});
run('source changes invalidate prepared and previewed responses; hostile strings remain literal text',async x=>{
 await x.V.renderInstructorSkillApplications();x.prepare();x.input('v15AppDraftJson',x.response({industry:'<img src=x onerror=alert(1)>',applicationText:'<script>alert(1)</script> literal source draft'}));x.button('Preview workplace JSON').click();assert.equal(x.el('v15AppDraftPreview').querySelectorAll('img,script').length,0);assert.match(x.el('v15AppDraftPreview').textContent,/<script>/);
 x.input('v15AppExcerpt','Changed source excerpt that now describes a different workflow and operation.');assert(x.button('Use reviewed draft in form').disabled);x.button('Preview workplace JSON').click();assert.match(x.el('v15AppDraftStatus').textContent,/changed/);assert.equal(x.writes.length,0);
});
run('availability checks never generate drafts; disabled AI leaves keyless workflows available',async x=>{
 await x.V.renderInstructorSkillApplications();x.button('Check optional AI availability').click();await settle();assert.equal(x.calls.length,1);assert.equal(x.calls[0].action,'capabilities');assert(x.button('Request optional AI draft').disabled);x.button('Request optional AI draft').click();assert.equal(x.calls.length,1);x.prepare();assert(x.el('v15AppPrompt').value);
});
run('optional AI sends only reviewed topic/source context after consent and does not auto-publish',async x=>{
 x.control.backend=async body=>body.action==='capabilities'?{aiConfigured:true}:{mode:'ai-draft',text:x.response()};await x.V.renderInstructorSkillApplications();x.prepare();x.button('Check optional AI availability').click();await settle();
 x.control.confirm=()=>false;x.button('Request optional AI draft').click();await settle();assert.equal(x.calls.length,1);x.control.confirm=()=>true;x.button('Request optional AI draft').click();await settle();const request=x.calls.find(c=>c.action==='ai');assert.equal(request.task,'career');assert.equal(request.consent,true);assert(!request.input.includes('PRIVATE TRAINEE'));assert.equal(x.writes.length,0);assert(!x.button('Use reviewed draft in form').disabled);
});
run('stale AI results cannot fill a different institute',async x=>{
 const pending=deferred();x.control.backend=async body=>body.action==='capabilities'?{aiConfigured:true}:pending.promise;await x.V.renderInstructorSkillApplications();x.prepare();x.input('v15AppDraftJson','previous text');x.button('Check optional AI availability').click();await settle();x.button('Request optional AI draft').click();await settle();x.V.INSTITUTE_ID='i2';pending.resolve({mode:'ai-draft',text:x.response()});await settle();assert.equal(x.el('v15AppDraftJson').value,'previous text');assert.equal(x.writes.length,0);
});
run('quota failures and missing source evidence retain existing text without reporting a successful draft',async x=>{
 x.control.backend=async body=>{if(body.action==='capabilities')return {aiConfigured:true};throw Error('Daily AI request limit reached');};await x.V.renderInstructorSkillApplications();x.button('Check optional AI availability').click();await settle();x.button('Request optional AI draft').click();assert.match(x.el('v15AppDraftStatus').textContent,/source/);x.prepare();x.input('v15AppDraftJson','previous text');x.button('Request optional AI draft').click();await settle();assert.equal(x.el('v15AppDraftJson').value,'previous text');assert.match(x.el('v15AppDraftStatus').textContent,/Daily AI request limit/);assert.equal(x.writes.length,0);
});
run('late initial reads cannot replace a newly selected practical and draft edits need discard consent',async x=>{
 const pending=deferred();x.control.read=(ref,snapshot)=>ref.path.endsWith('practical-01.2')?pending.promise:snapshot(ref);const render=x.V.renderInstructorSkillApplications();x.el('v15AppPractical').value='practical-2';x.el('v15AppPractical').dispatchEvent(new x.w.Event('change'));await settle();pending.resolve({exists:()=>true,data:()=>x.original});await render;assert.equal(x.el('v15AppIndustry').value,'');
 x.input('v15AppExcerpt','Unsaved source excerpt for a practical operation which should not be silently lost.');x.control.confirm=()=>false;x.el('v15AppPractical').value='practical-01.2';x.el('v15AppPractical').dispatchEvent(new x.w.Event('change'));assert.equal(x.el('v15AppPractical').value,'practical-2');assert.match(x.el('v15AppExcerpt').value,/Unsaved/);
});
run('Student role cannot create the Instructor editor',async x=>{x.control.role='student';await x.V.renderInstructorSkillApplications();assert.equal(x.w.document.querySelectorAll('button').length,0);assert.equal(x.calls.length,0);});
