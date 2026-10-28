'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<!doctype html><body>'+['heroGreeting','heroSub','dashCards','dashLatestNotice','dashRoadmap','pendingSigList','syllabusBarWrap'].map(id=>`<div id="${id}"></div>`).join('')+'</body>',{runScripts:'outside-only'}),w=dom.window;
 w.DATA={trainees:[],attendance:{},meta:{},practicals:[],theory:[],notices:[],signatures:{}};w.SESSION={role:'instructor'};w.todayISO=()=> '2026-10-28';
 const src=fs.readFileSync('app.js','utf8');w.eval(src.slice(src.indexOf('const Dashboard ='),src.indexOf('/* ===================== TRAINEES'))+';window.D=Dashboard;');return {w,close:()=>w.close()};
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
