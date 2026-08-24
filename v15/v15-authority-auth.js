/* V15 authority + authentication router.
 * Principal is the highest operational authority.
 * Users do not choose a role at login: Google identity + Firestore membership decides it.
 * The original V14 migration owner is only a temporary setup custodian until an official Principal activates.
 */
(function(V){
'use strict';
if(!V) return;

const AUTH_PENDING='iti-v15-auth-pending-v2';
const LAST_ROLE='iti-v15-last-role';
const LAST_TAB='iti-v15-last-tab';
const OLD_ROLE='iti-v15-pending-role';
const OLD_REDIRECT='iti-v15-auth-redirect-pending';

function mobileLike(){
  try{
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'') ||
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone===true;
  }catch(e){ return false; }
}
function removeOverlay(){ document.getElementById('v15ResumeOverlay')?.remove(); }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

V.hideRoleChoice=function(){
  const role=document.getElementById('loginRole');
  const field=role?.closest('.field');
  if(field) field.style.display='none';
  ['staffNameField','staffPinField','studentRollField','studentPinField'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
  const btn=document.querySelector('#loginScreen .login-card button.btn.primary.full') || document.querySelector('#loginScreen button');
  if(btn){
    btn.textContent='🔐 Continue with Google';
    btn.removeAttribute('onclick');
    btn.onclick=()=>V.login(null,{interactive:true});
  }
  let note=document.getElementById('v15RoleAssignedNote');
  if(!note && btn){
    note=document.createElement('div');
    note.id='v15RoleAssignedNote'; note.className='callout'; note.style.marginTop='12px';
    note.innerHTML='<b>Secure role authentication</b><br><small>You do not select Principal / Instructor / Student. Your approved Google account determines your role automatically.</small>';
    btn.insertAdjacentElement('afterend',note);
  }
  const n=document.querySelector('.login-note');
  if(n)n.textContent='V15 — Google account verified first; institute role is assigned securely from Firebase.';
};

V.googleAuthority=async function(interactive=false){
  const M=await this.modules(),cfg=this.config();
  let app=M.getApps().find(x=>x.name==='iti-v15');
  if(!app) app=M.initializeApp(cfg,'iti-v15');
  const auth=M.getAuth(app);
  await M.setPersistence(auth,M.browserLocalPersistence);
  const db=M.getFirestore(app);

  // Always accept a completed redirect result. This fixes the mobile redirect loop
  // even when sessionStorage was lost while Google was open.
  let rr=null;
  try{ rr=await M.getRedirectResult(auth); }
  catch(e){ localStorage.removeItem(AUTH_PENDING); throw e; }
  let user=rr?.user || auth.currentUser;
  this.fb={M,app,auth,db,user};
  if(rr?.user){
    localStorage.removeItem(AUTH_PENDING);
    sessionStorage.removeItem(OLD_REDIRECT);
    return rr.user;
  }

  // Silent refresh/session restore: reuse Google's persisted Firebase session.
  if(user && !interactive){ return user; }

  const provider=new M.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  if(mobileLike()){
    localStorage.setItem(AUTH_PENDING,'1');
    await M.signInWithRedirect(auth,provider);
    return await new Promise(()=>{});
  }
  try{
    user=(await M.signInWithPopup(auth,provider)).user;
    this.fb={M,app,auth,db,user};
    localStorage.removeItem(AUTH_PENDING);
    return user;
  }catch(e){
    if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e?.code)){
      localStorage.setItem(AUTH_PENDING,'1');
      await M.signInWithRedirect(auth,provider);
      return await new Promise(()=>{});
    }
    throw e;
  }
};

V.instituteInfo=async function(){
  const s=await this.fb.M.getDoc(this.inst());
  return s.exists()?s.data():null;
};
V.hasOfficialPrincipal=async function(){
  const d=await this.instituteInfo();
  return !!d?.principalUid;
};

