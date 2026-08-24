/* V15 Principal login stability + existing-account role promotion.
 * Loaded last.
 * Fixes a common loop where a Gmail had already activated as Instructor/Staff,
 * then System Admin approved the same Gmail as Principal. The old member record
 * stayed on the old role, so login kept returning to the role-login page.
 */
(function(V){
'use strict';
if(!V) return;

function role(){ return window.SESSION?.role||''; }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function label(r){return r==='principal'?'Principal':r==='instructor'?'Instructor':r==='staff'?'Staff (read-only)':r==='student'?'Student':String(r||'');}
function wsLabel(w){return [w?.trade||'Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}

V.findActivatedMemberByEmail=async function(email){
  email=this.email(email);
  if(!email||!this.fb?.db) return null;
  const M=this.fb.M,z=await M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members'));
  let found=null;
  z.forEach(d=>{const x=d.data();if(!found&&this.email(x?.email)===email)found={uid:d.id,...x};});
  return found;
};

// System Admin account creation now understands an already-activated Gmail.
// In that case there is no reason to generate another activation code: the Admin
// directly changes the existing member's authorized role/workspace.
const createBase=V.createAdminInvitation?.bind(V);
if(createBase){
  V.createAdminInvitation=async function(){
    if(!(this.member?.owner&&role()==='admin')) return createBase();

    const email=this.email(document.getElementById('v15AdminEmail')?.value||'');
    const name=String(document.getElementById('v15AdminName')?.value||'').trim();
    const accountRole=document.getElementById('v15AdminRole')?.value||'instructor';
    const wid=document.getElementById('v15AdminWorkspace')?.value||'';
    const traineeId=accountRole==='student'?(document.getElementById('v15AdminTrainee')?.value||''):null;
    const out=document.getElementById('v15AdminResult');

    try{
      if(!this.validEmail(email)) throw new Error('Enter a valid Google/Gmail address.');
      if(!['principal','instructor','staff','student'].includes(accountRole)) throw new Error('Select a valid role.');
      if(accountRole!=='principal'&&!wid) throw new Error('Select the Trade / Session / Batch for this account.');
      if(accountRole==='student'&&!traineeId) throw new Error('Select the trainee from the selected Trade workspace.');

      const existing=await this.findActivatedMemberByEmail(email);
      if(!existing) return createBase();
      if(existing.owner) throw new Error('The System Admin/Creator account cannot be reassigned from this form.');

      const M=this.fb.M,info=await this.instituteInfo().catch(()=>({}));
      if(accountRole==='principal'&&info?.principalUid&&info.principalUid!==existing.uid)
        throw new Error('Another official Principal is already active. Transfer/remove that Principal first.');

      const allWs=await this.listTradeWorkspaces?.()||[];
      let workspaceIds=[];
      if(accountRole==='principal') workspaceIds=allWs.map(w=>w.id);
      else workspaceIds=[wid];
      workspaceIds=[...new Set(workspaceIds.filter(Boolean))];
      if(!workspaceIds.length && accountRole!=='principal') throw new Error('The selected Trade workspace is not available.');

      // If this activated member was the current Principal and is being changed to another role,
      // clear the institute Principal marker before saving the new role.
      if(info?.principalUid===existing.uid && accountRole!=='principal'){
        await M.updateDoc(this.inst(),{
          principalUid:M.deleteField(),principalEmail:M.deleteField(),
          principalActivatedAt:M.deleteField(),updatedAt:this.now()
        });
      }

      await M.updateDoc(this.memberRef(existing.uid),{
        role:accountRole,active:true,workspaceIds,
        traineeId:accountRole==='student'?traineeId:null,
        displayName:name||existing.displayName||email,
        updatedAt:this.now(),updatedBy:this.fb.user.uid
      });
      await M.setDoc(this.access(email),{
        email,role:accountRole,active:true,workspaceIds,
        traineeId:accountRole==='student'?traineeId:null,
        displayName:name||existing.displayName||email,
        updatedAt:this.now(),updatedBy:this.fb.user.uid
      },{merge:true});

      // Existing Firebase membership is already verified, so any old pending code is invalidated.
      try{await M.setDoc(this.secret(email),{active:false,usedAt:this.now(),usedBy:this.fb.user.uid},{merge:true});}catch(e){}

      if(accountRole==='principal'){
        await M.updateDoc(this.inst(),{
          principalUid:existing.uid,principalEmail:email,
          principalActivatedAt:this.now(),updatedAt:this.now()
        });
      }

      const w=accountRole==='principal'?null:allWs.find(x=>x.id===wid);
      this._lastAdminActivation={
        noCode:true,name:name||existing.displayName||'',email,role:accountRole,
        assignment:accountRole==='principal'
          ? 'Existing activated Google account promoted to Principal. Principal has institute-wide access to all Trade / Batch workspaces.'
          : `Existing activated Google account updated. Assigned to: ${wsLabel(w)}`
      };
      await this.renderAdminPanel(false);
      await this.applyAdminWorkspaceFormRules?.();
      this.renderLastAdminActivation?.();
    }catch(e){
      if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);
    }
  };
}

// Keep the confirmation visible and clearly distinguish "no code needed" from a new account.
const resultBase=V.renderLastAdminActivation?.bind(V);
if(resultBase){
  V.renderLastAdminActivation=function(){
    const x=this._lastAdminActivation;
    if(!x?.noCode) return resultBase();
    const out=document.getElementById('v15AdminResult');if(!out)return;
    out.style.display='block';out.className='callout cloud-ok';
    out.innerHTML=`<b>${esc(label(x.role))} account updated</b><br>${esc(x.name||'')}${x.name?'<br>':''}${esc(x.email)}<br><b>No activation code is required.</b><br><small>${esc(x.assignment||'')}</small><br><small class="muted">This Gmail was already activated earlier. Log out of that account once, then sign in again using the newly assigned role.</small>`;
  };
}

// Improve the failure message instead of allowing a confusing Google-login loop.
const loginBase=V.login?.bind(V);
if(loginBase){
  V.login=async function(...args){
    const r=await loginBase(...args);
    if(!this.ready && this.fb?.user){
      try{
        const email=this.email(this.fb.user.email||'');
        const m=await this.readMember();
        const a=await this.fb.M.getDoc(this.access(email));
        const requested=localStorage.getItem('iti-v15-requested-role-v3')||document.getElementById('loginRole')?.value||'';
        if(m&&a.exists()&&requested&&m.role!==requested&&a.data()?.role===requested){
          this.loginMsg?.(`This Gmail was previously activated as ${label(m.role)} but is now approved as ${label(requested)}. Open System Admin and approve the same Gmail as ${label(requested)} once more; V15 will update the existing account directly and no new activation code will be required.`,true);
        }
      }catch(e){}
    }
    return r;
  };
}

console.info('V15 Principal login stability active.');
})(window.V15Sync);
