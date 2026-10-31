/* Authenticated career assistance, private learning-plan sync, and protected exams. */
(function(V){
'use strict';
if(!V)return;
const role=()=>V.currentRole?.()||window.SESSION?.role||'';
const el=(tag,value,parent)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);if(parent)parent.append(n);return n;};
const error=(host,e)=>{host.textContent=e.message||String(e);};
const EXAM_FILE_BYTES=150000;
V.parseSecureExamJSON=function(raw,now=Date.now()){
 if(typeof raw!=='string'||new Blob([raw]).size>EXAM_FILE_BYTES)throw Error('Use a JSON question set up to 150 KB.');
 let e;try{e=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw Error('Invalid JSON. Correct the text and preview it again.');}
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
 if(!exact(e,['id','title','durationMinutes','opensAt','closesAt','questions']))throw Error('Use exactly the six fields in the example template. Student records, extra fields and weighted marks are not supported.');
 if(typeof e.id!=='string'||! /^[A-Za-z0-9_-]{1,160}$/.test(e.id))throw Error('Use an ID of 1–160 letters, numbers, underscores or hyphens. Reusing a published ID cannot overwrite its test.');
 if(typeof e.title!=='string'||!e.title.trim()||e.title.trim().length>140)throw Error('Enter a test title up to 140 characters.');
 if(!Number.isInteger(e.durationMinutes)||e.durationMinutes<1||e.durationMinutes>180)throw Error('Duration must be 1–180 whole minutes.');
 if(!Number.isFinite(e.opensAt)||!Number.isFinite(e.closesAt)||!Number.isFinite(new Date(e.opensAt).getTime())||!Number.isFinite(new Date(e.closesAt).getTime())||e.closesAt<=e.opensAt||e.closesAt<=now)throw Error('Use valid opening/closing timestamps; closing must be later than opening and still in the future.');
 if(!Array.isArray(e.questions)||e.questions.length<1||e.questions.length>100)throw Error('Use 1–100 questions.');
 const questions=e.questions.map((q,i)=>{
  if(!exact(q,['text','options','correctIndex'])||typeof q.text!=='string'||!q.text.trim()||q.text.length>2000||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!q.options.every(x=>typeof x==='string'&&x.trim()&&x.length<=500)||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length)throw Error('Question '+(i+1)+': use text up to 2000 characters, 2–6 nonempty options up to 500 characters each, and a valid zero-based correctIndex. Each question carries one mark.');
  return {text:q.text.trim(),options:q.options.map(x=>x.trim()),correctIndex:q.correctIndex};
 });
 return {id:e.id,title:e.title.trim(),durationMinutes:e.durationMinutes,opensAt:e.opensAt,closesAt:e.closesAt,questions};
};
function examPublisher(host,status,current){
 const form=el('form',null,host);
 const active=()=>current()&&form.isConnected;
 const stale=sent=>{if(status.isConnected)status.textContent=sent?'The previous request may have completed. Reopen its original workspace to check.':'The account or workspace changed. Reopen Tests before publishing.';};
 form.id='exam-publisher';form.style.cssText='display:grid;gap:12px';
 el('p','Create your test, choose the correct answer for each question, and review before publishing. Published tests cannot be edited.',form);
 const controlStyle='display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:44px;padding:10px 12px;margin-top:5px;border:1px solid #b8cbd4;border-radius:12px;background:#fff;color:inherit;font:inherit';
 const field=(parent,label,type,max)=>{const wrap=el('label',label,parent);wrap.style.cssText='display:block;margin-bottom:12px';const input=el(type==='textarea'?'textarea':'input',null,wrap);input.style.cssText=controlStyle;if(type!=='textarea')input.type=type;else input.rows=3;input.required=true;if(max)input.maxLength=max;return input;};
 const title=field(form,'Test title','text',140);
 const duration=field(form,'Duration (minutes)','number');duration.min='1';duration.max='180';duration.step='1';duration.value='30';
 el('p','Opening and closing times use your device’s local time zone.',form);
 const opens=field(form,'Opens at','datetime-local'),closes=field(form,'Closes at','datetime-local');
 const localDate=t=>{const d=new Date(t);return new Date(t-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 opens.value=localDate(Date.now());closes.value=localDate(Date.now()+3600000);
 const questions=el('div',null,form),entries=[];
 const add=el('button','Add question',form);add.type='button';add.className='btn secondary';
 const refresh=()=>{entries.forEach((q,i)=>{q.legend.textContent='Question '+(i+1);q.remove.disabled=entries.length===1;});add.disabled=entries.length>=100;};
 function addQuestion(){
  if(entries.length>=100)return;
  const card=el('fieldset',null,questions);card.className='card';card.style.cssText='min-width:0;overflow-wrap:anywhere';
  const legend=el('legend','',card),text=field(card,'Question text','textarea',2000),options=[];
  for(let i=0;i<4;i++)options.push(field(card,'Option '+(i+1),'text',500));
  const label=el('label','Correct answer',card),answer=el('select',null,card);answer.style.cssText=controlStyle+';margin-bottom:12px';answer.required=true;answer.id='exam-answer-'+crypto.randomUUID();label.htmlFor=answer.id;
  const empty=el('option','Choose the correct option',answer);empty.value='';
  options.forEach((_,i)=>{const option=el('option','Option '+(i+1),answer);option.value=String(i);});
  const remove=el('button','Remove question',card);remove.type='button';remove.className='btn secondary';
  const entry={card,legend,text,options,answer,remove};entries.push(entry);
  remove.onclick=()=>{if(!active()||entries.length===1)return;entries.splice(entries.indexOf(entry),1);card.remove();refresh();};refresh();
 }
 add.onclick=()=>{if(active())addQuestion();};addQuestion();
 const review=el('label',null,form),checked=el('input',null,review);review.style.cssText='display:flex;align-items:flex-start;gap:10px;margin:12px 0';checked.type='checkbox';checked.required=true;checked.style.cssText='width:auto;flex-shrink:0;margin-top:4px';review.append(' I reviewed the questions, correct answers and test schedule.');
 const button=el('button','Publish protected exam',form);button.type='submit';button.className='btn primary';
 const examId='exam-'+crypto.randomUUID();let publishing=false;
 form.onsubmit=async event=>{
  event.preventDefault();if(!active()){stale(false);return;}if(publishing||!form.reportValidity())return;
  const exam={id:examId,title:title.value.trim(),durationMinutes:Number(duration.value),opensAt:new Date(opens.value).getTime(),closesAt:new Date(closes.value).getTime(),questions:entries.map(q=>({text:q.text.value.trim(),options:q.options.map(o=>o.value.trim()),correctIndex:Number(q.answer.value)}))};
  if(!exam.title||exam.questions.some(q=>!q.text||q.options.some(o=>!o))){status.textContent='Enter a title, question and all four answer options.';return;}
  if(!Number.isFinite(exam.opensAt)||!Number.isFinite(exam.closesAt)||exam.closesAt<=exam.opensAt||exam.closesAt<=Date.now()){status.textContent='Closing time must be later than opening time and still in the future.';return;}
  publishing=true;const controls=[...form.querySelectorAll('input,textarea,select,button')],disabled=controls.map(n=>n.disabled);controls.forEach(n=>{n.disabled=true;});status.textContent='Publishing test…';
  try{await V.backendRequest({action:'publishExam',exam});if(!active()){stale(true);return;}form.querySelectorAll('input,textarea,select,button').forEach(n=>{n.disabled=true;});status.textContent='Exam published with private answer key. Students can now open it during its scheduled time.';}
  catch(e){if(active()){status.textContent=(e.message||String(e))+' Your form is retained. If the connection failed, refresh the test list before creating another test.';controls.forEach((n,i)=>{n.disabled=disabled[i];});}else stale(true);}
  finally{publishing=false;}
 };
 // Keep reviewed imports discoverable. Previously this closed accordion followed
 // the long manual question form, so upload/preview/publish controls looked absent.
 const advanced=el('details',null,host);advanced.id='exam-import';
 advanced.open=true;advanced.className='card accent-teal';
 advanced.style.cssText='margin:12px 0 20px;padding:16px;overflow-wrap:anywhere;min-width:0';
 advanced.setAttribute('aria-label','MCQ file upload and reviewed publication');
 const advancedHeading=el('summary','Advanced — MCQ template, file upload, preview & reviewed publish',advanced);
 advancedHeading.style.cssText='font-weight:700;cursor:pointer;padding:6px 0;min-height:40px';
 host.insertBefore(advanced,form);
 const manualHeading=el('h3','Or create questions manually below',form);
 manualHeading.style.cssText='margin:12px 0 0';
 el('p','Download the example, replace its questions, then upload a .json file or paste JSON. Preview and review before publishing. Correct answers go to the protected backend on publication; Students receive questions without the answer key.',advanced);
 const help=el('details',null,advanced);el('summary','How to prepare this question file',help);el('p','The six fields are id, title, durationMinutes, opensAt, closesAt and questions. Times are Unix milliseconds; the preview displays your local date/time. Each question has text, 2–6 options and correctIndex: 0 means the first option, 1 the second, and so on. Each question carries one mark. Use a new ID for a new test. Published tests cannot be edited. Word/PDF/Excel files and weighted marks are not imported.',help);
 const template=el('button','Download example question file',advanced);template.type='button';template.className='btn secondary';
 template.style.cssText='display:block;margin:12px 0';
 template.onclick=()=>{if(!active()||publishing)return;const t=Date.now(),example={id:'exam-'+crypto.randomUUID(),title:'Example — replace with your test title',durationMinutes:30,opensAt:t-60000,closesAt:t+3600000,questions:[{text:'Which format preserves page layout for printing?',options:['TXT','PDF','CSV','LOG'],correctIndex:1}]};const url=URL.createObjectURL(new Blob([JSON.stringify(example,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='ITI-MCQ-example.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const uploadLabel=el('label','Question JSON file (up to 150 KB)',advanced),file=el('input',null,uploadLabel);file.type='file';file.accept='.json,application/json';file.style.cssText=controlStyle;
 uploadLabel.style.cssText='display:block;margin:12px 0';
 const input=el('textarea',null,advanced);input.rows=10;input.maxLength=EXAM_FILE_BYTES;input.setAttribute('aria-label','Exam JSON');input.style.cssText=controlStyle;
 const preview=el('button','Preview JSON question set',advanced);preview.type='button';preview.className='btn secondary';
 preview.style.cssText='display:block;margin:12px 0';
 const previewHost=el('section',null,advanced);previewHost.id='exam-import-preview';previewHost.style.cssText='overflow-wrap:anywhere';
 const consentLabel=el('label',null,advanced),consent=el('input',null,consentLabel);consent.type='checkbox';consent.style.width='auto';consent.disabled=true;consentLabel.append(' I reviewed this imported question set and its schedule.');
 consentLabel.style.cssText='display:flex;align-items:flex-start;gap:10px;margin:16px 0';consent.style.cssText='width:auto;flex-shrink:0;margin-top:4px';
 const raw=el('button','Publish JSON question set',advanced);raw.type='button';raw.className='btn secondary';raw.disabled=true;
 raw.style.cssText='display:block;margin:12px 0';
 let reviewed=null,readGeneration=0,rawPublished=false;
 const invalidate=()=>{reviewed=null;consent.checked=false;consent.disabled=true;raw.disabled=true;previewHost.replaceChildren();};
 input.addEventListener('input',()=>{readGeneration++;invalidate();});
 consent.onchange=()=>{raw.disabled=!reviewed||!consent.checked||publishing||rawPublished;};
 file.onchange=async()=>{
  if(!active()||publishing||rawPublished)return;const selected=file.files?.[0],generation=++readGeneration;invalidate();if(!selected)return;
  if(!/\.json$/i.test(selected.name)||selected.size>EXAM_FILE_BYTES){status.textContent='Select a .json question set up to 150 KB. Your pasted text was retained.';return;}
  try{const text=await selected.text();if(!active()||generation!==readGeneration||publishing||rawPublished)return;input.value=text;status.textContent='File loaded locally. Preview and review it before publishing; no records changed.';}
  catch{if(active()&&generation===readGeneration)status.textContent='File could not be read. Your pasted text was retained.';}
 };
 preview.onclick=()=>{
  if(!active()){stale(false);return;}if(publishing||rawPublished)return;readGeneration++;invalidate();
  try{const exam=V.parseSecureExamJSON(input.value);el('h3',exam.title,previewHost);el('p','Test ID: '+exam.id+' · '+exam.questions.length+' questions · '+exam.durationMinutes+' minutes · '+exam.questions.length+' total marks',previewHost);el('p','Opens: '+new Date(exam.opensAt).toLocaleString()+' · Closes: '+new Date(exam.closesAt).toLocaleString()+' (device local time)',previewHost);
   const list=el('ol',null,previewHost);for(const q of exam.questions){const row=el('li',null,list);el('p',q.text,row);const options=el('ol',null,row);for(const option of q.options)el('li',option,options);el('p','Correct answer: '+(q.correctIndex+1)+'. '+q.options[q.correctIndex],row);}
   reviewed={text:input.value};consent.disabled=false;status.textContent='Preview only. Check every correct answer and both dates, then tick the review box to publish.';
  }catch(e){error(status,e);}
 };
 raw.onclick=async()=>{
  if(!active()){stale(false);return;}if(publishing||rawPublished)return;
  if(!reviewed||reviewed.text!==input.value||!consent.checked){invalidate();status.textContent='Preview and review the current JSON before publishing. Your text was retained.';return;}
  let exam;try{exam=V.parseSecureExamJSON(input.value);}catch(e){invalidate();error(status,e);return;}
  publishing=true;const controls=[...advanced.querySelectorAll('input,textarea,button')],disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);status.textContent='Publishing reviewed question set…';
  try{await V.backendRequest({action:'publishExam',exam});if(!active()){stale(true);return;}rawPublished=true;status.textContent='Exam published with private answer key. Students can now open it during its scheduled time.';}
  catch(e){if(active())status.textContent=(e.message||String(e))+' Your JSON is retained. If a request was sent, reopen this test list to check its ID before retrying.';else stale(true);}
  finally{publishing=false;if(active()&&!rawPublished)controls.forEach((n,i)=>n.disabled=disabled[i]);}
 };
}
V.backendRequest=async function(payload){
 if(!V.ready||!V.fb?.user)throw Error('Verified sign-in required.');
 const url=window.ITI_RUNTIME?.apiUrl;
 if(!url)throw Error('Secure backend is not configured. Ask the administrator; no-key practice remains available.');
 const u=new URL(url,location.href);
 if(u.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(u.hostname)&&['localhost','127.0.0.1'].includes(location.hostname)))throw Error('The API must use HTTPS.');
 const user=V.fb.user,c={uid:user.uid,workspace:V.workspaceId,institute:V.INSTITUTE_ID,role:role()};
 const current=()=>V.ready&&V.fb?.user?.uid===c.uid&&V.workspaceId===c.workspace&&V.INSTITUTE_ID===c.institute&&role()===c.role;
 const token=await user.getIdToken();if(!current())throw Error('The account or workspace changed. Reopen this action.');
 const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},signal:AbortSignal.timeout(55000),body:JSON.stringify({...payload,instituteId:c.institute,workspaceId:c.workspace})});
 const out=await r.json();if(!current())throw Error('The account or workspace changed. The previous request may have completed; reload its workspace to check.');if(!r.ok)throw Error(out.error||'Service unavailable');return out;
};
const planRef=()=>V.fb.M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'studentPlans',V.fb.user.uid);
V.saveStudentPlan=async function(selfRatings,plan){
 if(role()!=='student')throw Error('Student access required.');
 const M=V.fb.M;await M.setDoc(planRef(),{selfRatings,plan,updatedAt:M.serverTimestamp()});
};
V.syncStudentPlan=async function(){
 if(role()!=='student'||!V.ready)return;
 const keys=V.studentStorageKeys?.();if(!keys)throw Error('Student storage identity is not ready.');
 const {selfKey,goalKey}=keys;
 const current=()=>V.ready&&role()==='student'&&V.studentStorageKeys?.()?.goalKey===goalKey;
 const persist=async()=>{
  if(!current())throw Error('Student identity changed. Reopen your learning plan.');
  localStorage.setItem(goalKey+'-pending','1');
  const selfText=localStorage.getItem(selfKey)||'{}',planText=localStorage.getItem(goalKey)||'{}';
  const run=()=>{if(!current())throw Error('Student identity changed. Reopen your learning plan.');return V.saveStudentPlan(JSON.parse(selfText),JSON.parse(planText));};
  const pending=(V._planSave||Promise.resolve()).catch(()=>{}).then(run);V._planSave=pending;
  await pending;
  if(current()&&(localStorage.getItem(selfKey)||'{}')===selfText&&(localStorage.getItem(goalKey)||'{}')===planText)localStorage.removeItem(goalKey+'-pending');
 };
 V.persistStudentPlan=persist;
 const snap=await V.fb.M.getDoc(planRef());
 if(!current())return;
 if(snap.exists()&&!localStorage.getItem(goalKey+'-pending')){
  const d=snap.data();localStorage.setItem(selfKey,JSON.stringify(d.selfRatings||{}));localStorage.setItem(goalKey,JSON.stringify(d.plan||{}));
 }
 if(localStorage.getItem(goalKey+'-pending'))await persist();
};
V.renderCareerCoach=function(){
 if(role()!=='student'||!V.ready)return;
 const host=document.getElementById('tab-career-coach');if(!host)return;
 const generation=V._coachRenderGeneration=(V._coachRenderGeneration||0)+1,workspace=V.workspaceId,uid=V.fb?.user?.uid,api=window.ITI_RUNTIME?.apiUrl;
 const current=()=>V._coachRenderGeneration===generation&&role()==='student'&&V.workspaceId===workspace&&V.fb?.user?.uid===uid&&window.ITI_RUNTIME?.apiUrl===api;
 host.replaceChildren();el('h2','Career Guidance, Resume & Mock Interview',host);
 const note=el('p','Choose a language and topic, then start free guided practice. These are structured learning templates, not AI-generated answers. Do not enter Aadhaar, phone numbers or private records.',host);note.className='callout';
 const label=el('label','Language',host),language=el('select',null,host);language.id='coach-language';label.htmlFor=language.id;
 for(const [value,title] of [['mr','मराठी'],['hi','हिन्दी'],['en','English']]){const o=el('option',title,language);o.value=value;}
 const taskLabel=el('label','Assistance',host),task=el('select',null,host);task.id='coach-task';taskLabel.htmlFor=task.id;
 for(const [value,title] of [['career','Career guidance'],['resume','Resume outline'],['interview','Mock interview']]){const o=el('option',title,task);o.value=value;}
 const inputLabel=el('label','Your goal, skills or practice answer (optional)',host),input=el('textarea',null,host);input.id='coach-input';input.maxLength=12000;input.rows=5;inputLabel.htmlFor=input.id;
 const output=el('pre','',host);output.id='coach-output';output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';output.setAttribute('aria-live','polite');
 const guide=el('button','Start free guided practice',host);guide.className='btn primary';guide.onclick=()=>{output.textContent=ITIGuidance.offlineGuide(task.value,language.value,input.value);};
 const status=el('p',api?'Checking optional AI configuration… Free guided practice is ready.':'AI-generated drafts are not enabled here. Free guided practice is ready.',host);status.id='coach-ai-status';status.setAttribute('role','status');
 if(!api)return;
 V.backendRequest({action:'capabilities'}).then(capabilities=>{
 if(!current())return;
 if(capabilities?.aiConfigured!==true){status.textContent='AI-generated drafts are not enabled here. Free guided practice is ready.';return;}
 status.textContent='An optional AI provider is configured. Generated drafts require your consent and review.';
 const consentLabel=el('label',null,host);consentLabel.style.display='block';const consent=el('input',null,consentLabel);consent.type='checkbox';consent.style.width='auto';consentLabel.append(' I consent to sending only the text above to the configured AI provider.');
 const ai=el('button','Request optional AI draft',host);ai.className='btn';ai.disabled=!window.ITI_RUNTIME?.apiUrl;
 ai.onclick=async()=>{if(!consent.checked){output.textContent='Consent is required for external AI.';return;}ai.disabled=true;output.textContent='Preparing reviewable draft…';try{const out=await V.backendRequest({action:'ai',task:task.value,language:language.value,input:input.value,consent:true});output.textContent=(out.mode==='guided'?'Guided mode (AI disabled):\n':'AI draft — check accuracy:\n')+out.text;}catch(e){error(output,e);}finally{ai.disabled=false;}};
 }).catch(()=>{if(current())status.textContent='Optional AI configuration could not be checked. Free guided practice is ready.';});
};
const oldExamLoad=V.load?.bind(V);
if(oldExamLoad)V.load=function(...args){this._examRenderGeneration=(this._examRenderGeneration||0)+1;return oldExamLoad(...args);};
V.renderSecureExams=async function(){
 const host=document.getElementById('tab-exams');if(!host)return;
 const currentRole=role(),student=currentRole==='student';
 const generation=V._examRenderGeneration=(V._examRenderGeneration||0)+1,workspace=V.workspaceId,uid=V.fb?.user?.uid,institute=V.INSTITUTE_ID,db=V.fb?.db,api=window.ITI_RUNTIME?.apiUrl;
 const current=()=>V.ready===true&&V._examRenderGeneration===generation&&role()===currentRole&&V.workspaceId===workspace&&V.fb?.user?.uid===uid&&V.INSTITUTE_ID===institute&&V.fb?.db===db&&window.ITI_RUNTIME?.apiUrl===api;
 host.replaceChildren();
 if(!V.ready||(!student&&currentRole!=='instructor')){el('p',V.ready?'Tests are not available for this role.':'Wait for your workspace to finish loading.',host);return;}
 el('h2',student?'Secure Class Tests':'Secure MCQ Examinations',host);
 el('p','Official scores are calculated only by the trusted backend. Answer keys are never sent to students. Tests require an online connection.',host);
 const status=el('p','',host);status.setAttribute('role','status');
 const stale=sent=>{if(status.isConnected)status.textContent=sent?'The previous request may have completed. Reopen its original workspace to check.':'The account or workspace changed. Reopen Tests before continuing.';};
 if(!window.ITI_RUNTIME?.apiUrl){status.textContent='Online tests are not yet available on this site. Your other training activities remain available.';const back=el('button','Back to dashboard',host);back.className='btn secondary';back.onclick=()=>V.finalOpenTab('dashboard');return;}
 if(!student)examPublisher(host,status,current);
 try{
  const M=V.fb.M,c=M.collection(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'secureExams');
  const z=await M.getDocs(student?M.query(c,M.where('published','==',true)):c);
  if(!current())return;
  if(z.empty)el('p','No published tests yet.',host);
  z.forEach(doc=>{
   const exam=doc.data(),card=el('section',null,host);card.className='card';el('h3',exam.title,card);el('p',exam.durationMinutes+' minutes • '+exam.questions.length+' questions',card);
   if(!student)return;
   const active=()=>current()&&card.isConnected;
   const start=el('button','Start / resume test',card);start.className='btn primary';let starting=false,started=false;
   start.onclick=async()=>{if(!active()){stale(false);return;}if(starting||started)return;starting=true;start.disabled=true;try{
    const session=await V.backendRequest({action:'startExam',examId:doc.id});
    if(!active()){stale(true);return;}started=true;
    if(session.result){el('p','Result: '+session.result.score+' / '+session.result.total,card);return;}
    start.remove();el('p','Submit by '+new Date(session.deadline).toLocaleString(),card);
    const selections=[];let submitting=false,complete=false;
    exam.questions.forEach((q,j)=>{const f=el('fieldset',null,card);el('legend',(j+1)+'. '+q.text,f);q.options.forEach((o,k)=>{const label=el('label',null,f);label.style.display='block';const radio=el('input',null,label);radio.type='radio';radio.name='exam-'+doc.id+'-'+j;radio.style.width='auto';radio.onchange=()=>{if(active()&&!submitting&&!complete)selections[j]=k;};label.append(' '+o);});});
    const submit=el('button','Submit answers for server grading',card);submit.className='btn primary';
    const lock=value=>card.querySelectorAll('input,button').forEach(n=>{n.disabled=value;});
    submit.onclick=async()=>{if(!active()){stale(false);return;}if(submitting||complete)return;submitting=true;lock(true);try{const out=await V.backendRequest({action:'submitExam',examId:doc.id,answers:exam.questions.map((_,j)=>selections[j]??null)});if(!active()){stale(true);return;}complete=true;el('p','Result: '+out.result.score+' / '+out.result.total,card);}catch(e){if(active())error(status,e);else stale(true);}finally{submitting=false;if(active()&&!complete)lock(false);}};
   }catch(e){if(active()){error(status,e);if(!started)start.disabled=false;}else stale(true);}finally{starting=false;}};
  });
 }catch(e){if(current())error(status,e);}
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
