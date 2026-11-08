'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const dom=new JSDOM('<div id="loginScreen"><div class="login-card"></div></div>',{url:'https://synthetic.example.test',runScripts:'outside-only'}),w=dom.window;
 let resolveCalls=0;const result={user:{uid:'synthetic-user'}};
 const resolver={hints:[{factorId:'totp',uid:'factor-one',displayName:'<img src=x onerror=alert(1)>'},{factorId:'totp',uid:'factor-two',displayName:'Backup authenticator'},{factorId:'phone',uid:'phone'}],resolveSignIn:async assertion=>{resolveCalls++;assert.deepEqual(assertion,{uid:'factor-two',otp:'123456'});return result;}};
 const M={getMultiFactorResolver:()=>resolver,TotpMultiFactorGenerator:{FACTOR_ID:'totp',assertionForSignIn:(uid,otp)=>({uid,otp})}};
 w.V15Sync={};w.eval(fs.readFileSync('v15/v15-mfa.js','utf8'));
 return {w,V:w.V15Sync,M,resolver,result,calls:()=>resolveCalls,close:()=>w.close()};
}
const challenge=()=>Promise.reject(Object.assign(Error('provider challenge'),{code:'auth/multi-factor-auth-required'}));
test('normal Firebase sign-in is unchanged and unrelated errors propagate',async()=>{
 const f=setup();try{assert.equal(await f.V.firebaseSignIn(f.M,{},async()=>f.result),f.result);await assert.rejects(f.V.firebaseSignIn(f.M,{},async()=>{throw Object.assign(Error('network'),{code:'auth/network-request-failed'});}),/network/);assert.equal(f.w.document.querySelector('form'),null);}finally{f.close();}
});
test('TOTP challenge requires Firebase resolution, supports factor choice and stores no code',async()=>{
 const f=setup();try{
  const p=f.V.firebaseSignIn(f.M,{},challenge);await tick();const form=f.w.document.querySelector('form'),code=f.w.document.querySelector('#v15MfaCode');assert(form);assert.equal(f.calls(),0);assert.equal(form.querySelectorAll('img').length,0);assert.match(form.textContent,/<img/);assert.equal(code.autocomplete,'one-time-code');
  f.w.document.querySelector('#v15MfaFactor').value='1';code.value='123456';form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(await p,f.result);assert.equal(f.calls(),1);assert.equal(f.w.document.querySelector('form'),null);assert.equal(code.value,'');assert.equal(f.w.localStorage.length,0);assert.equal(f.w.sessionStorage.length,0);
 }finally{f.close();}
});
test('cancel, unsupported factor and overlapping challenges never create a session',async()=>{
 const f=setup();try{const p=f.V.firebaseSignIn(f.M,{},challenge);await tick();await assert.rejects(f.V.firebaseSignIn(f.M,{},challenge),/existing/);const reject=assert.rejects(p,/cancelled/);f.w.document.querySelector('button[type=button]').click();await reject;assert.equal(f.calls(),0);
  f.resolver.hints=[{factorId:'phone',uid:'phone'}];await assert.rejects(f.V.firebaseSignIn(f.M,{},challenge),/does not support/);assert.equal(f.w.document.querySelector('form'),null);
 }finally{f.close();}
});
test('invalid OTP remains pending and clears input until the user cancels',async()=>{
 const f=setup();try{let calls=0;f.resolver.resolveSignIn=async()=>{calls++;throw Object.assign(Error('secret provider error'),{code:'auth/invalid-verification-code'});};const p=f.V.firebaseSignIn(f.M,{},challenge);await tick();const form=f.w.document.querySelector('form'),code=f.w.document.querySelector('input');code.value='abc';form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,0);code.value='123456';form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.equal(code.value,'');assert.match(form.textContent,/not accepted/);assert(!form.textContent.includes('secret provider error'));const reject=assert.rejects(p,/cancelled/);form.querySelector('button[type=button]').click();await reject;
 }finally{f.close();}
});
test('expired sessions and throttling close the challenge and fail closed',async()=>{
 for(const errorCode of ['auth/invalid-multi-factor-session','auth/too-many-requests']){const f=setup();try{f.resolver.resolveSignIn=async()=>{throw Object.assign(Error('private'),{code:errorCode});};const p=f.V.firebaseSignIn(f.M,{},challenge),rejected=assert.rejects(p,/expired or temporarily limited/);await tick();f.w.document.querySelector('input').value='123456';f.w.document.querySelector('form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));await rejected;assert.equal(f.w.document.querySelector('form'),null);}finally{f.close();}}
});
