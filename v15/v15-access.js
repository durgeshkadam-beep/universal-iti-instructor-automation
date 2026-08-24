/* V15 access: approved Google emails, first-login codes and trainee Gmail linking. */
(function(V){
'use strict';
Object.assign(V,{
 async invite(email,role,traineeId=null,name=''){
   if(!this.ready||!this.staff()) throw new Error('Staff access required.');
   email=this.email(email);
   if(!this.validEmail(email)) throw new Error('Enter a valid Google/Gmail email address.');

   const isOwner=!!this.member?.owner;
   const currentRole=SESSION?.role||this.member?.role||'';

   // V15 hierarchy:
   // System Owner / App Admin -> Principal (and Instructor for testing/exception)
   // Principal                -> Instructor
   // Instructor               -> Student through Trainee Master
   if(role==='principal' && !isOwner)
     throw new Error('Only the System Owner / App Admin can create a Principal account.');
   if(role==='instructor' && !(isOwner||currentRole==='principal'))
     throw new Error('Only the Principal or System Owner / App Admin can create an Instructor account.');
   if(role==='student' && !(isOwner||currentRole==='instructor'))
     throw new Error('Student Google access must be approved by the Instructor from Trainee Master.');

   const c=this.code(),h=await this.hash(c),M=this.fb.M;
   const a={email,role,traineeId:traineeId||null,displayName:name||'',workspaceIds:[this.workspaceId],active:true,createdBy:this.fb.user.uid,createdAt:this.now()};
   await M.setDoc(this.access(email),a);
   await M.setDoc(this.secret(email),{email,role,codeHash:h,active:true,createdBy:this.fb.user.uid,createdAt:this.now()});
   return c;
 },
 async inviteStudent(t){return t?.email?this.invite(t.email,'student',t.id,t.name||'Student'):null;},
 async setStudentEmail(t){
   if(!(this.member?.owner||SESSION?.role==='instructor'||this.member?.role==='instructor')){
     alert('Only the Instructor can approve a student Google account.');return;
   }
   const e=this.email(prompt(`Approved Google/Gmail for ${t.name}:`,this.email(t.email||''))||'');
   if(!e)return;
   if(!this.validEmail(e)){alert('Enter a valid email address.');return;}
   if((DATA.trainees||[]).some(x=>x.id!==t.id&&this.email(x.email)===e)){alert('This email is already assigned to another trainee.');return;}
   t.email=e;saveData();
   try{
     const c=await this.inviteStudent(t);
     alert(`Student Google account approved.\n\n${t.name}\n${e}\nActivation code: ${c}\n\nGive this code only to this trainee. It is required once on first Google login.`);
   }catch(x){alert('Email saved, but cloud approval failed: '+(x.message||x));}
   Trainees.render();
 },
 async inviteStaffUI(){
   const e=this.email(document.getElementById('v15InviteEmail')?.value||''),r=document.getElementById('v15InviteRole')?.value||'instructor';
   try{
     const c=await this.invite(e,r,null,e);
     alert(`${r==='principal'?'Principal':'Instructor'} account approved.\nEmail: ${e}\nActivation code: ${c}\n\nGive this code privately for first Google login. After activation, future logins use Google only.`);
   }catch(x){alert(x.message||x);}
 },
 traineeUI(){
   if(typeof Trainees==='undefined'||Trainees.__v15Email)return;
   Trainees.__v15Email=true;
   const m=document.getElementById('traineeModal');
   if(m&&!document.getElementById('mEmail')){
     const p=document.getElementById('mPhone')?.closest('.field'),f=document.createElement('div');
     f.className='field';
     f.innerHTML='<label>Approved Google / Gmail <span class="muted">(for student login)</span></label><input id="mEmail" type="email" placeholder="student@gmail.com"><small class="muted">Only this approved Google account can activate the student login.</small>';
     if(p?.parentNode)p.parentNode.insertBefore(f,p.nextSibling);else m.querySelector('.modal-card')?.appendChild(f);
   }
   const oo=Trainees.openForm?.bind(Trainees);
   if(oo)Trainees.openForm=function(){oo();const e=document.getElementById('mEmail');if(e)e.value='';};
   const os=Trainees.submitForm?.bind(Trainees);
   if(os)Trainees.submitForm=function(){
     const e=V.email(document.getElementById('mEmail')?.value||'');
     if(e&&!V.validEmail(e)){alert('Enter a valid Google/Gmail email address.');return;}
     const before=new Set((DATA.trainees||[]).map(x=>x.id));
     os();
     const t=(DATA.trainees||[]).find(x=>!before.has(x.id));
     if(t&&e){t.email=e;saveData();if(V.ready)V.inviteStudent(t).then(c=>alert(`Google login approved for ${e}.\nFirst-login activation code: ${c}`)).catch(x=>alert('Trainee saved, but Google approval failed: '+x.message));}
   };
   const or=Trainees.render?.bind(Trainees);
   if(or)Trainees.render=function(){
     or();
     const b=document.getElementById('traineeTableBody');if(!b)return;
     [...b.querySelectorAll('tr')].forEach((tr,i)=>{
       const t=(DATA.trainees||[])[i];if(!t)return;
       const n=tr.children[1];
       if(n&&t.email&&!n.querySelector('.v15-email')){const s=document.createElement('small');s.className='v15-email muted';s.style.display='block';s.textContent=t.email;n.appendChild(s);}
       const canApproveStudent=SESSION?.role==='instructor'||V.member?.owner;
       if(canApproveStudent){
         const c=tr.lastElementChild;
         if(c&&!c.querySelector('.v15-set-email')){const x=document.createElement('button');x.type='button';x.className='btn ghost small v15-set-email';x.textContent=t.email?'Change Gmail':'Set Gmail';x.onclick=()=>V.setStudentEmail(t);c.appendChild(x);}
       }
     });
   };
 }
});
})(window.V15Sync);
