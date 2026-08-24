/* V15 final role/tab matrix.
 * Keeps technical Admin separate from operational Principal/Instructor/Staff/Student views.
 * Creator may authenticate into Admin, Principal or Instructor, but each view shows only that role's UI.
 */
(function(V){
'use strict';
if(!V) return;

const MATRIX={
  admin:new Set(['admin-console']),
  principal:new Set(['dashboard','users','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities','record-formats','inspection','cloud','reports']),
  instructor:new Set(['dashboard','ai-assistant','syllabus-ai','modules','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities','record-formats','inspection','cloud','reports']),
  staff:new Set(['dashboard','trainees','attendance','practicals','theory','splitup','notices','record-formats','reports']),
  student:new Set(['dashboard','trainees','attendance','practicals','theory','splitup','evaluation','notices','leave','exams','ojt','gallery','activities'])
};
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};

function activeRole(){return SESSION?.role||'';}
function allowed(tab){return !!MATRIX[activeRole()]?.has(tab);}

V.enforceRoleMatrix=async function(){
  const role=activeRole();
  if(!role||!MATRIX[role]) return;

  // Old V15 layers added Instructor to Staff & Access for the migration owner.
  // Final rule: Staff & Access belongs only to Principal; Admin has its own Admin Panel.
  const users=document.querySelector('.tab[data-tab="users"]');
  if(users){users.dataset.roles='principal';users.textContent='👥 Staff & Access';}

  if(role==='admin'){
    this.ensureAdminPanel?.();
  }

  document.querySelectorAll('#tabs .tab').forEach(b=>{
    b.style.display=allowed(b.dataset.tab)?'':'none';
  });

  // Remove old owner shortcut from operational Instructor view.
  if(role!=='principal') document.getElementById('v15StaffShortcut')?.remove();

  // Principal should have a working Staff & Access panel; Instructor must not.
  if(role==='principal'){
    try{await this.renderAuthorityStaffPanel?.();}catch(e){
      try{await this.renderStaffPanel?.(false);}catch(_){}
    }
  }

  // If current visible panel is not allowed after role switching, move to first valid page.
  const visible=[...document.querySelectorAll('#main > section.panel')].find(p=>p.style.display!=='none'&&p.offsetParent!==null);
  const visibleTab=visible?.id?.replace(/^tab-/,'');
  if(!visibleTab||!allowed(visibleTab)){
    const first=role==='admin'?'admin-console':'dashboard';
    setTimeout(()=>{try{App.switchTab(first);}catch(e){}},0);
  }

  const who=document.getElementById('whoName');
  if(who&&SESSION){
    const creator=this.member?.owner?' • Creator':'';
    who.textContent=`${SESSION.name} • ${LABEL[role]||role}${role==='admin'?'':creator}`;
  }
  try{App.buildMobileNav?.();}catch(e){}
};

// Always re-apply after older role/workspace layers finish.
const applyBase=V.applySelectedRoleUI?.bind(V);
if(applyBase){
  V.applySelectedRoleUI=async function(){const r=await applyBase();await this.enforceRoleMatrix();return r;};
}
const roleBase=V.applyRoleWorkspace?.bind(V);
if(roleBase){
  V.applyRoleWorkspace=async function(){const r=await roleBase();await this.enforceRoleMatrix();return r;};
}

// Guard navigation too: hidden tabs cannot be opened programmatically from stale shortcuts.
const switchBase=App.switchTab?.bind(App);
if(switchBase){
  App.switchTab=function(name){
    if(SESSION&&MATRIX[SESSION.role]&&!MATRIX[SESSION.role].has(name)){
      name=SESSION.role==='admin'?'admin-console':'dashboard';
    }
    const r=switchBase(name);
    if(name==='admin-console'&&SESSION?.role==='admin') V.renderAdminPanel?.(false).catch(console.error);
    if(name==='users'&&SESSION?.role==='principal') V.renderAuthorityStaffPanel?.().catch(console.error);
    return r;
  };
}

setTimeout(()=>V.ready&&V.enforceRoleMatrix().catch(console.error),0);
console.info('V15 explicit role matrix active.');
})(window.V15Sync);
