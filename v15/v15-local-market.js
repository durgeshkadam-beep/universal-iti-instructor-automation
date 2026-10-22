/* V15 Local Skill Market — FREE, evidence-first, no generative AI needed.
 * Sources: instructor-reviewed HTTPS job URLs recorded inside assigned workspace.
 * Counts are ONLY within tracked postings, never all companies or live vacancies in a city.
 * Optional AI backend may later explain these facts, but must never invent counts.
 */
(function(V){
'use strict';
if(!V)return;
const COLLECTION='careerOpportunities';
const TODAY=()=>new Date().toISOString().slice(0,10);
const idText=x=>String(x||'').trim();
const canonical=x=>idText(x).toLocaleLowerCase('en-IN').replace(/\s+/g,' ');
const niceCity=x=>idText(x).replace(/\s+/g,' ').slice(0,80);
const allowedURL=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!!u.hostname&&u.username===''&&u.password==='';}catch(e){return false;}};
function role(){return V.currentRole?.()||window.SESSION?.role||'';}
function el(tag,label,cls){const v=document.createElement(tag);if(label!=null)v.textContent=String(label);if(cls)v.className=cls;return v;}
function col(){return V.fb.M.collection(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,COLLECTION);}
function validDate(x){return /^\d{4}-\d{2}-\d{2}$/.test(String(x||''))&&!Number.isNaN(Date.parse(x+'T00:00:00Z'));}
function uniqueSkills(items){return [...new Set((Array.isArray(items)?items:[]).map(canonical).filter(Boolean))].slice(0,16);}
function normalizedOpportunity(raw){
  if(!raw||raw.status!=='active'||!raw.title||!raw.employer||!raw.city||!validDate(raw.expiresAt)||!allowedURL(raw.sourceUrl))return null;
  return {...raw,skills:uniqueSkills(raw.skills),cityKey:canonical(raw.city)};
}
V.analyzeLocalSkillMarket=function(rawPostings,selectedCity='',likedSkill='',today=TODAY()){
  const all=(Array.isArray(rawPostings)?rawPostings:[]).map(normalizedOpportunity).filter(Boolean)
    .filter(x=>x.expiresAt>=today);
  const cityKey=canonical(selectedCity);
  const tracked=all.filter(x=>!cityKey||x.cityKey===cityKey);
  const employers=new Set(tracked.map(x=>canonical(x.employer)));
  const counts=new Map();
  for(const p of tracked)for(const skill of p.skills)counts.set(skill,(counts.get(skill)||0)+1);
  const topSkills=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([skill,postings])=>({skill,postings}));
  const target=canonical(likedSkill);
  const mentioned=target?(counts.get(target)||0):null;
  return {postings:tracked,trackedPostings:tracked.length,trackedEmployers:employers.size,topSkills,
    likedSkill:target,mentioned,ratio:target&&tracked.length?Math.round(100*mentioned/tracked.length):null,
    sampleAdequate:tracked.length>=5,city:niceCity(selectedCity)};
};
V.marketIsValidSourceUrl=allowedURL;
V.marketEmployerSearchUrl=function(city,skill=''){
  const location=niceCity(city);
  if(!location)return null; // Do not silently infer or request the student's GPS.
  const topic=idText(skill).replace(/\\s+/g,' ').slice(0,80);
  const query=(topic ? topic+' companies in ' : 'companies in ')+location+', India';
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
};

