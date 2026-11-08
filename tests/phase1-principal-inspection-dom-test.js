'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,25));
async function run(){
 const dom=new JSDOM('<!doctype html><html><body><section id="tab-inspection" class="panel active"></section></body></html>',{url:'https://example.test/v15/',runScripts:'outside-only'});
 const w=dom.window,host=w.document.getElementById('tab-inspection');
 let role='principal',uid='principal-uid',writes=0,reads=0,rendered=[];
 const source=Array.from({length:51},(_,i)=>({data:{no:String(i+1),title:i===0?'<img src=x onerror=alert(1)> Layout':'Synthetic topic '+i,plan:{objective:['Synthetic learning outcome'],steps:[{procedure:'Draft step'}]},planMeta:{status:'approved'}}}));
 const getDocs=(q)=>{
  reads++;
  if(q.key==='practicals'){
   const index=q.cursor?source.indexOf(q.cursor.sample)+1:0;
   return {docs:source.slice(index,index+q.n).map(o=>({sample:o,data:()=>o}))};
  }
  return {docs:[]};
 };
 const M={
  collection:(_db,_coll,_inst,_w,workspace,key)=>({workspace,key}),
  getDocsFromServer:async query=>getDocs(query),
  getDocFromServer:async ref=>({exists:()=>true,data:()=>({trainingPlanRevision:3,trainingPlan:{dayPlan:[{date:'2026-11-05',practical:'DTP layout'}]}})}),
  limit:n=>({kind:'limit',n}),startAfter:sample=>({kind:'cursor',sample}),
  query:(col,...opts)=>({key:col.key,n:opts.find(x=>x.kind==='limit').n,cursor:opts.find(x=>x.kind==='cursor')}),
  setDoc:()=>{writes++;throw Error('Read-only viewer must never write');},
  updateDoc:()=>{writes++;throw Error('Read-only viewer must never write');}
 };
 const V={ready:true,member:{active:true,role:'principal'},fb:{user:{uid},M,db:{}},INSTITUTE_ID:'synthetic-iti',
  currentRole:()=>role,
  listTradeWorkspaces:async()=>[{id:'w-a',trade:'DTP',session:'2026-27',batch:'A'},{id:'w-b',trade:'COPA',session:'2026-27',batch:'B'}],
  ws:id=>({id}),col:(key,id)=>({key,id}),
 };
 w.V15Sync=V;
 w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-principal-inspection.js'),'utf8'));
 assert.equal(typeof V.renderPrincipalInspection,'function');
 await V.renderPrincipalInspection();
 assert.equal(host.querySelector('#piWorkspace').options.length,3);
 assert.equal(reads,0,'No trainee records fetched until Principal chooses a Trade');
 const sel=host.querySelector('#piWorkspace');sel.value='w-a';sel.dispatchEvent(new w.Event('change'));await tick();
 assert.match(host.querySelector('#piStatus').textContent,/Year Plan preview loaded/);
 assert.match(host.textContent,/DTP layout/);
 const type=host.querySelector('#piType');type.value='practicals';type.dispatchEvent(new w.Event('change'));await tick();
 assert.equal(host.querySelectorAll('.pi-record').length,50);
 assert.match(host.textContent,/Synthetic learning outcome/,'approved lesson plan can be inspected');
 assert.equal(host.querySelector('img'),null,'record input is plain text, never executable HTML');
 const more=host.querySelector('.pi-more');assert.equal(more.hidden,false);
 more.click();await tick();
 assert.equal(host.querySelectorAll('.pi-record').length,51);
 assert.equal(more.hidden,true);
 assert.equal(writes,0,'inspection never modifies records');
 const note=host.querySelector('#piNotes');note.value='Synthetic draft note';
 assert.match(host.textContent,/NOT saved/);
 role='staff';await V.renderPrincipalInspection();
 assert.equal(host.querySelectorAll('.pi-record').length,51,'Staff cannot open a Principal inspection after role switch');
 role='principal';uid='new-user';await V.renderPrincipalInspection();
 assert.equal(host.querySelector('#piWorkspace').value,'','new login does not inherit another Principal selected workspace');
 assert.equal(writes,0);
 console.log('Principal inspection read-only DOM, pagination, escaping, role and workspace isolation PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
