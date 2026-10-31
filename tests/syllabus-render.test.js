'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(role='instructor',malicious=false){
 const fields=['practicalEditTitle','pracEditUnit','pracEditName','pracEditHours','practicalEditModal','theoryEditTitle','theoryEditName','theoryEditModal','theoryBulkText','theoryModal','markCompleteItemLabel','markCompleteDate','markCompleteModal'];
 const dom=new JSDOM('<table><tbody id="practicalTableBody"></tbody></table><table><tbody id="theoryTableBody"></tbody></table>'+fields.map(id=>id.endsWith('Date')?`<input id="${id}" type="date">`:`<input id="${id}">`).join(''),{runScripts:'outside-only'}),w=dom.window;
 const markup='<img src=x onerror="window.syllabusInjected=true">',no=malicious?"x');window.syllabusInjected=true;//":1;
 const record={no,title:malicious?markup:'Synthetic topic',unit:malicious?markup:'Synthetic unit',hours:malicious?markup:2,sequence:1,status:'pending',plannedDate:null,doneDate:null};
 w.DATA={practicals:[{...record}],theory:[{...record}]};w.SESSION={role};let saves=0,views=[];w.saveData=()=>saves++;w.todayISO=()=> '2026-10-23';w.Dashboard={render(){},topicState(type,item){return {code:item.status==='completed'?'complete':'unplanned',label:item.status==='completed'?'Done '+(item.doneDate||''):'Not scheduled'};}};w.Schedule={render(){}};w.PlanViewer={open:(...args)=>views.push(args)};w.confirm=()=>true;w.alert=()=>{};
 const source=fs.readFileSync('app.js','utf8'),mark=source.split('/* ===================== MARK COMPLETE (date-editable) ===================== */')[1].split('/* ===================== SPLIT-UP SYLLABUS')[0],tables=source.split('/* ===================== PRACTICALS ===================== */')[1].split('/* ===================== EVALUATION ===================== */')[0];
 w.eval(mark+tables+'\nwindow.P=Practicals;window.T=Theory;window.M=MarkComplete;');return {w,dom,saves:()=>saves,views,markup,no};
}
for(const [kind,key,handle] of [['practical','practicals','P'],['theory','theory','T']]){
 test(kind+' renders all saved fields as text and actions preserve exact identifiers',()=>{
  const {w,markup,no,views,saves}=setup('instructor',true);try{
   const item=w.DATA[key][0];item.plannedDate='" onfocus="window.syllabusInjected=true';item.doneDate=markup;item.status='completed';w[handle].render();const body=w.document.querySelector('#'+kind+'TableBody');
   assert.equal(body.querySelectorAll('img,script,[onclick],[onchange],[onerror],[onfocus]').length,0);assert(body.textContent.includes(markup));body.querySelector('button').click();assert.equal(views[0][0],kind);assert.equal(views[0][1],no);
   item.status='pending';w[handle].render();[...body.querySelectorAll('button')].find(b=>b.textContent==='Mark Complete').click();assert.equal(w.M.pending.no,no);assert(w.document.querySelector('#markCompleteItemLabel').textContent.includes(markup));w.M.confirm();assert.equal(item.status,'completed');assert.equal(item.doneDate,'2026-10-23');assert.equal(saves(),1);assert.equal(w.syllabusInjected,undefined);
  }finally{w.close();}
 });
 test(kind+' date, edit, reorder and confirmed deletion buttons keep working',()=>{
  const {w,saves}=setup();try{
   w.DATA[key].push({...w.DATA[key][0],no:2,title:'Second',sequence:2});w[handle].render();let body=w.document.querySelector('#'+kind+'TableBody');let row=body.querySelector('tr');const date=row.querySelector('input');date.value='2026-10-24';date.dispatchEvent(new w.Event('change'));assert.equal(w.DATA[key][0].plannedDate,'2026-10-24');
   [...row.querySelectorAll('button')].find(b=>b.textContent==='Edit').click();assert.equal(w[handle]._editingNo,1);w.document.querySelector(kind==='practical'?'#pracEditName':'#theoryEditName').value='Edited title';w[handle].saveEdit();assert.equal(w.DATA[key][0].title,'Edited title');
   row=body.querySelector('tr');[...row.querySelectorAll('button')].find(b=>b.textContent==='↓').click();assert.equal(body.querySelector('tr td').textContent,'2');
   w.confirm=()=>false;[...body.querySelectorAll('button')].find(b=>b.textContent==='Delete').click();assert.equal(w.DATA[key].length,2);w.confirm=()=>true;[...body.querySelectorAll('button')].find(b=>b.textContent==='Delete').click();assert.equal(w.DATA[key].length,1);assert.equal(w.DATA[key][0].no,1);assert.equal(saves(),4);
   assert.doesNotThrow(()=>w[handle].moveSeq('missing',1));
  }finally{w.close();}
 });
}
test('read-only roles cannot call syllabus mutation handlers or confirm an Instructor dialog',()=>{
 for(const role of ['student','staff','principal','admin']){const {w,saves}=setup();try{w.M.open('practical',1,'Synthetic');w.SESSION.role=role;for(const h of [w.P,w.T]){h.render();h.openAdd();h.openEdit(1);h.saveEdit();h.remove(1);h.moveSeq(1,1);h.setPlanned(1,'2026-10-24');}w.T.openBulkAdd();w.T.saveBulkAdd();w.M.confirm();assert.equal(saves(),0);assert.equal(w.DATA.practicals[0].status,'pending');assert.equal(w.DATA.theory.length,1);assert.equal(w.document.querySelectorAll('#practicalTableBody input,#theoryTableBody input').length,0);assert.equal(w.document.querySelectorAll('#practicalTableBody button').length,1);}finally{w.close();}}
});
test('completion cannot mark a replacement record or another workspace with the same number',()=>{
 for(const replacement of ['record','workspace']){const {w,saves}=setup();try{w.M.open('practical',1,'Synthetic');if(replacement==='record')w.DATA.practicals=[{...w.DATA.practicals[0],title:'Replacement topic'}];else w.DATA={practicals:[{...w.DATA.practicals[0]}],theory:[]};w.M.confirm();assert.equal(w.DATA.practicals[0].status,'pending');assert.equal(saves(),0);assert.equal(w.M.pending,null);assert.doesNotThrow(()=>w.M.confirm());}finally{w.close();}}
});
test('edit/add/bulk dialogs cannot save into a changed workspace or user',()=>{
 for(const mode of ['edit','add','bulk'])for(const changed of ['workspace','uid']){const {w,saves}=setup();try{
  w.V15Sync={workspaceId:'one',fb:{user:{uid:'instructor-one'}}};
  if(mode==='edit')w.P.openEdit(1);else if(mode==='add')w.P.openAdd();else w.T.openBulkAdd();
  w.document.querySelector('#pracEditName').value='Wrong workspace title';w.document.querySelector('#theoryBulkText').value='Wrong workspace bulk';
  if(changed==='workspace')w.V15Sync.workspaceId='two';else w.V15Sync.fb.user.uid='instructor-two';
  if(mode==='bulk')w.T.saveBulkAdd();else w.P.saveEdit();assert.equal(saves(),0);assert.equal(w.DATA.practicals[0].title,'Synthetic topic');assert.equal(w.DATA.theory.length,1);
 }finally{w.close();}}
});
test('completion checks identity/workspace even when DATA and record references stay the same',()=>{
 for(const changed of ['workspace','uid']){const {w,saves}=setup();try{w.V15Sync={workspaceId:'one',fb:{user:{uid:'one'}}};w.M.open('theory',1,'Synthetic');if(changed==='workspace')w.V15Sync.workspaceId='two';else w.V15Sync.fb.user.uid='two';w.M.confirm();assert.equal(saves(),0);assert.equal(w.DATA.theory[0].status,'pending');assert.equal(w.M.pending,null);}finally{w.close();}}
});
test('unchanged cloud clones do not invalidate an open completion dialog',()=>{
 const {w,saves}=setup();try{w.M.open('practical',1,'Synthetic');w.DATA.practicals=[Object.fromEntries(Object.entries(w.DATA.practicals[0]).reverse())];w.M.confirm();assert.equal(w.DATA.practicals[0].status,'completed');assert.equal(saves(),1);}finally{w.close();}
});
for(const [kind,key,handle] of [['practical','practicals','P'],['theory','theory','T']])test(kind+' completed teaching date can be corrected without losing completion or its plan',()=>{
 const {w,saves}=setup();try{const item=w.DATA[key][0];item.status='completed';item.doneDate='2026-10-20';item.plan={objective:['Kept objective']};w[handle].render();const body=w.document.querySelector('#'+kind+'TableBody'),edit=[...body.querySelectorAll('button')].find(b=>b.textContent==='Edit completion date');assert(edit);edit.click();assert.equal(w.document.querySelector('#markCompleteDate').value,'2026-10-20');w.document.querySelector('#markCompleteDate').value='2026-10-22';w.M.confirm();assert.equal(item.doneDate,'2026-10-22');assert.equal(item.status,'completed');assert.equal(item.plan.objective[0],'Kept objective');assert.equal(saves(),1);assert.match(body.textContent,/Done 2026-10-22/);
 edit.click();w.V15Sync={workspaceId:'another',fb:{user:{uid:'different'}}};w.document.querySelector('#markCompleteDate').value='2026-10-23';w.M.confirm();assert.equal(item.doneDate,'2026-10-22');assert.equal(saves(),1);
 }finally{w.close();}
});
