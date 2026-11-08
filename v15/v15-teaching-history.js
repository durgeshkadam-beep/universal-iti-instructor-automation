/* Online authoritative plan saves; draft text stays in its editor on failure. */
(function(V,P){
'use strict';if(!V||!P)return;
let saving=false;
const scope=()=>({uid:V.fb?.user?.uid,institute:V.INSTITUTE_ID,workspace:V.workspaceId,db:V.fb?.db,data:DATA});
const same=c=>!!c&&V.ready&&SESSION?.role==='instructor'&&c.uid===V.fb?.user?.uid&&c.institute===V.INSTITUTE_ID&&c.workspace===V.workspaceId&&c.db===V.fb?.db&&c.data===DATA;
const section=type=>type==='practical'?'practicals':type==='theory'?'theory':null;
const find=(type,no)=>(DATA[section(type)]||[]).find(x=>String(x.no)===String(no));
async function topicRef(c,s,item){
 const M=V.fb.M,snap=await M.getDocs(M.query(M.collection(c.db,'institutes',c.institute,'workspaces',c.workspace,s),M.where('data.no','==',item.no),M.limit(2)));
 if(!same(c))throw Error('Account or workspace changed. Your draft was retained.');
 if(snap.docs.length!==1)throw Error('This topic is missing or has duplicate numbers. Review its saved records first.');
 return snap.docs[0].ref;
}
V.saveReviewedTeachingPlan=async function(options){
 if(saving)return;let controls=[],c,committed;
 const ai=!!options.pending;
 const active=()=>same(c)&&(ai?InstructorAI.state.pending===options.pending:PlanViewer.current===options.editor);
 const message=text=>{if(ai)InstructorAI.setAIStatus(text,'error');else{const body=document.getElementById('planModalBody');let p=document.getElementById('teachingSaveStatus');if(!p&&body){p=document.createElement('p');p.id='teachingSaveStatus';p.setAttribute('role','status');body.prepend(p);}if(p)p.textContent=text;}};
 try{
  c=scope();if(!active())throw Error('Sign in as the assigned Instructor and reopen this plan.');
  const s=section(options.type),item=find(options.type,options.no);if(!s||!item)throw Error('Teaching topic missing.');
  if(ai)InstructorAI.requireCurrentPlan(options.pending);else if(!PlanViewer.readCurrent(true))return;
  P.validatePlan(s,options.plan,options.mode==='patch');
  if(!navigator.onLine)throw Error('The draft is retained here. Reconnect to save a verified cloud revision.');
  const before=P.canonical(item);saving=true;
  controls=[...document.querySelectorAll((ai?'#aiModal':'#planModal')+' button,'+(ai?'#aiModal':'#planModal')+' textarea')].map(node=>({node,disabled:node.disabled}));controls.forEach(x=>x.node.disabled=true);message('Saving an authoritative teaching-plan revision…');
  const deadline=Date.now()+8000;while(V.syncing||V._queueFlushing){if(!active())return;if(Date.now()>deadline)throw Error('Current sync is still pending. Your draft is retained.');await new Promise(resolve=>setTimeout(resolve,40));}
  await V.diff();await V.flushQueue();
  if(!active()||V.syncing||V._queueFlushing||V.queueRead().some(o=>o.workspaceId===c.workspace))throw Error('Sync pending changes and reopen the latest topic. Your draft is retained.');
  if(P.canonical(find(options.type,options.no))!==before)throw Error('The topic changed while syncing. Copy your draft before reopening the latest plan.');
  const ref=await topicRef(c,s,item);if(!active())return;
  const result=await V.backendRequest({action:'saveTeachingPlan',section:s,topicId:ref.id,expectedHash:await V.hash(before),mode:options.mode,status:options.status,plan:options.plan});
  committed=result.revision;
  if(!same(c))return;
  const fresh=await V.fb.M.getDocFromServer(ref);if(!same(c))return;if(!fresh.exists())throw Error('Saved topic could not reload.');const record=fresh.data().data;
  const update=list=>{const i=list?.findIndex(x=>String(x.no)===String(options.no));if(i>=0)list[i]=V.clone(record);};update(DATA[s]);V.shadow=V.shadow||{};if(!Array.isArray(V.shadow[s]))V.shadow[s]=V.clone(DATA[s]);else update(V.shadow[s]);
  V.refresh?.();if(!active())return;
  if(ai)InstructorAI.closeModal();PlanViewer.open(options.type,options.no);
  alert('Plan saved as cloud revision '+result.revision+(result.alreadySaved?' (already saved; no duplicate revision).':'. Review it before use.'));
 }catch(e){if(!c||same(c))message((committed?'Cloud revision '+committed+' was saved, but reloading did not finish. ':'')+(e.message||'Save did not finish.')+' If a request was sent, check Version history before retrying.');}
 finally{saving=false;controls.forEach(x=>{if(x.node.isConnected)x.node.disabled=x.disabled;});}
};
V.openTeachingHistory=async function(type,no){
 const c=scope(),item=find(type,no),s=section(type);if(!same(c)||!item||!s)return;
 const viewer=PlanViewer.current,body=document.getElementById('planModalBody');if(!body)return;
 const host=document.createElement('section');host.className='card';host.id='teachingHistory';body.querySelector('#teachingHistory')?.remove();body.prepend(host);host.textContent='Loading recent saved plan revisions…';
 const active=()=>same(c)&&viewer===PlanViewer.current&&host.isConnected;
 try{
  const M=V.fb.M,ref=await topicRef(c,s,item),snap=await M.getDocs(M.query(M.collection(ref,'teachingPlanRevisions'),M.orderBy('revision','desc'),M.limit(10)));if(!active())return;host.replaceChildren();
  const h=document.createElement('h4');h.textContent='Recent saved revisions (latest 10)';host.append(h);
  if(!snap.docs.length){const p=document.createElement('p');p.textContent='No managed revision yet. The first save will archive the current legacy plan; earlier history is not reconstructed.';host.append(p);}
  for(const doc of snap.docs){const d=doc.data(),details=document.createElement('details'),title=document.createElement('summary'),text=document.createElement('pre');title.textContent='Revision '+d.revision+' · '+d.createdAt+' · '+d.planMeta.status;details.append(title,text);text.textContent=JSON.stringify({plan:d.plan,previous:d.previous},null,2);text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';host.append(details);}
 }catch(e){if(active())host.textContent='History unavailable. Check connectivity and assigned-Instructor permissions.';}
};
function pendingPlans(type,no){return V.queueRead().filter(o=>o.workspaceId===V.workspaceId&&o.kind==='array'&&o.action==='set'&&o.section===section(type)&&String(o.value?.no)===String(no)&&P.canonical(P.protectedState(o.before))!==P.canonical(P.protectedState(o.value)));}
V.reviewPendingTeachingDraft=async function(type,no){
 const c=scope(),item=find(type,no),op=pendingPlans(type,no)[0],viewer=PlanViewer.current;if(!same(c)||!item||!op||op.actorUid&&op.actorUid!==c.uid)return;
 document.getElementById('pendingTeachingDraft')?.remove();const host=document.createElement('section');host.id='pendingTeachingDraft';host.className='card';document.getElementById('planModalBody').prepend(host);
 const add=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;host.append(n);return n;};
 add('h4','Review an older queued plan draft');add('p','This draft was not replayed over cloud history. Review it below. Recovery saves only this reviewed plan as a new revision; other queued field edits are retained. Recover drafts in queue order.');
 const raw=add('textarea');raw.setAttribute('aria-label','Pending teaching plan JSON');raw.value=JSON.stringify(op.value.plan,null,2);raw.rows=8;raw.style.width='100%';
 const download=add('button','Download pending plan JSON');download.type='button';download.className='btn ghost';download.onclick=()=>{if(!same(c))return;const url=URL.createObjectURL(new Blob([raw.value],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ITI-pending-plan-'+String(no).replace(/[^a-z0-9.-]/gi,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const status=add('p','Reading the current cloud plan…');status.setAttribute('role','status');const save=add('button','Save reviewed recovery as revision');save.type='button';save.className='btn primary';save.disabled=true;
 const active=()=>same(c)&&viewer===PlanViewer.current&&host.isConnected;let ref,before;
 try{if(!op.before)throw Error('This queued create needs operator review before recovery. Download the draft; it was not discarded.');ref=await topicRef(c,section(type),item);const snapshot=await V.fb.M.getDocFromServer(ref);if(!active())return;if(!snapshot.exists())throw Error('The original topic is missing. Download the draft for operator recovery.');before=snapshot.data().data;const current=add('details'),summary=document.createElement('summary'),text=document.createElement('pre');summary.textContent='Compare with the current cloud plan';text.textContent=JSON.stringify(before.plan||{},null,2);text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';current.append(summary,text);status.textContent='Review and correct the JSON before saving. No data changed.';save.disabled=false;}catch(e){if(active())status.textContent=e.message;return;}
 save.onclick=async()=>{
  if(!active()||saving)return;let committed;
  try{
   const plan=P.validatePlan(section(type),JSON.parse(raw.value),false),queued=V.queueRead().find(x=>x.id===op.id);if(P.canonical(queued)!==P.canonical(op))throw Error('The queued draft changed. Reopen its review.');
   if(!confirm('Save this reviewed queued plan as a new cloud revision? Only its consumed plan edit will be removed from the queue; other field edits are retained.'))return;if(!active())return;
   saving=true;save.disabled=true;raw.disabled=true;status.textContent='Saving reviewed recovery…';const result=await V.backendRequest({action:'saveTeachingPlan',section:section(type),topicId:ref.id,expectedHash:await V.hash(P.canonical(before)),mode:'replace',status:'instructor-edited',plan});committed=result.revision;
   const fresh=await V.fb.M.getDocFromServer(ref);if(!active())return;if(!fresh.exists())throw Error('Saved topic could not reload.');const record=fresh.data().data,q=V.queueRead(),original=q.find(x=>x.id===op.id);if(P.canonical(original)!==P.canonical(op))throw Error('The queued draft changed after the request. It is retained; check history.');
   const next=q.flatMap(x=>{if(x.id!==op.id)return [x];if(!P.mutableChanged(op.before,op.value))return [];const value=P.copyProtected(op.value,record);return [{...x,before:P.copyProtected(op.before,record),value,data:{...x.data,data:value}}];});V.queueWrite(next);
   const s=section(type),index=DATA[s].findIndex(x=>String(x.no)===String(no));if(index>=0)DATA[s][index]=P.copyProtected(DATA[s][index],V.clone(record));V.shadow=V.shadow||{};const old=V.shadow[s]?.findIndex(x=>String(x.no)===String(no));if(old>=0)V.shadow[s][old]=V.clone(record);
   PlanViewer.open(type,no);alert('Recovered plan saved as cloud revision '+result.revision+'. Other pending field edits were retained.');
  }catch(e){if(active()){status.textContent=(committed?'Cloud revision '+committed+' was saved. ':'')+(e.message||'Recovery did not finish.')+' Original queued draft is retained; check history before retrying.';raw.disabled=false;save.disabled=false;}}
  finally{saving=false;}
 };
};
// Rebase ordinary queued edits onto current plan metadata; never replay a plan edit over history.
V.writeQueuedTeachingTopic=async function(o,ref){
 const M=V.fb.M,c=scope();if(!same(c)&&!['admin','principal'].includes(SESSION?.role))throw Error('Teaching sync identity unavailable.');
 const current=()=>V.ready&&c.uid===V.fb?.user?.uid&&c.institute===V.INSTITUTE_ID&&c.db===V.fb?.db;
 if(o.before){const docs=await M.getDocs(M.query(M.collection(c.db,'institutes',c.institute,'workspaces',o.workspaceId,o.section),M.where('data.no','==',o.before.no),M.limit(2)));if(!current()||docs.docs.length!==1)throw Error('Queued topic is missing or duplicated. Original edit retained.');ref=docs.docs[0].ref;}
 let saved;await M.runTransaction(c.db,async tx=>{const snap=await tx.get(ref);if(!current())throw Error('Account changed during teaching sync.');const record=snap.exists()?snap.data().data:null;const value=P.rebase(o.before,o.value,record);tx.set(ref,{...(snap.exists()?snap.data():{}),...o.data,data:value});saved=value;});
 if(!current())throw Error('Account changed after teaching sync. Original retry retained.');
 const queue=V.queueRead(),index=queue.findIndex(x=>x.id===o.id);if(index>=0)V.queueWrite(queue.map((next,i)=>i>index&&next.kind==='array'&&next.action==='set'&&next.section===o.section&&next.workspaceId===o.workspaceId&&String(next.value?.no)===String(o.value?.no)&&(!next.actorUid||next.actorUid===c.uid)?P.advanceFollower(o,saved,next):next));
};
const receive=V.receiveSyllabusSnapshot?.bind(V);
if(receive)V.receiveSyllabusSnapshot=function(s,incoming){
 const before=new Map((V.shadow?.[s]||[]).map(x=>[V.itemId(s,x),x])),local=new Map((DATA[s]||[]).map(x=>[V.itemId(s,x),x]));receive(s,incoming);
 let changed=false;for(const server of incoming){const id=V.itemId(s,server),old=before.get(id),draft=local.get(id),current=(DATA[s]||[]).find(x=>V.itemId(s,x)===id);if(!current||!draft||P.canonical(P.protectedState(old))!==P.canonical(P.protectedState(draft)))continue;if(P.canonical(P.protectedState(current))!==P.canonical(P.protectedState(server)))changed=true;for(const key of P.protectedKeys){if(Object.hasOwn(server,key))current[key]=V.clone(server[key]);else delete current[key];}}if(changed)V.refresh?.();
};
const open=PlanViewer.open.bind(PlanViewer);PlanViewer.open=function(type,no){open(type,no);if(SESSION?.role!=='instructor'||!V.ready||!this.current)return;const toolbar=document.querySelector('#planModal .plan-preview-toolbar'),item=find(type,no);if(!toolbar||!item)return;const info=document.createElement('p');info.className='muted';const pending=pendingPlans(type,no).length;if(pending){const status=document.querySelector('#planModalBody .callout');if(status)status.textContent='Local draft pending review; the existing cloud approval does not apply to these unsynced edits.';}info.textContent=pending?'Pending local plan draft — review it before cloud publication.':item.teachingPlanRevision?'Cloud teaching revision '+item.teachingPlanRevision+(P.canonical(item.planMeta?.context)!==P.canonical(P.topicContext(item))?' · Topic context changed; review the saved plan.':''):'Legacy plan — revision history begins on its next cloud save.';toolbar.after(info);toolbar.append(this.button('Version history',()=>{if(this.readCurrent())V.openTeachingHistory(type,no);}));if(pendingPlans(type,no).length)toolbar.append(this.button('Review pending plan draft',()=>V.reviewPendingTeachingDraft(type,no)));};
for(const controller of [Practicals,Theory]){const remove=controller.remove;controller.remove=function(no){const item=find(controller===Practicals?'practical':'theory',no);if(item?.teachingPlanRevision){alert('This topic has saved plan history. Keep its record; edit it or archive the workspace instead.');return;}return remove.call(this,no);};}
})(window.V15Sync,window.ITITeachingPlan);