V.activateAssignedRole=async function(){
  const M=this.fb.M,email=this.email(this.fb.user?.email||'');
  const aSnap=await M.getDoc(this.access(email));
  if(!aSnap.exists()) throw new Error('This Google account is not approved for this institute. Ask the Principal/Instructor to approve it first.');
  const a=aSnap.data();
  if(a.active===false) throw new Error('This account is disabled. Contact the Principal.');
  if(!['principal','instructor','student'].includes(a.role)) throw new Error('Invalid institute role assignment.');
  if(a.role==='principal' && await this.hasOfficialPrincipal()) throw new Error('An official Principal is already activated for this institute.');

  const c=String(prompt(`First login activation\n${email}\n\nEnter the 6-digit code given by the institute:`)||'').trim();
  if(!/^\d{6}$/.test(c)) throw new Error('Activation cancelled or the code is not 6 digits.');
  const proof=await this.hash(c);
  const m={
    uid:this.fb.user.uid,email,displayName:a.displayName||this.fb.user.displayName||email,
    role:a.role,active:true,owner:false,workspaceIds:a.workspaceIds||[],traineeId:a.traineeId||null,
    activationProof:proof,createdAt:this.now()
  };
  try{ await M.setDoc(this.memberRef(),m); }
  catch(e){ throw new Error('Activation failed. The Gmail or activation code does not match the approved account.'); }
  this.member=m;

  // The first successfully activated Principal becomes the official highest authority.
  if(a.role==='principal'){
    try{ await M.updateDoc(this.inst(),{principalUid:this.fb.user.uid,principalEmail:email,principalActivatedAt:this.now(),updatedAt:this.now()}); }
    catch(e){ console.warn('Principal authority marker pending',e); }
  }
  try{ await M.updateDoc(this.secret(email),{active:false,usedAt:this.now(),usedBy:this.fb.user.uid}); }
  catch(e){ console.warn('Activation-code cleanup pending',e); }
  return m;
};

V.resolveOperationalRole=async function(m){
  if(!m || m.active===false) return null;
  const info=await this.instituteInfo();
  if(m.role==='principal'){
    if(!info?.principalUid || info.principalUid===this.fb.user.uid) return 'principal';
    return null;
  }
  // Migration owner is only temporary Principal while the real Principal is not activated.
  if(m.owner && !info?.principalUid) return 'principal';
  return m.role;
};

V.restoreLastVisibleTab=function(){
  const tab=localStorage.getItem(LAST_TAB);
  if(!tab) return;
  const b=document.querySelector(`.tab[data-tab="${CSS.escape(tab)}"]`);
  if(b && b.style.display!=='none') setTimeout(()=>App.switchTab(tab),60);
};

V.login=async function(_ignoredRole=null,opts={}){
  if(this._authorityLoginRunning) return;
  this._authorityLoginRunning=true;
  const interactive=!!opts.interactive;
  this.loginMsg?.(interactive?'Verifying your Google account…':'Restoring secure Google session…');
  try{
    await this.googleAuthority(interactive);
    if(!this.fb.user) throw new Error('Google sign-in did not return an account.');

    let legacy=null;
    let m=await this.readMember();
    let inst=await this.instituteInfo();

    // First V15 migration only: existing V14 owner becomes a temporary setup custodian.
    if(!m && !inst){
      legacy=await this.legacy();
      if(!(legacy||this.localRecords())) throw new Error('No existing institute setup was found for this Google account.');
      await this.bootstrap('instructor',legacy);
      m=this.member; inst=await this.instituteInfo();
    }else if(!m){
      m=await this.activateAssignedRole();
      inst=await this.instituteInfo();
    }

    const role=await this.resolveOperationalRole(m);
    if(!role){
      await this.fb.M.signOut(this.fb.auth).catch(()=>{});
      throw new Error('This Google account does not have an active institute role.');
    }

    this.member=m;
    this.workspaceId=this.workspaceId||(m.workspaceIds||[])[0]||this.wid(legacy?.meta||DATA?.meta||{});
    let shared=(await this.fb.M.getDoc(this.ws())).exists();
    if(!shared){
      if(!legacy) legacy=await this.legacy();
      if(legacy){ await this.migrate(legacy,'V14'); shared=true; }
      else if(m.owner&&DATA){ await this.migrate(DATA,'local'); shared=true; }
      else throw new Error('Shared institute workspace is not ready yet.');
    }

    await this.load(role);
    SESSION={
      role,name:m.displayName||this.fb.user.displayName||this.fb.user.email,
      userId:this.fb.user.uid,username:this.email(this.fb.user.email),
      traineeId:m.traineeId||null,googleEmail:this.email(this.fb.user.email)
    };
    this.ready=true;
    this.shadow=this.clone(DATA);
    this.disableLegacy?.();
    this.unsubscribers?.forEach?.(f=>{try{f();}catch(e){}}); this.unsubscribers=[];
    this.realtime(role);
    App.enter();
    document.getElementById('changePinBtn')?.style && (document.getElementById('changePinBtn').style.display='none');
    this.refresh();
    this.cloudUI?.();
    this.hideRoleChoice();
    localStorage.setItem(LAST_ROLE,role);
    localStorage.removeItem(AUTH_PENDING);
    sessionStorage.removeItem(OLD_ROLE); sessionStorage.removeItem(OLD_REDIRECT);
    removeOverlay();

    const who=document.getElementById('whoName');
    if(who) who.textContent=`${SESSION.name} • ${role==='principal'?'Principal':role==='instructor'?'Instructor':'Student'}`;
    this.restoreLastVisibleTab();
    this.loginMsg?.('');
  }catch(e){
    console.error('V15 authority login',e);
    removeOverlay();
    this.loginMsg?.(e?.code==='auth/popup-closed-by-user'?'Google sign-in was cancelled.':(e.message||String(e)),true);
  }finally{
    this._authorityLoginRunning=false;
  }
};

