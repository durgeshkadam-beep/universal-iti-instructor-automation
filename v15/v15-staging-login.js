/* Staging-only account form. Roles are still authorized by Firebase membership/rules. */
(function(V){
'use strict';
const runtime=window.ITI_RUNTIME||{},project=runtime.firebaseConfig?.projectId||'';
if(!V||runtime.staging!==true||!project.endsWith('-staging'))return;
if(V.stagingLoginInstalled){V.showRoleLogin();return;}
V.stagingLoginInstalled=true;
const show=V.showRoleLogin;
function stageEmail(id){
 const domain=String(window.ITI_RUNTIME?.instituteLoginDomain||'').trim().toLowerCase(),stageDomain=/^[a-z0-9.-]+\.test$/.test(domain)&&!domain.includes('..')?domain:'';
 const text=String(id||'').trim().toLowerCase();
 if(text.includes('@'))return V.validEmail(text)?text:null;
 return stageDomain&&/^[a-z0-9][a-z0-9._-]{2,39}$/.test(text)?text+'@'+stageDomain:null;
}
V.stagingIdToEmail=stageEmail;
V.stagingFailureMessage=function(error,stage){
 const messages={
  'auth/invalid-credential':'Credentials were not accepted. Use the matching demo ID and password.',
  'auth/user-not-found':'Credentials were not accepted. Use the matching demo ID and password.',
  'auth/wrong-password':'Credentials were not accepted. Use the matching demo ID and password.',
  'auth/network-request-failed':'Firebase could not be reached. Check the connection before retrying.',
  'auth/too-many-requests':'Firebase temporarily limited attempts. Stop retrying and wait.',
  'auth/operation-not-allowed':'Password sign-in is unavailable for this Firebase project.',
  'auth/user-disabled':'This account is disabled. Ask the institute administrator.',
  'auth/web-storage-unsupported':'Browser session storage is unavailable. Check browser storage settings.'
 };
 return 'Staging sign-in failed. '+(messages[error?.code]||(stage==='institute-access'?'Firebase credentials were accepted, but institute role/workspace access did not finish.':'Authentication could not finish. No role permissions were granted.'));
};
V.showRoleLogin=function(){
 show.call(this);
 const card=document.querySelector('#loginScreen .login-card');
 if(!card)return;
 if(document.getElementById('stagingPassword')){
  // The underlying role-login renderer also resets the legacy Google label.
  // Keep the two sign-in methods visually distinct after a role/menu refresh.
  const existingGoogle=card.querySelector('#stagingGoogleOption button.btn.full');
  if(existingGoogle){existingGoogle.classList.remove('primary');existingGoogle.textContent='Continue with approved Google';}
  return;
 }
 const field=document.createElement('div');field.className='field staging-test-password-field';field.id='stagingTestPasswordField';
 field.innerHTML='<label for="stagingPassword">Test account password</label><input id="stagingPassword" type="password" autocomplete="current-password"><button type="button" class="btn primary" id="stagingSignIn">Sign in to demo</button><small class="muted">Use your assigned demo ID and private test password, not a personal Google password.</small>';
 card.appendChild(field);
 const label=document.querySelector('#v15ExpectedEmailField label');if(label)label.textContent='Test account ID or email';
 const idInput=document.getElementById('v15ExpectedEmail');
 if(idInput){idInput.type='text';idInput.placeholder='e.g. instructor or instructor@iti-staging.example.test';idInput.autocomplete='username';}
 const idHelp=document.querySelector('#v15ExpectedEmailField small');
 if(idHelp)idHelp.textContent='Demo credentials only. Google sign-in is a separate option below.';
 const help=document.getElementById('v15AuthHelp');
 if(help){help.textContent='The selected role must match the approved test account. Firebase still verifies role and workspace permissions.';help.className='staging-test-help';field.appendChild(help);}
 const google=card.querySelector('button.btn.primary.full:not(#stagingSignIn)');
 if(google){
  const other=document.createElement('details');other.id='stagingGoogleOption';other.className='staging-google-option';
  other.innerHTML='<summary>Other sign-in method: Approved Google account <span>Optional · separately authorised</span></summary><div class="staging-google-fields"><label for="stagingGoogleEmail">Approved Google / Gmail email</label><input id="stagingGoogleEmail" type="email" autocomplete="email" placeholder="name@gmail.com"><small>Only for an account separately approved for the selected institute role. Do not use the test password here.</small></div>';
  const googleEmail=other.querySelector('#stagingGoogleEmail');
  const oldValue=idInput?.value?.trim()||'';
  if(V.validEmail(oldValue)&&!/\.(?:test|invalid)$/i.test(oldValue.split('@')[1]||''))googleEmail.value=oldValue;
  google.classList.remove('primary');google.textContent='Continue with approved Google';
  google.addEventListener('click',event=>{
   const chosen=googleEmail.value.trim().toLowerCase();
   if(!V.validEmail(chosen)){
    event.preventDefault();event.stopImmediatePropagation();
    V.loginMsg('Enter the full, separately approved Google / Gmail address.',true);googleEmail.focus();return;
   }
   // The original verified-Google handler still owns authentication. Set the
   // email it validates before it starts; never reuse an unrelated demo ID.
   if(idInput)idInput.value=chosen;
  },true);
  other.appendChild(google);card.appendChild(other);
 }
 document.getElementById('stagingSignIn').onclick=async()=>{
  const button=document.getElementById('stagingSignIn'),email=stageEmail(document.getElementById('v15ExpectedEmail')?.value),password=document.getElementById('stagingPassword').value,role=document.getElementById('loginRole')?.value;
  if(!email||!password)return V.loginMsg('Enter your approved synthetic Institute ID/email and password.',true);
  button.disabled=true;
  V.loginMsg('Verifying staging credentials and assigned role…');
  let signInAuth=null,signInModules=null,stage='credentials';
  try{
   const M=await V.modules();let app=M.getApps().find(x=>x.name==='iti-v15');if(!app)app=M.initializeApp(V.config(),'iti-v15');
   const auth=M.getAuth(app);signInAuth=auth;signInModules=M;await M.setPersistence(auth,M.browserSessionPersistence);
   await (V.firebaseSignIn?V.firebaseSignIn(M,auth,()=>M.signInWithEmailAndPassword(auth,email,password)):M.signInWithEmailAndPassword(auth,email,password));
   stage='institute-access';
   document.getElementById('stagingPassword').value='';
   localStorage.setItem('iti-v15-password-session','1');
   localStorage.setItem('iti-v15-role-v2',role);localStorage.setItem('iti-v15-email-v2',email);
   const approved=document.getElementById('v15ExpectedEmail');if(approved)approved.value=email;
   await V.login({interactive:false});
   if(!V.ready||V.fb?.user?.uid!==auth.currentUser?.uid){await M.signOut(auth).catch(()=>{});throw Error('Selected role not approved');}
  }catch(error){
   if(!V.ready&&signInAuth){try{await signInModules.signOut(signInAuth);}catch(e){}if(V.fb)V.fb.user=null;}
   try{localStorage.removeItem('iti-v15-password-session');}catch(err){}
   document.getElementById('stagingPassword').value='';
   V.loginMsg(V.stagingFailureMessage(error,stage),true);
  }
  finally{button.disabled=false;}
 };
};
const banner=document.createElement('div');banner.id='stagingNotice';banner.setAttribute('role','status');
banner.style.cssText='padding:10px 16px;background:#fff1c2;color:#593c00;text-align:center;font:14px/1.5 sans-serif;overflow-wrap:anywhere';
banner.textContent='STAGING • Institute records — authorised access only. '+(runtime.apiUrl?'':'Secure online exams and generative AI await backend hosting. Guided assistance remains available.');
document.body.prepend(banner);document.title+=' — STAGING';V.showRoleLogin();
})(window.V15Sync);
