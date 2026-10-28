'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(){
 const html=fs.readFileSync('index.html','utf8'),w=new JSDOM(html,{runScripts:'outside-only'}).window;
 w.DATA={meta:{trade:'Electrician',officialPlanPack:'NONE',scheduleMode:'real',hoursPerWorkingDay:7,theoryDaysPerTopic:1},practicals:[{no:1,sequence:1,title:'Synthetic practical',hours:14}],theory:[],holidays:[],modules:[]};
 w.SESSION={role:'instructor'};w.V15Sync={workspaceId:'one',fb:{user:{uid:'one'}}};let saves=0;
 w.saveData=()=>saves++;w.confirm=()=>true;w.alert=()=>{};w.uid=()=> 'synthetic';w.todayISO=()=> '2026-10-28';
 for(const name of ['Practicals','Theory','Dashboard','ModuleManager'])w[name]={render(){},refresh(){}};
 w.isHoliday=iso=>w.DATA.holidays.some(h=>h.date===iso);w.SEED_SPLITUP=[['2026-08-10',1,1,null]];
 const src=fs.readFileSync('app.js','utf8');
 const context=src.slice(src.indexOf('function syllabusRecordVersion('),src.indexOf('const MarkComplete ='));
 const schedule=src.slice(src.indexOf('const Schedule ='),src.indexOf('/* ===================== EVALUATION'));
 const universal=src.slice(src.indexOf('const UniversalSyllabus ='),src.indexOf('// The original app binds the tab events'));
 w.eval(context+schedule+universal+'\nwindow.S=Schedule;window.Schedule=Schedule;window.U=UniversalSyllabus;');
 return {w,S:w.S,U:w.U,saves:()=>saves,close:()=>w.close()};
}
test('split-up shows the saved complete plan instead of a different trade seed',()=>{const f=setup();try{
 f.w.DATA.meta.trainingPlan={dayPlan:[{date:'2026-10-29',day:'Thu',week:'W44',holiday:false,practical:'Synthetic circuit (6h)',theory:'Synthetic safety (1h)',hours:7}]};
 assert.equal(f.S.buildRows()[0].date,'2026-10-29');assert.match(f.S.buildRows()[0].practical,/Synthetic circuit/);
 delete f.w.DATA.meta.trainingPlan;assert.equal(f.S.buildRows().length,0);
}finally{f.close();}});
test('alternate schedule dates are stable in India and skip Sundays',()=>{const previous=process.env.TZ;process.env.TZ='Asia/Kolkata';const f=setup();try{
 assert.deepEqual(Array.from(f.S.workingDaysFrom('2026-10-30',3)),['2026-10-30','2026-10-31','2026-11-02']);
}finally{f.close();if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}});
test('multi-day practical and theory keep every teaching day across holidays',()=>{const f=setup();try{
 Object.assign(f.w.DATA.meta,{scheduleMode:'generated',scheduleStartDate:'2026-10-30',hoursPerWorkingDay:7,theoryDaysPerTopic:2});
 f.w.DATA.practicals[0].plannedDate='2026-10-30';f.w.DATA.theory=[{no:1,sequence:1,title:'Safety',plannedDate:'2026-10-30'}];f.w.DATA.holidays=[{date:'2026-10-31',label:'Synthetic closure'}];
 const rows=f.S.buildRows();assert.equal(rows.at(-1).date,'2026-11-02');assert.equal(rows.find(r=>r.date==='2026-11-01').holiday,true);assert.equal(rows.at(-1).practical,'Practice');assert.equal(rows.at(-1).theory,'Practice');
}finally{f.close();}});
test('saved syllabus and holiday markup stays inert in the split-up table',()=>{const f=setup();try{
 f.w.DATA.meta.trainingPlan={dayPlan:[{date:'2026-10-29',day:'Thu',week:'W44',holiday:true,label:'<img src=x onerror="window.injected=1">'}]};f.S.render();
 const body=f.w.document.querySelector('#splitupTableBody');assert.match(body.textContent,/<img/);assert.equal(body.querySelector('img'),null);assert.equal(f.w.injected,undefined);
}finally{f.close();}});
test('read-only roles and non-DTPO workspaces cannot reset shared topic dates',()=>{const f=setup();try{
 for(const role of ['student','staff','principal','admin']){f.w.SESSION.role=role;f.w.document.querySelector('#splitupStart').value='2026-10-30';f.S.generate();f.S.useRealCalendar();assert.equal(f.saves(),0);}
 f.w.SESSION.role='instructor';f.S.useRealCalendar();assert.equal(f.saves(),0);assert.equal(f.w.DATA.practicals[0].plannedDate,undefined);
}finally{f.close();}});
test('bundled dates remain available for DTPO and cannot leak through an incorrectly copied pack flag',()=>{const f=setup();try{
 f.w.DATA.meta.officialPlanPack='DTPO';assert.equal(f.S.buildRows().length,0);f.S.applyRealCalendarDates();assert.equal(f.w.DATA.practicals[0].plannedDate,undefined);
 f.w.DATA.meta.trade='Desktop Publishing Operator (DTPO)';assert.equal(f.S.buildRows()[0].date,'2026-08-10');f.S.useRealCalendar();assert.equal(f.w.DATA.practicals[0].plannedDate,'2026-08-10');assert.equal(f.saves(),1);
}finally{f.close();}});
test('complete plan maps interleaved source sequences to each practical and theory number',()=>{const f=setup();try{
 const d=f.w.document;d.querySelector('#uStart').value='2026-10-30';d.querySelector('#uEnd').value='2026-11-06';d.querySelector('#uHours').value='7';d.querySelector('#uTheoryHours').value='1';d.querySelector('#uAltSat').checked=false;
 f.U.state.trade='Electrician';f.U.state.items=[{seq:1,type:'theory',title:'Safety',hours:1},{seq:2,type:'practical',title:'Circuit one',hours:6},{seq:3,type:'theory',title:'Testing',hours:1},{seq:4,type:'practical',title:'Circuit two',hours:6}];
 f.U.generateCalendar();f.U.createCompletePlan();
 assert.deepEqual(Array.from(f.w.DATA.practicals,p=>p.plannedDate),['2026-10-30','2026-10-31']);assert.deepEqual(Array.from(f.w.DATA.theory,t=>t.plannedDate),['2026-10-30','2026-10-31']);assert.match(f.S.buildRows()[0].practical,/1\. Circuit one/);assert.equal(f.w.DATA.meta.trainingPlan.dayPlan[1].practicalItems[0].seq,2);assert.equal(f.w.DATA.meta.scheduleStartDate,'2026-10-30');assert.equal(f.saves(),1);
}finally{f.close();}});
test('alternate generator rejects invalid inputs before changing the calendar',()=>{const f=setup();try{
 const d=f.w.document;d.querySelector('#splitupStart').value='2026-10-30';const before=JSON.stringify(f.w.DATA);
 for(const [id,value] of [['splitupHoursPerDay','0'],['splitupHoursPerDay','-1'],['splitupHoursPerDay','99'],['splitupDaysPerTheory','1.5']]){d.querySelector('#splitupHoursPerDay').value='7';d.querySelector('#splitupDaysPerTheory').value='1';d.querySelector('#'+id).value=value;f.S.generate();assert.equal(JSON.stringify(f.w.DATA),before);assert.equal(f.saves(),0);}
}finally{f.close();}});
function configure(f){const d=f.w.document;d.querySelector('#uStart').value='2026-10-30';d.querySelector('#uEnd').value='2026-11-06';d.querySelector('#uHours').value='7';d.querySelector('#uTheoryHours').value='1';d.querySelector('#uAltSat').checked=false;f.U.state.items=[{seq:1,type:'theory',title:'Safety',hours:1},{seq:2,type:'practical',title:'Synthetic circuit',hours:14}];}
test('complete plan recalculates changed dates and hours; zero theory budget is retained',()=>{const f=setup();try{
 configure(f);f.U.generateCalendar();f.w.document.querySelector('#uStart').value='2026-11-02';f.w.document.querySelector('#uTheoryHours').value='0';f.U.createCompletePlan();
 assert.equal(f.S.buildRows()[0].date,'2026-11-02');assert.equal(f.w.DATA.meta.trainingPlan.theoryHoursPerDay,0);assert.equal(f.S.buildRows()[0].hours,7);assert.equal(f.S.buildRows()[0].theoryItems.length,0);assert.equal(f.S.buildRows().reduce((sum,r)=>sum+r.hours,0),15);
}finally{f.close();}});
test('invalid or unselected working days cannot save a previous generated calendar',()=>{const f=setup();try{
 configure(f);f.U.generateCalendar();f.w.document.querySelectorAll('#uDays input').forEach(el=>el.checked=false);f.U.createCompletePlan();assert.equal(f.saves(),0);assert.equal(f.U.state.calendar.length,0);assert.match(f.w.document.querySelector('#uCalendarBody').textContent,/Generate a calendar/);
}finally{f.close();}});
test('a prior workspace calendar and a changed confirmation context cannot save',()=>{for(const changed of ['workspace','uid','confirmation']){const f=setup();try{
 configure(f);f.U.generateCalendar();if(changed==='workspace')f.w.V15Sync.workspaceId='two';else if(changed==='uid')f.w.V15Sync.fb.user.uid='two';else f.w.confirm=()=>{f.w.V15Sync.workspaceId='two';return true;};f.U.createCompletePlan();assert.equal(f.saves(),0);
}finally{f.close();}}});
test('partial allocations are disclosed before and after saving',()=>{const f=setup();try{
 configure(f);f.w.document.querySelector('#uEnd').value='2026-10-30';let confirmation='';f.w.confirm=message=>{confirmation=message;return true;};f.U.createCompletePlan();assert.match(confirmation,/not fully allocated/);assert.match(f.w.document.querySelector('#uStatus').textContent,/not fully allocated/);assert.equal(f.saves(),1);
}finally{f.close();}});
test('split-up print escapes titles and holiday labels',()=>{const f=setup();try{
 const src=fs.readFileSync('app.js','utf8'),method=src.slice(src.indexOf('  printSplitUp(){'),src.indexOf('  printExtraTopics(){'));let printed='';f.w.Reports={header:()=>'',signBlock:()=>'',markPending(){},doPrint:html=>printed=html};f.w.eval('window.R={'+method+'};');f.w.DATA.meta.trainingPlan={dayPlan:[{date:'2026-10-30',day:'Fri',week:1,practical:'<img src=x onerror="alert(1)">',theory:'<script>evil</script>'}]};f.w.R.printSplitUp();const template=f.w.document.createElement('template');template.innerHTML=printed;assert.equal(template.content.querySelectorAll('img,script').length,0);assert.match(template.content.textContent,/<img/);
}finally{f.close();}});
