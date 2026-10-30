'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const practical={objective:['Connect a synthetic training circuit'],tools:['Isolated training board'],steps:[{procedure:'Disconnect and verify the training supply before wiring.',keyPoint:'Confirm isolation before touching conductors.',spotHint:'Point to the isolation switch.'}],questions:['How do you confirm isolation?'],nextDemo:'Synthetic continuity test'};
const theory={objective:['Explain a synthetic circuit'],materials:['Circuit diagram'],review:'Recall current and voltage.',motivation:'Explain why the circuit is useful.',steps:[{topic:'Circuit path',information:'Trace the complete current path.',spotHint:'Mark the path on the board.'}],questions:['What completes the path?'],summary:'Review the complete circuit.',assignment:'Draw a labelled circuit.',nextLesson:'Synthetic resistance lesson'};
function setup(type='practical'){
 const dom=new JSDOM('<div id="aiModal"><h3 id="aiModalTitle"></h3><textarea id="aiPromptText"></textarea><textarea id="aiResultText"></textarea><div id="aiModalStatus"></div><button id="aiGenerateBtn"></button><div id="aiPreviewBox"></div></div>',{runScripts:'outside-only',url:'https://synthetic.example'}),w=dom.window;
 w.__ITI_V15=true;w.DATA={meta:{institute:'Synthetic Institute',instructor:'Synthetic Instructor',trade:'Synthetic Trade',batch:'Batch A',session:'2026-27'},practicals:[{no:'002',title:'Synthetic circuit demonstration',unit:'Unit 2',hours:2,plannedDate:'2026-10-28',plan:{objective:['Existing saved objective']}}],theory:[{no:'002',title:'Synthetic circuit lesson',unit:'Unit 2',hours:1,plannedDate:'2026-10-28'}]};
 w.SESSION={role:'instructor',name:'Synthetic Instructor'};w.V15Sync={workspaceId:'w',INSTITUTE_ID:'synthetic',fb:{user:{uid:'u'}}};let saves=0;w.saveData=()=>saves++;w.alert=()=>{};
 const source=fs.readFileSync('app.js','utf8'),formats=source.slice(source.indexOf('const RecordFormats ='),source.indexOf('/* ===================== INSPECTION / INSTRUCTOR PROFILE')),helpers=source.slice(source.indexOf('function syllabusRecordVersion('),source.indexOf('const MarkComplete ='));
 w.eval(formats+helpers+fs.readFileSync('ai.js','utf8')+'\nwindow.ai=InstructorAI;window.formats=RecordFormats;');
 w.ai.openPlanDraft(type,'002');w.document.querySelector('#aiResultText').value=JSON.stringify(type==='practical'?practical:theory);
 return {w,ai:w.ai,saves:()=>saves,preview:()=>w.document.querySelector('#aiPreviewBox'),close:()=>w.close()};
}
test('unsaved demonstration preview shows the full institute document without changing stored data',()=>{
 const f=setup();try{const before=JSON.stringify(f.w.DATA);f.ai.previewResult();const text=f.preview().textContent;
 for(const expected of ['DEMONSTRATION PLAN','Synthetic Institute','Synthetic Instructor','Synthetic Trade','Batch A','2026-27','Unit 2','002','2 Hours','2026-10-28','Synthetic circuit demonstration',...practical.objective,...practical.tools,...Object.values(practical.steps[0]),...practical.questions,practical.nextDemo,'GROUP INSTRUCTOR','Signature & Date'])assert(text.includes(expected),expected);
 assert(!text.includes('Existing saved objective'));assert.equal(f.preview().querySelectorAll('.doc-table tbody tr').length,1);assert.equal(JSON.stringify(f.w.DATA),before);assert.equal(f.saves(),0);
 }finally{f.close();}
});
test('lesson preview includes review, motivation, information, summary, assignment and next lesson',()=>{
 const f=setup('theory');try{f.ai.previewResult();for(const text of ['LESSON PLAN','Synthetic circuit lesson',theory.review,theory.motivation,...Object.values(theory.steps[0]),theory.summary,theory.assignment,theory.nextLesson])assert(f.preview().textContent.includes(text),text);}finally{f.close();}
});
test('edited JSON refreshes the full preview and explicit approval saves the same plan',()=>{
 const f=setup();try{f.w.__ITI_V15=false; // Legacy save path; authoritative V15 saves are tested separately.
 const edited={...practical,objective:['Instructor revised objective']};f.w.document.querySelector('#aiResultText').value=JSON.stringify(edited);f.ai.previewResult();assert(f.preview().textContent.includes(edited.objective[0]));f.ai.saveResult(true);assert.equal(f.saves(),1);assert.equal(f.w.DATA.practicals[0].plan.objective[0],edited.objective[0]);assert.equal(f.w.DATA.practicals[0].plan.steps[0][1],practical.steps[0].keyPoint);assert.equal(f.w.DATA.practicals[0].planMeta.status,'approved');}finally{f.close();}
});
test('AI preview escapes both generated content and workspace header fields',()=>{
 const f=setup();try{const payload='<img src=x onerror="window.injected=true">';f.w.DATA.meta.institute=payload;f.w.document.querySelector('#aiResultText').value=JSON.stringify({...practical,objective:[payload]});f.ai.previewResult();assert(f.preview().textContent.includes(payload));assert.equal(f.preview().querySelectorAll('img,script,[onerror]').length,0);assert.equal(f.w.injected,undefined);}finally{f.close();}
});
test('changed account, institute, workspace, role or topic cannot preview or save an old AI draft',()=>{
 for(const change of ['uid','institute','workspace','role','topic']){const f=setup();try{if(change==='uid')f.w.V15Sync.fb.user.uid='other';if(change==='institute')f.w.V15Sync.INSTITUTE_ID='other';if(change==='workspace')f.w.V15Sync.workspaceId='other';if(change==='role')f.w.SESSION.role='student';if(change==='topic')f.w.DATA.practicals[0].title='Replacement topic';f.ai.previewResult();assert.equal(f.preview().style.display,'none');f.ai.saveResult(true);assert.equal(f.saves(),0);assert.equal(f.w.DATA.practicals[0].planMeta,undefined);}finally{f.close();}}
});
test('late AI response after a workspace switch cannot replace draft text or show a preview',async()=>{
 const f=setup();try{let finish;f.ai.geminiJSON=()=>new Promise(r=>{finish=r;});const previous=f.w.document.querySelector('#aiResultText').value;const pending=f.ai.generatePending();f.w.V15Sync.workspaceId='other';finish(practical);await pending;assert.equal(f.w.document.querySelector('#aiResultText').value,previous);assert.equal(f.preview().style.display,'none');assert.equal(f.saves(),0);}finally{f.close();}
});

