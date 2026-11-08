/* EduSkill 360 Principal Internal Inspection — read-only source records.
 * Draft print is not a saved finding, a Principal signature or an approval.
 */
(function(V){
'use strict';
if(!V)return;
const PAGE=50;
const TYPES=[['plan','Year Plan & Split-up'],['practicals','Practical Register / Lesson Plans'],['theory','Theory Register / Lesson Plans'],['attendance','Attendance Register'],['attendanceLocks','Attendance Submissions'],['trainees','Trainee Register'],['marks','Evaluation / Marks'],['exams','Examination Register'],['projects','OJT / Projects'],['holidays','Holidays / Calendar'],['notices','Trade Notices']];
const FIELDS={practicals:['no','sourceNo','title','topic','unit','hours','plannedDate','doneDate','status','teachingPlanRevision','planReviewRequired'],theory:['no','sourceNo','title','topic','unit','hours','plannedDate','doneDate','status','teachingPlanRevision','planReviewRequired'],trainees:['roll','name','id','trade','session','batch','admissionDate','status'],attendanceLocks:['month','status','submittedAt','reviewedAt','reason'],exams:['title','name','date','duration','status','published','questionCount'],projects:['title','name','date','submittedAt','status','description','traineeId'],holidays:['date','label','name','reason'],notices:['date','title','text','message']};
let serial=0;
function role(){return V.currentRole?.()||V.currentSession?.()?.role||window.SESSION?.role||'';}
function eligible(){return V.ready===true&&role()==='principal'&&V.member?.active!==false&&!!V.fb?.user?.uid;}
function node(tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;}
function short(v,n=300){
 if(v==null)return '';
 if(typeof v==='string')return v.slice(0,n);
 if(typeof v==='number'||typeof v==='boolean')return String(v);
 if(typeof v?.toDate==='function')return v.toDate().toISOString();
 if(Array.isArray(v))return v.slice(0,12).map(x=>short(x,110)).filter(Boolean).join(' | ').slice(0,n);
 if(typeof v==='object')return Object.entries(v).filter(([k])=>/^(status|value|attendance|total|marks|score|date|text|topic|title|information|procedure|keyPoint|spotHint|practical|theory)$/i.test(k)).slice(0,12).map(([k,x])=>k+': '+short(x,140)).join(' | ').slice(0,n);
 return '';
}
function inspect(type,source,index){
 const x=source?.data!==undefined?source.data:source,rows=[];
 if(type==='attendance'||type==='marks'){
  for(const k of ['key','subKey','traineeId'])if(source?.[k]!=null)rows.push([k,short(source[k],100)]);
  rows.push([type==='marks'?'Recorded marks':'Attendance entry',short(x,450)||'—']);
 }else{
  for(const k of FIELDS[type]||[])if(x?.[k]!=null&&x[k]!=='')rows.push([k,short(x[k],600)]);
  if((type==='practicals'||type==='theory')&&x?.plan&&typeof x.plan==='object'){
   for(const k of ['objective','tools','materials','motivation','steps','questions','summary','assignment','review','nextLesson','nextDemo']){
    if(x.plan[k]!=null)rows.push(['Reviewed plan: '+k,short(x.plan[k],1100)]);
   }
   if(x.planMeta?.status)rows.push(['Plan review status',short(x.planMeta.status,80)]);
  }
 }
 if(!rows.length)rows.push(['Record','Saved; no supported preview fields']);
 const title=rows.find(([k])=>['title','topic','name','date','key','roll','month','no'].includes(k))?.[1]||'Entry '+(index+1);
 return {title,rows};
}
function recordCard(info,index){
 const box=node('details',null,'pi-record'),summary=node('summary',(index+1)+'. '+info.title),dl=node('dl');
 for(const [label,value]of info.rows)dl.append(node('dt',label),node('dd',value));
 box.append(summary,dl);return box;
}
V.renderPrincipalInspection=async function(){
 const host=document.getElementById('tab-inspection');if(!host||!eligible())return;
 const ticket=++serial,uid=V.fb.user.uid,inst=V.INSTITUTE_ID;
 const active=()=>ticket===serial&&eligible()&&V.fb.user.uid===uid&&V.INSTITUTE_ID===inst&&document.getElementById('tab-inspection')===host&&host.classList.contains('active');
 host.replaceChildren();
 const hero=node('div',null,'hero'),hc=node('div',null,'hero-content'),head=node('div');
 head.append(node('h2','🛡️ Principal Internal Inspection'),node('p','Trade-wise review of actual saved training records.'));hc.append(head);hero.append(hc);host.append(hero);
 host.append(node('p','Read-only inspection. Principal can review saved Instructor records; this tool never changes attendance, lesson plans, marks or teaching data.','pi-notice'));
 const card=node('section',null,'card'),grid=node('div',null,'pi-controls');
 const wfield=node('div'),wlabel=node('label','Trade / Session / Batch'),wsel=node('select');wsel.id='piWorkspace';wlabel.htmlFor=wsel.id;
 const none=node('option','Choose a Trade / Batch…');none.value='';wsel.append(none);wfield.append(wlabel,wsel);
 const tfield=node('div'),tlabel=node('label','Record category'),tsel=node('select');tsel.id='piType';tlabel.htmlFor=tsel.id;
 for(const [key,title]of TYPES){const option=node('option',title);option.value=key;tsel.append(option);}
 tfield.append(tlabel,tsel);grid.append(wfield,tfield);
 const status=node('p','Loading available Trade workspaces…','pi-status');status.id='piStatus';status.setAttribute('role','status');
 const summary=node('div',null,'pi-summary'),records=node('div',null,'pi-records');records.id='piRecords';
 const next=node('button','Load next 50 records','btn secondary pi-more');next.type='button';next.hidden=true;
 const notesLabel=node('label','Draft observation — NOT saved to the institute');notesLabel.htmlFor='piNotes';
 const notes=node('textarea');notes.id='piNotes';notes.className='pi-notes';notes.maxLength=1600;notes.placeholder='Draft observations for print. Official compliance remarks and closure require a separate approved workflow.';
 const print=node('button','Print draft inspection','btn secondary pi-print');print.type='button';print.disabled=true;
 const warning=node('p','Draft printout only — no Principal approval, signatures, corrective actions or compliance history are stored.','pi-status');
 card.append(grid,status,summary,records,next,notesLabel,notes,print,warning);host.append(card);
 let workspace='',last=null,shown=0,request=0;
 async function fetchPage(first){
  if(!active()||!workspace)return;
  const id=++request,M=V.fb.M,type=tsel.value;
  if(first){last=null;shown=0;records.replaceChildren();notes.value='';}
  next.hidden=true;print.disabled=true;status.textContent='Reading '+type+' for the selected Trade…';
  try{
   if(type==='plan'){
    const ref=V.ws(workspace),snap=await (M.getDocFromServer?M.getDocFromServer(ref):M.getDoc(ref));
    if(!active()||request!==id||wsel.value!==workspace||tsel.value!==type)return;
    const d=snap.exists()?snap.data():null,plan=d?.trainingPlan;
    if(!plan){records.append(node('p','No saved Year Plan found in this workspace.','pi-status'));status.textContent='No approved Year Plan returned.';}
    else{
     const rows=[['Plan revision',d.trainingPlanRevision],['Source',d.trainingPlanSource],['Start',plan.settings?.startDate||plan.startDate],['End',plan.settings?.endDate||plan.endDate],['Planned days',Array.isArray(plan.dayPlan)?plan.dayPlan.length:undefined],['Summary',plan.summary]];
     for(const [i,day]of (Array.isArray(plan.dayPlan)?plan.dayPlan.slice(0,20):[]).entries())rows.push(['Day '+(i+1),short(day,500)]);
     records.append(recordCard({title:'Saved Year Plan',rows:rows.filter(x=>x[1]!=null).map(([k,v])=>[k,short(v,700)])},0));
     if(plan.dayPlan?.length>20)records.append(node('p','Showing the first 20 planned days. This is not the complete approved schedule.','pi-status'));
     status.textContent='Saved Year Plan preview loaded.';print.disabled=false;
    }
    summary.textContent='Trade: '+wsel.selectedOptions[0].textContent+' · Year Plan';return;
   }
   const col=V.col(type,workspace),constraints=[M.limit(PAGE)];
   if(last)constraints.push(M.startAfter(last));
   const q=M.query(col,...constraints);
   const out=await (M.getDocsFromServer?M.getDocsFromServer(q):M.getDocs(q));
   if(!active()||request!==id||wsel.value!==workspace||tsel.value!==type)return;
   const docs=out.docs||[];
   docs.forEach((d,i)=>records.append(recordCard(inspect(type,d.data(),shown+i),shown+i)));
   shown+=docs.length;last=docs[docs.length-1]||null;next.hidden=docs.length<PAGE;
   summary.textContent=wsel.selectedOptions[0].textContent+' · '+TYPES.find(x=>x[0]===type)[1]+' · '+shown+' entries displayed';
   status.textContent=shown?'Actual saved records loaded. Paginated preview is not a certification of completeness.':'No records returned in this category.';
   print.disabled=shown===0;
  }catch(e){
   if(!active()||request!==id)return;
   status.textContent='Record read failed: '+String(e?.message||'Unavailable').slice(0,160)+'. No records were changed.';
   next.hidden=true;print.disabled=true;
  }
 }
 wsel.addEventListener('change',()=>{workspace=wsel.value;request++;if(!workspace){records.replaceChildren();summary.replaceChildren();status.textContent='Choose a Trade / Batch to begin.';next.hidden=true;print.disabled=true;return;}fetchPage(true);});
 tsel.addEventListener('change',()=>{if(workspace)fetchPage(true);});
 next.addEventListener('click',()=>fetchPage(false));
 print.addEventListener('click',()=>{if(active()&&!print.disabled)window.print();});
 try{
  const ws=await V.listTradeWorkspaces({includeArchived:true});
  if(!active())return;
  for(const w of ws){if(w.status==='deleted'||w.deleted)continue;const opt=node('option',[w.trade||'Trade',w.session||'',w.batch||''].filter(Boolean).join(' • ')+(w.status==='archived'?' (Archived)':''));opt.value=w.id;wsel.append(opt);}
  status.textContent=wsel.options.length>1?'Choose a Trade and record category. Records load from Firestore only after selection.':'No available workspaces. Ask System Admin to create a Trade / Batch.';
 }catch(e){if(active())status.textContent='Unable to list Trade workspaces: '+String(e?.message||e).slice(0,140);}
};
})(window.V15Sync);
