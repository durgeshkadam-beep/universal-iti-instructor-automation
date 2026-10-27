/* V15 Skill Verification: Firebase-backed instructor review + student-owned read.
 * Self-assessment remains separate in v15-skill-passport.js.
 * This module does NOT mint government certificates or assess skills using AI.
 */
(function(V){
'use strict';
if(!V)return;
const COLLECTION='skillVerifications';
let instructorRenderGeneration=0;
function role(){return V.currentRole?.()||window.SESSION?.role||'';}
function element(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined&&text!==null)e.textContent=String(text);
  if(cls)e.className=cls;
  return e;
}
function profileRef(studentUid,wid){
  return V.fb.M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',wid,COLLECTION,studentUid);
}
function safeId(item){return 'practical-'+String(item.no);}
function practicals(){
  return (Array.isArray(DATA?.practicals)?DATA.practicals:[])
    .filter(p=>p&&p.no!=null&&p.title).slice(0,200);
}
function formatTime(t){
  if(!t)return '';
  try{const d=t.toDate?t.toDate():new Date(t);return Number.isNaN(d.getTime())?'':d.toLocaleDateString();}catch(e){return '';}
}
function notice(parent,message){parent.replaceChildren(element('p',message,'muted'));}
function validate(){
  if(!V.ready||!V.fb?.M||!V.fb?.db||!V.fb?.user)throw new Error('Verified Google login required.');
  if(!V.workspaceId)throw new Error('No active workspace.');
}
V.getStudentSkillProfile=async function(uid,wid=this.workspaceId){
  validate();
  const snap=await this.fb.M.getDoc(profileRef(uid,wid));
  return snap.exists()?snap.data():null;
};
V.renderVerifiedSkillList=async function(){
  const host=document.getElementById('tab-skills');
  if(!host||role()!=='student'||!this.ready)return;
  let container=host.querySelector('#v15VerifiedSkills');
  if(!container){container=element('section',null,'card');container.id='v15VerifiedSkills';host.append(container);}
  const heading=element('h3','✅ Instructor-verified skills');
  container.replaceChildren(heading,element('p','Loading verified skills…','muted'));
  const uid=this.fb?.user?.uid,workspace=this.workspaceId, institute=this.INSTITUTE_ID;
  if(!uid){notice(container,'Sign in with an approved Google account to see verified skills.');return;}
  try{
    const p=await this.getStudentSkillProfile(uid,workspace);
    if(!this.ready||this.fb?.user?.uid!==uid||this.INSTITUTE_ID!==institute||this.workspaceId!==workspace||role()!=='student'||!host.isConnected)return;
    container.replaceChildren(heading);
    const skills=Object.entries(p?.skills||{}).filter(([,entry])=>entry?.status==='verified');
    if(!skills.length){container.append(element('p','No skills have been instructor-verified yet. Ask your instructor to assess your practical work.','muted'));return;}
    for(const [key,x] of skills){
      const row=element('div',null,'field-row');
      row.style.cssText='padding:10px 0;border-bottom:1px solid #e4e9ed';
      row.append(element('strong',String(x.title||key)));
      row.append(element('p','Instructor verified • '+(formatTime(x.verifiedAt)||'Date unavailable'),'muted'));
      if(x.evidence)row.append(element('p','Evidence: '+String(x.evidence),'muted'));
      container.append(row);
    }
    container.append(element('p','This is an institute practical assessment record, not an NCVT/DVET certificate.','muted'));
  }catch(e){
    if(this.ready&&this.fb?.user?.uid===uid&&this.INSTITUTE_ID===institute&&role()==='student'&&this.workspaceId===workspace&&host.isConnected)notice(container,'Verified skill records are unavailable. Ask your instructor or administrator to check Firestore access.');
  }
};
const priorStudentRender=V.renderSkillPassport;
V.renderSkillPassport=function(){
  priorStudentRender?.call(this);
  this.renderVerifiedSkillList().catch(console.error);
};
V.renderInstructorSkillVerification=async function(){
  if(!this.ready||role()!=='instructor')return;
  const host=document.getElementById('tab-skill-review');
  if(!host)return;
  const generation=++instructorRenderGeneration;
  const actor=this.fb?.user?.uid, institute=this.INSTITUTE_ID, workspace=this.workspaceId;
  const contextIsCurrent=()=>generation===instructorRenderGeneration&&this.ready&&this.fb?.user?.uid===actor&&this.INSTITUTE_ID===institute&&this.workspaceId===workspace&&role()==='instructor'&&host.isConnected;
  host.replaceChildren(element('h2','✅ Instructor Skill Verification'));
  host.append(element('p','Verify assessed practical skills of activated students in your current Trade / Session / Batch. Only verified records are shared to students.','muted'));
  const summary=element('div',null,'card');host.append(summary);
  notice(summary,'Loading activated student accounts…');
  try{
    validate();
    const M=this.fb.M,ws=this.workspaceId;
    const snap=await M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'members'));
    if(!contextIsCurrent())return;
    const candidates=[];
    snap.forEach(doc=>{
      const m=doc.data();
      if(m.role==='student'&&m.active===true&&Array.isArray(m.workspaceIds)&&m.workspaceIds.includes(ws)&&m.traineeId){
        candidates.push({uid:doc.id,traineeId:m.traineeId,name:m.displayName||m.traineeId});
      }
    });
    candidates.sort((a,b)=>a.name.localeCompare(b.name));
    summary.replaceChildren();
    const label=element('label','Choose activated student');summary.append(label);
    const sel=element('select');sel.id='v15SkillReviewStudent';
    const empty=element('option','Select a student…');empty.value='';sel.append(empty);
    candidates.forEach(c=>{const o=element('option',c.name+' • '+c.traineeId);o.value=c.uid;sel.append(o);});
    summary.append(sel);
    const details=element('div');summary.append(details);
    if(!candidates.length)details.append(element('p','No activated Student accounts in this workspace. Approve a student Gmail and complete their first login before verification.','muted'));
    let sequence=0;
    sel.addEventListener('change',async()=>{
      const requestId=++sequence, student=candidates.find(c=>c.uid===sel.value);
      details.replaceChildren();
      if(!student)return;
      details.append(element('p','Loading practical assessment status…','muted'));
      try{
        const profile=await this.getStudentSkillProfile(student.uid,ws);
        if(requestId!==sequence||!contextIsCurrent())return;
        details.replaceChildren();
        const topics=practicals();
        if(!topics.length){details.append(element('p','No practical syllabus published for this workspace.','muted'));return;}
        details.append(element('p','Assess work directly before verifying. Never enter Aadhaar, phone numbers or personal data as evidence.','muted'));
        for(const item of topics){
          const key=safeId(item),current=profile?.skills?.[key];
          const row=element('div',null,'card');row.style.marginTop='12px';
          row.append(element('h4','Practical '+item.no+': '+item.title));
          if(current?.status==='verified'){
            row.append(element('p','Verified • '+(formatTime(current.verifiedAt)||'Date unavailable'),'muted'));
            row.append(element('p','Evidence: '+(current.evidence||'Not recorded'),'muted'));
          }
          const evidence=element('input');evidence.type='text';evidence.maxLength=180;
          evidence.placeholder='Practical assessment evidence (min. 5 characters)';
          evidence.setAttribute('aria-label','Evidence for practical '+item.no);
          row.append(evidence);
          const button=element('button',current?.status==='verified'?'Update verification':'Verify assessed skill','btn primary');
          button.type='button';row.append(button);
          button.addEventListener('click',async()=>{
            if(!contextIsCurrent()||requestId!==sequence||sel.value!==student.uid){alert('Account, workspace or student changed. Reopen this page.');return;}
            const info=evidence.value.trim();
            if(info.length<5){alert('Provide assessment evidence (at least 5 characters).');return;}
            button.disabled=true;
            const oldLabel=button.textContent;button.textContent='Saving verification…';
            try{
              const ref=profileRef(student.uid,ws);
              await M.runTransaction(this.fb.db,async trx=>{
                const old=await trx.get(ref);
                if(!contextIsCurrent()||requestId!==sequence||sel.value!==student.uid)throw new Error('Assessment context changed. Reopen this page.');
                const previous=old.exists()?old.data():null;
                if(previous&&(previous.studentUid!==student.uid||previous.traineeId!==student.traineeId||previous.workspaceId!==ws))throw new Error('Student skill profile identity mismatch.');
                const skills={...(previous?.skills||{})};
                skills[key]={title:String(item.title).slice(0,140),status:'verified',evidence:info,verifiedBy:actor,verifiedAt:M.serverTimestamp()};
                trx.set(ref,{studentUid:student.uid,traineeId:student.traineeId,workspaceId:ws,skills,updatedAt:M.serverTimestamp(),updatedBy:actor});
              });
              if(!contextIsCurrent()||requestId!==sequence||sel.value!==student.uid)return;
              button.textContent='Verified ✓';evidence.value='';
              const msg=element('p','Saved to Firebase. Student can view this verification on My Skills.','muted');row.append(msg);
            }catch(e){if(contextIsCurrent()&&requestId===sequence&&sel.value===student.uid){button.disabled=false;button.textContent=oldLabel;alert('Verification not saved: '+(e.message||e));}}
          });
          details.append(row);
        }
      }catch(e){if(contextIsCurrent()&&requestId===sequence)notice(details,'Unable to load skill verification: '+(e.message||e));}
    });
  }catch(e){if(contextIsCurrent())notice(summary,'Could not open Instructor Skill Verification: '+(e.message||e));}
};
})(window.V15Sync);
