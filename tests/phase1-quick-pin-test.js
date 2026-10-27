'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TextEncoder}=require('node:util');
const {JSDOM}=require('jsdom');
const wait=()=>new Promise(r=>setTimeout(r,110));
async function test(){
 const dom=new JSDOM('<!doctype html><body><div id="appShell"><header class="topbar"><div class="who"></div></header></div></body>',{
  url:'https://example.test/v15/',runScripts:'outside-only'
 });
 const w=dom.window;
 Object.defineProperty(w,'crypto',{configurable:true,value:crypto.webcrypto});
 w.TextEncoder=TextEncoder;
 w.ITI_RUNTIME={quickPinEnabled:true};
 const current={uid:'teacher-a'},auth={currentUser:current};
 let signouts=0;
 const V={ready:true,fb:{auth,user:current},
  config:()=>({projectId:'isolated-staging'}),
  applyRolePortal:async()=>true,
  logout:async()=>{signouts++;V.ready=false;}
 };
 w.V15Sync=V;
 w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-quick-pin.js'),'utf8'));
 await V.applyRolePortal();
 assert.ok(w.document.getElementById('v15QuickPinSetupButton'));
 assert.ok(w.document.getElementById('v15QuickPinLockButton'));
 assert.equal(V.quickPinLock(),false,'cannot lock until own PIN is set');
 assert.equal(await V.quickPinSet('000000'),false,'reject easy repeated PIN');
 assert.equal(await V.quickPinSet('123456'),false,'reject trivial sequence');
 for(const weak of ['234567','765432','789012','210987','890123']){
  assert.equal(await V.quickPinSet(weak),false,'reject ascending/descending sequence '+weak);
 }
 assert.equal(await V.quickPinSet('1234'),false,'reject 4 digit PINs');
 for(const weak of ['121212','123123','909090','456456']){
  assert.equal(await V.quickPinSet(weak),false,'reject repeated short PIN motif '+weak);
 }
 assert.equal(await V.quickPinSet('529174'),true,'allow explicitly set nontrivial six digit PIN');
 const key='iti-v15-local-quick-pin-v1:isolated-staging:teacher-a';
 const saved=w.localStorage.getItem(key);
 assert.ok(saved);assert.doesNotMatch(saved,/529174/,'PIN never stored as raw digits');
 assert.match(saved,/PBKDF2-SHA256/);
 assert.equal(V.quickPinLock(),true);
 assert.ok(w.document.getElementById('v15QuickPinGuard'));
 const entry=w.document.querySelector('#v15QuickPinGuard input');
 const form=w.document.querySelector('#v15QuickPinGuard form');
 entry.value='999999';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await wait();assert.match(w.document.querySelector('#v15QuickPinGuard').textContent,/Remaining attempts: 4/);
 entry.value='529174';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await wait();assert.equal(w.document.getElementById('v15QuickPinGuard'),null,'correct PIN unlocks existing session UI');
 assert.equal(V.quickPinLock(),true);
 V.fb.user={uid:'teacher-b'};auth.currentUser={uid:'teacher-b'};
 assert.equal(V.quickPinLock(),false,'another Firebase user cannot use saved PIN');
 V.quickPinShowLock();
 const other=w.document.getElementById('v15QuickPinGuard');
 assert.ok(other,'original user lock remains visible until signout or full session verification');
 auth.currentUser=current;V.fb.user=current;
 // Five wrong attempts require Firebase sign out, not permanent PIN brute force.
 for(let i=0;i<5;i++){
   const guard=w.document.getElementById('v15QuickPinGuard'),pin=guard.querySelector('input');
   pin.value='888888';guard.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
   await wait();
 }
 assert.equal(signouts,1,'five failures require full authentication');
 assert.equal(V.ready,false);
 assert.equal(V.quickPinLock(),false,'signed-out user cannot unlock app with PIN alone');
 w.close();
 console.log('PASS optional Quick PIN: local PBKDF2 hash, no raw secret, account isolation and full signout on failed attempts.');
 const disabled=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/',runScripts:'outside-only'});
 disabled.window.V15Sync={ready:true};disabled.window.ITI_RUNTIME={quickPinEnabled:false};
 disabled.window.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-quick-pin.js'),'utf8'));
 assert.equal(disabled.window.V15Sync.quickPinLock,undefined,'PIN opt-in disabled by default');
 disabled.window.close();
}
test().catch(e=>{console.error(e);process.exitCode=1;});
