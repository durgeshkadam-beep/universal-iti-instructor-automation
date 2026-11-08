/* Shared deterministic syllabus calculations. No provider, network or student data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ITISyllabusPlanning=api;})(typeof window!=='undefined'?window:this,function(){
'use strict';
const text=x=>String(x??'').trim(),key=x=>text(x).toLowerCase().replace(/\s+/g,' '),header=x=>key(x).replace(/[^a-z0-9]/g,'');
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const requireValue=(ok,msg)=>{if(!ok)throw Error(msg);};
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const canonical=x=>JSON.stringify(normalize(x));
function normalize(x){return Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,normalize(x[k])])):x;}
function validateItems(raw){
 requireValue(Array.isArray(raw)&&raw.length>0&&raw.length<=500,'Use 1–500 syllabus topics.');const ids=new Set(),numbers=new Set();
 return raw.map((x,i)=>{requireValue(x&&['practical','theory'].includes(x.type),'Choose Theory or Practical for row '+(i+1));const hours=Number(x.hours),no=text(x.no??x.sourceNo),seq=text(x.seq??i+1),title=text(x.title),module=text(x.module);
  requireValue(title.length>0&&title.length<=1000&&module.length<=160,'Check topic name/module at row '+(i+1));
  requireValue(Number.isFinite(hours)&&hours>0&&hours<=10000&&Math.abs(hours*100-Math.round(hours*100))<0.00001,'Enter positive hours with at most two decimal places at row '+(i+1));
  requireValue(seq.length>0&&seq.length<=80&&!ids.has(x.type+'|'+seq),'Duplicate source order at row '+(i+1));ids.add(x.type+'|'+seq);
  if(no){requireValue(/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(no),'Use letters, numbers, dots, hyphens or underscores for exercise number at row '+(i+1));requireValue(!numbers.has(x.type+'|'+no.toLowerCase()),'Duplicate '+x.type+' number '+no);numbers.add(x.type+'|'+no.toLowerCase());}
  return {seq:x.seq??i+1,type:x.type,no,title,module,hours};
 });
}
function fromSheets(sheets){
 const items=[],errors=[];
 for(const [name,rows] of Object.entries(sheets||{})){
  const type=/^practicals?$/i.test(name.trim())?'practical':/^theory$/i.test(name.trim())?'theory':null;if(!type)continue;
  const headings=(rows[0]||[]).map(header),find=aliases=>headings.findIndex(x=>aliases.includes(x));
  const columns={sr:find(['srno','srnumber','serialno']),no:find([type+'no',type+'number','exerciseno']),title:find([type+'name','topicname','topic','title']),hours:find(['requiredhours','hours','requiredtime','requiredtimetocomplete']),module:find(['unitmoduleoptional','unitmodule','moduleunit','module','unit'])};
  if(['sr','no','title','hours'].some(x=>columns[x]<0)){errors.push(name+': use the template headers (Sr No., '+type+' No., Name, Required Hours).');continue;}
  const orders=new Set();
  rows.slice(1).forEach((r,j)=>{if(!r.some(x=>text(x)!==''))return;const label=name+' row '+(j+2),sr=Number(r[columns.sr]);
   if(!Number.isInteger(sr)||sr<1||orders.has(sr)){errors.push(label+': enter a unique positive Sr No.');return;}orders.add(sr);
   if(!text(r[columns.no])||!text(r[columns.title])||!text(r[columns.hours])){errors.push(label+': number, name and hours are required.');return;}
   items.push({seq:sr,type,no:text(r[columns.no]),title:text(r[columns.title]),hours:Number(r[columns.hours]),module:columns.module<0?'':text(r[columns.module]),sourceRow:label});
  });
 }
 requireValue(!errors.length,errors.slice(0,12).join('\n'));requireValue(items.length>0,'No topics found. Fill the Theory and/or Practicals sheets in the template.');
 return validateItems(items.sort((a,b)=>a.type.localeCompare(b.type)||Number(a.seq)-Number(b.seq)));
}
function settings(raw){
 const s={startDate:raw?.startDate,endDate:raw?.endDate,practicalHours:Number(raw?.practicalHours),theoryHours:Number(raw?.theoryHours),workdays:raw?.workdays,alternateSaturdays:raw?.alternateSaturdays===true,includeExistingHolidays:raw?.includeExistingHolidays!==false,holidays:raw?.holidays||[]};
 requireValue(validDate(s.startDate)&&validDate(s.endDate)&&s.startDate<=s.endDate&&(Date.parse(s.endDate)-Date.parse(s.startDate))/86400000<1500,'Enter valid session dates covering fewer than 1500 days.');
 requireValue([s.practicalHours,s.theoryHours].every(x=>Number.isFinite(x)&&x>=0&&x<=12&&Math.abs(x*100-Math.round(x*100))<0.00001)&&s.practicalHours+s.theoryHours>0&&s.practicalHours+s.theoryHours<=12,'Set separate practical/theory hours; total must be greater than 0 and at most 12 per day.');
 requireValue(Array.isArray(s.workdays)&&s.workdays.length>0&&s.workdays.length<=7&&new Set(s.workdays).size===s.workdays.length&&s.workdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6),'Select working weekdays.');s.workdays=s.workdays.slice().sort();
 requireValue(Array.isArray(s.holidays)&&s.holidays.length<=1000,'Use at most 1000 additional holidays.');s.holidays=s.holidays.map(h=>{requireValue(validDate(h.date)&&text(h.label).length>0&&text(h.label).length<=200,'Check additional holiday dates and labels.');return {date:h.date,label:text(h.label)};}).sort((a,b)=>cmp(a.date,b.date)||cmp(a.label,b.label));return s;
}
function allocate(raw,rawSettings,existingHolidays=[]){
 const items=validateItems(raw),s=settings(rawSettings),holidayMap=new Map((s.includeExistingHolidays?existingHolidays:[]).filter(h=>validDate(h.date)).map(h=>[h.date,text(h.label)||'Institute holiday']));s.holidays.forEach(h=>holidayMap.set(h.date,h.label));
 const streams=Object.fromEntries(['practical','theory'].map(type=>[type,{items:items.filter(x=>x.type===type),index:0,remaining:0,allocated:0,capacity:Math.round(s[type+'Hours']*100)}]));
 const take=stream=>{let cap=stream.capacity;const parts=[];while(cap>0&&stream.index<stream.items.length){const item=stream.items[stream.index];if(!stream.remaining)stream.remaining=Math.round(item.hours*100);const hours=Math.min(cap,stream.remaining);parts.push({seq:item.seq,title:item.title,module:item.module,hours:hours/100});cap-=hours;stream.remaining-=hours;stream.allocated+=hours;if(!stream.remaining)stream.index++;}return parts;};
 const rows=[];
 for(let date=new Date(s.startDate+'T00:00:00Z');date.toISOString().slice(0,10)<=s.endDate;date.setUTCDate(date.getUTCDate()+1)){
  const iso=date.toISOString().slice(0,10),day=date.getUTCDay(),weekOfMonth=Math.floor((date.getUTCDate()-1)/7)+1;
  const label=holidayMap.get(iso)||(s.alternateSaturdays&&day===6&&[2,4].includes(weekOfMonth)?'2nd/4th Saturday':'')||(!s.workdays.includes(day)?day===0?'Sunday':'Non-working day':'');
  const practicalItems=label?[]:take(streams.practical),theoryItems=label?[]:take(streams.theory),fmt=parts=>parts.map(x=>`${x.sourceNo??x.seq}. ${x.title} (${x.hours}h)`).join('; ');
  const monday=new Date(date);monday.setUTCDate(date.getUTCDate()-((day+6)%7));
  rows.push({date:iso,day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day],week:monday.toISOString().slice(0,10),holiday:!!label,label,practicalItems,theoryItems,practical:label?'HOLIDAY — '+label:fmt(practicalItems),theory:label?'HOLIDAY — '+label:fmt(theoryItems),hours:[...practicalItems,...theoryItems].reduce((sum,x)=>sum+Math.round(x.hours*100),0)/100});
 }
 const working=rows.filter(x=>!x.holiday).length,summary={workingDays:working,nonWorkingDays:rows.length-working};
 for(const [type,stream] of Object.entries(streams)){const required=stream.items.reduce((n,x)=>n+Math.round(x.hours*100),0);summary[type]={requiredHours:required/100,allocatedHours:stream.allocated/100,remainingHours:(required-stream.allocated)/100,capacityHours:working*stream.capacity/100,incompleteTopics:stream.items.length-stream.index,finishDate:stream.index===stream.items.length?rows.filter(r=>r[type+'Items'].length).at(-1)?.date||null:null};}
 return {settings:s,items,rows,summary,years:Array.from({length:Number(s.endDate.slice(0,4))-Number(s.startDate.slice(0,4))+1},(_,i)=>Number(s.startDate.slice(0,4))+i)};
}
function mergeTopics(type,rawItems,existing){
 const source=validateItems(rawItems).filter(x=>x.type===type),current=(existing||[]).map(x=>({...x})),seen=new Set(),numbers=new Set(current.map(x=>text(x.no).toLowerCase()));let next=Math.max(0,...current.map(x=>/^\d+$/.test(text(x.no))?Number(x.no):0));const links=new Map(),updates=[];
 for(const item of source){let matches=item.no?current.filter(x=>text(x.no).toLowerCase()===item.no.toLowerCase()||text(x.sourceNo).toLowerCase()===item.no.toLowerCase()):current.filter(x=>key(x.title)===key(item.title));if(item.no&&!matches.length){const same=current.filter(x=>key(x.title)===key(item.title)&&(!item.module||key(x.unit)===key(item.module)));requireValue(!same.length,'The imported '+type+' '+item.no+' already matches an existing topic under number '+same.map(x=>x.no).join(', ')+'. Use its existing number in the preview to preserve student links.');}requireValue(matches.length<=1,'Ambiguous '+type+' '+(item.no||item.title)+'. Resolve duplicate existing records first.');let old=matches[0],no=old?.no??item.no;
  if(!no){do{next++;}while(numbers.has(String(next)));no=next;}
  requireValue(!seen.has(text(no).toLowerCase()),'Two imported topics match '+type+' '+no+'. Assign distinct exercise numbers.');seen.add(text(no).toLowerCase());numbers.add(text(no).toLowerCase());
  if(old&&(old.plan||old.status==='completed'||old.doneDate))requireValue(key(old.title)===key(item.title),'Protected '+type+' '+no+' has a saved plan/completion. Its topic name differs; revise that record explicitly before importing.');
  const row={...(old||{status:'pending',doneDate:null,plan:null,materials:{pdfLink:'',youtubeLink:'',updatedDate:null}}),no,title:item.title,hours:item.hours,unit:item.module||old?.unit||'General',sequence:updates.length+1};if(old?.plan&&Number(old.hours)!==item.hours)row.planReviewRequired={reason:'duration-changed',previousHours:old.hours??null,hours:item.hours};updates.push(row);links.set(String(item.seq),row);
 }
 const extras=current.filter(x=>!seen.has(text(x.no).toLowerCase())).sort((a,b)=>(Number(a.sequence)||0)-(Number(b.sequence)||0)||text(a.no).localeCompare(text(b.no),undefined,{numeric:true}));
 extras.forEach((x,i)=>{x.sequence=updates.length+i+1;});return {records:[...updates,...extras],links,added:updates.filter(x=>!current.some(y=>text(x.no).toLowerCase()===text(y.no).toLowerCase())).length,retained:extras.length};
}
function sourceState(meta,practicals,theory,holidays){const fields=['id','no','sourceNo','title','hours','unit','sequence','plannedDate','plannedEndDate'];const rows=a=>(a||[]).map(x=>Object.fromEntries(fields.filter(k=>x[k]!==undefined).map(k=>[k,x[k]]))).sort((a,b)=>cmp(text(a.id??a.no),text(b.id??b.no)));return {identity:{trade:meta.trade||'',session:meta.session||'',batch:meta.batch||'',trainingPlanRevision:meta.trainingPlanRevision||0,trainingPlan:meta.trainingPlan||null,scheduleMode:meta.scheduleMode||''},practicals:rows(practicals),theory:rows(theory),holidays:(holidays||[]).map(x=>({date:x.date,label:x.label})).sort((a,b)=>cmp(text(a.date),text(b.date))||cmp(text(a.label),text(b.label)))};}
function candidate(items,options,source){
 const allocation=allocate(items,options,source.holidays),p=mergeTopics('practical',items,source.practicals),t=mergeTopics('theory',items,source.theory),rows=allocation.rows.map(r=>({...r,practicalItems:r.practicalItems.map(x=>({...x,seq:p.links.get(String(x.seq)).no,sourceNo:p.links.get(String(x.seq)).sourceNo||p.links.get(String(x.seq)).no})),theoryItems:r.theoryItems.map(x=>({...x,seq:t.links.get(String(x.seq)).no,sourceNo:t.links.get(String(x.seq)).sourceNo||t.links.get(String(x.seq)).no}))}));
 for(const [type,merged] of [['practical',p],['theory',t]])for(const item of merged.links.values()){const days=rows.filter(r=>r[type+'Items'].some(x=>String(x.seq)===String(item.no))),hours=days.reduce((n,r)=>n+r[type+'Items'].filter(x=>String(x.seq)===String(item.no)).reduce((m,x)=>m+Math.round(x.hours*100),0),0);item.plannedDate=days[0]?.date||null;item.plannedEndDate=hours>=Math.round(item.hours*100)?days.at(-1)?.date||null:null;}
 for(const r of rows)if(!r.holiday)for(const type of ['practical','theory'])r[type]=r[type+'Items'].map(x=>`${x.sourceNo??x.seq}. ${x.title} (${x.hours}h)`).join('; ');
 const holidays=(source.holidays||[]).map(h=>({...h}));for(const r of rows.filter(x=>x.holiday))if(!holidays.some(h=>h.date===r.date))holidays.push({date:r.date,label:r.label});
 return {...allocation,rows,practicals:p.records,theory:t.records,holidays,added:p.added+t.added,retained:p.retained+t.retained};
}
function periodRows(rows,view='day',month=''){
 const chosen=rows.filter(r=>!month||r.date.slice(0,7)===month);if(view==='day')return chosen;const groups=new Map();
 for(const r of chosen){const period=view==='month'?r.date.slice(0,7):r.week;let g=groups.get(period);if(!g){g={date:period,day:'',week:r.week,holiday:false,label:'',practicalItems:[],theoryItems:[],hours:0};groups.set(period,g);}g.hours+=Math.round((r.hours||0)*100);for(const type of ['practical','theory'])for(const part of r[type+'Items']||[]){let old=g[type+'Items'].find(x=>String(x.seq)===String(part.seq));if(!old){old={...part,hours:0};g[type+'Items'].push(old);}old.hours+=Math.round(part.hours*100);}}
 return [...groups.values()].map(g=>{g.hours/=100;for(const type of ['practical','theory']){g[type+'Items'].forEach(x=>x.hours/=100);g[type]=g[type+'Items'].map(x=>`${x.sourceNo??x.seq}. ${x.title} (${x.hours}h)`).join('; ');}return g;});
}
return {validDate,canonical,validateItems,fromSheets,settings,allocate,mergeTopics,sourceState,candidate,periodRows};
});
