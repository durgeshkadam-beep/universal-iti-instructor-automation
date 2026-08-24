/* V15 System Administration + V14 DTP recovery.
 * Technical System Admin is separate from institute authority:
 * - Principal remains the highest operational authority.
 * - The original V14 migration owner keeps a technical Admin Panel for account-role setup,
 *   security/migration support and recovery of missing V14 DTP teaching records.
 * - Operational roles: Principal, Instructor, Staff (read-only), Student.
 */
(function(V){
'use strict';
if(!V) return;

const ROLE_LABELS={principal:'Principal',instructor:'Instructor',staff:'Staff (read-only)',student:'Student'};
const STAFF_READ_TABS=['dashboard','trainees','attendance','practicals','theory','splitup','notices','record-formats'];
const DTP_ARRAYS=['practicals','theory','modules','holidays'];
const DTP_META=['institute','instituteCode','trade','batch','session','instructor','designation','authority','attendanceThreshold','scheduleStartDate','scheduleMode','hoursPerWorkingDay','theoryDaysPerTopic','realCalendarApplied'];

function isAdmin(){return !!V.member?.owner;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function addRole(tab,role){
  const b=document.querySelector(`.tab[data-tab="${tab}"]`);if(!b)return;
  const s=new Set(String(b.dataset.roles||'').split(',').map(x=>x.trim()).filter(Boolean));s.add(role);b.dataset.roles=[...s].join(',');
}
function deepFill(current,legacy){
  if(current===undefined||current===null||current==='') return V.clone(legacy);
  if(Array.isArray(current)) return current.length?V.clone(current):V.clone(legacy);
  if(current&&legacy&&typeof current==='object'&&typeof legacy==='object'&&!Array.isArray(legacy)){
    const out=V.clone(current)||{};
    Object.keys(legacy).forEach(k=>{out[k]=deepFill(out[k],legacy[k]);});
    return out;
  }
  return current;
}
function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false;}}

// Staff is a genuine fourth operational role, but read-only in the application UI.
STAFF_READ_TABS.forEach(t=>addRole(t,'staff'));

// The technical migration owner is not an authority above Principal.
// After setup it keeps its normal operational role (normally Instructor), plus a separate Admin Panel.
const oldResolve=V.resolveOperationalRole?.bind(V);
if(oldResolve){
  V.resolveOperationalRole=async function(m){
    if(m?.owner && m.active!==false) return m.role==='student'?'instructor':(m.role||'instructor');
    return oldResolve(m);
  };
}

// Support Staff activation patch. Google identity still determines the assigned Firestore role.
V.activateAssignedRole=async function(){
  const M=this.fb.M,email=this.email(this.fb.user?.email||'');
  const aSnap=await M.getDoc(this.access(email));
  if(!aSnap.exists()) throw new Error('This Google account is not approved for this institute.');
  const a=aSnap.data();
  if(a.active===false) throw new Error('This account is disabled. Contact the Principal.');
  if(!['principal','instructor','staff','student'].includes(a.role)) throw new Error('Invalid institute role assignment.');
  const info=await this.instituteInfo();
  if(a.role==='principal' && info?.principalUid) throw new Error('An official Principal is already assigned. Use the System Admin panel to transfer the Principal role.');
  const c=String(prompt(`First login activation\n${email}\n\nEnter the 6-digit code given by the institute:`)||'').trim();
  if(!/^\d{6}$/.test(c)) throw new Error('Activation cancelled or the code is not 6 digits.');
  const proof=await this.hash(c);
  const m={uid:this.fb.user.uid,email,displayName:a.displayName||this.fb.user.displayName||email,role:a.role,active:true,owner:false,workspaceIds:a.workspaceIds||[],traineeId:a.traineeId||null,activationProof:proof,createdAt:this.now()};
  try{await M.setDoc(this.memberRef(),m);}catch(e){throw new Error('Activation failed. Gmail or activation code does not match the approved account.');}
  this.member=m;
  if(a.role==='principal') await M.updateDoc(this.inst(),{principalUid:this.fb.user.uid,principalEmail:email,principalActivatedAt:this.now(),updatedAt:this.now()});
  try{await M.updateDoc(this.secret(email),{active:false,usedAt:this.now(),usedBy:this.fb.user.uid});}catch(e){console.warn('Activation cleanup',e);}
  return m;
};

// Tighten invitation hierarchy while adding Staff.
const authorityInvite=V.invite?.bind(V);
if(authorityInvite){
  V.invite=async function(email,role,traineeId=null,name=''){
    if(role==='staff' && !(isAdmin()||SESSION?.role==='principal')) throw new Error('Only System Admin or Principal can create a Staff account.');
    return authorityInvite(email,role,traineeId,name);
  };
}

V.ensureAdminPanel=function(){
  if(!isAdmin()) return;
  const nav=document.getElementById('tabs'),main=document.getElementById('main');
  if(nav&&!document.querySelector('.tab[data-tab="admin-console"]')){
    const b=document.createElement('button');b.className='tab';b.dataset.tab='admin-console';b.dataset.roles=SESSION?.role||this.member?.role||'instructor';b.textContent='⚙️ Admin Panel';
    const cloud=document.querySelector('.tab[data-tab="cloud"]');nav.insertBefore(b,cloud||null);
  }
  if(main&&!document.getElementById('tab-admin-console')){
    const p=document.createElement('section');p.id='tab-admin-console';p.className='panel';main.appendChild(p);
  }
};

V.accountDirectory=async function(){
  if(!isAdmin()) throw new Error('System Admin access required.');
  const M=this.fb.M;
  const [ms,as]=await Promise.all([
    M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members')),
    M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'access'))
  ]);
  const members=[];ms.forEach(d=>members.push({uid:d.id,...d.data()}));
  const access=[];as.forEach(d=>access.push({id:d.id,...d.data()}));
  return {members,access};
};

