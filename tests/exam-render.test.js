'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<section id="tab-exams"></section>',{url:'https://synthetic.example',runScripts:'outside-only'}),w=dom.window,pending=[];
 const M={collection:()=>({}),where:()=>({}),query:()=>({}),getDocs:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
 const V={ready:true,currentRole:()=> 'student',workspaceId:'workspace-a',fb:{M,db:{},user:{uid:'synthetic-student'}}};
 w.ITI_RUNTIME={apiUrl:'https://synthetic.example/api'};w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-student-services.js','utf8'));
 const snapshot=title=>({empty:false,forEach:fn=>fn({id:'synthetic-exam',data:()=>({title,durationMinutes:1,questions:[]})})});
 return {dom,w,V,pending,snapshot};
}
test('late exam query cannot append stale or duplicate cards after a newer render',async()=>{
 const {dom,w,V,pending,snapshot}=setup();try{
  const older=V.renderSecureExams(),newer=V.renderSecureExams();
  pending[1].resolve(snapshot('Latest synthetic exam'));await newer;
  pending[0].resolve(snapshot('Old synthetic exam'));await older;
  assert.deepEqual([...w.document.querySelectorAll('#tab-exams h3')].map(n=>n.textContent),['Latest synthetic exam']);
  assert.equal(w.document.querySelectorAll('#tab-exams button').length,1);
 }finally{dom.window.close();}
});
for(const identity of ['workspace','user'])test('pending exam query cannot render after changing '+identity,async()=>{
 const {dom,w,V,pending,snapshot}=setup();try{
  const render=V.renderSecureExams();
  if(identity==='workspace')V.workspaceId='workspace-b';else V.fb.user={uid:'different-synthetic-student'};
  pending[0].resolve(snapshot('Previous identity exam'));await render;
  assert.equal(w.document.querySelectorAll('#tab-exams h3').length,0);
 }finally{dom.window.close();}
});