test('V15 plan headers ignore legacy browser profiles and never invent missing workspace fields',()=>{
 const f=setup();try{f.w.Inspection={load:()=>({name:'Other account',institute:'Other institute',designation:'Other trade instructor'})};f.ai.previewResult();assert(!f.preview().textContent.includes('Other account'));assert(!f.preview().textContent.includes('Other trade instructor'));f.w.DATA.meta={};const p=f.w.formats.profile();assert.equal(p.institute,'Institute not configured');assert.equal(p.trade,'Trade not configured');assert.equal(p.batch,'Batch not configured');assert.equal(p.name,'Synthetic Instructor');}finally{f.close();}
});
test('a syllabus AI result cannot be saved after the account, institute or workspace changes',()=>{
 for(const change of ['uid','institute','workspace','role']){const f=setup();try{f.ai.openManual('syllabus','Synthetic prompt',{},{});f.w.document.querySelector('#aiResultText').value=JSON.stringify({items:[{title:'Synthetic new topic',hours:2}]});if(change==='uid')f.w.V15Sync.fb.user.uid='other';if(change==='institute')f.w.V15Sync.INSTITUTE_ID='other';if(change==='workspace')f.w.V15Sync.workspaceId='other';if(change==='role')f.w.SESSION.role='student';f.ai.saveResult();assert.equal(f.saves(),0);assert.match(f.w.document.querySelector('#aiModalStatus').textContent,/changed|instructor/);}finally{f.close();}}
});