V.createAdminInvitation=async function(){
  if(!isAdmin()) return;
  const email=this.email(document.getElementById('v15AdminEmail')?.value||'');
  const name=String(document.getElementById('v15AdminName')?.value||'').trim();
  const role=document.getElementById('v15AdminRole')?.value||'instructor';
  const traineeId=role==='student'?(document.getElementById('v15AdminTrainee')?.value||null):null;
  const out=document.getElementById('v15AdminResult');
  try{
    if(!this.validEmail(email)) throw new Error('Enter a valid Google/Gmail address.');
    if(role==='student'&&!traineeId) throw new Error('Select the trainee linked to this Student account.');
    const info=await this.instituteInfo();
    if(role==='principal'&&info?.principalUid) throw new Error('A Principal is already active. Change/transfer the existing Principal role in Account Directory first.');
    const code=await this.invite(email,role,traineeId,name||email);
    if(out){out.style.display='block';out.className='callout cloud-ok';out.innerHTML=`<b>${esc(ROLE_LABELS[role])} approved</b><br>${esc(email)}<br><b>First-login code: ${esc(code)}</b>`;}
    await this.renderAdminPanel(false);
  }catch(e){if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);}
};

V.changeAccountRole=async function(uid){
  if(!isAdmin()) throw new Error('System Admin access required.');
  const role=document.getElementById('role-'+uid)?.value;
  const traineeId=role==='student'?(document.getElementById('trainee-'+uid)?.value||null):null;
  if(!ROLE_LABELS[role]) throw new Error('Invalid role.');
  if(role==='student'&&!traineeId) throw new Error('Select a trainee for Student role.');
  const M=this.fb.M,ref=this.memberRef(uid),snap=await M.getDoc(ref);
  if(!snap.exists()) throw new Error('Account not found.');
  const target=snap.data();
  if(target.owner) throw new Error('The technical System Admin account cannot be converted here.');
  const info=await this.instituteInfo();
  if(info?.principalUid===uid && role!=='principal'){
    if(!confirm('This is the current Principal. Remove Principal authority and change the role?')) return;
    await M.updateDoc(this.inst(),{principalUid:M.deleteField(),principalEmail:M.deleteField(),updatedAt:this.now()});
  }
  if(role==='principal'&&info?.principalUid&&info.principalUid!==uid){
    throw new Error('Another Principal is active. Change the existing Principal to another role first, then assign the new Principal.');
  }
  await M.updateDoc(ref,{role,traineeId:traineeId||null,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  if(target.email){
    try{await M.setDoc(this.access(target.email),{email:this.email(target.email),role,traineeId:traineeId||null,displayName:target.displayName||'',workspaceIds:target.workspaceIds||[this.workspaceId],active:target.active!==false,updatedBy:this.fb.user.uid,updatedAt:this.now()},{merge:true});}catch(e){}
  }
  if(role==='principal') await M.updateDoc(this.inst(),{principalUid:uid,principalEmail:this.email(target.email),principalActivatedAt:this.now(),updatedAt:this.now()});
  await this.renderAdminPanel(false);
};

V.toggleAccount=async function(uid){
  if(!isAdmin()) return;
  const M=this.fb.M,ref=this.memberRef(uid),snap=await M.getDoc(ref);if(!snap.exists())return;
  const t=snap.data();if(t.owner) throw new Error('System Admin account cannot be disabled here.');
  await M.updateDoc(ref,{active:t.active===false,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  await this.renderAdminPanel(false);
};

V.legacyDtpSummary=async function(){
  const legacy=await this.legacy();
  const count=k=>Array.isArray(legacy?.[k])?legacy[k].length:0;
  return {legacy,practicals:count('practicals'),theory:count('theory'),modules:count('modules'),holidays:count('holidays')};
};

V.restoreV14Dtp=async function(){
  if(!isAdmin()) throw new Error('System Admin access required.');
  if(!confirm('Recover missing V14 DTP practical/theory plans and split-up calendar into V15?\n\nExisting V15 values are preserved; only missing records/fields are filled from V14.')) return;
  const M=this.fb.M,legacy=await this.legacy();
  if(!legacy?.meta) throw new Error('No V14 cloud workspace was found for this System Admin Google account.');
  let added=0,filled=0;
  const wsSnap=await M.getDoc(this.ws());
  const wsData=wsSnap.exists()?wsSnap.data():{};
  const arrays=new Set(wsData.arraySections||[]);

  for(const s of DTP_ARRAYS){
    const source=Array.isArray(legacy[s])?legacy[s]:[];
    if(!source.length) continue;
    const existingSnap=await M.getDocs(this.col(s));
    const docs=new Map();existingSnap.forEach(d=>docs.set(d.id,d.data()?.data));
    const existingValues=[...docs.values()];
    for(let i=0;i<source.length;i++){
      const old=source[i];
      // Holidays are de-duplicated by date even if the old document id included the label.
      if(s==='holidays'&&old?.date&&existingValues.some(x=>x?.date===old.date)) continue;
      const id=this.itemId(s,old,i),ref=M.doc(this.col(s),id);
      const current=docs.get(id);
      if(current===undefined){
        await M.setDoc(ref,{data:this.safe(old),updatedAt:this.now(),updatedBy:this.fb.user.uid,recoveredFrom:'V14'});added++;
      }else{
        const merged=deepFill(current,old);
        if(!same(current,merged)){await M.setDoc(ref,{data:this.safe(merged),updatedAt:this.now(),updatedBy:this.fb.user.uid,recoveredFrom:'V14'},{merge:true});filled++;}
      }
    }
    arrays.add(s);
  }

  const meta={};
  DTP_META.forEach(k=>{const cur=wsData[k],old=legacy.meta?.[k];if((cur===undefined||cur===null||cur==='')&&old!==undefined)meta[k]=old;});
  meta.arraySections=[...arrays];meta.schemaVersion=15;meta.appVersion='V15';meta.v14DtpRecoveredAt=this.now();
  await M.setDoc(this.ws(),meta,{merge:true});
  alert(`V14 DTP recovery completed.\nNew records: ${added}\nExisting records completed with missing V14 fields: ${filled}\n\nThe page will reload so Practicals, Theory and Split-up Calendar use the recovered data.`);
  location.reload();
};

V.renderAdminPanel=async function(showLoading=true){
  if(!isAdmin()) return;
  this.ensureAdminPanel();
  const panel=document.getElementById('tab-admin-console');if(!panel)return;
  if(showLoading)panel.innerHTML='<div class="card"><h2>⚙️ System Admin</h2><p class="muted">Loading account and V14 recovery status…</p></div>';
  let dir={members:[],access:[]},dtp={practicals:0,theory:0,modules:0,holidays:0};
  try{[dir,dtp]=await Promise.all([this.accountDirectory(),this.legacyDtpSummary()]);}catch(e){}
  const info=await this.instituteInfo().catch(()=>({}));
  const currentCounts={practicals:(DATA?.practicals||[]).length,theory:(DATA?.theory||[]).length,modules:(DATA?.modules||[]).length,holidays:(DATA?.holidays||[]).length};
  const trainees=(DATA?.trainees||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.roll||'')} — ${esc(t.name||'')}</option>`).join('');
  const memberRows=dir.members.map(m=>{
    const owner=m.owner===true;
    const opts=Object.keys(ROLE_LABELS).map(r=>`<option value="${r}" ${m.role===r?'selected':''}>${ROLE_LABELS[r]}</option>`).join('');
    const traineeSelect=`<select id="trainee-${esc(m.uid)}" style="min-width:150px"><option value="">Select trainee…</option>${(DATA?.trainees||[]).map(t=>`<option value="${esc(t.id)}" ${m.traineeId===t.id?'selected':''}>${esc(t.roll||'')} — ${esc(t.name||'')}</option>`).join('')}</select>`;
    return `<tr><td><b>${esc(m.displayName||m.email||'Account')}</b><br><small>${esc(m.email||'')}</small>${owner?'<br><span class="badge">System Admin</span>':''}</td><td>${owner?esc(ROLE_LABELS[m.role]||m.role):`<select id="role-${esc(m.uid)}">${opts}</select><div style="margin-top:6px">${traineeSelect}</div>`}</td><td>${m.active===false?'Disabled':'Active'}</td><td>${owner?'Protected':`<button class="btn small" data-role-save="${esc(m.uid)}">Save Role</button> <button class="btn ghost small" data-toggle-user="${esc(m.uid)}">${m.active===false?'Enable':'Disable'}</button>`}</td></tr>`;
  }).join('')||'<tr><td colspan="4">No accounts found.</td></tr>';
  const pendingEmails=new Set(dir.members.map(m=>this.email(m.email)));
  const pending=dir.access.filter(a=>!pendingEmails.has(this.email(a.email))).map(a=>`<tr><td>${esc(a.displayName||a.email)}</td><td>${esc(a.email)}</td><td>${esc(ROLE_LABELS[a.role]||a.role)}</td><td>Waiting for first Google login</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No pending accounts.</td></tr>';

  panel.innerHTML=`
    <div class="hero"><div class="hero-content"><div><span class="eyebrow">TECHNICAL CONFIGURATION</span><h2>⚙️ System Admin Panel</h2><p>Assign secure Google accounts and recover/migrate data. <b>Principal remains the highest institute operational authority.</b></p></div></div></div>
    <div class="callout cloud-ok" style="margin:14px 0"><b>Authority model</b><br>System Admin = technical setup/security/migration only. Principal = highest institute authority. Principal manages Instructor/Staff. Instructor manages teaching and Student access. Staff is read-only.</div>
    <div class="cards" style="grid-template-columns:1fr 1fr">
      <div class="card"><h3>Create / approve Google account</h3>
        <div class="field"><label>Name</label><input id="v15AdminName" placeholder="Full name"></div>
        <div class="field"><label>Google / Gmail</label><input id="v15AdminEmail" type="email" placeholder="user@gmail.com"></div>
        <div class="field"><label>Role</label><select id="v15AdminRole"><option value="principal">Principal</option><option value="instructor">Instructor</option><option value="staff">Staff (read-only)</option><option value="student">Student</option></select></div>
        <div class="field" id="v15AdminTraineeField" style="display:none"><label>Student linked trainee</label><select id="v15AdminTrainee"><option value="">Select trainee…</option>${trainees}</select></div>
        <button class="btn primary" id="v15AdminCreate">Create first-login code</button><div id="v15AdminResult" class="callout" style="display:none;margin-top:10px"></div>
      </div>
      <div class="card"><h3>V14 DTP → V15 Recovery</h3>
        <p class="muted">Your V14 DTP practical/theory plans contain the planned dates used by the Split-up Calendar. If V15 was initialized before all V14 sections were copied, these records can be missing.</p>
        <table class="datatable"><thead><tr><th>Section</th><th>V14</th><th>V15</th></tr></thead><tbody>
          <tr><td>Practicals</td><td>${dtp.practicals}</td><td>${currentCounts.practicals}</td></tr>
          <tr><td>Theory</td><td>${dtp.theory}</td><td>${currentCounts.theory}</td></tr>
          <tr><td>Modules</td><td>${dtp.modules}</td><td>${currentCounts.modules}</td></tr>
          <tr><td>Holidays / Calendar</td><td>${dtp.holidays}</td><td>${currentCounts.holidays}</td></tr>
        </tbody></table>
        <button class="btn primary" id="v15RecoverDtp">Recover missing V14 DTP records</button>
        <button class="btn secondary" id="v15OpenSplit" style="margin-left:6px">Open Split-up Calendar</button>
        <p class="muted"><small>Recovery is merge-only: current V15 values are kept and only missing records/fields are filled from your V14 cloud.</small></p>
      </div>
    </div>
    <div class="card"><h3>Account Directory</h3><p class="muted">Change the operational role here. One official Principal at a time.</p><div class="table-wrap"><table><thead><tr><th>Account</th><th>Role / trainee</th><th>Status</th><th>Action</th></tr></thead><tbody>${memberRows}</tbody></table></div></div>
    <div class="card"><h3>Pending first-login accounts</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>${pending}</tbody></table></div></div>
    <div class="callout"><b>Current official Principal:</b> ${esc(info?.principalEmail||'Not assigned yet')}</div>`;

  panel.querySelector('#v15AdminRole')?.addEventListener('change',e=>{const f=panel.querySelector('#v15AdminTraineeField');if(f)f.style.display=e.target.value==='student'?'':'none';});
  panel.querySelector('#v15AdminCreate')?.addEventListener('click',()=>V.createAdminInvitation());
  panel.querySelector('#v15RecoverDtp')?.addEventListener('click',()=>V.restoreV14Dtp().catch(e=>alert(e.message||e)));
  panel.querySelector('#v15OpenSplit')?.addEventListener('click',()=>App.switchTab('splitup'));
  panel.querySelectorAll('[data-role-save]').forEach(b=>b.addEventListener('click',()=>V.changeAccountRole(b.dataset.roleSave).catch(e=>alert(e.message||e))));
  panel.querySelectorAll('[data-toggle-user]').forEach(b=>b.addEventListener('click',()=>V.toggleAccount(b.dataset.toggleUser).catch(e=>alert(e.message||e))));
};

// Principal's operational account panel: Principal can create Instructor or read-only Staff.
V.renderAuthorityStaffPanel=async function(){
  const panel=document.getElementById('tab-users'),tab=document.querySelector('.tab[data-tab="users"]');
  if(!panel||!tab||SESSION?.role!=='principal'){if(tab)tab.style.display='none';return;}
  tab.style.display='';tab.textContent='👥 Staff & Access';panel.style.display='';
  let dir={members:[],pending:[]};try{dir=await this.staffDirectory();}catch(e){}
  const rows=(dir.members||[]).filter(x=>!x.owner&&['instructor','staff'].includes(x.role)).map(x=>`<tr><td><b>${esc(x.displayName||x.email)}</b><br><small>${esc(x.email||'')}</small></td><td>${esc(ROLE_LABELS[x.role]||x.role)}</td><td>${x.active===false?'Disabled':'Active'}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">No Instructor/Staff accounts yet.</td></tr>';
  panel.innerHTML=`<div class="hero"><div class="hero-content"><div><h2>👥 Staff & Access</h2><p>Principal is the highest operational authority and can create Instructor or Staff accounts.</p></div></div></div>
    <div class="card"><h3>Create staff account</h3><div class="field"><label>Name</label><input id="v15StaffName"></div><div class="field"><label>Google / Gmail</label><input id="v15StaffEmail" type="email"></div><div class="field"><label>Role</label><select id="v15StaffRole"><option value="instructor">Instructor</option><option value="staff">Staff (read-only)</option></select></div><button class="btn primary" id="v15CreateStaffBtn">Create first-login code</button><div id="v15ActivationResult" class="callout" style="display:none;margin-top:10px"></div></div>
    <div class="card"><h3>Active Instructor / Staff</h3><div class="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  panel.querySelector('#v15CreateStaffBtn')?.addEventListener('click',()=>V.createStaffFromPanel());
};

V.applySupportStaffUI=function(){
  if(SESSION?.role!=='staff') return;
  STAFF_READ_TABS.forEach(t=>{addRole(t,'staff');const b=document.querySelector(`.tab[data-tab="${t}"]`);if(b)b.style.display='';});
  const who=document.getElementById('whoName');if(who)who.textContent=`${SESSION.name} • Staff (read-only)`;
  try{App.buildMobileNav?.();}catch(e){}
};

V.applyAdminConsole=async function(){
  this.applySupportStaffUI();
  if(isAdmin()){
    this.ensureAdminPanel();
    const b=document.querySelector('.tab[data-tab="admin-console"]');if(b)b.style.display='';
    await this.renderAdminPanel(false).catch(console.error);
    try{App.buildMobileNav?.();}catch(e){}
  }else{
    document.querySelector('.tab[data-tab="admin-console"]')?.remove();
    document.getElementById('tab-admin-console')?.remove();
  }
};

const finalApply=V.applyRoleWorkspace?.bind(V);
if(finalApply){V.applyRoleWorkspace=async function(){const r=await finalApply();await this.applyAdminConsole();return r;};}
const finalLogin=V.login?.bind(V);
if(finalLogin){V.login=async function(...args){const r=await finalLogin(...args);if(this.ready)await this.applyAdminConsole();return r;};}

// Keep System Admin panel current when the user navigates to it.
const switchBase=App.switchTab?.bind(App);
if(switchBase){App.switchTab=function(name){const r=switchBase(name);if(name==='admin-console'&&V.ready&&isAdmin())V.renderAdminPanel(false).catch(console.error);return r;};}

console.info('V15 System Admin + V14 DTP recovery active.');
})(window.V15Sync);