async function getRecords(onlyActive){
  if(!V.ready||!V.fb?.M||!V.workspaceId)throw Error('Approved account and workspace required.');
  const M=V.fb.M;
  const query=onlyActive?M.query(col(),M.where('status','==','active')):col();
  const snap=await M.getDocs(query),out=[];
  snap.forEach(d=>out.push({id:d.id,...d.data()}));
  return out;
}
function addNotice(host,text){host.append(el('p',text,'muted'));}
function appendStats(host,signals){
  const box=el('section',null,'card');host.append(box);
  box.append(el('h3','Recorded opportunities (not the entire market)'));
  addNotice(box,'Coverage: '+(signals.city||'All recorded cities')+' · Records reviewed by this institute only.');
  const summary=el('p',signals.trackedEmployers+' recorded employers · '+signals.trackedPostings+' active reviewed listings','callout');
  box.append(summary);
  if(!signals.trackedPostings){
    addNotice(box,'No current reviewed entries for this city. This DOES NOT mean that no companies or jobs exist here.');
    return;
  }
  const heading=el('h4','Skills most mentioned in these listings');box.append(heading);
  if(!signals.sampleAdequate)addNotice(box,'Small sample (fewer than five postings): rankings are not a reliable measure of wider market demand.');
  signals.topSkills.slice(0,10).forEach(s=>{
    const line=el('p',s.skill+' — '+s.postings+' of '+signals.trackedPostings+' postings');
    box.append(line);
  });
  if(signals.likedSkill){
    const x=signals.mentioned;
    const msg=x===0
      ?'Your chosen skill "'+signals.likedSkill+'" has zero mentions in these tracked listings. It may still be valuable elsewhere.'
      :'Your chosen skill "'+signals.likedSkill+'" appears in '+x+' of '+signals.trackedPostings+' tracked listings ('+signals.ratio+'%).';
    box.append(el('p',msg,'callout'));
    if(!signals.sampleAdequate)addNotice(box,'Not enough data to judge whether a skill is valuable or popular in the whole city.');
  }
}
function renderListings(host,entries,forInstructor=false){
  const card=el('section',null,'card');card.style.marginTop='14px';host.append(card);
  card.append(el('h3',forInstructor?'Institute-reviewed job entries':'Job posting sources'));
  if(!entries.length){addNotice(card,'No matching verified source links yet.');return;}
  for(const p of entries.slice(0,100)){
    const block=el('div',null,'field-row');
    block.style.cssText='border-bottom:1px solid #e2e8f0;padding:11px 0';
    block.append(el('strong',p.title+' · '+p.employer));
    block.append(el('p',p.city+' · Skills: '+(p.skills||[]).join(', '),'muted'));
    block.append(el('p','Expires '+p.expiresAt+' · Source: Institute-reviewed link','muted'));
    if(allowedURL(p.sourceUrl)){
      const a=el('a','Open original job source ↗');
      a.href=p.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';
      block.append(a);
    }
    if(forInstructor&&p.status==='active'){
      const btn=el('button','Withdraw listing','btn');btn.style.marginLeft='10px';
      btn.addEventListener('click',async()=>{
        if(role()!=='instructor'||!confirm('Withdraw this posting from student search?'))return;
        btn.disabled=true;
        try{
          const M=V.fb.M;
          await M.updateDoc(M.doc(col(),p.id),{status:'withdrawn',updatedAt:M.serverTimestamp(),updatedBy:V.fb.user.uid});
          await V.renderInstructorMarketEditor();
        }catch(e){alert('Could not withdraw entry: '+(e.message||e));btn.disabled=false;}
      });
      block.append(btn);
    }
    card.append(block);
  }
  if(entries.length>100)addNotice(card,'Showing first 100 tracked records only. Contact the institute for the full directory.');
}
V.renderStudentLocalMarket=async function(){
  if(role()!=='student'||!this.ready)return;
  const host=document.getElementById('tab-local-market');if(!host)return;
  host.replaceChildren();
  const h=el('div',null,'hero'),body=el('div',null,'hero-content');
  body.append(el('h2','📍 Local Job & Skill Market'));
  body.append(el('p','Explore manually reviewed jobs by city. Choose a skill to see how often it is mentioned. No GPS or AI key required.'));
  h.append(body);host.append(h);
  const info=el('div','Important: This is NOT a census of companies, live city-wide job market, or employment guarantee. Listings are collected and reviewed by the institute.','callout');
  host.append(info);
  const form=el('section',null,'card');host.append(form);
  const l=el('label','City / District (manual choice)');l.htmlFor='v15MarketCity';form.append(l);
  const city=el('input');city.id='v15MarketCity';city.placeholder='e.g. Mumbai, Pune, Ratnagiri';city.maxLength=80;form.append(city);
  const skillLabel=el('label','Skill you like / मला आवडणारे कौशल्य');skillLabel.htmlFor='v15MarketSkill';form.append(skillLabel);
  const skill=el('input');skill.id='v15MarketSkill';skill.maxLength=80;skill.placeholder='e.g. Photoshop';form.append(skill);
  const btn=el('button','Check reviewed job market','btn primary');btn.type='button';form.append(btn);
  const result=el('div');result.id='v15MarketResults';host.append(result);
  const load=async()=>{
    result.replaceChildren(el('p','Checking institute-reviewed source records…','muted'));
    const ws=this.workspaceId;
    try{
      const records=await getRecords(true);
      if(role()!=='student'||ws!==this.workspaceId||!host.isConnected)return;
      const signals=this.analyzeLocalSkillMarket(records,city.value,skill.value);
      result.replaceChildren();appendStats(result,signals);renderListings(result,signals.postings);
      const searchURL=this.marketEmployerSearchUrl(city.value,skill.value);
      const maps=el('section',null,'card');maps.style.marginTop='12px';
      maps.append(el('h3','Find other companies in your selected city'));
      if(searchURL){
        addNotice(maps,'Open a Google Maps search for businesses connected with the chosen skill in '+niceCity(city.value)+'. Google Maps businesses are NOT verified job openings and are NOT counted above.');
        const employerLink=el('a','Search companies on Google Maps ↗');
        employerLink.href=searchURL;employerLink.target='_blank';employerLink.rel='noopener noreferrer';
        maps.append(employerLink);
      }else{
        addNotice(maps,'Enter a city to search companies on Google Maps without giving GPS permission or an API key.');
      }
      result.append(maps);
      const external=el('section',null,'card');external.style.marginTop='12px';
      external.append(el('h3','Search more verified opportunities'));
      addNotice(external,'For wider live vacancies, continue to the official National Career Service portal and select your city there. This app does not import its listings automatically.');
      const link=el('a','Search on National Career Service (Government of India) ↗');
      link.href='https://ncs.gov.in/';link.target='_blank';link.rel='noopener noreferrer';external.append(link);
      result.append(external);
    }catch(e){
      result.replaceChildren(el('p','Job source data cannot be loaded. No market counts are available: '+(e.message||e),'muted'));
    }
  };
  btn.addEventListener('click',load);await load();
};
V.renderInstructorMarketEditor=async function(){
  if(role()!=='instructor'||!this.ready)return;
  const host=document.getElementById('tab-market-editor');if(!host)return;
  host.replaceChildren(el('h2','📋 Review Job Opportunities'));
  addNotice(host,'Manually record real job links from trusted sources. Students will see ONLY reviewed active listings for this workspace, not the entire market.');
  const form=el('section',null,'card');host.append(form);
  const fields=[
    ['title','Job title','e.g. Junior DTP Operator'],
    ['employer','Employer / company','Name from source listing'],
    ['city','City / District','e.g. Mumbai'],
    ['skills','Required skills (comma separated)','e.g. CorelDRAW, Photoshop'],
    ['sourceUrl','Original HTTPS job link','https://...']
  ];
  const inputs={};
  for(const [key,title,placeholder] of fields){
    const label=el('label',title);label.htmlFor='market-'+key;form.append(label);
    const input=el('input');input.id='market-'+key;input.placeholder=placeholder;input.maxLength=key==='sourceUrl'?500:300;
    form.append(input);inputs[key]=input;
  }
  const lbl=el('label','Expiry date (from original posting)');lbl.htmlFor='market-expiresAt';form.append(lbl);
  const expiry=el('input');expiry.type='date';expiry.id='market-expiresAt';form.append(expiry);
  const save=el('button','Save instructor-reviewed opportunity','btn primary');save.type='button';form.append(save);
  const status=el('p',null,'muted');status.setAttribute('role','status');form.append(status);
  const listing=el('div');host.append(listing);
  save.addEventListener('click',async()=>{
    if(role()!=='instructor')return;
    const title=idText(inputs.title.value),employer=idText(inputs.employer.value);
    const city=niceCity(inputs.city.value),skills=uniqueSkills(inputs.skills.value.split(','));
    const sourceUrl=idText(inputs.sourceUrl.value),expiresAt=expiry.value;
    if(!title||title.length>140||!employer||employer.length>140||!city||!skills.length||!allowedURL(sourceUrl)||sourceUrl.length>500||!validDate(expiresAt)||expiresAt<TODAY()){
      status.textContent='Enter a valid title, employer, city, required skills, original HTTPS source and future expiry date.';return;
    }
    if(!confirm('I reviewed the original job listing and confirmed its details. Save for student viewing?'))return;
    save.disabled=true;status.textContent='Saving reviewed source…';
    try{
      const M=this.fb.M,uid=this.fb.user.uid;
      await M.addDoc(col(),{title,employer,city,cityKey:canonical(city),skills,sourceUrl,expiresAt,status:'active',reviewedBy:uid,
        reviewedAt:M.serverTimestamp(),updatedBy:uid,updatedAt:M.serverTimestamp()});
      status.textContent='Saved. This listing is now visible to students in this workspace.';
      Object.values(inputs).forEach(i=>{i.value='';});expiry.value='';
      await refresh();
    }catch(e){status.textContent='Could not save listing: '+(e.message||e);}
    finally{save.disabled=false;}
  });
  const refresh=async()=>{
    listing.replaceChildren(el('p','Loading reviewed listings…','muted'));
    try{
      const all=await getRecords(false);
      if(role()!=='instructor'||!host.isConnected)return;
      listing.replaceChildren();
      renderListings(listing,all.filter(x=>x.status==='active').map(normalizedOpportunity).filter(Boolean),true);
    }catch(e){listing.replaceChildren(el('p','Could not load listings: '+(e.message||e),'muted'));}
  };
  await refresh();
};
})(window.V15Sync);
