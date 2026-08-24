/* Final V15 Principal authority fixes. */
(function(V){
'use strict';
if(!V) return;

// All older staff-management calls now land on the Principal-first panel.
if(V.renderAuthorityStaffPanel){
  V.renderStaffPanel=function(){ return V.renderAuthorityStaffPanel(); };
}

// If a Principal had already activated before the new authority marker existed,
// establish the marker on the next successful login without creating a new account.
const baseLogin=V.login.bind(V);
V.login=async function(...args){
  const r=await baseLogin(...args);
  if(this.ready && SESSION?.role==='principal' && !this.member?.owner){
    try{
      const info=await this.instituteInfo();
      if(!info?.principalUid){
        await this.fb.M.updateDoc(this.inst(),{
          principalUid:this.fb.user.uid,
          principalEmail:this.email(this.fb.user.email),
          principalActivatedAt:this.now(),
          updatedAt:this.now()
        });
      }
    }catch(e){ console.warn('Principal marker check',e); }
    try{ await this.renderAuthorityStaffPanel(); }catch(e){}
    const who=document.getElementById('whoName');
    if(who) who.textContent=`${SESSION.name} • Principal`;
  }
  return r;
};

App.login=()=>V.login(null,{interactive:true});
const btn=document.querySelector('#loginScreen .login-card button.btn.primary.full') || document.querySelector('#loginScreen button');
if(btn) btn.onclick=()=>V.login(null,{interactive:true});

console.info('V15 Principal authority finalization active.');
})(window.V15Sync);
