'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('staging login reinstallation retains one wrapper, notice and password form and validates the current public alias domain',()=>{
 const w=new JSDOM('<div id="loginScreen"><div class="login-card"></div></div>',{url:'https://example.test',runScripts:'outside-only'}).window;
 try{let shown=0;w.V15Sync={showRoleLogin:()=>shown++,validEmail:x=>/^[a-z0-9._-]+@[a-z0-9.-]+$/.test(x)};w.ITI_RUNTIME={staging:true,firebaseConfig:{projectId:'synthetic-staging'},instituteLoginDomain:'first.test'};const source=fs.readFileSync('v15/v15-staging-login.js','utf8');w.eval(source);const wrapper=w.V15Sync.showRoleLogin;assert.equal(w.V15Sync.stagingIdToEmail('student'),'student@first.test');w.ITI_RUNTIME.instituteLoginDomain='second.test';w.eval(source);assert.equal(w.V15Sync.showRoleLogin,wrapper);assert.equal(w.document.querySelectorAll('#stagingNotice').length,1);assert.equal(w.document.querySelectorAll('#stagingPassword').length,1);assert.equal(w.V15Sync.stagingIdToEmail('student'),'student@second.test');assert.equal(shown,2);w.ITI_RUNTIME.instituteLoginDomain='untrusted.example.com';assert.equal(w.V15Sync.stagingIdToEmail('student'),null);
 }finally{w.close();}
});
