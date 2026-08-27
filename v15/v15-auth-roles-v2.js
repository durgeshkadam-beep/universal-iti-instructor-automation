/* V15 Production Auth + Roles
 * Consolidates mobile auth, authority, explicit role login and refresh continuity.
 */
(function(V){
'use strict';
if(!V) return;
const K={role:'iti-v15-role-v2',email:'iti-v15-email-v2',tab:'iti-v15-tab-v2',redirect:'iti-v15-redirect-v2'};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const OWNER_ROLES=new Set(['admin','principal','instructor']);
let authPromise=null,loginRunning=false;
function mobileLike(){try{return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;}catch(e){return false;}}
function email(v){return V.email(v||'');}
function selectedRole(){return localStorage.getItem(K.role)||document.getElementById('loginRole')?.value||'';}
function expectedEmail(){return email(localStorage.getItem(K.email)||document.getElementById('v15ExpectedEmail')?.value||'');}
function setMsg(t,err=false){V.loginMsg?.(t,err);}
function clearRedirect(){try{localStorage.removeItem(K.redirect);}catch(e){}}
async function authReady(M,auth){if(typeof auth.authStateReady==='function'){try{await auth.authStateReady();return;}catch(e){}}await new Promise(resolve=>{let done=false,un=null;try{un=M.onAuthStateChanged(auth,()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();});}catch(e){resolve();return;}setTimeout(()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();},1800);});}
V.instituteInfo=async function(){const z=await this.fb.M.getDoc(this.inst());return z.exists()?z.data():null;};

V.showRoleLogin=function(){
  const r=document.getElementById('loginRole'),rf=r?.closest('.field');if(r){const keep=selectedRole()||'instructor';r.innerHTML='<option value="admin">System Admin</option><option value="principal">Principal</option><option value="instructor">Instructor</option><option value="staff">Staff</option><option value="student">Student / Trainee</option>';r.value=LABEL[keep]?keep:'instructor';}if(rf){rf.style.display='';const l=rf.querySelector('label');if(l)l.textContent='Login as';}
  ['staffNameField','staffPinField','studentRollField','studentPinField'].forEach(id=>{const x=document.getElementById(id);if(x)x.style.display='none';});const cp=document.getElementById('changePinBtn');if(cp)cp.style.display='none';
  const card=document.querySelector('#loginScreen .login-card'),btn=card?.querySelector('button.btn.primary.full')||card?.querySelector('button');if(card&&btn&&!document.getElementById('v15ExpectedEmail')){const f=document.createElement('div');f.className='field';f.id='v15ExpectedEmailField';f.innerHTML='<label>Approved Google / Gmail</label><input id="v15ExpectedEmail" type="email" autocomplete="email" placeholder="name@gmail.com"><small class="muted">Google must verify this exact email.</small>';btn.parentNode.insertBefore(f,btn);}const e=document.getElementById('v15ExpectedEmail');if(e&&!e.value)e.value=localStorage.getItem(K.email)||'';
  if(btn){btn.textContent='🔐 Verify Role & Continue with Google';btn.removeAttribute('onclick');btn.onclick=()=>V.startRoleLogin();}let note=document.getElementById('v15AuthHelp');if(!note&&btn){note=document.createElement('div');note.id='v15AuthHelp';note.className='callout';note.style.marginTop='12px';note.innerHTML='<b>Secure role login</b><br><small>Select the role and enter the approved Gmail. Google verifies identity; Firebase verifies the assigned role.</small>';btn.insertAdjacentElement('afterend',note);}const n=document.querySelector('.login-note');if(n)n.textContent='V15 Production — Google identity + Firebase role authorization.';
};

V.googleAuthority=async function(interactive=false){
  if(authPromise)return authPromise;authPromise=(async()=>{const M=await this.modules(),cfg=this.config();let app=M.getApps().find(x=>x.name==='iti-v15');if(!app)app=M.initializeApp(cfg,'iti-v15');const auth=M.getAuth(app);await M.setPersistence(auth,M.browserLocalPersistence);const db=M.getFirestore(app);let rr=null;try{rr=await M.getRedirectResult(auth);}catch(e){clearRedirect();throw e;}await authReady(M,auth);let user=rr?.user||auth.currentUser||null;this.fb={M,app,auth,db,user};if(user){clearRedirect();const want=expectedEmail(),got=email(user.email);if(want&&want!==got){try{await M.signOut(auth);}catch(e){}this.fb.user=null;throw new Error(`Google account mismatch. Entered ${want}, verified ${got||'another account'}.`);}return user;}if(!interactive)throw new Error('No saved Google session. Press “Verify Role & Continue with Google”.');const p=new M.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});if(mobileLike()){localStorage.setItem(K.redirect,'1');await M.signInWithRedirect(auth,p);return await new Promise(()=>{});}try{user=(await M.signInWithPopup(auth,p)).user;this.fb={M,app,auth,db,user};return user;}catch(e){if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e?.code)){localStorage.setItem(K.redirect,'1');await M.signInWithRedirect(auth,p);return await new Promise(()=>{});}throw e;}})();try{return await authPromise;}finally{authPromise=null;}
};