test('syllabus AI keeps official identifiers and unknown durations blank for Instructor review',()=>{
 const f=setup();try{const items=f.ai.syllabusItems({items:[{type:'practical',sourceNo:'01.02.003',title:'Reviewed layout',hours:null},{type:'theory',no:'001',title:'Safety theory',hours:1.25}]});assert.equal(items[0].no,'01.02.003');assert.equal(items[0].hours,'');assert.equal(items[1].no,'001');assert.equal(items[1].hours,1.25);assert.match(f.ai.buildSyllabusPrompt('Synthetic text','DTP'),/never estimate hours/);}finally{f.close();}
});
test('today teaching actions use exact dotted exercise numbers, render inert text and reject stale context',()=>{
 for(const changed of ['uid','workspace','institute','topic']){const f=setup();try{
 const w=f.w,host=w.document.createElement('div');host.id='aiToday';w.document.body.append(host);w.todayISO=()=> '2026-10-30';const no='1.1.01',title='<img src=x onerror="window.injected=1">';w.DATA.practicals=[{no,sequence:9,title,hours:7,status:'pending'}];w.DATA.meta.trainingPlan={revision:1,dayPlan:[{date:'2026-10-30',practicalItems:[{seq:no,hours:5}],theoryItems:[]}]};let opened=[],marked=[];f.ai.openPlanDraft=(...args)=>opened.push(args);w.MarkComplete={open:(...args)=>marked.push(args)};f.ai.renderToday();assert.equal(host.querySelectorAll('img,script,[onclick],[onerror]').length,0);assert.match(host.textContent,/1\.1\.01/);assert.match(host.textContent,/5 hrs/);const buttons=host.querySelectorAll('button');buttons[0].click();buttons[1].click();assert.deepEqual(opened,[['practical',no]]);assert.deepEqual(marked[0].slice(0,2),['practical',no]);
 if(changed==='uid')w.V15Sync.fb.user.uid='other';if(changed==='workspace')w.V15Sync.workspaceId='other';if(changed==='institute')w.V15Sync.INSTITUTE_ID='other';if(changed==='topic')w.DATA.practicals[0].title='Replaced topic';buttons[0].click();buttons[1].click();assert.equal(opened.length,1);assert.equal(marked.length,1);
 }finally{f.close();}}
});
test('AI topic picker keeps opaque identifiers and titles out of executable markup',()=>{
 const f=setup();try{const w=f.w,sel=w.document.createElement('select');sel.id='aiTopicSelect';w.document.body.append(sel);const no='opaque:01\"><img src=x onerror=bad()>',title='<svg onload=bad()>';w.DATA.practicals=[{no,title}];f.ai.refreshTopicPicker();assert.equal(sel.querySelectorAll('img,svg,[onerror],[onload]').length,0);assert(sel.textContent.includes(title));sel.value=JSON.stringify(['practical',no]);let opened;f.ai.openPlanDraft=(...args)=>opened=args;f.ai.openQuickPlan();assert.deepEqual(opened,['practical',no]);}finally{f.close();}
});
test('syllabus text reading abandons a changed workspace and never automatically spends an AI request',async()=>{
 for(const changed of [false,true]){const f=setup();try{const w=f.w,input=w.document.createElement('input');input.id='uFile';input.type='file';w.document.body.append(input);Object.defineProperty(input,'files',{value:[{name:'source.txt',size:50}]});let finish,calls=0;w.UniversalSyllabus={status(){},extractText:()=>new Promise(r=>finish=r)};f.ai.state.pending=null;f.ai.getKey=()=>true;f.ai.geminiJSON=async()=>{calls++;return {};};const pending=f.ai.analyzeSyllabusFile();if(changed)w.V15Sync.workspaceId='other';finish('1.1.01 Perform the supplied training exercise 7 hours');await pending;assert.equal(calls,0);if(changed)assert.equal(f.ai.state.pending,null);else assert.equal(f.ai.state.pending.kind,'syllabus');}finally{f.close();}}
});

test('non-object JSON stays editable and cannot become a preview or saved plan',()=>{for(const raw of ['null','[]','"text"']){const f=setup();try{f.w.document.querySelector('#aiResultText').value=raw;f.ai.previewResult();f.ai.saveResult();assert.equal(f.preview().style.display,'none');assert.equal(f.saves(),0);assert.equal(f.w.document.querySelector('#aiResultText').value,raw);assert.match(f.w.document.querySelector('#aiModalStatus').textContent,/JSON error/);}finally{f.close();}}});

test('V15 JSON cannot fall back to direct legacy writes when the authoritative saver is unavailable',()=>{const f=setup();try{f.ai.saveResult(true);assert.equal(f.saves(),0);assert.equal(f.w.DATA.practicals[0].planMeta,undefined);assert.match(f.w.document.querySelector('#aiModalStatus').textContent,/Secure plan saving is unavailable/);assert(f.w.document.querySelector('#aiResultText').value);}finally{f.close();}});
