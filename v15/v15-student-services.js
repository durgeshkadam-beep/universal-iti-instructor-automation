/* Authenticated career assistance, private learning-plan sync, and protected exams. */
(function(V){
'use strict';
if(!V)return;
const role=()=>V.currentRole?.()||window.SESSION?.role||'';
const el=(tag,value,parent)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);if(parent)parent.append(n);return n;};
const error=(host,e)=>{host.textContent=e.message||String(e);};
V.backendRequest=async function(payload){
 if(!V.ready||!V.fb?.user)throw Error('Verified sign-in required.');
 const url=window.ITI_RUNTIME?.apiUrl;
 if(!url)throw Error('Secure backend is not configured. Ask the administrator; no-key practice remains available.');
 const u=new URL(url,location.href);
 if(u.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(u.hostname)&&['localhost','127.0.0.1'].includes(location.hostname)))throw Error('The API must use HTTPS.');
 const token=await V.fb.user.getIdToken();
 const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},signal:AbortSignal.timeout(55000),body:JSON.stringify({...payload,instituteId:V.INSTITUTE_ID,workspaceId:V.workspaceId})});
 const out=await r.json();if(!r.ok)throw Error(out.error||'Service unavailable');return out;
};
const planRef=()=>V.fb.M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'studentPlans',V.fb.user.uid);
V.saveStudentPlan=async function(selfRatings,plan){
 if(role()!=='student')throw Error('Student access required.');
 const M=V.fb.M;await M.setDoc(planRef(),{selfRatings,plan,updatedAt:M.serverTimestamp()});
};
V.syncStudentPlan=async function(){
 if(role()!=='student'||!V.ready)return;
 const ws=V.workspaceId,uid=V.fb.user.uid,tid=V.member.traineeId;
 const selfKey='iti-v15-student-skill-self-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(ws);
 const goalKey='iti-v15-career-plan-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(ws)+'-'+encodeURIComponent(tid);
 const persist=async()=>{
  if(role()!=='student'||ws!==V.workspaceId||uid!==V.fb.user?.uid)throw Error('Student identity changed. Reopen your learning plan.');
  localStorage.setItem(goalKey+'-pending','1');
  const selfText=localStorage.getItem(selfKey)||'{}',planText=localStorage.getItem(goalKey)||'{}';
  const run=()=>V.saveStudentPlan(JSON.parse(selfText),JSON.parse(planText));
  const pending=(V._planSave||Promise.resolve()).catch(()=>{}).then(run);V._planSave=pending;
  await pending;
  if((localStorage.getItem(selfKey)||'{}')===selfText&&(localStorage.getItem(goalKey)||'{}')===planText)localStorage.removeItem(goalKey+'-pending');
 };
 V.persistStudentPlan=persist;
 const snap=await V.fb.M.getDoc(planRef());
 if(role()!=='student'||ws!==V.workspaceId||uid!==V.fb.user?.uid)return;
 if(snap.exists()&&!localStorage.getItem(goalKey+'-pending')){
  const d=snap.data();localStorage.setItem(selfKey,JSON.stringify(d.selfRatings||{}));localStorage.setItem(goalKey,JSON.stringify(d.plan||{}));
 }
 if(localStorage.getItem(goalKey+'-pending'))await persist();
};
V.renderCareerCoach=function(){
 if(role()!=='student'||!V.ready)return;
 const host=document.getElementById('tab-career-coach');if(!host)return;
 host.replaceChildren();el('h2','Career Guidance, Resume & Mock Interview',host);
 const note=el('p','Choose a language and topic, then start free guided practice. These are structured learning templates, not AI-generated answers. Do not enter Aadhaar, phone numbers or private records.',host);note.className='callout';
 const label=el('label','Language',host),language=el('select',null,host);language.id='coach-language';label.htmlFor=language.id;
 for(const [value,title] of [['mr','मराठी'],['hi','हिन्दी'],['en','English']]){const o=el('option',title,language);o.value=value;}
 const taskLabel=el('label','Assistance',host),task=el('select',null,host);task.id='coach-task';taskLabel.htmlFor=task.id;
 for(const [value,title] of [['career','Career guidance'],['resume','Resume outline'],['interview','Mock interview']]){const o=el('option',title,task);o.value=value;}
 const inputLabel=el('label','Your goal, skills or practice answer (optional)',host),input=el('textarea',null,host);input.id='coach-input';input.maxLength=12000;input.rows=5;inputLabel.htmlFor=input.id;
 const output=el('pre','',host);output.id='coach-output';output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';output.setAttribute('aria-live','polite');
 const guide=el('button','Start free guided practice',host);guide.className='btn primary';guide.onclick=()=>{output.textContent=ITIGuidance.offlineGuide(task.value,language.value,input.value);};
 if(!window.ITI_RUNTIME?.apiUrl){el('p','AI-generated drafts are not available on this site. Guided practice is ready to use.',host);return;}
 const consentLabel=el('label',null,host);consentLabel.style.display='block';const consent=el('input',null,consentLabel);consent.type='checkbox';consent.style.width='auto';consentLabel.append(' I consent to sending only the text above to the configured AI provider.');
 const ai=el('button','Request optional AI draft',host);ai.className='btn';ai.disabled=!window.ITI_RUNTIME?.apiUrl;
 ai.onclick=async()=>{if(!consent.checked){output.textContent='Consent is required for external AI.';return;}ai.disabled=true;output.textContent='Preparing reviewable draft…';try{const out=await V.backendRequest({action:'ai',task:task.value,language:language.value,input:input.value,consent:true});output.textContent=(out.mode==='guided'?'Guided mode (AI disabled):\n':'AI draft — check accuracy:\n')+out.text;}catch(e){error(output,e);}finally{ai.disabled=false;}};
};
V.renderSecureExams=async function(){
 const host=document.getElementById('tab-exams');if(!host)return;
 const student=role()==='student';if(!student&&role()!=='instructor')return;
 host.replaceChildren();el('h2',student?'Secure Class Tests':'Secure MCQ Examinations',host);
 el('p','Official scores are calculated only by the trusted backend. Answer keys are never sent to students. Tests require an online connection.',host);
 const status=el('p','',host);status.setAttribute('role','status');
 if(!window.ITI_RUNTIME?.apiUrl){status.textContent='Online tests are not yet available on this site. Your other training activities remain available.';const back=el('button','Back to dashboard',host);back.className='btn secondary';back.onclick=()=>V.finalOpenTab('dashboard');return;}
 if(!student){
  el('p','Publish a reviewed question set as JSON: id, title, durationMinutes, opensAt/closesAt (epoch milliseconds), questions [{text, options, correctIndex}]. Published tests are immutable. Use synthetic data in staging.',host);
  const input=el('textarea',null,host);input.rows=10;input.setAttribute('aria-label','Exam JSON');
  const button=el('button','Publish protected exam',host);button.className='btn primary';button.onclick=async()=>{button.disabled=true;try{await V.backendRequest({action:'publishExam',exam:JSON.parse(input.value)});status.textContent='Exam published with private answer key.';}catch(e){error(status,e);}finally{button.disabled=false;}};
 }
 try{
  const M=V.fb.M,c=M.collection(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'secureExams');
  const z=await M.getDocs(student?M.query(c,M.where('published','==',true)):c);
  if(z.empty)el('p','No published tests yet.',host);
  z.forEach(doc=>{
   const exam=doc.data(),card=el('section',null,host);card.className='card';el('h3',exam.title,card);el('p',exam.durationMinutes+' minutes • '+exam.questions.length+' questions',card);
   if(!student)return;
   const start=el('button','Start / resume test',card);start.className='btn primary';
   start.onclick=async()=>{start.disabled=true;try{
    const session=await V.backendRequest({action:'startExam',examId:doc.id});
    if(session.result){el('p','Result: '+session.result.score+' / '+session.result.total,card);return;}
    start.remove();el('p','Submit by '+new Date(session.deadline).toLocaleString(),card);
    const selections=[];
    exam.questions.forEach((q,j)=>{const f=el('fieldset',null,card);el('legend',(j+1)+'. '+q.text,f);q.options.forEach((o,k)=>{const label=el('label',null,f);label.style.display='block';const radio=el('input',null,label);radio.type='radio';radio.name='exam-'+doc.id+'-'+j;radio.style.width='auto';radio.onchange=()=>{selections[j]=k;};label.append(' '+o);});});
    const submit=el('button','Submit answers for server grading',card);submit.className='btn primary';submit.onclick=async()=>{submit.disabled=true;try{const out=await V.backendRequest({action:'submitExam',examId:doc.id,answers:exam.questions.map((_,j)=>selections[j]??null)});el('p','Result: '+out.result.score+' / '+out.result.total,card);card.querySelectorAll('input,button').forEach(n=>{n.disabled=true;});}catch(e){error(status,e);submit.disabled=false;}};
   }catch(e){error(status,e);start.disabled=false;}};
  });
 }catch(e){error(status,e);}
};
// Save online copies only after explicit student edits. Local scoped data remains usable offline.
const oldOpen=V.finalOpenTab?.bind(V);
V.finalOpenTab=async function(name){
 if(role()==='student'&&['skills','skill-gap'].includes(name)){
  try{await V.syncStudentPlan();}catch(e){console.warn('Student plan pending',e.code||'offline');}
 }
 return oldOpen?.(name);
};
window.addEventListener('online',()=>{if(role()==='student')V.syncStudentPlan().catch(()=>{});});
})(window.V15Sync);
