/* V15 Skill Gap: personal learning plan against real, instructor-verified practicals.
 * No job vacancy feed, official occupation standard, AI, GPS or cloud write here.
 * The learner selects a target role and skills manually. It is NOT job eligibility.
 */
(function(V){
'use strict';
if(!V)return;
const PREFIX='iti-v15-career-plan-v1-';
let renderGeneration=0;
const OPTIONS=new Set(['not-started','learning','can-demonstrate']);
function currentRole(){return V.currentRole?.()||window.SESSION?.role||'';}
function node(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined&&text!==null)e.textContent=String(text);
  if(cls)e.className=cls;
  return e;
}
function identity(){const k=V.studentStorageKeys?.();return k?{...k,key:k.goalKey}:null;}
function skills(){
  const seen=new Set();
  return (Array.isArray(DATA?.practicals)?DATA.practicals:[])
    .filter(p=>p&&p.no!=null&&p.title)
    .map(p=>({id:'practical-'+String(p.no),name:'Practical '+String(p.no)+': '+String(p.title)}))
    .filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;})
    .slice(0,200);
}
function read(key){
  try{const d=JSON.parse(localStorage.getItem(key)||'null');return d&&typeof d==='object'&&!Array.isArray(d)?d:null;}catch(e){return null;}
}
function selfRatings(){const k=V.studentStorageKeys?.();return k?(read(k.selfKey)||{}):{};}
V.calculateSkillGap=function(requiredIds,profile,self){
  const ids=[...new Set((Array.isArray(requiredIds)?requiredIds:[]).filter(x=>typeof x==='string'&&x.startsWith('practical-')))];
  const verified=new Set(Object.entries(profile?.skills||{})
    .filter(([key,value])=>key.startsWith('practical-')&&value?.status==='verified')
    .map(([key])=>key));
  const complete=ids.filter(k=>verified.has(k));
  const missing=ids.filter(k=>!verified.has(k));
  const steps=missing.map(k=>{
    const rating=OPTIONS.has(self?.[k])?self[k]:'not-started';
    return {id:k,rating,action:rating==='can-demonstrate'?'Request Instructor assessment':rating==='learning'?'Continue practical exercises':'Begin learning this practical'};
  });
  return {total:ids.length,completed:complete.length,missing,steps,
    percent:ids.length?Math.round(100*complete.length/ids.length):null};
};
function renderStats(host,requested,profile,self,topicMap,roleName){
  host.replaceChildren();
  const result=V.calculateSkillGap(requested,profile,self);
  const heading=node('h3','3. My verified progress / माझी पडताळलेली प्रगती');
  host.append(heading);
  host.append(node('p','Skill Gap = selected practicals the Instructor has NOT yet verified. A self-rating does not count as Instructor verification.','muted'));
  host.append(node('p','Your goal: '+(roleName||'Trade practical learning (no role entered)'),'skill-gap-goal-summary'));
  if(!result.total){host.append(node('p','No practicals selected. Search and tick a few useful practicals above to see your learning steps. No percentage is calculated until you select at least one.','muted'));return;}
  const stats=node('div',null,'skill-gap-summary');
  stats.append(node('strong',result.completed+' / '+result.total+' verified'));
  stats.append(node('strong',result.percent+'% learning coverage'));
  stats.append(node('strong',result.missing.length+' not yet verified'));
  host.append(stats);
  host.append(node('p','This percentage is only Instructor-verified coverage of YOUR selected practicals. It is NOT an overall skills score, job eligibility score or placement chance.','skill-gap-score-note'));
  const bar=node('div');bar.style.cssText='height:11px;border-radius:9px;background:#e7eef2;overflow:hidden;margin:12px 0';
  bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');
  bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(result.percent));
  bar.setAttribute('aria-label','Instructor-verified learning coverage');
  const fill=node('div');fill.style.cssText='height:100%;border-radius:9px;background:#087e86;width:'+result.percent+'%';
  bar.append(fill);host.append(bar);
  if(!result.steps.length){host.append(node('p','All selected practicals are instructor-verified. You can choose more challenging practicals with your instructor.','muted'));return;}
  host.append(node('h4','Next learning actions / पुढील सराव'));
  result.steps.forEach((step,i)=>{
    const row=node('div',null,'field-row');
    row.style.cssText='padding:10px 0;border-bottom:1px solid #e4e9ed';
    row.append(node('strong',(i+1)+'. '+(topicMap.get(step.id)||step.id)));
    const label={'not-started':'Not started','learning':'Learning','can-demonstrate':'I can demonstrate'}[step.rating]||'Not started';
    row.append(node('p','Next action: '+step.action+' · My self-rating: '+label+' · Instructor verification pending','muted'));
    host.append(row);
  });
}
V.renderStudentSkillGap=async function(){
  const host=document.getElementById('tab-skill-gap');
  if(!host||currentRole()!=='student'||!this.ready)return;
  const generation=++renderGeneration, institute=V.INSTITUTE_ID;
  host.replaceChildren();
  const h=node('div',null,'hero'),head=node('div',null,'hero-content');
  head.append(node('h2','🎯 My Learning Plan (Skill Gap)'));
  head.append(node('p','मी काय शिकलो? अजून कोणत्या practicals चा सराव किंवा Instructor assessment हवा? Choose a few Trade practicals, then see your next learning actions.'));
  h.append(head);host.append(h);
  const id=identity();
  if(!id){host.append(node('div','An activated Student account linked to a trainee and Trade is required.','callout'));return;}
  const active=()=>generation===renderGeneration&&V.ready&&currentRole()==='student'&&V.INSTITUTE_ID===institute&&identity()?.key===id.key&&host.isConnected;
  const help=node('section',null,'card skill-gap-howto');
  help.append(node('h3','How it works / कसे वापरायचे?'));
  const steps=node('ol',null,'skill-gap-step-list');
  for(const step of [
    'My Skills: mark your own level for each practical. Instructor verification is separate.',
    'Choose: enter an optional study goal, select the practicals you want to work on and Save.',
    'Improve: see which selected practicals are not yet Instructor-verified, practise them and request assessment.'
  ])steps.append(node('li',step));
  help.append(steps);
  const openSkills=node('button','Open My Skills / माझी कौशल्ये','btn secondary');openSkills.type='button';
  openSkills.addEventListener('click',()=>{if(active())V.finalOpenTab?.('skills')?.catch?.(console.error);});
  help.append(openSkills);
  help.append(node('p','Example: If you choose 5 practicals and the Instructor has verified 2, your gap is 3. The 40% describes only those 5 selected tasks, not your employability.','skill-gap-example'));
  host.append(help);
  const topics=skills();
  if(!topics.length){host.append(node('div','Your instructor has not published practical topics for this Trade.','callout'));return;}
  const legacyNotice=V.studentStorageNotice?.();if(legacyNotice)host.append(node('p',legacyNotice,'callout'));
  const stored=read(id.key);
  const keys=new Set(topics.map(t=>t.id));
  const selected=stored&&Array.isArray(stored.requiredIds)
    ?stored.requiredIds.filter(x=>keys.has(x)) :topics.map(t=>t.id);
  const form=node('section',null,'card');host.append(form);
  form.append(node('h3','2. Choose your goal and practicals / माझे उद्दिष्ट'));
  form.append(node('p','Your personal study list — you choose which practicals to focus on. This is NOT an employer-approved job requirement, NSQF assessment or live vacancy match.','muted'));
  const label=node('label','My study / career goal (optional)');label.htmlFor='v15CareerRole';form.append(label);
  const goal=node('input');goal.id='v15CareerRole';goal.maxLength=80;goal.placeholder='Example: DTP Operator — layout and print skills';
  goal.value=typeof stored?.roleName==='string'?stored.roleName:'';
  form.append(goal);
  form.append(node('p',stored?.requiredIds?'Your saved practical selection is loaded below.':'All Trade practicals are selected by default. For a smaller goal, click Clear selection and choose 3–5 practicals.','skill-gap-selection-tip'));
  const searchLabel=node('label','Find a practical / प्रात्यक्षिक शोधा');searchLabel.htmlFor='skillGapPracticalSearch';form.append(searchLabel);
  const search=node('input');search.id='skillGapPracticalSearch';search.type='search';search.placeholder='Search by practical number or topic…';form.append(search);
  const selectedCount=node('p','', 'skill-gap-selected-count');selectedCount.id='skillGapSelectedCount';selectedCount.setAttribute('role','status');form.append(selectedCount);
  const chooser=node('div');chooser.id='skillGapPracticalChooser';chooser.style.cssText='max-height:310px;overflow-y:auto;margin:12px 0;border-top:1px solid #e2e8f0';
  const boxes=[],rows=[];
  topics.forEach(t=>{
    const line=node('label');line.style.cssText='display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0;font-weight:normal;cursor:pointer';
    const check=node('input');check.type='checkbox';check.value=t.id;check.checked=selected.includes(t.id);
    check.style.width='auto';check.setAttribute('aria-label','Include '+t.name);
    line.append(check,node('span',t.name));chooser.append(line);boxes.push(check);rows.push({line,text:t.name.toLowerCase()});
  });
  form.append(chooser);
  const refreshSelection=()=>{
    const chosen=boxes.filter(b=>b.checked).length;
    selectedCount.textContent=chosen+' of '+boxes.length+' practicals selected · This is your study list, not job requirements.';
  };
  search.addEventListener('input',()=>{
    const term=search.value.trim().toLowerCase();
    for(const item of rows)item.line.hidden=!item.text.includes(term);
  });
  refreshSelection();
  const buttons=node('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  const save=node('button','Save personal learning plan','btn primary');save.type='button';
  const clear=node('button','Clear selection','btn secondary');clear.type='button';
  const reset=node('button','Select full Trade syllabus','btn');reset.type='button';
  buttons.append(save,clear,reset);form.append(buttons);
  const message=node('p','','muted');message.setAttribute('role','status');form.append(message);
  const resultHost=node('section',null,'card');resultHost.style.marginTop='16px';
  resultHost.append(node('p','Loading secure verified skills…','muted'));host.append(resultHost);
  let profile;
  try{
    if(typeof this.getStudentSkillProfile!=='function')throw Error('Verification service unavailable.');
    profile=await this.getStudentSkillProfile(id.uid,id.wid);
  }catch(e){
    if(active()){
      resultHost.replaceChildren(node('p','Cannot load verified skills. No percentage is shown because verification data is unavailable. Please retry later.','muted'));
    }
    return;
  }
  if(!active())return;
  const topicMap=new Map(topics.map(t=>[t.id,t.name]));
  const redraw=()=>{
    if(!active())return;
    const required=boxes.filter(b=>b.checked).map(b=>b.value);
    renderStats(resultHost,required,profile,selfRatings(id.uid,id.wid),topicMap,goal.value.trim().slice(0,80));
  };
  save.addEventListener('click',()=>{
    const requiredIds=boxes.filter(b=>b.checked).map(b=>b.value);
    if(!requiredIds.length){message.textContent='Select at least one practical.';return;}
    if(!active())return;
    try{
      localStorage.setItem(id.key,JSON.stringify({roleName:goal.value.trim().slice(0,80),requiredIds,updatedAt:new Date().toISOString()}));
      message.textContent='Learning plan saved on this browser. Syncing private cloud copy…';
      V.persistStudentPlan?.().then(()=>{if(active())message.textContent='Private learning plan synced. Verified status remains controlled by the instructor.';}).catch(()=>{if(active())message.textContent='Saved on this browser; cloud sync pending. Reconnect and reopen Skill Gap.';});
      redraw();
    }catch(e){message.textContent='This browser could not save your plan. Check storage permissions.';}
  });
  clear.addEventListener('click',()=>{if(!active())return;boxes.forEach(b=>{b.checked=false;});message.textContent='Selection cleared. Choose a few practicals, then Save your personal learning plan.';refreshSelection();redraw();});
  reset.addEventListener('click',()=>{if(!active())return;boxes.forEach(b=>{b.checked=true;});message.textContent='Full Trade syllabus selected. Click Save to keep this selection.';refreshSelection();redraw();});
  boxes.forEach(b=>b.addEventListener('change',()=>{if(!active())return;refreshSelection();message.textContent='Selection changed. Click Save to keep your new learning plan.';redraw();}));
  goal.addEventListener('input',()=>{if(!active())return;message.textContent='Goal changed. Click Save to keep it.';redraw();});
  redraw();
};
})(window.V15Sync);
