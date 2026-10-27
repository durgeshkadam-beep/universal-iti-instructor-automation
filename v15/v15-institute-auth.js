/* EduSkill 360 — opt-in institute ID / email + password.
 * Firebase Auth is the ONLY password verifier. No browser-side user database,
 * password hashing, default credentials or client account creation.
 * Existing Google users retain UID only via explicit Firebase account linking.
 */
(function(V){
'use strict';
if(!V)return;
const runtime=window.ITI_RUNTIME||{};
const enabled=runtime.institutePasswordEnabled===true&&runtime.staging!==true;
const PREFIX='iti-v15-';
const message='Sign-in was not completed. Check your approved credentials and selected role.';
let inProgress=false;
function domain(){
  const s=String(runtime.instituteLoginDomain||'').trim().toLowerCase();
  return /^[a-z0-9](?:[a-z0-9.-]{1,180})\.[a-z]{2,24}$/.test(s)&&
    !s.includes('..')&&!s.endsWith('.invalid')&&!s.endsWith('.test')?s:'';
}
V.instituteIdentifierToEmail=function(identifier){
  const id=String(identifier||'').trim().toLowerCase();
  if(id.includes('@'))return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)?id:null;
  if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(id)||!domain())return null;
  return id+'@'+domain();
};
// Reset only an explicit, deliverable email address. Never infer that an Institute ID
// alias owns a real inbox and never reveal whether the email is registered.
V.requestInstitutePasswordReset=async function(address){
  if(!enabled)throw Error('Password recovery is not enabled for this deployment.');
  const email=String(address||'').trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
     ||/\.(?:test|invalid|example)$/.test(email.split('@')[1]||''))
    throw Error('Enter the full email address of an inbox you control. For Institute-ID-only accounts, contact your institute administrator.');
  const generic='If this email has a password-enabled account and can receive mail, reset instructions will arrive. Otherwise, contact your institute administrator.';
  try{
    const M=await this.modules(),cfg=this.config();
    let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app)app=M.initializeApp(cfg,'iti-v15');
    await M.sendPasswordResetEmail(M.getAuth(app),email);
    return generic;
  }catch(e){
    if(['auth/network-request-failed','auth/too-many-requests','auth/quota-exceeded'].includes(e?.code))
      throw Error('Password recovery is temporarily unavailable. Retry later or contact your institute administrator.');
    // Do not leak account existence or Firebase Auth email enumeration hints.
    return generic;
  }
};
V.institutePasswordLogin=async function(identifier,password,role){
  if(!enabled)throw Error('Institute Password Login is not enabled for this deployment.');
  if(inProgress)return false;
  const email=this.instituteIdentifierToEmail(identifier);
  if(!email||typeof password!=='string'||!password||!['admin','principal','instructor','staff','student'].includes(role))
    throw Error('Enter your Institute ID or approved email, password, and role.');
  inProgress=true;
  try{
    const M=await this.modules(),config=this.config();
    let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app)app=M.initializeApp(config,'iti-v15');
    const auth=M.getAuth(app);
    await M.setPersistence(auth,M.browserSessionPersistence);
    const sign=await M.signInWithEmailAndPassword(auth,email,password);
    if(!sign?.user?.uid||String(sign.user.email||'').toLowerCase()!==email)throw Error(message);
    localStorage.setItem('iti-v15-password-session','1');
    localStorage.setItem(PREFIX+'role-v2',role);
    localStorage.setItem(PREFIX+'email-v2',email);
    const roleInput=document.getElementById('loginRole');if(roleInput)roleInput.value=role;
    const approved=document.getElementById('v15ExpectedEmail');if(approved)approved.value=email;
    await this.login({interactive:false}); // Existing member & Firestore role checks remain authoritative.
    if(!this.ready||this.fb?.user?.uid!==sign.user.uid){
      await M.signOut(auth).catch(()=>{});
      this.fb.user=null;
      throw Error('Account not authorized for the selected role. Contact the institute.');
    }
    return true;
  }catch(e){
    const auth=this.fb?.auth;
    if(auth&&!this.ready)await this.fb.M?.signOut(auth).catch(()=>{});
    if(!this.ready)try{localStorage.removeItem('iti-v15-password-session');}catch(err){}
    if(e?.message==='Account not authorized for the selected role. Contact the institute.')throw e;
    throw Error(message);
  }finally{inProgress=false;}
};
const show=V.showRoleLogin;
V.showRoleLogin=function(){
  show?.call(this);
  if(!enabled)return;
  const card=document.querySelector('#loginScreen .login-card');
  if(!card||card.querySelector('#v15InstitutePasswordForm'))return;
  const form=document.createElement('form');form.id='v15InstitutePasswordForm';
  form.setAttribute('aria-label','Institute ID and password sign in');
  const heading=document.createElement('h3');heading.textContent='Or sign in with Institute ID / Password';
  form.append(heading);
  const label=document.createElement('label');label.htmlFor='v15InstituteID';label.textContent='Institute ID or approved Email';form.append(label);
  const id=document.createElement('input');id.id='v15InstituteID';id.autocomplete='username';
  id.required=true;id.maxLength=200;id.placeholder=domain()?'e.g. student001':'Enter your approved email';
  form.append(id);
  const passLabel=document.createElement('label');passLabel.htmlFor='v15InstitutePassword';
  passLabel.textContent='Password';form.append(passLabel);
  const password=document.createElement('input');password.id='v15InstitutePassword';
  password.type='password';password.autocomplete='current-password';password.required=true;form.append(password);
  const submit=document.createElement('button');submit.type='submit';submit.className='btn primary full';
  submit.textContent='Sign in securely';form.append(submit);
  const feedback=document.createElement('p');feedback.id='v15InstituteAuthStatus';feedback.setAttribute('role','status');
  feedback.className='muted';form.append(feedback);
  const recover=document.createElement('button');recover.type='button';
  recover.id='v15InstitutePasswordRecovery';recover.className='btn';
  recover.textContent='Forgot password?';
  form.append(recover);
  recover.addEventListener('click',async()=>{
    const address=id.value.trim(),value=email=>String(email||'').toLowerCase();
    if(!address.includes('@')){
      feedback.textContent='For an Institute ID without a working personal email inbox, ask the institute administrator to reset your account. Do not enter an unknown email.';
      return;
    }
    recover.disabled=true;
    try{feedback.textContent=await V.requestInstitutePasswordReset(value(address));}
    catch(e){feedback.textContent=e.message;}
    finally{recover.disabled=false;}
  });
  const note=document.createElement('small');
  note.textContent='Accounts must be issued by your institute. A PIN cannot replace password sign-in. The selected role is verified on the server.';
  form.append(note);
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(submit.disabled)return;
    submit.disabled=true;feedback.textContent='Verifying approved credentials…';
    const role=document.getElementById('loginRole')?.value||'';
    try{await V.institutePasswordLogin(id.value,password.value,role);password.value='';feedback.textContent='';}
    catch(err){password.value='';feedback.textContent=err.message||message;}
    finally{submit.disabled=false;}
  });
  card.append(form);
};
const portal=V.applyRolePortal;
if(portal){
  V.applyRolePortal=async function(...args){
    const result=await portal.apply(this,args);
    if(result&&enabled)this.ensurePasswordLinkButton?.();
    return result;
  };
}
V.ensurePasswordLinkButton=function(){
  if(!enabled||!this.ready||!this.fb?.user?.uid)return;
  const header=document.querySelector('#appShell .topbar .who');
  if(!header||header.querySelector('#v15LinkPassword'))return;
  const user=this.fb.user;
  if(!Array.isArray(user.providerData)||!user.providerData.some(p=>p.providerId==='google.com'))return;
  if(user.providerData.some(p=>p.providerId==='password'))return;
  const button=document.createElement('button');button.id='v15LinkPassword';
  button.className='btn';button.type='button';button.textContent='Add Password Login';
  const panel=document.createElement('form');panel.id='v15LinkPasswordForm';
  panel.hidden=true;panel.style.cssText='display:none;padding:10px;max-width:340px';
  const desc=document.createElement('p');
  desc.textContent='Link a password to this Google Firebase user. You must keep the same approved email and UID.';
  panel.append(desc);
  const first=document.createElement('input');first.type='password';first.autocomplete='new-password';
  first.placeholder='New password (12+ characters)';first.minLength=12;first.required=true;panel.append(first);
  const second=document.createElement('input');second.type='password';second.autocomplete='new-password';
  second.placeholder='Confirm password';second.required=true;panel.append(second);
  const save=document.createElement('button');save.type='submit';save.className='btn';save.textContent='Link password securely';panel.append(save);
  const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
  button.addEventListener('click',()=>{panel.hidden=!panel.hidden;panel.style.display=panel.hidden?'none':'block';});
  panel.addEventListener('submit',async e=>{
    e.preventDefault();
    const pwd=first.value,confirm=second.value;
    if(pwd.length<12||pwd!==confirm||pwd.length>128){status.textContent='Use a matching password of 12–128 characters.';return;}
    if(!V.ready||V.fb?.user?.uid!==user.uid){status.textContent='Reauthenticate with Google first.';return;}
    save.disabled=true;
    try{
      const M=V.fb.M;
      const credential=M.EmailAuthProvider.credential(user.email,pwd);
      const out=await M.linkWithCredential(user,credential);
      if(out.user.uid!==user.uid)throw Error('UID changed unexpectedly');
      status.textContent='Password linked to this same account. Use your approved email to sign in.';
      button.disabled=true;
    }catch(err){status.textContent='Could not link password. Sign in again with Google and contact your administrator if this email belongs to another account.';}
    finally{first.value='';second.value='';save.disabled=false;}
  });
  header.append(button,panel);
};
if(enabled)V.showRoleLogin();
})(window.V15Sync);
