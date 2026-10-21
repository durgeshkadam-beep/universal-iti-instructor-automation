/* Phase 1: Student Skill Passport (local self-assessment prototype).
 * Self-reported competency is NEVER treated as instructor verification.
 * No external APIs, GPS, score generation or record writes.
 */
(function(V){
'use strict';
if(!V)return;
const OPTIONS=[['not-started','Not started'],['learning','Learning'],['can-demonstrate','I can demonstrate']];
function role(){return V.currentRole?.()||window.SESSION?.role||'';}
function storeKey(){
  const uid=String(V.fb?.user?.uid||'');
  const wid=String(V.workspaceId||'');
  if(!uid||!wid)return null;
  return 'iti-v15-student-skill-self-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(wid);
}
function read(){
  const key=storeKey();if(!key)return {};
  try{const d=JSON.parse(localStorage.getItem(key)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch(e){return {};}
}
function write(value){
  const key=storeKey();if(!key)throw new Error('Student identity is not ready.');
  localStorage.setItem(key,JSON.stringify(value));
}
function el(tag,text,className){
  const x=document.createElement(tag);if(text!=null)x.textContent=String(text);
  if(className)x.className=className;return x;
}
V.renderSkillPassport=function(){
  const host=document.getElementById('tab-skills');
  if(!host||!V.ready||role()!=='student')return;
  host.replaceChildren();
  const hero=el('div',null,'hero');
  const body=el('div',null,'hero-content');
  body.append(el('h2','🧩 My Skills / माझी कौशल्ये'));
  body.append(el('p','Track your own learning progress. This is a self-assessment, not an official certificate or instructor verification.'));
  hero.append(body);host.append(hero);
  const notice=el('div','Instructor-verified skills will appear in a future release after secure assessment integration. Do not use this page as an official skills certificate.','callout');
  host.append(notice);
  const saved=read(),list=el('div',null,'card');
  list.append(el('h3','Practical-based self assessment'));
  const items=(Array.isArray(DATA?.practicals)?DATA.practicals:[]).filter(x=>x&&x.title&&x.no!=null);
  if(!items.length){
    list.append(el('p','No practical topics are currently available for your Trade. Ask your instructor to publish the syllabus.','muted'));
    host.append(list);return;
  }
  list.append(el('p','Select your current level for each available practical topic. Data stays in this browser profile.','muted'));
  const search=el('input');search.type='search';search.placeholder='Search practical skills';search.setAttribute('aria-label','Search practical skills');search.style.maxWidth='420px';
  list.append(search);
  const count=el('p','', 'muted');list.append(count);
  const entries=el('div');list.append(entries);
  let rows=[];
  for(const item of items){
    const id='practical-'+String(item.no),row=el('div',null,'field-row');
    row.style.cssText='display:flex;gap:14px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e4e9ed;flex-wrap:wrap';
    const label=el('label','Practical '+item.no+': '+String(item.title));label.style.flex='1 1 250px';
    const select=el('select');select.setAttribute('aria-label','Self assessment for practical '+String(item.no));
    for(const [value,title] of OPTIONS){const option=el('option',title);option.value=value;select.append(option);}
    select.value=OPTIONS.some(x=>x[0]===saved[id])?saved[id]:'not-started';
    select.addEventListener('change',()=>{const all=read();all[id]=select.value;try{write(all);}catch(e){alert('Could not save on this device: '+e.message);}});
    row.append(label,select);entries.append(row);rows.push({row,labelText:(String(item.no)+' '+item.title).toLowerCase()});
  }
  function filter(){
    const term=search.value.toLowerCase().trim();let shown=0;
    for(const x of rows){const display=x.labelText.includes(term);x.row.hidden=!display;if(display)shown++;}
    count.textContent=shown+' of '+rows.length+' practical topics';
  }
  search.addEventListener('input',filter);filter();host.append(list);
};
})(window.V15Sync);
