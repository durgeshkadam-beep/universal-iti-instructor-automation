/* Final V15 Admin/Principal account UX fixes. */
(function(V){
'use strict';
if(!V) return;
const label=r=>r==='principal'?'Principal':r==='staff'?'Staff (read-only)':r==='student'?'Student':'Instructor';

// Principal account creation must label Staff correctly and keep the generated code visible.
V.createStaffFromPanel=async function(){
  const email=this.email(document.getElementById('v15StaffEmail')?.value||'');
  const role=document.getElementById('v15StaffRole')?.value||'instructor';
  const name=String(document.getElementById('v15StaffName')?.value||'').trim();
  try{
    if(!this.validEmail(email)) throw new Error('Enter a valid Google/Gmail address.');
    if(!['instructor','staff'].includes(role)) throw new Error('Principal can create only Instructor or Staff accounts here.');
    const code=await this.invite(email,role,null,name||email);
    await this.renderAuthorityStaffPanel();
    const out=document.getElementById('v15ActivationResult');
    if(out){
      out.style.display='block';out.className='callout cloud-ok';
      out.textContent=`${label(role)} approved — ${email} — First-login activation code: ${code}`;
    }else alert(`${label(role)} approved.\n${email}\nActivation code: ${code}`);
  }catch(e){
    const out=document.getElementById('v15ActivationResult');
    if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);
  }
};

// Make the technical-vs-operational distinction visible in the header for the migration owner.
const baseApply=V.applyAdminConsole?.bind(V);
if(baseApply){
  V.applyAdminConsole=async function(){
    const r=await baseApply();
    if(this.member?.owner&&SESSION){
      const who=document.getElementById('whoName');
      if(who) who.textContent=`${SESSION.name} • ${label(SESSION.role)} • System Admin`;
    }
    return r;
  };
}

console.info('V15 Admin final UX active.');
})(window.V15Sync);
