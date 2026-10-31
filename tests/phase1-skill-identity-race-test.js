'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
async function run(){
 const dom=new JSDOM('<!doctype html><body><section id="tab-skills"></section></body>',{url:'https://example.test/v15/',runScripts:'outside-only'});
 const w=dom.window;
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 const user={uid:'student-a'};
 const M={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:()=>pending
 };
 const V={ready:true,workspaceId:'batch-1',INSTITUTE_ID:'iti-a',fb:{user,M,db:{}},
  currentRole:()=> 'student'
 };
 w.V15Sync=V;
 w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-skill-verification.js'),'utf8'));
 const task=V.renderVerifiedSkillList();
 V.fb.user={uid:'student-b'};
 finish({exists:()=>true,data:()=>({skills:{'practical-1':{status:'verified',title:'Former student private skill'}}})});
 await task;
 assert.doesNotMatch(w.document.body.textContent,/Former student private skill/,'late skill fetch must not render after identity switch');
 assert.doesNotMatch(w.document.body.textContent,/Instructor verified •/,'no old assessment may appear');
 dom.window.close();
 console.log('PASS stale student skill verification response not displayed after account switch.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
