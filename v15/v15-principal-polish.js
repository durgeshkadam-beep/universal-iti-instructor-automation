/* V15 Principal/Admin polish: panel visibility, non-duplicated staff UI, durable activation result. */
(function(V){
'use strict';
if(!V) return;

const baseRender=V.renderStaffPanel?.bind(V);
if(baseRender){
  V.renderStaffPanel=async function(...args){
    const panel=document.getElementById('tab-users');
    if(panel) panel.style.display='';
    return baseRender(...args);
  };
}

V.createStaffFromPanel=async function(){
  const email=this.email(document.getElementById('v15StaffEmail')?.value||'');
  const role=document.getElementById('v15StaffRole')?.value||'instructor';
  const name=String(document.getElementById('v15StaffName')?.value||'').trim();
  try{
    if(!email) throw new Error('Enter the staff Google/Gmail address.');
    const code=await this.invite(email,role,null,name||email);
    await this.renderStaffPanel(false);
    const out=document.getElementById('v15ActivationResult');
    if(out){
      out.style.display='block';
      out.className='callout cloud-ok';
      out.replaceChildren();
      const b=document.createElement('b'); b.textContent=`${role==='principal'?'Principal':'Instructor'} approved.`;
      const codeLine=document.createElement('b'); codeLine.textContent=`First-login activation code: ${code}`;
      const small=document.createElement('small'); small.textContent='Give this code privately. It is used only once; future sign-in uses the same Google account.';
      out.append(b,document.createElement('br'),document.createTextNode(email),document.createElement('br'),codeLine,document.createElement('br'),small);
    }
  }catch(e){
    const out=document.getElementById('v15ActivationResult');
    if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);
  }
};

function hideDuplicateCloudManager(){
  const old=document.getElementById('v15InviteEmail');
  const card=old?.closest?.('.card');
  if(card) card.style.display='none';
}

function ensureStaffShortcut(){
  if(!(V.member?.owner || SESSION?.role==='principal' || V.member?.role==='principal')) return;
  const dash=document.getElementById('tab-dashboard');
  if(!dash || document.getElementById('v15StaffShortcut')) return;
  const d=document.createElement('div');
  d.id='v15StaffShortcut'; d.className='card'; d.style.marginBottom='16px';
  const title=document.createElement('h3'); title.textContent='👥 Staff & Access';
  const p=document.createElement('p'); p.className='muted'; p.textContent=V.member?.owner?'Create the Principal and manage staff Google accounts.':'Create/manage Instructor Google accounts and review institute records.';
  const b=document.createElement('button'); b.className='btn primary'; b.type='button'; b.textContent='Open Staff & Access';
  b.addEventListener('click',()=>App.switchTab('users'));
  d.append(title,p,b); dash.prepend(d);
}

const baseApply=V.applyRoleWorkspace?.bind(V);
if(baseApply){
  V.applyRoleWorkspace=async function(){
    const r=await baseApply();
    hideDuplicateCloudManager();
    ensureStaffShortcut();
    return r;
  };
}

console.info('V15 Principal/Admin polish active.');
})(window.V15Sync);
