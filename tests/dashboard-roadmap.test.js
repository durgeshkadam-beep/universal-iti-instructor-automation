'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<!doctype html><body>'+['heroGreeting','heroSub','dashCards','dashLatestNotice','dashRoadmap','pendingSigList','syllabusBarWrap'].map(id=>`<div id="${id}"></div>`).join('')+'</body>',{runScripts:'outside-only'}),w=dom.window;
 w.DATA={trainees:[],attendance:{},meta:{},practicals:[],theory:[],notices:[],signatures:{}};w.SESSION={role:'instructor'};w.todayISO=()=> '2026-10-28';
 const src=fs.readFileSync('app.js','utf8');w.eval(src.slice(src.indexOf('const RecordFormats ='),src.indexOf('/* ===================== INSPECTION / INSTRUCTOR PROFILE'))+src.slice(src.indexOf('const Dashboard ='),src.indexOf('/* ===================== TRAINEES'))+';window.D=Dashboard;');return {w,close:()=>w.close()};
}
test('roadmap sorts Firestore lexical document order by numeric training sequence without mutating records',()=>{
 const f=setup();try{const records=[{no:1},{no:10},{no:100},{no:2},{no:3,status:'completed'}];const before=JSON.stringify(records);
 assert.deepEqual(Array.from(f.w.D.pendingTopics(records),x=>x.no),[1,2,10,100]);assert.equal(JSON.stringify(records),before);
 assert.deepEqual(Array.from(f.w.D.pendingTopics([{no:1,sequence:3},{no:2,sequence:1},{no:3,sequence:2}]),x=>x.no),[2,3,1]);
 }finally{f.close();}
});
test('dashboard renders ordered saved topics and escapes titles, numbers and dates',()=>{
 const f=setup();try{const w=f.w;w.DATA.practicals=[{no:10,title:'Later'},{no:2,title:'Second'},{no:1,title:'<img src=x onerror="window.injected=1">',plannedDate:'<svg onload="window.injected=1">'}];w.DATA.theory=[{no:10,title:'Later theory'},{no:2,title:'Second theory'},{no:1,title:'First theory'}];
 w.D.render();const roadmap=w.document.querySelector('#dashRoadmap');assert.equal(roadmap.querySelectorAll('img,svg,script').length,0);assert.match(roadmap.textContent,/Demo 1: <img/);assert.match(roadmap.textContent,/Demo 1:[\s\S]*Demo 2:[\s\S]*Demo 10:/);assert.match(roadmap.textContent,/Lesson 1:[\s\S]*Lesson 2:[\s\S]*Lesson 10:/);assert.match(w.document.querySelector('#syllabusBarWrap').textContent,/Next practical: Demo 1/);assert.equal(w.injected,undefined);
 }finally{f.close();}
});

test('dashboard identity uses current authorised institute without altering stored data or borrowing bundled profile',()=>{
 const f=setup();try{const w=f.w;w.__ITI_V15=true;w.SESSION.name='Synthetic Instructor';w.DATA.meta={trade:'Electrician',batch:'TEST'};
 w.V15Sync={INSTITUTE_ID:'inst',fb:{user:{uid:'u'},app:{options:{projectId:'demo'}}},instituteIdentity:{uid:'u',instituteId:'inst',projectId:'demo',name:'Synthetic Institute'}};
 w.document.body.insertAdjacentHTML('beforeend','<div id="brandSub"></div><div class="instructor-profile-dashboard"><div class="profile-avatar">DK</div><h3>Legacy identity</h3><p>Legacy trade</p></div>');
 const before=JSON.stringify(w.DATA);w.D.render();assert.match(w.document.querySelector('#heroSub').textContent,/Electrician.*Synthetic Institute/);assert.equal(w.document.querySelector('#brandSub').textContent,'Synthetic Institute');assert.equal(w.document.querySelector('.instructor-profile-dashboard h3').textContent,'Synthetic Instructor');assert.equal(JSON.stringify(w.DATA),before);
 w.V15Sync.fb.user.uid='other';w.D.render();assert.match(w.document.querySelector('#heroSub').textContent,/Institute not configured/);assert(!w.document.querySelector('#heroSub').textContent.includes('undefined'));
 w.SESSION.role='student';w.D.render();assert.equal(w.document.querySelector('.instructor-profile-dashboard').hidden,true);
 }finally{f.close();}
});
test('notice with missing date stays readable and stored notice markup cannot execute',()=>{
 const f=setup();try{const w=f.w;w.DATA.notices=[{title:'<img src=x onerror="window.injected=1">',body:'<script>bad</script>'}];w.D.render();const box=w.document.querySelector('#dashLatestNotice');assert.match(box.textContent,/Date not recorded/);assert.equal(box.querySelectorAll('img,script').length,0);assert.match(box.textContent,/<img/);assert.equal(w.injected,undefined);
 }finally{f.close();}
});
test('progress uses the full allocated finish and preserves overdue work despite later completions',()=>{
 const f=setup();try{const w=f.w;w.DATA.practicals=[{no:'1.1.01',title:'Long practical',hours:7,plannedDate:'2026-10-26'},{no:'1.1.02',title:'Later',hours:2,status:'completed'}];w.DATA.meta={scheduleMode:'training-plan',trainingPlan:{dayPlan:[{date:'2026-10-26',practicalItems:[{seq:'1.1.01',hours:5}]},{date:'2026-10-27',practicalItems:[{seq:'1.1.01',hours:2}]},{date:'2026-10-30',practicalItems:[{seq:'1.1.02',hours:2}]}]}};
 assert.equal(w.D.topicState('practical',w.DATA.practicals[0],'2026-10-26').label,'Upcoming');assert.equal(w.D.topicState('practical',w.DATA.practicals[0],'2026-10-27').label,'Due today');assert.equal(w.D.topicState('practical',w.DATA.practicals[0],'2026-10-28').code,'overdue');
 const summary=w.D.progressSummary('practical','2026-10-28');assert.equal(summary.expected,1);assert.equal(summary.completed,1);assert.equal(summary.overdue.length,1);assert.equal(summary.lastExpected.no,'1.1.01');
 w.DATA.practicals[1].status='pending';assert.equal(w.D.progressSummary('practical','2026-10-28').notStarted,true);
 }finally{f.close();}
});
test('partial, invalid and changed-date schedules do not invent a completed allocation or overdue finish',()=>{
 const f=setup();try{const w=f.w,item={no:1,hours:11,plannedDate:'2026-10-26'};w.DATA.meta={trainingPlan:{dayPlan:[{date:'2026-10-26',practicalItems:[{seq:1,hours:5}]}]}};
 assert.equal(w.D.topicState('practical',item,'2026-10-30').code,'unplanned');assert.equal(w.D.topicTiming('practical',item).finish,null);
 w.DATA.meta.trainingPlan.dayPlan.push({date:'2026-10-27',practicalItems:[{seq:1,hours:6}]});item.plannedDate='2026-10-28';assert.equal(w.D.topicTiming('practical',item).finish,null);
 delete w.DATA.meta.trainingPlan;item.plannedEndDate='2026-02-30';assert.equal(w.D.topicTiming('practical',item).finish,null);item.plannedEndDate='2026-10-29';assert.equal(w.D.topicState('practical',item,'2026-10-30').code,'overdue');item.status='completed';assert.equal(w.D.topicState('practical',item,'2026-10-30').code,'complete');
 }finally{f.close();}
});
