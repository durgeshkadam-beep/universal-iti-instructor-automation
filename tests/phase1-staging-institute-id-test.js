'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><body><div id="loginScreen"><div class="login-card"><select id="loginRole"><option value="student">Student</option><option value="instructor">Instructor</option></select><input id="v15ExpectedEmail" type="email"><button class="btn primary full">Google</button></div></div></body>',{url:'https://example.test/v15/',runScripts:'outside-only'});
 const w=dom.window;
 w.ITI_RUNTIME={staging:true,instituteLoginDomain:'iti-staging.example.test',firebaseConfig:{projectId:'universal-iti-dk-staging'}};
 let loginCount=0,signoutCount=0,providedEmail='';
 const user={uid:'same-student-uid',email:'student@iti-staging.example.test'};
 const auth={currentUser:null};
 const M={
  getApps:()=>[{name:'iti-v15'}],getAuth:()=>auth,browserSessionPersistence:'session',
  setPersistence:async()=>{},
  signInWithEmailAndPassword:async(_,email,password)=>{
   assert.equal(email,'student@iti-staging.example.test');
   assert.equal(password,'CorrectTestPassword123!');
   auth.currentUser=user;return {user};
  },
  signOut:async()=>{signoutCount++;auth.currentUser=null;}
 };
 const V={ready:false,fb:{M,auth,user:null},email:x=>String(x||'').toLowerCase().trim(),validEmail:x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
  modules:async()=>M,config:()=>w.ITI_RUNTIME.firebaseConfig,showRoleLogin:()=>{},loginMsg:()=>{},
  login:async()=>{loginCount++;providedEmail=w.localStorage.getItem('iti-v15-email-v2');V.fb.user=auth.currentUser;V.ready=w.document.getElementById('loginRole').value==='student';}
 };
 w.V15Sync=V;
 w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-staging-login.js'),'utf8'));
 assert.match(w.document.getElementById('stagingNotice').textContent,/Institute records/);
 assert.doesNotMatch(w.document.getElementById('stagingNotice').textContent,/Synthetic test data only/);
 assert.equal(V.stagingIdToEmail('student'),'student@iti-staging.example.test');
 assert.equal(V.stagingIdToEmail('INSTRUCTOR'),'instructor@iti-staging.example.test');
 assert.equal(V.stagingIdToEmail('../admin'),null);
 assert.ok(w.document.getElementById('stagingPassword'),'original staging password control preserved');
 assert.equal(w.document.getElementById('v15ExpectedEmail').type,'text','staging ID allows shorthand');
 w.document.getElementById('v15ExpectedEmail').value='student';
 w.document.getElementById('stagingPassword').value='CorrectTestPassword123!';
 w.document.getElementById('stagingSignIn').click();
 await new Promise(r=>setTimeout(r,35));
 assert.equal(loginCount,1);
 assert.equal(providedEmail,'student@iti-staging.example.test');
 assert.equal(w.localStorage.getItem('iti-v15-password-session'),'1','staging login keeps password in session only');
 assert.equal(V.fb.user.uid,'same-student-uid');
 assert.equal(signoutCount,0);
 assert.equal(w.document.getElementById('stagingPassword').value,'','password cleared');
 // A wrong-role sign-in MUST sign out the Firebase user and clear the stale
 // active marker, not merely display an error while leaving a token behind.
 V.ready=false;V.fb.user=null;auth.currentUser=null;
 w.document.getElementById('loginRole').value='instructor';
 w.document.getElementById('v15ExpectedEmail').value='student';
 w.document.getElementById('stagingPassword').value='CorrectTestPassword123!';
 w.document.getElementById('stagingSignIn').click();
 await new Promise(r=>setTimeout(r,55));
 assert.equal(V.ready,false,'wrong institute role cannot open dashboard');
 assert.equal(auth.currentUser,null,'wrong-role rejection must end Auth session');
 assert.equal(V.fb.user,null,'member data must not retain rejected identity');
 assert.ok(signoutCount>=1,'wrong role triggers Firebase signout');
 assert.equal(w.localStorage.getItem('iti-v15-password-session'),null,'rejected session marker cleared');
 w.close();
 console.log('PASS staging Institute ID aliases: existing synthetic accounts, same Auth UID, no bypass or credentials in source.');
})().catch(e=>{console.error(e);process.exitCode=1;});
