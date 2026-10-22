/* Staging-only account form. Roles are still authorized by Firebase membership/rules. */
(function(V){
'use strict';
const runtime=window.ITI_RUNTIME||{},project=runtime.firebaseConfig?.projectId||'';
if(!V||runtime.staging!==true||!project.endsWith('-staging'))return;
const show=V.showRoleLogin;
V.showRoleLogin=function(){
 show.call(this);
 const card=document.querySelector('#loginScreen .login-card');
 if(!card||document.getElementById('stagingPassword'))return;
 const field=document.createElement('div');field.className='field';
 field.innerHTML='<label for="stagingPassword">Staging account password</label><input id="stagingPassword" type="password" autocomplete="current-password"><button type="button" class="btn primary" style="width:100%" id="stagingSignIn">Sign in with test account</button><small class="muted">Use the synthetic account credentials supplied privately. Select its assigned role above.</small>';
 card.appendChild(field);
 const label=document.querySelector('#v15ExpectedEmailField label');if(label)label.textContent='Staging test account email';
 const help=document.getElementById('v15AuthHelp');if(help)help.textContent='Select a role, enter its supplied test email and password, then choose Sign in with test account.';
 const google=card.querySelector('button.btn.primary.full:not(#stagingSignIn)');if(google){google.classList.remove('primary');google.textContent='Use a separately approved Google account';}
 document.getElementById('stagingSignIn').onclick=async()=>{
  const button=document.getElementById('stagingSignIn'),email=V.email(document.getElementById('v15ExpectedEmail')?.value),password=document.getElementById('stagingPassword').value,role=document.getElementById('loginRole')?.value;
  if(!V.validEmail(email)||!password)return V.loginMsg('Enter your staging email and password.',true);
  button.disabled=true;
  try{
   const M=await V.modules();let app=M.getApps().find(x=>x.name==='iti-v15');if(!app)app=M.initializeApp(V.config(),'iti-v15');
   const auth=M.getAuth(app);await M.setPersistence(auth,M.browserSessionPersistence);
   await M.signInWithEmailAndPassword(auth,email,password);
   document.getElementById('stagingPassword').value='';
   localStorage.setItem('iti-v15-role-v2',role);localStorage.setItem('iti-v15-email-v2',email);
   await V.login({interactive:false});
  }catch(error){V.loginMsg('Staging sign-in failed. Check the supplied account credentials and selected role.',true);}
  finally{button.disabled=false;}
 };
};
const banner=document.createElement('div');banner.id='stagingNotice';banner.setAttribute('role','status');
banner.style.cssText='padding:10px 16px;background:#fff1c2;color:#593c00;text-align:center;font:14px/1.5 sans-serif;overflow-wrap:anywhere';
banner.textContent='STAGING • Synthetic test data only. '+(runtime.apiUrl?'':'Secure online exams and generative AI await backend hosting. Guided assistance remains available.');
document.body.prepend(banner);document.title+=' — STAGING';V.showRoleLogin();
})(window.V15Sync);
