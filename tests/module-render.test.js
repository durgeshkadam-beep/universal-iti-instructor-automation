'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(modules,role='instructor'){
 const dom=new JSDOM('<select id="topicModule"></select><div id="moduleManagerBody"></div>',{runScripts:'outside-only'}),w=dom.window;
 w.DATA={modules};w.SESSION={role};let saves=0,confirms=0;w.saveData=()=>saves++;w.confirm=()=>{confirms++;return true;};
 const source=fs.readFileSync('app.js','utf8').split('/* ===================== MODULE MANAGER ===================== */')[1].split('/* ===================== PRACTICALS ===================== */')[0];
 w.eval(source+'\nwindow.manager=ModuleManager;');return {dom,w,manager:w.manager,saves:()=>saves,confirms:()=>confirms};
}
test('module and topic fields render hostile markup as text without executable attributes',()=>{
 const payload='<img src=x onerror="window.injected=true">',id="x');window.injected=true;//";
 const {dom,w,manager}=setup([{id,code:payload,name:payload,description:payload,hours:payload,topics:[{id,type:payload,title:payload,hours:payload}]}]);
 try{manager.refresh();const body=w.document.querySelector('#moduleManagerBody');assert.equal(body.querySelectorAll('img,script,[onclick],[onerror]').length,0);assert(body.textContent.includes(payload));assert.equal(w.document.querySelector('option').value,id);assert.equal(w.injected,undefined);}finally{w.close();}
});
test('module and topic delete buttons preserve exact opaque IDs and persist only confirmed changes',()=>{
 const moduleId="m'\"<>&",topicId="t'\"<>&",{w,manager,saves,confirms}=setup([{id:moduleId,name:'Synthetic',topics:[{id:topicId,title:'Topic',type:'theory',hours:1}]}]);
 try{manager.refresh();w.document.querySelector('tbody button').click();assert.equal(w.DATA.modules[0].topics.length,0);assert.equal(saves(),1);assert.equal(confirms(),1);w.document.querySelector('#moduleManagerBody button').click();assert.equal(w.DATA.modules.length,0);assert.equal(saves(),2);}finally{w.close();}
});
test('non-instructor cannot delete syllabus records even by directly invoking handlers',()=>{
 for(const role of ['student','staff','principal','admin']){const {w,manager,saves,confirms}=setup([{id:'m',name:'Synthetic',topics:[{id:'t',title:'Topic'}]}],role);try{manager.refresh();assert.equal(w.document.querySelectorAll('#moduleManagerBody button').length,0);manager.deleteTopic('m','t');manager.deleteModule('m');assert.equal(w.DATA.modules.length,1);assert.equal(w.DATA.modules[0].topics.length,1);assert.equal(saves(),0);assert.equal(confirms(),0);}finally{w.close();}}
});
test('missing or malformed topic lists do not break the module page',()=>{
 for(const topics of [undefined,null,{}]){const {w,manager}=setup([{id:'m',name:'Synthetic',topics}]);try{manager.refresh();assert.match(w.document.querySelector('#moduleManagerBody').textContent,/0 topics/);}finally{w.close();}}
});
