'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('',{url:'https://synthetic.example',runScripts:'outside-only'}),w=dom.window;w.SESSION={role:'instructor'};const original={no:1,title:'Synthetic',plannedDate:null,status:'pending'};w.DATA={practicals:[{...original}]};
 const V={ready:true,workspaceId:'w',fb:{user:{uid:'i'}},shadow:{practicals:[{...original}]},itemId:(_,x)=>String(x.no),clone:x=>structuredClone(x),eq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),badge(){},refresh(){}};w.V15Sync=V;w.eval(fs.readFileSync('v15/v15-governance-v2.js','utf8'));return {w,V,original};
}
test('a remote syllabus echo preserves edits made before the debounce queue runs',()=>{
 const {w,V,original}=setup();try{w.DATA.practicals[0].plannedDate='2026-10-22';V.receiveSyllabusSnapshot('practicals',[original,{no:2,title:'Remote new topic'}]);assert.equal(w.DATA.practicals[0].plannedDate,'2026-10-22');assert.equal(w.DATA.practicals[1].title,'Remote new topic');assert.equal(V.shadow.practicals[0].plannedDate,null);assert(!V.eq(w.DATA.practicals,V.shadow.practicals));}finally{w.close();}
});
test('latest local syllabus changes and deletes take precedence over older queued values',()=>{
 const {w,V,original}=setup();try{V.queueWrite([{workspaceId:'w',section:'practicals',kind:'array',docId:'1',action:'set',value:{...original,title:'Older queued title'}}]);w.DATA.practicals[0].title='Latest local title';V.receiveSyllabusSnapshot('practicals',[original]);assert.equal(w.DATA.practicals[0].title,'Latest local title');w.DATA.practicals=[];V.receiveSyllabusSnapshot('practicals',[original]);assert.equal(w.DATA.practicals.length,0);}finally{w.close();}
});
test('queued syllabus edits survive echoes and clean remote records update or disappear',()=>{
 const {w,V,original}=setup();try{V.queueWrite([{workspaceId:'w',section:'practicals',kind:'array',docId:'1',action:'set',value:{...original,status:'completed'}}]);V.receiveSyllabusSnapshot('practicals',[original,{no:2,title:'Remote'}]);assert.equal(w.DATA.practicals[0].status,'completed');V.queueWrite([]);w.DATA.practicals=structuredClone(V.shadow.practicals);V.receiveSyllabusSnapshot('practicals',[{...original,title:'Remote change'}]);assert.equal(w.DATA.practicals.length,1);assert.equal(w.DATA.practicals[0].title,'Remote change');}finally{w.close();}
});
test('old array listeners cannot write after identity, workspace or DATA replacement',()=>{
 for(const changed of ['workspace','uid','data']){const {w,V}=setup();try{let callback;V.fb.M={onSnapshot:(_,cb)=>{callback=cb;return ()=>{};}};V.col=()=>({});V.unsubscribers=[];w.eval(fs.readFileSync('v15/v15-data.js','utf8'));V.listenArr('practicals');if(changed==='workspace')V.workspaceId='new';else if(changed==='uid')V.fb.user.uid='new';else w.DATA={practicals:[{no:99,title:'New session'}]};const before=JSON.stringify(w.DATA);callback({forEach:fn=>fn({data:()=>({data:{no:7,title:'Stale'}})})});assert.equal(JSON.stringify(w.DATA),before);}finally{w.close();}}
});
