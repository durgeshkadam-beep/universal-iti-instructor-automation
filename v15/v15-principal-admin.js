/* V15 Principal/Admin portal and role-visibility fixes.
 * - Gives Principal an oversight view of institute records.
 * - Replaces legacy PIN "Instructor Accounts" with Google/Firebase Staff & Access.
 * - Makes owner/admin vs principal vs instructor hierarchy explicit.
 * - Prevents the owner account from masquerading as a different staff role.
 */
(function(V){
'use strict';
if(!V) return;

const OVERSIGHT_TABS = [
  'dashboard','modules','trainees','attendance','practicals','theory','splitup',
  'evaluation','notices','leave','exams','ojt','gallery','activities',
  'record-formats','inspection','cloud','reports'
];

function addRole(tab, role){
  const b=document.querySelector(`.tab[data-tab="${tab}"]`);
  if(!b) return;
  const roles=new Set(String(b.dataset.roles||'').split(',').map(x=>x.trim()).filter(Boolean));
  roles.add(role);
  b.dataset.roles=[...roles].join(',');
}

function preparePrincipalVisibility(){
  OVERSIGHT_TABS.forEach(t=>addRole(t,'principal'));
  const u=document.querySelector('.tab[data-tab="users"]');
  if(u){
    u.dataset.roles='principal,instructor';
    u.textContent='👥 Staff & Access';
  }
}
preparePrincipalVisibility();

function canManageStaff(){
  return !!V.member?.owner || SESSION?.role==='principal' || V.member?.role==='principal';
}
function isOwner(){ return !!V.member?.owner; }
function roleName(){
  if(isOwner()) return 'System Owner / App Admin';
  if((SESSION?.role||V.member?.role)==='principal') return 'Principal / Vice-Principal';
  if((SESSION?.role||V.member?.role)==='instructor') return 'Instructor';
  return 'Student / Trainee';
}
function escHtml(v){
  return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

const baseRoleOK=V.roleOK?.bind(V);
if(baseRoleOK){
  V.roleOK=function(requested){
    if(this.member?.owner){
      return this.member.active!==false && requested===this.member.role;
    }
    return baseRoleOK(requested);
  };
}

V.staffDirectory=async function(){
  if(!this.ready||!canManageStaff()) return {members:[],pending:[]};
  const M=this.fb.M;
  const mc=M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members');
  const ac=M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'access');
  const [ms,as]=await Promise.all([M.getDocs(mc),M.getDocs(ac)]);
  const members=[]; ms.forEach(d=>members.push({uid:d.id,...d.data()}));
  const memberEmails=new Set(members.map(x=>this.email(x.email)));
  const pending=[]; as.forEach(d=>{const x={id:d.id,...d.data()};if(!memberEmails.has(this.email(x.email)))pending.push(x);});
  const rank={principal:1,instructor:2,student:3};
  members.sort((a,b)=>(a.owner?0:rank[a.role]||9)-(b.owner?0:rank[b.role]||9)||String(a.displayName||a.email||'').localeCompare(String(b.displayName||b.email||'')));
  pending.sort((a,b)=>(rank[a.role]||9)-(rank[b.role]||9)||String(a.email||'').localeCompare(String(b.email||'')));
  return {members,pending};
};

V.setMemberActive=async function(uid,active){
  if(!this.ready||!canManageStaff()) throw new Error('Principal/Admin access required.');
  const M=this.fb.M,ref=this.memberRef(uid),snap=await M.getDoc(ref);
  if(!snap.exists()) throw new Error('Staff member not found.');
  const target=snap.data();
  if(target.owner) throw new Error('The System Owner account cannot be disabled here.');
  if(!isOwner() && target.role!=='instructor') throw new Error('Principal can manage Instructor accounts only.');
  await M.updateDoc(ref,{active:!!active,updatedAt:this.now(),updatedBy:this.fb.user.uid});
  await this.renderStaffPanel();
};

V.createStaffFromPanel=async function(){
  const email=this.email(document.getElementById('v15StaffEmail')?.value||'');
  const role=document.getElementById('v15StaffRole')?.value||'instructor';
  const name=String(document.getElementById('v15StaffName')?.value||'').trim();
  const out=document.getElementById('v15ActivationResult');
  try{
    if(!email) throw new Error('Enter the staff Google/Gmail address.');
    const code=await this.invite(email,role,null,name||email);
    if(out){
      out.style.display='block';
      out.className='callout cloud-ok';
      out.innerHTML=`<b>${role==='principal'?'Principal':'Instructor'} approved.</b><br>${escHtml(email)}<br><b>First-login activation code: ${escHtml(code)}</b><br><small>Give this code privately. It works for first activation only; later login uses the same Google account.</small>`;
    }
    await this.renderStaffPanel(false);
  }catch(e){
    if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);
  }
};

V.renderStaffPanel=async function(showLoading=true){
  const panel=document.getElementById('tab-users');
  const tab=document.querySelector('.tab[data-tab="users"]');
  if(!panel||!tab) return;
  if(!canManageStaff()){
    tab.style.display='none';
    panel.style.display='none';
    return;
  }
  tab.style.display='';
  tab.textContent='👥 Staff & Access';
  if(showLoading) panel.innerHTML='<div class="card"><h2>👥 Staff & Access</h2><p class="muted">Loading secure Firebase staff directory…</p></div>';

  let dir;
  try{ dir=await this.staffDirectory(); }
  catch(e){panel.innerHTML=`<div class="card"><h2>👥 Staff & Access</h2><div class="callout cloud-error">${escHtml(e.message||e)}</div></div>`;return;}

  const roleOptions=isOwner()
    ? '<option value="principal">Principal / Vice-Principal</option><option value="instructor">Instructor</option>'
    : '<option value="instructor">Instructor</option>';
  const hierarchy=isOwner()
    ? '<b>You are the System Owner / App Admin.</b> Create the Principal here. You can also create an Instructor for testing.'
    : '<b>You are signed in as Principal.</b> Create and manage Instructor Google accounts here. Students are approved by an Instructor from Trainee Master.';

  const memberRows=dir.members.map(m=>{
    const label=m.owner?'System Owner / Admin':m.role==='principal'?'Principal':m.role==='instructor'?'Instructor':'Student';
    const status=m.active===false?'Disabled':'Active';
    let action='';
    const allowed=!m.owner && (isOwner() || m.role==='instructor');
    if(allowed) action=`<button class="btn ghost small v15MemberToggle" data-uid="${escHtml(m.uid)}" data-active="${m.active===false?'1':'0'}">${m.active===false?'Enable':'Disable'}</button>`;
    return `<tr><td><strong>${escHtml(m.displayName||m.email||'Staff')}</strong><br><small class="muted">${escHtml(m.email||'')}</small></td><td><span class="badge">${escHtml(label)}</span></td><td>${escHtml(status)}</td><td>${action}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="muted">No activated staff accounts yet.</td></tr>';

  const pendingRows=dir.pending.filter(x=>x.role!=='student').map(p=>`<tr><td>${escHtml(p.displayName||p.email||'')}</td><td>${escHtml(p.email||'')}</td><td>${escHtml(p.role||'')}</td><td><span class="badge pending">Waiting for first login</span></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No pending staff activations.</td></tr>';

  panel.innerHTML=`
    <div class="hero" style="margin-bottom:16px"><div class="hero-content"><div><h2>👥 Staff & Access</h2><p>Google/Firebase staff accounts for this institute. Old V14 User ID/PIN accounts are not used in V15.</p></div></div></div>
    <div class="callout cloud-ok"><b>${escHtml(roleName())}</b><br>${hierarchy}</div>
    <div class="cards" style="grid-template-columns:1fr 1fr;margin-top:16px">
      <div class="card"><h3>Create staff account</h3>
        <div class="field"><label>Name</label><input id="v15StaffName" placeholder="Staff full name"></div>
        <div class="field"><label>Approved Google / Gmail</label><input id="v15StaffEmail" type="email" placeholder="staff@gmail.com"></div>
        <div class="field"><label>Account role</label><select id="v15StaffRole">${roleOptions}</select></div>
        <button class="btn primary" id="v15CreateStaffBtn">Create first-login activation code</button>
        <div id="v15ActivationResult" class="callout" style="display:none;margin-top:12px"></div>
      </div>
      <div class="card"><h3>How V15 access works</h3>
        <p><b>System Owner / App Admin</b> → creates Principal</p>
        <p><b>Principal</b> → creates Instructors</p>
        <p><b>Instructor</b> → adds trainees and approves each trainee Gmail</p>
        <p><b>Student</b> → sees only the permitted student data linked to that Google account</p>
        <p class="muted">Activation code is required only on the first Google login.</p>
      </div>
    </div>
    <div class="card"><div class="field-row" style="justify-content:space-between"><h3>Activated staff</h3><button class="btn ghost small" id="v15RefreshStaff">Refresh</button></div>
      <div class="table-wrap"><table><thead><tr><th>Staff</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${memberRows}</tbody></table></div>
    </div>
    <div class="card"><h3>Pending first-login activations</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>${pendingRows}</tbody></table></div></div>`;

  panel.querySelector('#v15CreateStaffBtn')?.addEventListener('click',()=>V.createStaffFromPanel());
  panel.querySelector('#v15RefreshStaff')?.addEventListener('click',()=>V.renderStaffPanel());
  panel.querySelectorAll('.v15MemberToggle').forEach(b=>b.addEventListener('click',async()=>{
    try{await V.setMemberActive(b.dataset.uid,b.dataset.active==='1');}
    catch(e){alert(e.message||e);}
  }));
};

V.applyRoleWorkspace=async function(){
  if(!this.ready||!SESSION) return;
  preparePrincipalVisibility();
  const principal=SESSION.role==='principal' || this.member?.role==='principal';
  const owner=isOwner();

  if(principal){
    OVERSIGHT_TABS.forEach(t=>{
      const b=document.querySelector(`.tab[data-tab="${t}"]`);
      if(b) b.style.display='';
    });
    document.body.classList.add('v15-principal-oversight');
  }

  const staffTab=document.querySelector('.tab[data-tab="users"]');
  if(staffTab){
    staffTab.style.display=(owner||principal)?'':'none';
    staffTab.textContent='👥 Staff & Access';
  }
  if(owner||principal) await this.renderStaffPanel(false);

  const who=document.getElementById('whoName');
  if(who){
    const base=String(SESSION.name||this.fb.user?.displayName||this.fb.user?.email||'');
    who.textContent=`${base} • ${roleName()}`;
  }
  ['changePinBtn','staffNameField','staffPinField','studentRollField','studentPinField'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});

  try{ App.buildMobileNav?.(); }catch(e){}
};

const cloudBase=V.cloudUI?.bind(V);
if(cloudBase){
  V.cloudUI=function(){
    const r=cloudBase();
    Promise.resolve().then(()=>this.applyRoleWorkspace()).catch(console.error);
    return r;
  };
}

const loginBase=V.login.bind(V);
V.login=async function(role){
  const r=await loginBase(role);
  if(this.ready) await this.applyRoleWorkspace();
  return r;
};

console.info('V15 Principal/Admin portal active.');
})(window.V15Sync);