// Visible authority model: Principal is highest; no separate Admin role is shown.
V.staff=function(){ return !!SESSION && ['principal','instructor'].includes(SESSION.role); };

const oldInvite=V.invite?.bind(V);
if(oldInvite){
  V.invite=async function(email,role,traineeId=null,name=''){
    const info=await this.instituteInfo();
    const temporarySetup=!!this.member?.owner && !info?.principalUid;
    if(role==='principal'){
      if(!temporarySetup) throw new Error('Principal is the highest authority. Only the one-time setup account can assign the official Principal.');
    }else if(role==='instructor'){
      if(SESSION?.role!=='principal') throw new Error('Only the Principal can create an Instructor account.');
    }else if(role==='student'){
      if(SESSION?.role!=='instructor') throw new Error('Only an Instructor can approve a Student account.');
    }
    return oldInvite(email,role,traineeId,name);
  };
}

// Replace confusing Owner/Admin staff panel with Principal-first wording.
V.renderAuthorityStaffPanel=async function(){
  const panel=document.getElementById('tab-users'),tab=document.querySelector('.tab[data-tab="users"]');
  if(!panel||!tab||SESSION?.role!=='principal'){
    if(tab)tab.style.display='none';
    return;
  }
  tab.style.display=''; tab.textContent='👥 Staff & Access'; panel.style.display='';
  const info=await this.instituteInfo();
  const temporary=!!this.member?.owner && !info?.principalUid;
  let dir={members:[],pending:[]};
  try{ dir=await this.staffDirectory(); }catch(e){}
  const rows=(dir.members||[]).filter(x=>!x.owner).map(x=>`<tr><td><b>${esc(x.displayName||x.email)}</b><br><small>${esc(x.email||'')}</small></td><td>${esc(x.role||'')}</td><td>${x.active===false?'Disabled':'Active'}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">No activated staff yet.</td></tr>';
  const role=temporary?'principal':'instructor';
  panel.innerHTML=`<div class="hero"><div class="hero-content"><div><h2>👥 Staff & Access</h2><p>Principal is the highest institute authority. Google/Firebase verifies every staff account.</p></div></div></div>
    <div class="callout cloud-ok" style="margin:14px 0"><b>${temporary?'One-time Principal setup':'Principal account'}</b><br>${temporary?'Assign the official Principal Gmail. After that account activates, this setup account returns to its normal operational role.':'Create and manage Instructor Google accounts. Students are approved only by their Instructor.'}</div>
    <div class="card"><h3>${temporary?'Assign Official Principal':'Create Instructor Account'}</h3>
      <div class="field"><label>Name</label><input id="v15StaffName" placeholder="Full name"></div>
      <div class="field"><label>Approved Google / Gmail</label><input id="v15StaffEmail" type="email" placeholder="${temporary?'principal':'instructor'}@gmail.com"></div>
      <input id="v15StaffRole" type="hidden" value="${role}">
      <button class="btn primary" id="v15CreateStaffBtn">Create first-login activation code</button>
      <div id="v15ActivationResult" class="callout" style="display:none;margin-top:12px"></div>
    </div>
    <div class="card"><h3>Activated Staff</h3><div class="table-wrap"><table><thead><tr><th>Staff</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  panel.querySelector('#v15CreateStaffBtn')?.addEventListener('click',()=>V.createStaffFromPanel());
};

const oldApply=V.applyRoleWorkspace?.bind(V);
if(oldApply){
  V.applyRoleWorkspace=async function(){
    await oldApply();
    this.hideRoleChoice();
    if(SESSION?.role==='principal') await this.renderAuthorityStaffPanel();
    else{
      const t=document.querySelector('.tab[data-tab="users"]'); if(t)t.style.display='none';
    }
    const who=document.getElementById('whoName');
    if(who&&SESSION) who.textContent=`${SESSION.name} • ${SESSION.role==='principal'?'Principal':SESSION.role==='instructor'?'Instructor':'Student'}`;
  };
}

App.login=()=>V.login(null,{interactive:true});
V.hideRoleChoice();

// Robust redirect return: use localStorage rather than sessionStorage so Android/PWA
// cannot lose the continuation flag and start an endless Google redirect loop.
setTimeout(()=>{
  if(localStorage.getItem(AUTH_PENDING)==='1' && !V.ready){
    V.loginMsg?.('Google verified. Finishing secure login…');
    V.login(null,{interactive:false});
  }
},120);

console.info('V15 principal authority authentication router active.');
})(window.V15Sync);
