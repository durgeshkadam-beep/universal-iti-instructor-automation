/* V15 explicit role login + creator multi-role + Admin navigation + safe V14 DTP recovery.
 * Login contract:
 *   1) user chooses Admin / Principal / Instructor / Staff / Student
 *   2) user enters the approved Google email
 *   3) Google authenticates that exact email
 *   4) Firestore membership/access must permit that selected role
 * Creator/migration owner may explicitly enter Admin, Principal, or Instructor view.
 */
(function(V){
'use strict';
if(!V) return;

const REQUESTED_ROLE='iti-v15-requested-role-v3';
const EXPECTED_EMAIL='iti-v15-expected-email-v3';
const ROLE_LOGIN_READY='iti-v15-role-login-ready-v3';
const LAST_ROLE='iti-v15-last-role';
const ROLE_LABELS={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const OWNER_ROLES=new Set(['admin','principal','instructor']);
const DTP_ARRAYS=['practicals','theory','modules','holidays'];
const DTP_META=['institute','instituteCode','trade','batch','session','instructor','designation','authority','attendanceThreshold','scheduleStartDate','scheduleMode','hoursPerWorkingDay','theoryDaysPerTopic','realCalendarApplied'];

// Force the new explicit role chooser once after upgrade instead of silently reopening an old V15 role.
try{
  if(!localStorage.getItem(ROLE_LOGIN_READY)){
    localStorage.removeItem(LAST_ROLE);
    localStorage.removeItem(REQUESTED_ROLE);
    localStorage.setItem(ROLE_LOGIN_READY,'1');
  }
}catch(e){}

function roleLabel(r){return ROLE_LABELS[r]||String(r||'');}
function requestedRole(){
  return localStorage.getItem(REQUESTED_ROLE)||document.getElementById('loginRole')?.value||'';
}
function expectedEmail(){
  return V.email(localStorage.getItem(EXPECTED_EMAIL)||document.getElementById('v15ExpectedEmail')?.value||'');
}
function owner(){return !!V.member?.owner;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false;}}
function deepFill(current,legacy){
  if(current===undefined||current===null||current==='') return clone(legacy);
  if(Array.isArray(current)) return current.length?clone(current):clone(legacy);
  if(current&&legacy&&typeof current==='object'&&typeof legacy==='object'&&!Array.isArray(legacy)){
    const out=clone(current)||{};
    for(const k of Object.keys(legacy)) out[k]=deepFill(out[k],legacy[k]);
    return out;
  }
  return current;
}
async function chunks(tasks,size=24){
  for(let i=0;i<tasks.length;i+=size) await Promise.all(tasks.slice(i,i+size).map(fn=>fn()));
}

V.showRoleLogin=function(){
  const sel=document.getElementById('loginRole');
  const roleField=sel?.closest('.field');
  if(sel){
    const keep=requestedRole()||'instructor';
    sel.innerHTML='<option value="admin">System Admin</option><option value="principal">Principal</option><option value="instructor">Instructor</option><option value="staff">Staff</option><option value="student">Student / Trainee</option>';
    sel.value=ROLE_LABELS[keep]?keep:'instructor';
  }
  if(roleField){
    roleField.style.display='';
    const lab=roleField.querySelector('label'); if(lab) lab.textContent='Login as';
  }
  ['staffNameField','staffPinField','studentRollField','studentPinField'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});

  const card=document.querySelector('#loginScreen .login-card');
  const btn=card?.querySelector('button.btn.primary.full')||card?.querySelector('button');
  if(card&&btn&&!document.getElementById('v15ExpectedEmail')){
    const f=document.createElement('div');f.className='field';f.id='v15ExpectedEmailField';
    f.innerHTML='<label>Approved Google / Gmail</label><input id="v15ExpectedEmail" type="email" autocomplete="email" placeholder="name@gmail.com"><small class="muted">The Google account selected next must exactly match this approved email.</small>';
    btn.parentNode.insertBefore(f,btn);
  }
  const email=document.getElementById('v15ExpectedEmail');
  if(email&&!email.value){const saved=localStorage.getItem(EXPECTED_EMAIL)||'';if(saved)email.value=saved;}
  if(btn){
    btn.textContent='🔐 Verify Role & Continue with Google';
    btn.removeAttribute('onclick');
    btn.onclick=()=>V.startRoleLogin();
  }
  const old=document.getElementById('v15RoleAssignedNote');if(old)old.remove();
  let note=document.getElementById('v15RoleLoginNote');
  if(!note&&btn){
    note=document.createElement('div');note.id='v15RoleLoginNote';note.className='callout';note.style.marginTop='12px';
    note.innerHTML='<b>Role-secured login</b><br><small>Select the role first. Google verifies the email, then Firebase verifies that this email is approved for the selected role. Selecting a role alone never grants access.</small>';
    btn.insertAdjacentElement('afterend',note);
  }
  const n=document.querySelector('.login-note');if(n)n.textContent='V15 — Role + Google email + Firebase authorization.';
};

// Older authority layer calls hideRoleChoice(); in the final model it must show the secure role chooser instead.
V.hideRoleChoice=V.showRoleLogin;

V.startRoleLogin=async function(){
  const role=document.getElementById('loginRole')?.value||'';
  const email=V.email(document.getElementById('v15ExpectedEmail')?.value||'');
  if(!ROLE_LABELS[role]){V.loginMsg?.('Select a login role.',true);return;}
  if(!V.validEmail(email)){V.loginMsg?.('Enter the approved Google/Gmail address.',true);return;}
  localStorage.setItem(REQUESTED_ROLE,role);
  localStorage.setItem(EXPECTED_EMAIL,email);
  localStorage.setItem(LAST_ROLE,role);
  V.loginMsg?.('Opening Google verification…');
  return V.login(null,{interactive:true});
};

// The typed email is not authentication by itself. It MUST match the Firebase-authenticated Google account.
const googleBase=V.googleAuthority?.bind(V);
if(googleBase){
  V.googleAuthority=async function(interactive=false){
    const u=await googleBase(interactive);
    const want=expectedEmail();
    const got=this.email(u?.email||'');
    if(want&&got!==want){
      try{await this.fb.M.signOut(this.fb.auth);}catch(e){}
      throw new Error(`Google account mismatch. You entered ${want}, but Google verified ${got||'another account'}.`);
    }
    return u;
  };
}

// Before first activation, reject a wrong role immediately instead of creating a member then failing later.
const activateBase=V.activateAssignedRole?.bind(V);
if(activateBase){
  V.activateAssignedRole=async function(){
    const role=requestedRole();
    if(role==='admin') throw new Error('System Admin is restricted to the original creator/migration-owner account.');
    const email=this.email(this.fb.user?.email||'');
    const a=await this.fb.M.getDoc(this.access(email));
    if(!a.exists()) throw new Error('This Google account is not approved for this institute.');
    const approved=a.data()?.role||'';
    if(role&&approved!==role) throw new Error(`This Gmail is approved as ${roleLabel(approved)}, not ${roleLabel(role)}.`);
    return activateBase();
  };
}

// Role selection is authorization intent, never authorization itself.
// Regular accounts must exactly match their Firestore role. The creator owner has the three approved creator views.
const resolveBase=V.resolveOperationalRole?.bind(V);
if(resolveBase){
  V.resolveOperationalRole=async function(m){
    const want=requestedRole();
    this._roleLoginDenied='';
    if(m?.owner){
      if(OWNER_ROLES.has(want)) return want;
      this._roleLoginDenied='Creator/System Admin account may log in only as System Admin, Principal, or Instructor.';
      return null;
    }
    if(want==='admin'){
      this._roleLoginDenied='This Gmail is not the authorized System Admin account.';
      return null;
    }
    const assigned=await resolveBase(m);
    if(!assigned) return null;
    if(want&&assigned!==want){
      this._roleLoginDenied=`This Gmail is registered as ${roleLabel(assigned)}, not ${roleLabel(want)}.`;
      return null;
    }
    return assigned;
  };
}

// Fix the dynamic Admin Panel button: older code created it after startup, so it never received the normal tab click binding.
const ensureAdminBase=V.ensureAdminPanel?.bind(V);
if(ensureAdminBase){
  V.ensureAdminPanel=function(){
    ensureAdminBase();
    const b=document.querySelector('.tab[data-tab="admin-console"]');
    if(b){
      b.dataset.roles='admin';
      b.style.display='';
      b.onclick=()=>{
        App.switchTab('admin-console');
        V.renderAdminPanel?.(false).catch(console.error);
      };
    }
    return b;
  };
}

function setHeader(){
  if(!SESSION)return;
  const who=document.getElementById('whoName');if(!who)return;
  if(owner()&&SESSION.role==='admin') who.textContent=`${SESSION.name} • System Admin`;
  else if(owner()) who.textContent=`${SESSION.name} • ${roleLabel(SESSION.role)} • Creator`;
  else who.textContent=`${SESSION.name} • ${roleLabel(SESSION.role)}`;
}

// Admin Panel appears ONLY in the Admin login view. It no longer appears inside Instructor or Principal workspaces.
V.applySelectedRoleUI=async function(){
  if(!SESSION)return;
  const adminView=owner()&&SESSION.role==='admin';
  if(adminView){
    this.ensureAdminPanel?.();
    document.querySelectorAll('.tab').forEach(b=>{b.style.display=b.dataset.tab==='admin-console'?'':'none';});
    const b=document.querySelector('.tab[data-tab="admin-console"]');if(b)b.style.display='';
    await this.renderAdminPanel?.(false).catch(console.error);
    try{App.buildMobileNav?.();}catch(e){}
    setTimeout(()=>App.switchTab('admin-console'),0);
  }else{
    document.querySelector('.tab[data-tab="admin-console"]')?.remove();
    document.getElementById('tab-admin-console')?.remove();
    // App.enter/applyRoleWorkspace already assigned the normal role tabs. Re-apply exact role visibility after removing Admin.
    document.querySelectorAll('.tab').forEach(b=>{
      const roles=String(b.dataset.roles||'').split(',').map(x=>x.trim());
      b.style.display=roles.includes(SESSION.role)?'':'none';
    });
    try{App.buildMobileNav?.();}catch(e){}
  }
  setHeader();
};

// Replace the older "owner always gets Admin Panel" behavior.
V.applyAdminConsole=async function(){
  this.applySupportStaffUI?.();
  return this.applySelectedRoleUI();
};

// Safe, merge-only V14 DTP recovery. No existing V15 value is overwritten.
V.autoRecoverV14Dtp=async function(){
  if(!owner()||!this.ready) return {changed:false};
  const M=this.fb.M,wsSnap=await M.getDoc(this.ws());
  if(!wsSnap.exists()) return {changed:false};
  const ws=wsSnap.data()||{};
  if(ws.v14DtpRecoveryV3At) return {changed:false};
  const legacy=await this.legacy();
  if(!legacy?.meta) return {changed:false};

  const arrays=new Set(ws.arraySections||[]),tasks=[];
  let added=0,filled=0;
  for(const s of DTP_ARRAYS){
    const source=Array.isArray(legacy[s])?legacy[s]:[];
    if(!source.length) continue;
    const snap=await M.getDocs(this.col(s));
    const docs=new Map(),holidayDates=new Set();
    snap.forEach(d=>{const x=d.data()?.data;docs.set(d.id,x);if(s==='holidays'&&x?.date)holidayDates.add(String(x.date));});
    for(let i=0;i<source.length;i++){
      const old=source[i];
      if(s==='holidays'&&old?.date&&holidayDates.has(String(old.date))) continue;
      const id=this.itemId(s,old,i),current=docs.get(id);
      if(current===undefined){
        tasks.push(async()=>{await M.setDoc(M.doc(this.col(s),id),{data:this.safe(old),updatedAt:this.now(),updatedBy:this.fb.user.uid,recoveredFrom:'V14-auto'});});
        added++;
      }else{
        const merged=deepFill(current,old);
        if(!same(current,merged)){
          tasks.push(async()=>{await M.setDoc(M.doc(this.col(s),id),{data:this.safe(merged),updatedAt:this.now(),updatedBy:this.fb.user.uid,recoveredFrom:'V14-auto'},{merge:true});});
          filled++;
        }
      }
    }
    arrays.add(s);
  }
  await chunks(tasks);
  const patch={arraySections:[...arrays],schemaVersion:15,appVersion:'V15',v14DtpRecoveryV3At:this.now()};
  for(const k of DTP_META){
    const cur=ws[k],old=legacy.meta?.[k];
    if((cur===undefined||cur===null||cur==='')&&old!==undefined) patch[k]=old;
  }
  await M.setDoc(this.ws(),patch,{merge:true});

  if(added||filled){
    await this.load(SESSION.role);
    this.shadow=this.clone(DATA);
    try{Practicals?.render?.();Theory?.render?.();Schedule?.render?.();Holidays?.render?.();Dashboard?.render?.();}catch(e){}
  }
  return {changed:!!(added||filled),added,filled};
};

// Final wrapper: improve wrong-role message, recover missing V14 DTP once, and enforce the chosen role shell.
const loginBase=V.login?.bind(V);
if(loginBase){
  V.login=async function(...args){
    const r=await loginBase(...args);
    if(!this.ready){
      if(this._roleLoginDenied) this.loginMsg?.(this._roleLoginDenied,true);
      this.showRoleLogin();
      return r;
    }
    try{await this.autoRecoverV14Dtp();}catch(e){console.warn('V14 DTP auto recovery',e);}
    await this.applySelectedRoleUI();
    localStorage.setItem(REQUESTED_ROLE,SESSION.role);
    localStorage.setItem(EXPECTED_EMAIL,this.email(this.fb.user?.email||expectedEmail()));
    localStorage.setItem(LAST_ROLE,SESSION.role);
    return r;
  };
}

const logoutBase=V.logout?.bind(V);
if(logoutBase){
  V.logout=async function(){
    localStorage.removeItem(REQUESTED_ROLE);
    localStorage.removeItem(LAST_ROLE);
    return logoutBase();
  };
}

App.login=()=>V.startRoleLogin();
V.showRoleLogin();
console.info('V15 explicit role login + Admin navigation + DTP recovery active.');
})(window.V15Sync);