V.bootstrap=async function(role,legacy){const M=this.fb.M,u=this.fb.user;if((await M.getDoc(this.inst())).exists())return false;if(!legacy?.meta)throw new Error('Safe V15 setup requires the existing V14 cloud workspace.');let legacyWorkspaceId='';try{legacyWorkspaceId=window.CloudCenter?.workspaceId?.()||'';}catch(e){}if(!legacyWorkspaceId)legacyWorkspaceId=this.wid(legacy.meta);const meta=legacy.meta||{},w=this.wid(meta);await M.setDoc(this.inst(),{name:meta.institute||this.INSTITUTE_NAME,code:meta.instituteCode||'MUMBAI-01',schemaVersion:15,ownerUid:u.uid,legacyWorkspaceId,createdAt:this.now(),updatedAt:this.now()});await M.setDoc(this.memberRef(),{uid:u.uid,email:email(u.email),displayName:u.displayName||meta.instructor||'Creator',role:'instructor',active:true,owner:true,workspaceIds:[w],createdAt:this.now()});this.member=(await M.getDoc(this.memberRef())).data();this.workspaceId=w;return true;};
V.activateApprovedAccount=async function(want){const M=this.fb.M,e=email(this.fb.user?.email||''),aSnap=await M.getDoc(this.access(e));if(!aSnap.exists())throw new Error('This Google account is not approved for this institute.');const a=aSnap.data();if(a.active===false)throw new Error('This account is disabled. Contact the Principal/System Admin.');if(a.role!==want)throw new Error(`This Gmail is approved as ${LABEL[a.role]||a.role}, not ${LABEL[want]||want}.`);if(a.role==='principal'){const info=await this.instituteInfo();if(info?.principalUid&&info.principalUid!==this.fb.user.uid)throw new Error('Another official Principal is already active.');}const c=String(prompt(`First login activation\n${e}\n\nEnter the 6-digit code given by the institute:`)||'').trim();if(!/^\d{6}$/.test(c))throw new Error('Activation cancelled or code is not 6 digits.');const proof=await this.hash(c),m={uid:this.fb.user.uid,email:e,displayName:a.displayName||this.fb.user.displayName||e,role:a.role,active:true,owner:false,workspaceIds:a.workspaceIds||[],traineeId:a.traineeId||null,activationProof:proof,createdAt:this.now()};try{await M.setDoc(this.memberRef(),m);}catch(x){throw new Error('Activation failed. Gmail or activation code does not match the approved account.');}this.member=m;if(a.role==='principal')await M.setDoc(this.inst(),{principalUid:this.fb.user.uid,principalEmail:e,principalActivatedAt:this.now(),updatedAt:this.now()},{merge:true});try{await M.setDoc(this.secret(e),{active:false,usedAt:this.now(),usedBy:this.fb.user.uid},{merge:true});}catch(x){}return m;};
V.resolveRequestedRole=async function(m,want){if(!m||m.active===false)return null;if(m.owner)return OWNER_ROLES.has(want)?want:null;if(want==='admin')return null;return m.role===want?want:null;};
V.chooseWorkspace=async function(m,want){const ids=Array.isArray(m?.workspaceIds)?m.workspaceIds.filter(Boolean):[],pref=localStorage.getItem('iti-v15-workspace-pref-'+this.fb.user.uid)||'';if(pref&&ids.includes(pref))return pref;if(ids.length)return ids[0];if(want==='principal'||want==='admin'){try{const z=await this.fb.M.getDocs(this.fb.M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces'));let first='';z.forEach(d=>{if(!first&&d.data()?.status!=='archived')first=d.id;});return first;}catch(e){}}return '';};
V.startRoleLogin=async function(){const r=document.getElementById('loginRole')?.value||'',e=email(document.getElementById('v15ExpectedEmail')?.value||'');if(!LABEL[r])return setMsg('Select a login role.',true);if(!this.validEmail(e))return setMsg('Enter the approved Google/Gmail address.',true);localStorage.setItem(K.role,r);localStorage.setItem(K.email,e);setMsg('Opening Google verification…');return this.login({interactive:true});};

V.login=async function(opts={}){
  if(loginRunning)return;loginRunning=true;
  const interactive=!!opts.interactive,want=selectedRole()||'instructor',started=performance.now();
  setMsg(interactive?'Verifying Google account…':'Restoring secure session…');
  try{
    await this.googleAuthority(interactive);
    if(!this.fb.user)throw new Error('Google sign-in did not return an account.');
    setMsg('Loading institute access…');
    let legacy=null;
    const [memberResult,inst]=await Promise.all([this.readMember(),this.instituteInfo()]);
    let m=memberResult;
    if(!m&&!inst){
      legacy=await this.legacy();
      if(!(legacy||this.localRecords()))throw new Error('No existing institute setup was found for this Google account.');
      await this.bootstrap(want,legacy);m=this.member;
    }else if(!m){
      if(want==='admin')throw new Error('System Admin is restricted to the original creator account.');
      m=await this.activateApprovedAccount(want);
    }
    const resolved=await this.resolveRequestedRole(m,want);
    if(!resolved)throw new Error(m?.owner?'Creator account may enter only System Admin, Principal or Instructor.':`This Gmail is registered as ${LABEL[m?.role]||m?.role||'another role'}, not ${LABEL[want]||want}.`);
    this.member=m;
    this.workspaceId=await this.chooseWorkspace(m,resolved);
    if(!this.workspaceId&&resolved!=='admin')throw new Error('No Trade / Session / Batch workspace is assigned to this account.');
    if(this.workspaceId){
      setMsg('Loading Trade workspace…');
      const wsSnap=await this.fb.M.getDoc(this.ws());
      let shared=wsSnap.exists();
      if(shared)this._loginWorkspaceSeed={id:this.workspaceId,data:wsSnap.data()};
      if(!shared){
        if(!legacy)legacy=await this.legacy();
        if(legacy){await this.migrate(legacy,'V14');shared=true;}
        else if(m.owner&&window.DATA){await this.migrate(DATA,'local');shared=true;}
        else throw new Error('Shared workspace is not ready.');
      }
      await this.load(resolved==='admin'?'instructor':resolved);
    }
    SESSION={role:resolved,name:m.displayName||this.fb.user.displayName||this.fb.user.email,userId:this.fb.user.uid,username:email(this.fb.user.email),traineeId:m.traineeId||null,googleEmail:email(this.fb.user.email)};
    this.ready=true;this.shadow=this.clone(DATA||{});this.disableLegacy?.();
    this.unsubscribers?.forEach?.(f=>{try{f();}catch(e){}});this.unsubscribers=[];
    if(this.workspaceId)this.realtime(resolved==='admin'?'instructor':resolved);
    App.enter();
    const cp=document.getElementById('changePinBtn');if(cp)cp.style.display='none';
    this.refresh?.();this.cloudUI?.();
    await this.applyRolePortal?.();
    localStorage.setItem(K.role,resolved);localStorage.setItem(K.email,email(this.fb.user.email));clearRedirect();setMsg('');
    const elapsed=Math.round(performance.now()-started);try{sessionStorage.setItem('iti-v15-last-login-ms',String(elapsed));}catch(e){}
    const last=localStorage.getItem(K.tab);
    if(last)setTimeout(()=>{const b=document.querySelector(`.tab[data-tab="${CSS.escape(last)}"]`);if(b&&b.offsetParent!==null)App.switchTab(last);},80);
  }catch(e){
    console.error('V15 login',e);setMsg(e?.code==='auth/popup-closed-by-user'?'Google sign-in was cancelled.':(e.message||String(e)),true);this.showRoleLogin();
  }finally{loginRunning=false;}
};
V.logout=async function(){this.unsubscribers?.forEach?.(f=>{try{f();}catch(e){}});this.unsubscribers=[];try{if(this.fb.auth)await this.fb.M.signOut(this.fb.auth);}catch(e){}SESSION=null;this.ready=false;this.member=null;this.workspaceId=null;localStorage.removeItem(K.role);localStorage.removeItem(K.tab);clearRedirect();location.reload();};
document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-tab]');if(b?.dataset?.tab)localStorage.setItem(K.tab,b.dataset.tab);},{capture:true});

async function autoResume(){if(V.ready)return;const r=localStorage.getItem(K.role),e=localStorage.getItem(K.email);if(!r||!e)return;try{if(localStorage.getItem(K.redirect)==='1'){setMsg('Google verified. Finishing secure login…');await V.login({interactive:false});return;}const M=await V.modules(),cfg=V.config();let app=M.getApps().find(x=>x.name==='iti-v15');if(!app)app=M.initializeApp(cfg,'iti-v15');const auth=M.getAuth(app);await M.setPersistence(auth,M.browserLocalPersistence);await authReady(M,auth);if(!auth.currentUser)return;await V.login({interactive:false});}catch(x){console.warn('V15 session restore',x);clearRedirect();}}
App.login=()=>V.startRoleLogin();App.logout=()=>V.logout();V.showRoleLogin();setTimeout(autoResume,100);
console.info('V15 consolidated authentication + roles active.');
})(window.V15Sync);
