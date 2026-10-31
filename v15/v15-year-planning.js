/* Reviewed keyless planning. Authoritative saves go through the existing authenticated API. */
(function(V,P){
'use strict';if(!V||!P||typeof UniversalSyllabus==='undefined')return;
const U=UniversalSyllabus;let excelLoader=null;
async function excel(file){if(window.XLSX)return;if(/\.xls$/i.test(file.name))throw Error('Legacy XLS needs the full online parser. Save this workbook as XLSX and import again.');if(!excelLoader)excelLoader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/vendor/xlsx.mini.min.js';script.onload=()=>window.XLSX?resolve():reject(Error('Excel parser did not initialise.'));script.onerror=()=>{excelLoader=null;reject(Error('Excel parser could not load. Reconnect and retry.'));};document.head.append(script);});await excelLoader;}
let busy=false,scope='',view='day',month='',viewScope='';
const context=()=>({uid:V.fb?.user?.uid,institute:V.INSTITUTE_ID,workspace:V.workspaceId,data:DATA});
const current=c=>c&&c.uid===V.fb?.user?.uid&&c.institute===V.INSTITUTE_ID&&c.workspace===V.workspaceId&&c.data===DATA&&SESSION?.role==='instructor'&&V.ready;
const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const source=()=>({practicals:DATA.practicals||[],theory:DATA.theory||[],holidays:DATA.holidays||[]});
function settings(){return P.settings({startDate:document.getElementById('uStart').value,endDate:document.getElementById('uEnd').value,practicalHours:document.getElementById('uHours').value,theoryHours:document.getElementById('uTheoryHours').value,workdays:[...document.querySelectorAll('#uDays input:checked')].map(x=>Number(x.value)),alternateSaturdays:document.getElementById('uAltSat').checked,includeExistingHolidays:document.getElementById('uUseExistingHolidays').checked,holidays:U.parseHolidayText(document.getElementById('uHolidays').value)});}
function snapshot(){return P.canonical(P.sourceState(DATA.meta,DATA.practicals,DATA.theory,DATA.holidays));}
function assertImportContext(){if(U._importContext&&!current(U._importContext))throw Error('Account or workspace changed. Import the syllabus again.');if(U.state.trade&&String(U.state.trade).trim().toLowerCase()!==String(DATA.meta.trade||'').trim().toLowerCase())throw Error('The imported trade differs from this workspace. Select its correct Trade / Session / Batch first.');}
function summary(result){
 let host=document.getElementById('uCapacitySummary');if(!host)return;host.replaceChildren();
 const line=(text,cls='muted')=>{const p=document.createElement('p');p.className=cls;p.textContent=text;host.append(p);};
 line(`${result.summary.workingDays} working days; ${result.summary.nonWorkingDays} holidays/non-working days.`);
 for(const type of ['practical','theory']){const s=result.summary[type];line(`${type==='practical'?'Practical':'Theory'}: ${s.requiredHours} hours required; ${s.capacityHours} hours available; ${s.allocatedHours} allocated; ${s.remainingHours} hours remain.${s.finishDate?' Finish: '+s.finishDate:''}`,s.remainingHours?'bad':'');}
 const review=[...result.practicals,...result.theory].filter(x=>x.planReviewRequired).length;if(review)line(`${review} saved plan(s) need Instructor review because required hours changed.`, 'bad');
 line(`${result.added} new topics; ${result.retained} existing topics outside this import retained. Saved plans, completion dates, marks and trainee links are preserved.`);
 line(`Holiday coverage: review the published calendar for ${result.years.join(', ')}. Loaded holiday dates do not prove a complete official calendar; missing dates are not invented.`);
}
const baseInit=U.init.bind(U);
U.init=function(){
 const active=V.ready&&SESSION?.role==='instructor'?[V.fb?.user?.uid,V.INSTITUTE_ID,V.workspaceId].join('|'):'';
 if(active&&active!==scope){scope=active;this._importContext=null;this._reviewed=null;this.state={trade:DATA.meta.trade||'',items:[],calendar:[],sourceName:'',analyzedAt:null};const old=DATA.meta.trainingPlan,opts=old?.settings;
  document.getElementById('uTrade').value=DATA.meta.trade||'';document.getElementById('uStart').value=old?.startDate||DATA.meta.scheduleStartDate||'';document.getElementById('uEnd').value=old?.endDate||DATA.meta.sessionEndDate||DATA.meta.scheduleEndDate||'';
  document.getElementById('uHours').value=old?.practicalHoursPerDay??5;document.getElementById('uTheoryHours').value=old?.theoryHoursPerDay??3;
  if(opts){document.querySelectorAll('#uDays input').forEach(x=>x.checked=opts.workdays.includes(Number(x.value)));document.getElementById('uAltSat').checked=opts.alternateSaturdays;document.getElementById('uHolidays').value=opts.holidays.map(h=>h.date+' | '+h.label).join('\n');}
  this.renderPreview();this.renderCalendar();
 }
 const trade=document.getElementById('uTrade');if(trade)trade.readOnly=true;if(!V.ready)baseInit();
};
U.loadCurrentSyllabus=function(){
 if(!V.ready||SESSION?.role!=='instructor')return;const items=[];for(const type of ['practical','theory'])for(const x of (type==='practical'?DATA.practicals:DATA.theory).slice().sort((a,b)=>(Number(a.sequence)||0)-(Number(b.sequence)||0)||String(a.no).localeCompare(String(b.no),undefined,{numeric:true})))items.push({seq:items.length+1,type,no:String(x.sourceNo||x.no),title:x.title,hours:Number(x.hours)>0?Number(x.hours):'',module:x.unit||'General'});
 this.state={trade:DATA.meta.trade||'',items,calendar:[],sourceName:'Current workspace syllabus',analyzedAt:new Date().toISOString()};this._importContext=context();this._reviewed=null;this.renderPreview();this.renderCalendar();this.status('Loaded existing topic numbers and hours. Review them and preview the calendar; no records have changed.','ok');
};
U.analyzeFile=async function(){
 if(!V.ready||SESSION?.role!=='instructor')return;const file=document.getElementById('uFile').files[0];if(!file){this.status('Select a syllabus file first.','error');return;}const c=context();this._reviewed=null;
 try{if(file.size>10*1024*1024)throw Error('Use a syllabus file up to 10 MB.');this.status('Reading '+file.name+'…');let items;
  if(/\.xlsx?$/i.test(file.name)){
   await excel(file);const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),sheets={};
   for(const name of wb.SheetNames){if(!/^(theory|practicals?)$/i.test(name.trim()))continue;const sheet=wb.Sheets[name],range=sheet['!ref'];if(range){const bounds=XLSX.utils.decode_range(range);if(bounds.e.r>2000||bounds.e.c>30)throw Error('Use the compact template, with at most 2000 rows and 31 columns per sheet.');}
    if(Object.values(sheet).some(cell=>cell&&typeof cell==='object'&&cell.f))throw Error('Replace formulas with reviewed fixed values before importing the syllabus.');sheets[name]=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});}
   items=P.fromSheets(sheets);
  }else{const text=await this.extractText(file);if(!text.trim())throw Error('This file has no readable text. Scanned PDFs need OCR followed by a reviewed topic list; no syllabus was guessed.');items=this.classifyLines(text);if(!items.length)throw Error('No topics found. Use the blank Excel template or review the extracted text.');}
  if(!current(c))return;this.state={trade:DATA.meta.trade||'',items,calendar:[],sourceName:file.name,analyzedAt:new Date().toISOString()};this._importContext=c;this._reviewed=null;this.renderPreview();this.renderCalendar();this.status(`Loaded ${items.length} topics. Review numbers, types, names and hours before preview. Nothing has been saved.`,'ok');
 }catch(e){if(current(c))this.status(e.message||'Could not read this syllabus.','error');}
};
U.renderPreview=function(){
 const host=document.getElementById('uPreviewBody');if(!host)return;host.replaceChildren();const make=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value??'');return n;};
 (this.state.items||[]).forEach((item,index)=>{const tr=make('tr');for(const [field,type] of [['type','select'],['no','input'],['module','input'],['title','textarea'],['hours','input']]){const td=make('td'),input=make(type);if(type==='select')for(const value of ['practical','theory']){const option=make('option',value);option.value=value;input.append(option);}if(field==='hours'){input.type='number';input.step='0.01';input.min='0.01';}input.value=item[field]??'';input.setAttribute('aria-label',`Row ${index+1} ${field}`);input.addEventListener('change',()=>{item[field]=field==='hours'?Number(input.value):input.value;this._reviewed=null;});td.append(input);tr.append(td);}const td=make('td'),remove=make('button','Remove');remove.type='button';remove.className='btn ghost small';remove.addEventListener('click',()=>{this.state.items.splice(index,1);this._reviewed=null;this.renderPreview();});td.append(remove);tr.append(td);host.append(tr);});
 const count=document.getElementById('uCounts');if(count)count.textContent=`${this.state.items.filter(x=>x.type==='practical').length} practical · ${this.state.items.filter(x=>x.type==='theory').length} theory`;
};
U.generateCalendar=function(){
 this._reviewed=null;this.state.calendar=[];this.renderCalendar();
 try{if(!V.ready||SESSION?.role!=='instructor')throw Error('Sign in as the assigned Instructor first.');assertImportContext();const opts=settings(),items=P.validateItems(this.state.items),result=P.candidate(items,opts,source());
  this.state.calendar=result.rows;this._reviewed={context:context(),items:P.canonical(items),settings:P.canonical(opts),source:snapshot(),sourceName:this.state.sourceName};this.renderCalendar();summary(result);
  this.status(`Preview ready. ${result.summary.practical.remainingHours+result.summary.theory.remainingHours} hours remain outside this session. Review holiday coverage and allocations, then explicitly save.`,'ok');return true;
 }catch(e){this.status(e.message||'Check the syllabus and calendar settings.','error');return false;}
};
U.createCompletePlan=async function(){
 if(busy)return;let dialog;
 try{if(!V.ready||SESSION?.role!=='instructor')throw Error('Only the assigned Instructor can save year planning.');assertImportContext();const r=this._reviewed;if(!r||!current(r.context)||r.items!==P.canonical(P.validateItems(this.state.items))||r.settings!==P.canonical(settings())||r.source!==snapshot()||r.sourceName!==this.state.sourceName)throw Error('Preview the current syllabus and settings again before saving.');
  if(!navigator.onLine)throw Error('Preview and printing work offline. Reconnect to save an authoritative year-plan revision.');
  if(!confirm('Save this reviewed year plan? Existing topic IDs, plans, completion dates and student records will be kept. Any previous year-plan revision remains in history.'))return;
  if(!current(r.context))throw Error('Account or workspace changed. Review the syllabus again.');busy=true;dialog=document.createElement('dialog');dialog.className='planning-saving-dialog';const p=document.createElement('p');p.textContent='Saving your reviewed year plan…';p.setAttribute('role','status');dialog.append(p);dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);dialog.showModal();
  await V.diff();await V.flushQueue();if(!current(r.context))throw Error('Account or workspace changed.');if(V.queueRead().some(o=>o.workspaceId===r.context.workspace))throw Error('Sync pending changes before saving a year-plan revision.');
  const result=await V.backendRequest({action:'saveTrainingPlan',expectedSourceHash:await sha(r.source),items:JSON.parse(r.items),settings:JSON.parse(r.settings),source:r.sourceName});if(!current(r.context))return;
  await V.load('instructor');V.shadow=V.clone(DATA);V.realtime('instructor');V.refresh();this._importContext=context();this._reviewed=null;
  this.status(`${result.planId} · revision ${result.revision}${result.alreadySaved?' already saved; no duplicate revision created.':' saved. Existing records and prior revisions retained.'}`,'ok');Schedule.render();
 }catch(e){this.status((e.message||'Save did not finish.')+' Your imported list is retained. If a request was already sent, check the saved plan before retrying.','error');}
 finally{busy=false;if(dialog){dialog.close();dialog.remove();}}
};
U.applyToRegister=()=>U.createCompletePlan();
Schedule.rowsForPrint=()=>SESSION?.role==='instructor'?V.yearPlanViewRows():Schedule.buildRows();
Schedule.printCaption=()=>{const p=DATA.meta.trainingPlan;return [p?.planId,p?.revision?'revision '+p.revision:'',view+'-wise',month||'Full session'].filter(Boolean).join(' · ');};
V.yearPlanViewRows=function(){return P.periodRows(Schedule.buildRows(),view,month);};
const baseRender=Schedule.render.bind(Schedule);
Schedule.render=function(){
 baseRender();if(SESSION?.role!=='instructor')return;const currentViewScope=[V.fb?.user?.uid,V.INSTITUTE_ID,V.workspaceId].join('|');if(currentViewScope!==viewScope){viewScope=currentViewScope;view='day';month='';}const panel=document.getElementById('tab-splitup');if(!panel)return;
 let controls=document.getElementById('yearPlanViews');if(!controls){controls=document.createElement('div');controls.id='yearPlanViews';controls.className='card';const select=document.createElement('select');select.setAttribute('aria-label','Year plan view');for(const [value,label] of [['day','Day-wise'],['week','Week-wise'],['month','Month-wise']]){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}select.addEventListener('change',()=>{view=select.value;Schedule.render();});const filter=document.createElement('input');filter.type='month';filter.setAttribute('aria-label','Year plan month');filter.addEventListener('change',()=>{month=filter.value;Schedule.render();});const reset=document.createElement('button');reset.type='button';reset.className='btn ghost';reset.textContent='Full session';reset.addEventListener('click',()=>{month='';filter.value='';Schedule.render();});const label=document.createElement('p');label.id='yearPlanRevision';controls.append(label,select,filter,reset);panel.querySelector('h2')?.after(controls);}
 controls.querySelector('select').value=view;controls.querySelector('input').value=month;const label=controls.querySelector('#yearPlanRevision'),plan=DATA.meta.trainingPlan;const advanced=document.getElementById('splitupAlternateSettings');if(advanced)advanced.hidden=!!plan?.revision;const official=document.getElementById('splitupOfficial');if(official&&plan?.revision)official.hidden=true;label.textContent=plan?.planId?`${plan.planId} · revision ${plan.revision||DATA.meta.trainingPlanRevision||'legacy'} · ${month||'Full session'} · ${view}-wise`:'No managed year-plan revision saved yet. Import or load your current syllabus to plan.';
 const body=document.getElementById('splitupTableBody');if(body){body.replaceChildren();for(const r of V.yearPlanViewRows()){const tr=document.createElement('tr');for(const value of [r.date,r.day,r.week,r.holiday?'HOLIDAY — '+r.label:r.practical||'—',r.holiday?'HOLIDAY — '+r.label:r.theory||'—']){const td=document.createElement('td');td.textContent=value??'';tr.append(td);}body.append(tr);}}
};
})(window.V15Sync,window.ITISyllabusPlanning);
