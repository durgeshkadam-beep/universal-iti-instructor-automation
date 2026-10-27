'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const wait=()=>new Promise(r=>setTimeout(r,30));
async function run(){
 const dom=new JSDOM('<!doctype html><body><div id="loginScreen"><div class="login-card"><select id="loginRole"><option value="student">Student</option><option value="instructor">Instructor</option></select><input id="v15ExpectedEmail" type="email"></div></div><div id="appShell"><header class="topbar"><div class="who"></div></header></div></body>',{
  url:'https://example.test/v15/',runScripts:'outside-only'
 });
 const w=dom.window;
 w.ITI_RUNTIME={institutePasswordEnabled:true,instituteLoginDomain:'iti.example.in'};
 let ready=false,role='student',signedInUid='auth-student',loggedInEmail='',signouts=0,linked=0,resets=[];
 const auth={currentUser:null};
 const user={uid:signedInUid,email:'student001@iti.example.in',
   providerData:[{providerId:'google.com'}]};
 const M={
  getApps:()=>[{name:'iti-v15'}],
  getAuth:()=>auth,
  browserSessionPersistence:'session',
  setPersistence:async()=>{},
  async signInWithEmailAndPassword(_auth,email,pass){
   if(email!=='student001@iti.example.in'||pass!=='CorrectPassword123!')throw Error('invalid credential');
   auth.currentUser=user;return {user};
  },
  async signOut(){signouts++;auth.currentUser=null;},
  async sendPasswordResetEmail(_auth,email){resets.push(email);},
  EmailAuthProvider:{credential:(email,pwd)=>({email,pwd})},
  async linkWithCredential(signed,cred){linked++;assert.equal(signed.uid,user.uid);assert.equal(cred.email,signed.email);return {user:signed};}
 };
 const V={
  ready:false,fb:{M,auth,db:{},user:null},
  currentRole:()=>role,
  config:()=>({projectId:'project-test'}),
  modules:async()=>M,
  showRoleLogin:()=>{},
  applyRolePortal:async()=>true,
  async login(){
   loggedInEmail=w.localStorage.getItem('iti-v15-email-v2');
   this.fb.user=auth.currentUser;
   this.ready=role==='student'&&this.fb.user?.uid===signedInUid;
  }
 };
 w.V15Sync=V;
 w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-institute-auth.js'),'utf8'));
 assert.equal(V.instituteIdentifierToEmail('STUDENT001'),'student001@iti.example.in');
 assert.equal(V.instituteIdentifierToEmail('student001@iti.example.in'),'student001@iti.example.in');
 for(const bad of ['a','../x','@evil.com','hello world','admin/secret','foo@example','x'.repeat(41)])assert.equal(V.instituteIdentifierToEmail(bad),null,'reject invalid ID '+bad);
 assert.ok(w.document.querySelector('#v15InstitutePasswordForm'),'password login shown only with explicit feature flag');
 assert.match(w.document.querySelector('#v15InstitutePasswordForm').textContent,/Institute ID \/ Password/);

 assert.ok(w.document.getElementById('v15InstitutePasswordRecovery'),'password recovery UI exists');
 for(const invalid of ['student001','foo@iti-staging.example.test','student@invalid.invalid','foo@example.test','']) {
   await assert.rejects(()=>V.requestInstitutePasswordReset(invalid),/full email address/i);
 }
 assert.deepEqual(resets,[],'an Institute ID alone cannot trigger reset email to unowned alias');
 const result=await V.requestInstitutePasswordReset('student001@iti.example.in');
 assert.match(result,/If this email has a password-enabled account/,'generic response reveals no existence');
 assert.deepEqual(resets,['student001@iti.example.in']);
 assert.equal(V.ready,false,'password reset does not create an authenticated session');
 for(const privileged of ['admin','principal']) {
   await assert.rejects(()=>V.institutePasswordLogin('student001','CorrectPassword123!',privileged),/must use approved Google sign-in/);
 }
 assert.equal(auth.currentUser,null,'privileged role selection must not open Firebase password session');

 await assert.rejects(()=>V.institutePasswordLogin('student001','badpassword','student'),/Sign-in was not completed/);
 assert.equal(V.ready,false,'bad password cannot create an active user');
 const ok=await V.institutePasswordLogin('student001','CorrectPassword123!','student');
 assert.equal(ok,true);assert.equal(V.fb.user.uid,signedInUid,'same UID preserved');
 assert.equal(loggedInEmail,user.email,'Firebase user is the account identity');
 assert.equal(V.ready,true);
 assert.equal(w.localStorage.getItem('iti-v15-password-session'),'1','institute password chooses browser-session persistence');
 assert.equal(w.localStorage.getItem('iti-v15-role-v2'),'student');
 assert.equal(w.localStorage.getItem('iti-v15-email-v2'),user.email);
 assert.equal(w.localStorage.getItem('CorrectPassword123!'),null,'no password in localStorage');
 assert.doesNotMatch(JSON.stringify([...Object.entries(w.localStorage)]),/CorrectPassword123!/,'never persist passwords');
 role='instructor';V.ready=false;auth.currentUser=null;
 await assert.rejects(()=>V.institutePasswordLogin('student001','CorrectPassword123!','instructor'),/not authorized/i);
 assert.equal(auth.currentUser,null,'denied role clears Firebase session');
 role='student';V.ready=true;V.fb.user=user;auth.currentUser=user;
 V.ensurePasswordLinkButton();
 assert.ok(w.document.getElementById('v15LinkPassword'),'existing Google account may link a password');
 w.document.getElementById('v15LinkPassword').click();
 const form=w.document.getElementById('v15LinkPasswordForm'),fields=form.querySelectorAll('input');
 fields[0].value='AnotherVeryStrongPassword123!';
 fields[1].value='AnotherVeryStrongPassword123!';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await wait();assert.equal(linked,1,'linkWithCredential called for original Google user');
 assert.match(form.textContent,/same account/);
 w.close();
 console.log('PASS secure institute password login: ID alias, UID preservation, denied roles, no passwords stored, Google provider linking.');
 // A deployment without the feature flag must never expose an alternative sign-in form.
 const fallback=new JSDOM('<!doctype html><body><div id="loginScreen"><div class="login-card"></div></div></body>',{url:'https://example.test/',runScripts:'outside-only'});
 fallback.window.V15Sync={showRoleLogin:()=>{}};
 fallback.window.ITI_RUNTIME={};
 fallback.window.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-institute-auth.js'),'utf8'));
 assert.equal(fallback.window.document.getElementById('v15InstitutePasswordForm'),null);
 fallback.window.close();
 console.log('PASS institute password feature is disabled by default.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
