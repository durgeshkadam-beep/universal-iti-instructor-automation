/* V15 UI/bootstrap. */
(function(V){
'use strict';
Object.assign(V,{
 loginMsg(t,err=false){const e=document.getElementById('v15LoginStatus');if(!e)return;e.style.display=t?'block':'none';e.textContent=t;e.className='callout '+(err?'cloud-error':'');},
 disableLegacy(){try{if(window.CloudCenter){CloudCenter.cfg.autoSync=false;CloudCenter.scheduleSync=()=>{};}}catch(e){}},
 hideLegacyAccountUI(){
   // V15 uses Google/Firebase identity. Old local User ID/PIN management must not appear.
   ['staffNameField','staffPinField','studentRollField','studentPinField'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
   const ch=document.getElementById('changePinBtn');if(ch)ch.style.display='none';
   const oldTab=document.querySelector('.tab[data-tab="users"]');if(oldTab)oldTab.style.display='none';
   const oldPanel=document.getElementById('tab-users');if(oldPanel)oldPanel.style.display='none';
 },
 cloudUI(){
   const c=document.getElementById('cloudFirebaseConfig');if(c?.closest('.field'))c.closest('.field').style.display='none';
   const a=document.getElementById('cloudAutoSync');if(a?.closest('label'))a.closest('label').style.display='none';
   document.querySelectorAll('[onclick*="CloudCenter.pushNow"],[onclick*="CloudCenter.restoreFromCloud"],[onclick*="CloudCenter.connectFirebase"],[onclick*="CloudCenter.disconnectFirebase"],[onclick*="CloudCenter.saveSettings"]').forEach(b=>b.style.display='none');
   this.hideLegacyAccountUI();
   const card=c?.closest('.card');
   if(card&&!document.getElementById('v15RealtimePanel')){
     const isOwner=!!this.member?.owner;
     const isPrincipal=SESSION?.role==='principal'||this.member?.role==='principal';
     const canManageStaff=isOwner||isPrincipal;
     const roleLabel=isOwner?'App Admin / Owner':(isPrincipal?'Principal':(SESSION?.role||this.member?.role||'Staff'));
     const d=document.createElement('div');d.id='v15RealtimePanel';
     let manage='';
     if(canManageStaff){
       const roleOptions=isOwner?'<option value="principal">Principal</option><option value="instructor">Instructor</option>':'<option value="instructor">Instructor</option>';
       const help=isOwner?'As App Admin / Owner, create the Principal first. You may also approve an Instructor directly.':'As Principal, approve Instructor Google accounts here. Instructors approve students from Trainee Master.';
       manage=`<div class="card" style="margin-top:14px"><h3>👤 Staff Access Management</h3><p class="muted">${help}</p><div class="field-row"><div class="field" style="flex:2"><label>Approved Google / Gmail</label><input id="v15InviteEmail" type="email" placeholder="staff@gmail.com"></div><div class="field" style="flex:1"><label>Create account as</label><select id="v15InviteRole">${roleOptions}</select></div></div><button class="btn secondary" id="v15InviteBtn">Create first-login activation code</button><p class="muted small-note">The code is used only once. After activation, that staff member signs in using the same Google account only.</p></div>`;
     }else{
       manage='<div class="callout" style="margin-top:14px"><b>Staff accounts</b><br>Only the Principal or App Admin can create Instructor accounts. You can approve students from Trainee Master → Set Gmail.</div>';
     }
     d.innerHTML=`<div class="callout cloud-ok"><b>V15 Shared Realtime Cloud</b><br><span id="v15RealtimeBadge">● Synced</span> — ${this.fb.user?.email||''}<br><small>Signed in as: <b>${roleLabel}</b>. Firebase is built in; no Push/Restore is required.</small></div>${manage}<div class="callout" style="margin-top:14px"><b>V15 account hierarchy</b><br><small>App Admin / Owner → creates Principal → Principal creates Instructors → Instructor creates/approves Students. V14 PIN accounts are no longer used for V15 sign-in.</small></div>`;
     card.insertBefore(d,card.firstChild.nextSibling);
     d.querySelector('#v15InviteBtn')?.addEventListener('click',()=>V.inviteStaffUI());
   }
 },
 wrapSave(){if(typeof saveData!=='function'||saveData.__v15)return;const o=saveData;saveData=function(){const r=o();if(!V.suppressLocalSync)V.schedule();return r;};saveData.__v15=true;},
 loginUI(){
   document.title='Universal ITI Instructor Automation V15';
   const n=document.querySelector('.login-note');if(n)n.textContent='Universal Instructor Automation V15 — Google login + shared realtime Firebase records. No PIN login in V15.';
   const k=document.querySelector('.showcase-kicker');if(k)k.textContent='REALTIME MULTI-USER WORKSPACE';
   const f=document.querySelector('.showcase-footer');if(f)f.textContent='Government ITI workflow • Shared Firebase records • Multi-device';
   this.hideLegacyAccountUI();
   const b=document.querySelector('#loginScreen button[onclick="App.login()"]');
   if(b){b.textContent='🔐 Continue with Google';b.removeAttribute('onclick');b.onclick=()=>V.login(document.getElementById('loginRole')?.value||'instructor');}
   if(!document.getElementById('v15LoginStatus')){const p=document.createElement('div');p.id='v15LoginStatus';p.className='callout';p.style.display='none';p.style.marginTop='12px';b?.insertAdjacentElement('afterend',p);}
   const r=document.getElementById('loginRole');if(r)r.onchange=()=>this.hideLegacyAccountUI();
   App.login=()=>V.login(document.getElementById('loginRole')?.value||'instructor');
   App.logout=()=>V.logout();
 },
 install(){this.loginUI();this.traineeUI();this.wrapSave();this.disableLegacy();console.info('Universal ITI V15 realtime layer ready. V14 local/cloud records are preserved until migration succeeds.');}
});
V.install();
})(window.V15Sync);
