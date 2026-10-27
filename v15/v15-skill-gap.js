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
function identity(){
  const uid=String(V.fb?.user?.uid||'');
  const wid=String(V.workspaceId||'');
  const trainee=String(V.member?.traineeId||'');
  if(!uid||!wid||!trainee)return null;
  return {uid,wid,trainee,key:PREFIX+encodeURIComponent(uid)+'-'+encodeURIComponent(wid)+'-'+encodeURIComponent(trainee)};
}
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
function selfRatings(uid,wid){
  try{
    const key='iti-v15-student-skill-self-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(wid);
    const x=JSON.parse(localStorage.getItem(key)||'{}');
    return x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  }catch(e){return {};}
}
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
  const heading=node('h3','Learning gaps for '+(roleName||'My Trade Learning Plan'));
  host.append(heading);
  const caution=node('p','These are self-selected learning requirements, not employer-approved job requirements. Completion means instructor verification, NOT a job guarantee.','muted');
  host.append(caution);
  if(!result.total){host.append(node('p','Select at least one practical to calculate your learning gap.','muted'));return;}
  const stats=node('div',null,'field-row');
  stats.style.cssText='display:flex;gap:14px;flex-wrap:wrap;align-items:center';
  stats.append(node('strong',result.completed+' / '+result.total+' verified'));
  stats.append(node('strong',result.percent+'% learning coverage'));
  host.append(stats);
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
    row.append(node('p',step.action+' • Self-rated: '+step.rating,'muted'));
    host.append(row);
  });
}
V.renderStudentSkillGap=async function(){
  const host=document.getElementById('tab-skill-gap');
  if(!host||currentRole()!=='student'||!this.ready)return;
  const generation=++renderGeneration, institute=V.INSTITUTE_ID;
  host.replaceChildren();
  const h=node('div',null,'hero'),head=node('div',null,'hero-content');
  head.append(node('h2','🎯 Skill Gap & Learning Plan'));
  head.append(node('p','Compare your selected practicals with Instructor-verified achievements. Choose a personal career goal and plan your next learning steps.'));
  h.append(head);host.append(h);
  const id=identity();
  if(!id){host.append(node('div','An activated Student account linked to a trainee and Trade is required.','callout'));return;}
  const active=()=>generation===renderGeneration&&V.ready&&currentRole()==='student'&&V.INSTITUTE_ID===institute&&identity()?.key===id.key&&host.isConnected;
  const topics=skills();
  if(!topics.length){host.append(node('div','Your instructor has not published practical topics for this Trade.','callout'));return;}
  const stored=read(id.key);
  const keys=new Set(topics.map(t=>t.id));
  const selected=stored&&Array.isArray(stored.requiredIds)
    ?stored.requiredIds.filter(x=>keys.has(x)) :topics.map(t=>t.id);
  const form=node('section',null,'card');host.append(form);
  form.append(node('h3','Personal target role / माझे करिअर उद्दिष्ट'));
  const disclaimer=node('p','Role name and required practicals are chosen by you. They are NOT verified against employer job descriptions, NSQF standards or live vacancies.','muted');
  form.append(disclaimer);
  const label=node('label','Target role (personal goal)');label.htmlFor='v15CareerRole';form.append(label);
  const goal=node('input');goal.id='v15CareerRole';goal.maxLength=80;goal.placeholder='e.g. DTP Operator';
  goal.value=typeof stored?.roleName==='string'?stored.roleName:'';
  form.append(goal);
  const chooser=node('div');chooser.style.cssText='max-height:310px;overflow-y:auto;margin:12px 0;border-top:1px solid #e2e8f0';
  const boxes=[];
  topics.forEach(t=>{
    const line=node('label');line.style.cssText='display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0;font-weight:normal;cursor:pointer';
    const check=node('input');check.type='checkbox';check.value=t.id;check.checked=selected.includes(t.id);
    check.style.width='auto';check.setAttribute('aria-label','Include '+t.name);
    line.append(check,node('span',t.name));chooser.append(line);boxes.push(check);
  });
  form.append(chooser);
  const buttons=node('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  const save=node('button','Save personal learning plan','btn primary');save.type='button';
  const reset=node('button','Select full Trade syllabus','btn');reset.type='button';
  buttons.append(save,reset);form.append(buttons);
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
      V.persistStudentPlan?.().then(()=>{message.textContent='Private learning plan synced. Verified status remains controlled by the instructor.';}).catch(()=>{message.textContent='Saved on this browser; cloud sync pending. Reconnect and reopen Skill Gap.';});
      redraw();
    }catch(e){message.textContent='This browser could not save your plan. Check storage permissions.';}
  });
  reset.addEventListener('click',()=>{if(!active())return;boxes.forEach(b=>{b.checked=true;});message.textContent='Full Trade syllabus selected. Click Save to keep this selection.';redraw();});
  boxes.forEach(b=>b.addEventListener('change',redraw));
  goal.addEventListener('input',redraw);
  redraw();
};
})(window.V15Sync);
