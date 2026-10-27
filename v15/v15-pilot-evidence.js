/* Universal EduSkill 360 — Instructor time-use pilot diary (device-local).
 * Research measurement, not verified impact or a government timesheet.
 * Never stores student names, IDs, marks, contacts or attendance records.
 */
(function(V){
'use strict';
if(!V)return;
const tasks={attendance:'Taking attendance',reports:'Preparing routine reports'};
const methods={before:'Existing/manual workflow',app:'Using EduSkill / ITI application'};
function el(tag,text,cls){const x=document.createElement(tag);if(text!=null)x.textContent=String(text);if(cls)x.className=cls;return x;}
function role(){return V.currentRole?.()||window.SESSION?.role||'';}
function context(){if(!V.ready||role()!=='instructor'||!V.fb?.user?.uid||!V.workspaceId)return null;return 'eduskill360-pilot-v1-'+encodeURIComponent(V.INSTITUTE_ID)+'-'+encodeURIComponent(V.fb.user.uid)+'-'+encodeURIComponent(V.workspaceId);}
function valid(row){
  return row&&Object.hasOwn(tasks,row.task)&&Object.hasOwn(methods,row.method)
    &&Number.isInteger(Number(row.batchSize))&&Number(row.batchSize)>=1&&Number(row.batchSize)<=200
    &&Number.isFinite(Number(row.minutes))&&Number(row.minutes)>0&&Number(row.minutes)<=300
    &&/^\d{4}-\d{2}-\d{2}$/.test(String(row.date||''));
}
const round=x=>Math.round(x*10)/10;
V.calculatePilotTimeSavings=function(rows,task,batchSize){
  const group=(Array.isArray(rows)?rows:[]).filter(x=>valid(x)&&x.task===task&&Number(x.batchSize)===Number(batchSize));
  const base=group.filter(x=>x.method==='before').map(x=>Number(x.minutes));
  const app=group.filter(x=>x.method==='app').map(x=>Number(x.minutes));
  const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
  const a=mean(base),b=mean(app);
  return {beforeCount:base.length,appCount:app.length,beforeMean:a===null?null:round(a),appMean:b===null?null:round(b),
    // Not shown without measured before AND measured after for matched task/batch size.
    savingsPercent:a!==null&&b!==null?Math.round(100*(a-b)/a):null,
    smallSample:base.length<3||app.length<3};
};
function records(key){try{const r=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(r)?r.filter(valid).slice(0,200):[];}catch(e){return [];}}
function csvEscape(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"';}
V.pilotEvidenceCsv=function(rows){
  const lines=['Date,Workflow,Method,Batch_Size,Measured_Minutes'];
  for(const item of (Array.isArray(rows)?rows:[]).filter(valid)){
    lines.push([item.date,item.task,item.method,item.batchSize,item.minutes].map(csvEscape).join(','));
  }
  return lines.join('\r\n')+'\r\n';
};
V.renderPilotTimeEvidence=function(){
  const host=document.getElementById('tab-pilot-impact'),key=context();
  if(!host||!key)return;
  host.replaceChildren(el('h2','⏱ Instructor Time-Saving Evidence'));
  host.append(el('p','Record actual minutes for the SAME task and comparable batch size before and after using the application. These are self-recorded pilot observations, not independently verified savings.','callout'));
  host.append(el('p','Record no student names, IDs, personal details or grades. This diary stays only on this browser for this signed-in Instructor and workspace. Export CSV for your authorised pilot report.','muted'));
  const form=el('section',null,'card');host.append(form);
  form.append(el('h3','Record one real observation'));
  function control(title,field){
    const lab=el('label',title);const id='pilot-'+field;lab.htmlFor=id;form.append(lab);
    const input=el('input');input.id=id;form.append(input);return input;
  }
  function menu(title,field,choices){
    const lab=el('label',title);lab.htmlFor='pilot-'+field;form.append(lab);
    const select=el('select');select.id='pilot-'+field;
    for(const [value,text] of Object.entries(choices)){const opt=el('option',text);opt.value=value;select.append(opt);}
    form.append(select);return select;
  }
  const task=menu('Workflow','task',tasks),method=menu('Method','method',methods);
  const date=control('Date of observation','date');date.type='date';date.value=new Date().toISOString().slice(0,10);
  const batch=control('Number of trainees in that batch','batch');batch.type='number';batch.min='1';batch.max='200';batch.step='1';batch.placeholder='e.g. 20';
  const minutes=control('Actual elapsed time (minutes)','minutes');minutes.type='number';minutes.min='0.1';minutes.max='300';minutes.step='0.1';minutes.placeholder='Enter observed time, not a target';
  const buttons=el('div');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0';
  const save=el('button','Save observation','btn primary');save.type='button';buttons.append(save);
  const download=el('button','Export observations CSV','btn');download.type='button';buttons.append(download);
  form.append(buttons);
  const status=el('p','','muted');status.setAttribute('role','status');form.append(status);
  const output=el('section',null,'card');output.id='v15PilotSummary';host.append(output);
  const draw=()=>{
    output.replaceChildren(el('h3','Observed time comparisons'));
    const items=records(key);
    if(!items.length){output.append(el('p','No measurements entered. Nothing is claimed yet.','muted'));return;}
    output.append(el('p',items.length+' observed task timings recorded on this device only.','muted'));
    const groups=[...new Set(items.map(x=>x.task+'|'+x.batchSize))].sort();
    for(const group of groups){
      const cut=group.lastIndexOf('|'),kind=group.slice(0,cut),size=Number(group.slice(cut+1));
      const x=V.calculatePilotTimeSavings(items,kind,size);
      const line=el('div',null,'field-row');line.style.cssText='padding:12px 0;border-bottom:1px solid #dce4ed';
      line.append(el('strong',tasks[kind]+' · '+size+' trainees'));
      line.append(el('p','Manual '+x.beforeCount+' observation(s)'+(x.beforeMean!==null?' • mean '+x.beforeMean+' min':'')+
        ' | Application '+x.appCount+' observation(s)'+(x.appMean!==null?' • mean '+x.appMean+' min':''),'muted'));
      if(x.savingsPercent===null){
        line.append(el('p','Insufficient paired observations — no time-saving percentage.','muted'));
      }else{
        const label=x.savingsPercent>=0?'Observed time difference (reduction): ':'Observed time difference (increase): ';
        line.append(el('p',label+Math.abs(x.savingsPercent)+'% (self-recorded; matched task and batch size).','callout'));
        if(x.smallSample)line.append(el('p','Small sample: fewer than 3 observations in at least one method; do NOT report this as validated pilot impact.','muted'));
      }
      output.append(line);
    }
  };
  save.addEventListener('click',()=>{
    if(context()!==key)return;
    const row={task:task.value,method:method.value,date:date.value,batchSize:Number(batch.value),minutes:Number(minutes.value)};
    if(!batch.value.trim()||!minutes.value.trim()||!valid(row)||row.date>new Date().toISOString().slice(0,10)){
      status.textContent='Enter an actual observation date, batch size (1–200) and minutes (0.1–300). Future dates are not accepted.';return;
    }
    const list=records(key);
    if(list.length>=200){status.textContent='Device log limit reached; export the CSV and use a new reviewed pilot phase.';return;}
    try{localStorage.setItem(key,JSON.stringify([...list,row]));status.textContent='Observed time saved on this device. Do not treat this as independent validation.';minutes.value='';draw();}
    catch(e){status.textContent='Browser storage unavailable. The observation was not saved.';}
  });
  download.addEventListener('click',()=>{
    if(context()!==key)return;
    const items=records(key);
    if(!items.length){status.textContent='No observed data to export.';return;}
    const blob=new Blob([V.pilotEvidenceCsv(items)],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=el('a');a.href=url;a.download='EduSkill360_Pilot_Time_Observations.csv';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='CSV prepared; verify that your browser saved it. The records remain stored only on this device.';
  });
  draw();
};
})(window.V15Sync);
