/* Universal EduSkill 360 — Skill-to-Career Lens, initial ITI pilot.
 * Evidence comes solely from activated-student verification, loaded trade practicals
 * and manually instructor-reviewed, source-linked, unexpired opportunities.
 * No vacancy, career fit, eligibility, employer or statistics are invented.
 */
(function(V){
'use strict';
if(!V)return;
function role(){return V.currentRole?.()||window.SESSION?.role||'';}
function make(tag,text,cls){
  const n=document.createElement(tag);
  if(text!==undefined&&text!==null)n.textContent=String(text);
  if(cls)n.className=cls;
  return n;
}
function state(){
  if(!V.ready||role()!=='student'||!V.fb?.user?.uid||!V.workspaceId||!V.member?.traineeId)return null;
  return [V.INSTITUTE_ID,V.workspaceId,V.fb.user.uid,V.member.traineeId].join('|');
}
function syllabus(){
  const data=typeof DATA==='undefined'?null:DATA;
  const seen=new Set();
  return (Array.isArray(data?.practicals)?data.practicals:[])
    .filter(p=>p&&p.no!=null&&p.title)
    .map(p=>({id:'practical-'+String(p.no),title:String(p.title),no:String(p.no)}))
    .filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;})
    .slice(0,200);
}
function statusOf(profile,id){
  return profile?.skills?.[id]?.status==='verified'?'verified':'not verified';
}
V.careerLensEvidence=function(id,profile,rawRecords,city='',today){
  const postings=typeof this.analyzeLocalSkillMarket==='function'
    ?this.analyzeLocalSkillMarket(rawRecords,city,'',today).postings:[];
  const sources=postings.filter(p=>
    Array.isArray(p.practicalIds) &&
    p.practicalIds.includes(id) &&
    typeof p.sourceUrl==='string' && p.sourceUrl.startsWith('https://')
  );
  return {status:statusOf(profile,id),sources,sourceCount:sources.length};
};
V.renderSkillCareerLens=async function(){
  if(!this.ready||role()!=='student')return;
  const host=document.getElementById('tab-career-lens');if(!host)return;
  host.replaceChildren();
  const hero=make('div',null,'hero'),body=make('div',null,'hero-content');
  body.append(make('h2','🔎 Skill-to-Career Lens'));
  body.append(make('p','Learn a practical → get instructor verification → discover source-linked career examples → choose your next learning action.'));
  hero.append(body);host.append(hero);
  host.append(make('p','Workplace applications are entered by instructors with a source link. Current job examples must also be explicitly mapped by an instructor. Neither is a certification, city-wide company count, placement assurance or AI prediction.','callout'));

  const identity=state();
  if(!identity){host.append(make('p','An approved Student account linked to a trainee and workspace is required.','muted'));return;}
  const topics=syllabus();
  if(!topics.length){host.append(make('p','No published practical syllabus is loaded for this trade. Ask your instructor.','muted'));return;}
  const form=make('section',null,'card');host.append(form);
  const label=make('label','1. Practical you are learning');label.htmlFor='v15LensPractical';form.append(label);
  const select=make('select');select.id='v15LensPractical';select.setAttribute('aria-label','Select a practical');
  for(const p of topics){const option=make('option','Practical '+p.no+' · '+p.title);option.value=p.id;select.append(option);}
  form.append(select);
  const cityLabel=make('label','2. City or district (optional)');cityLabel.htmlFor='v15LensCity';form.append(cityLabel);
  const city=make('input');city.id='v15LensCity';city.maxLength=80;city.placeholder='e.g. Mumbai';form.append(city);
  const action=make('button','Show verified skills and career examples','btn primary');action.type='button';form.append(action);
  const results=make('section',null,'card');results.id='v15LensResults';results.style.marginTop='14px';host.append(results);
  const route=make('div',null,'card');route.style.marginTop='14px';
  route.append(make('h3','Continue your learning'));
  for(const [name,labelText] of [['skills','My Skill Passport'],['skill-gap','My Learning Plan'],['local-market','Explore Job Sources']]){
    const button=make('button',labelText,'btn');button.type='button';button.style.margin='4px';
    button.addEventListener('click',()=>{if(state()===identity)this.finalOpenTab?.(name);});
    route.append(button);
  }
  host.append(route);
  let sequence=0;
  const load=async()=>{
    const serial=++sequence, pid=select.value,chosenCity=city.value.trim();
    results.replaceChildren(make('p','Reading your verified profile and institute-reviewed examples…','muted'));
    if(!pid)return;
    action.disabled=true;
    try{
      const M=this.fb?.M;
      if(!M||!this.fb.db||typeof this.getStudentSkillProfile!=='function'||typeof this.analyzeLocalSkillMarket!=='function')throw Error('Skill or job source service is unavailable.');
      const recordsQuery=M.query(
        M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',this.workspaceId,'careerOpportunities'),
        M.where('status','==','active')
      );
      const applicationRef=M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',this.workspaceId,'skillApplications',pid);
      const [profile,snapshot,applicationSnap]=await Promise.all([
        this.getStudentSkillProfile(this.fb.user.uid,this.workspaceId),
        M.getDocs(recordsQuery),
        M.getDoc(applicationRef)
      ]);
      if(state()!==identity||serial!==sequence||!host.isConnected)return;
      const records=[];
      snapshot.forEach(doc=>records.push(doc.data()));
      const found=this.careerLensEvidence(pid,profile,records,chosenCity);
      const title=topics.find(x=>x.id===pid)?.title||pid;
      results.replaceChildren(make('h3','3. Your practical: '+title));
      const verified=found.status==='verified';
      results.append(make('p',verified?'✅ Instructor-verified skill':'⏳ Instructor verification not yet recorded',verified?'callout':'muted'));
      results.append(make('p',verified
        ?'Next step: review relevant workplace examples below and discuss advanced practice with your instructor.'
        :'Next step: practise this skill and request direct assessment from your instructor. Self-rating alone does not verify competence.','muted'));
      results.append(make('h4','4. Where this skill is used'));
      const app=applicationSnap.exists()?applicationSnap.data():null;
      if(app&&app.practicalId===pid&&typeof app.applicationText==='string'
         &&typeof app.industry==='string'&&typeof this.marketIsValidSourceUrl==='function'
         &&this.marketIsValidSourceUrl(app.sourceUrl)){
        const card=make('div',null,'field-row');card.style.cssText='padding:10px 0;border-bottom:1px solid #dce4ed';
        card.append(make('strong','Industry / workplace: '+app.industry));
        card.append(make('p',app.applicationText,'muted'));
        card.append(make('p','Instructor-reviewed educational example. This is not a vacancy or proof of current hiring.','muted'));
        const link=make('a','Read original supporting source ↗');link.href=app.sourceUrl;
        link.rel='noopener noreferrer';link.target='_blank';card.append(link);results.append(card);
      }else{
        results.append(make('p','No instructor-reviewed workplace application has been published for this practical. Ask your instructor for a real, sourced example.','muted'));
      }
      results.append(make('h4','5. Reviewed current job/apprenticeship examples'));
      if(!found.sourceCount){
        results.append(make('p','No instructor-mapped, current source is recorded for this practical'+(chosenCity?' in '+chosenCity:'')+'. This does NOT mean the skill has no industry value. Ask your instructor for a real example and original source link.','muted'));
      }else{
        results.append(make('p',found.sourceCount+' active institute-reviewed example(s) for this practical'+(chosenCity?' in '+chosenCity:'')+'. This is NOT the number of all employers or vacancies in the city.','muted'));
        for(const p of found.sources.slice(0,25)){
          const item=make('div',null,'field-row');item.style.cssText='padding:10px 0;border-bottom:1px solid #dce4ed';
          item.append(make('strong',(p.kind==='apprenticeship'?'Apprenticeship: ':'Job: ')+p.title));
          item.append(make('p',p.employer+' · '+p.city+' · Skills mentioned: '+p.skills.join(', '),'muted'));
          item.append(make('p','Source valid in tracked data until '+p.expiresAt+'; recheck opening before applying.','muted'));
          const link=make('a','Open original source ↗');link.href=p.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
          results.append(item);
        }
        if(found.sourceCount>25)results.append(make('p','Showing the first 25 tracked examples. Open Job Market for the complete source list.','muted'));
      }
      results.append(make('p','Suggested learning actions are based on syllabus and instructor verification, not an AI employment forecast.','muted'));
    }catch(e){
      if(state()===identity&&serial===sequence){
        results.replaceChildren(make('p','Verified evidence is unavailable; no career relevance or readiness has been inferred. Please retry after reconnecting.','muted'));
      }
    }finally{if(state()===identity&&serial===sequence)action.disabled=false;}
  };
  action.addEventListener('click',load);
  await load();
};
})(window.V15Sync);
