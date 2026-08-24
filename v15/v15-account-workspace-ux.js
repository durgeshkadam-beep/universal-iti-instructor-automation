/* V15 account/workspace UX finalizer.
 * Loaded after multitrade patches.
 * - Principal is institute-wide: no Trade selector is needed.
 * - Instructor/Staff is assigned to a selected Trade + Session + Batch workspace.
 * - Student is assigned to one workspace and one trainee from that workspace.
 * - Generated first-login code stays visible after Admin Panel re-renders.
 */
(function(V){
'use strict';
if(!V) return;

const LABEL={principal:'Principal',instructor:'Instructor',staff:'Staff (read-only)',student:'Student'};
function role(){return SESSION?.role||'';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function wsLabel(w){return [w?.trade||'Unnamed Trade',w?.session||'',w?.batch||''].filter(Boolean).join(' • ');}
function natural(a,b){return String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'});}

V._lastAdminActivation=V._lastAdminActivation||null;

V.adminSelectedWorkspace=async function(){
  const wid=document.getElementById('v15AdminWorkspace')?.value||'';
  if(!wid)return null;
  const all=await this.listTradeWorkspaces?.()||[];
  return all.find(x=>x.id===wid)||null;
};

V.populateAdminStudentTrainees=async function(){
  if(role()!=='admin')return;
  const roleEl=document.getElementById('v15AdminRole');
  const trainee=document.getElementById('v15AdminTrainee');
  const wid=document.getElementById('v15AdminWorkspace')?.value||'';
  if(!trainee||roleEl?.value!=='student')return;
  trainee.innerHTML='<option value="">Loading trainees…</option>';
  if(!wid){trainee.innerHTML='<option value="">Select Trade / Batch first…</option>';return;}
  try{
    const M=this.fb.M,ref=M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid,'trainees');
    const z=await M.getDocs(ref),arr=[];
    z.forEach(d=>{const x=d.data()?.data;if(x)arr.push(x);});
    arr.sort((a,b)=>natural(a.roll,b.roll)||natural(a.name,b.name));
    trainee.innerHTML='<option value="">Select trainee…</option>'+arr.map(t=>`<option value="${esc(t.id)}">${esc(t.roll||'—')} — ${esc(t.name||'')}</option>`).join('');
    if(!arr.length) trainee.innerHTML='<option value="">No trainees in this Trade workspace</option>';
  }catch(e){
    trainee.innerHTML='<option value="">Could not load trainees</option>';
  }
};

V.applyAdminWorkspaceFormRules=async function(){
  if(role()!=='admin')return;
  const roleEl=document.getElementById('v15AdminRole');
  const wsField=document.getElementById('v15AdminWorkspaceField');
  const wsSel=document.getElementById('v15AdminWorkspace');
  const traineeField=document.getElementById('v15AdminTraineeField');
  if(!roleEl)return;

  // Add a plain-language explanation once per Admin form render.
  let expl=document.getElementById('v15WorkspaceLogicHelp');
  if(!expl){
    expl=document.createElement('div');expl.id='v15WorkspaceLogicHelp';expl.className='callout';expl.style.margin='10px 0';
    expl.innerHTML='<b>How Trade assignment works</b><br><small><b>Principal:</b> automatically oversees every Trade/Batch — no Trade selection. &nbsp; <b>Instructor/Staff:</b> choose the Trade/Batch they work in. &nbsp; <b>Student:</b> choose the Trade/Batch first, then link the exact trainee.</small>';
    roleEl.closest('.field')?.insertAdjacentElement('afterend',expl);
  }

  const r=roleEl.value;
  if(wsField){
    const lab=wsField.querySelector('label');if(lab)lab.textContent='Assigned Trade / Batch';
    const small=wsField.querySelector('small');
    if(r==='principal'){
      wsField.style.display='none';
    }else{
      wsField.style.display='';
      if(small)small.textContent=r==='student'?'Choose the trainee’s Trade / Session / Batch. The trainee list below will come only from this workspace.':'This account will see and work only in the selected Trade / Session / Batch.';
    }
  }

  if(traineeField) traineeField.style.display=r==='student'?'':'none';
  if(r==='student') await this.populateAdminStudentTrainees();

  if(!roleEl.dataset.workspaceUxBound){
    roleEl.dataset.workspaceUxBound='1';
    roleEl.addEventListener('change',()=>V.applyAdminWorkspaceFormRules().catch(console.error));
  }
  if(wsSel&&!wsSel.dataset.workspaceUxBound){
    wsSel.dataset.workspaceUxBound='1';
    wsSel.addEventListener('change',()=>V.populateAdminStudentTrainees().catch(console.error));
  }
};

V.renderLastAdminActivation=function(){
  const x=this._lastAdminActivation;if(!x)return;
  const out=document.getElementById('v15AdminResult');if(!out)return;
  out.style.display='block';out.className='callout cloud-ok';
  out.innerHTML=`<b>${esc(LABEL[x.role]||x.role)} approved</b><br>${esc(x.name||'')} ${x.name?'<br>':''}${esc(x.email)}<br><b>First-login activation code: <span id="v15LastCode">${esc(x.code)}</span></b><br><small>${esc(x.assignment||'')}</small><br><button type="button" class="btn ghost small" id="v15CopyActivation" style="margin-top:8px">Copy code</button> <small class="muted">Keep this page open until you have given the code privately.</small>`;
  out.querySelector('#v15CopyActivation')?.addEventListener('click',async e=>{
    try{await navigator.clipboard.writeText(String(x.code));e.currentTarget.textContent='Copied';}
    catch(err){e.currentTarget.textContent='Code: '+x.code;}
  });
};

// Replace the old Admin invitation flow because it displayed the code BEFORE re-rendering,
// then renderAdminPanel() erased it immediately.
V.createAdminInvitation=async function(){
  if(!(this.member?.owner&&role()==='admin')) throw new Error('System Admin access required.');
  const email=this.email(document.getElementById('v15AdminEmail')?.value||'');
  const name=String(document.getElementById('v15AdminName')?.value||'').trim();
  const accountRole=document.getElementById('v15AdminRole')?.value||'instructor';
  const wid=document.getElementById('v15AdminWorkspace')?.value||'';
  const traineeId=accountRole==='student'?(document.getElementById('v15AdminTrainee')?.value||''):null;
  try{
    if(!this.validEmail(email)) throw new Error('Enter a valid Google/Gmail address.');
    if(!['principal','instructor','staff','student'].includes(accountRole)) throw new Error('Select a valid role.');
    if(accountRole!=='principal'&&!wid) throw new Error('Select the Trade / Session / Batch for this account.');
    if(accountRole==='student'&&!traineeId) throw new Error('Select the trainee from the selected Trade workspace.');
    const info=await this.instituteInfo().catch(()=>({}));
    if(accountRole==='principal'&&info?.principalUid) throw new Error('A Principal is already active. Change/transfer the current Principal first.');

    const w=accountRole==='principal'?null:await this.adminSelectedWorkspace();
    const code=await this.invite(email,accountRole,traineeId,name||email);
    this._lastAdminActivation={
      name:name||'',email,role:accountRole,code,
      assignment:accountRole==='principal'
        ? 'Institute-wide access: Principal automatically oversees all Trade / Session / Batch workspaces.'
        : `Assigned to: ${wsLabel(w)||'selected Trade workspace'}${accountRole==='student'?' • linked to selected trainee':''}`
    };
    await this.renderAdminPanel(false);
    await this.applyAdminWorkspaceFormRules();
    this.renderLastAdminActivation();
  }catch(e){
    const out=document.getElementById('v15AdminResult');
    if(out){out.style.display='block';out.className='callout cloud-error';out.textContent=e.message||String(e);}else alert(e.message||e);
  }
};

// Final wrapper: every Admin Panel render gets the clearer role rules and restores the last code.
const renderBase=V.renderAdminPanel?.bind(V);
if(renderBase){
  V.renderAdminPanel=async function(...args){
    const r=await renderBase(...args);
    if(role()==='admin'){
      await this.injectAdminWorkspaceSelect?.();
      await this.applyAdminWorkspaceFormRules();
      this.renderLastAdminActivation();
    }
    return r;
  };
}

// Principal staff creation should also use a clearer Trade label.
const principalInjectBase=V.injectPrincipalWorkspaceSelect?.bind(V);
if(principalInjectBase){
  V.injectPrincipalWorkspaceSelect=async function(...args){
    const r=await principalInjectBase(...args);
    const f=document.getElementById('v15StaffWorkspaceField');
    if(f){const l=f.querySelector('label');if(l)l.textContent='Assigned Trade / Batch';const s=f.querySelector('small');if(s)s.textContent='Choose the Trade / Session / Batch this Instructor or Staff member belongs to.';}
    return r;
  };
}

setTimeout(()=>{if(V.ready&&role()==='admin')V.renderAdminPanel(false).catch(console.error);},0);
console.info('V15 account/workspace UX finalizer active.');
})(window.V15Sync);
