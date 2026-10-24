/* Workspace-bound training backup. Restores missing training resources only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.ITITrainingBackup=api;api.install(root.V15Sync);}})(typeof window!=='undefined'?window:this,function(){
'use strict';
const SECTIONS=['practicals','theory','modules','notices','holidays'],FORMAT='Universal ITI training backup',MAX_BYTES=10*1024*1024;
const fieldKey=k=>k.toLowerCase().replace(/[_-]/g,'');
const forbidden=new Set(['__proto__','prototype','constructor','pin','password','instructorpin','principalpin','apikey','api_key','accesstoken','refreshtoken','idtoken','authorization','private_key','client_secret','credentials'].map(fieldKey));
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=500;
function clean(value,depth=0,strip=false){
 if(depth>12)throw Error('Backup nesting is too deep.');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid number.');return value;}
 if(typeof value==='string'){if(value.length>20000)throw Error('A training field is too long.');return value;}
 if(Array.isArray(value)){if(value.length>1000)throw Error('A training list is too large.');return value.map(x=>clean(x,depth+1,strip));}
 if(!plain(value))throw Error('Backup contains an unsupported value.');
 const out={};for(const [k,v] of Object.entries(value)){if(forbidden.has(fieldKey(k))){if(strip)continue;throw Error('Backup contains credentials or unsafe object keys.');}out[k]=clean(v,depth+1,strip);}return out;
}
function esc(x){return String(x??'').trim().toLowerCase().replace(/[^a-z0-9._@-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,180)||'record';}
function recordId(section,x){
 if(x.id!=null)return esc(x.id);if(x.no!=null)return 'n-'+esc(x.no);if(section==='holidays'&&x.date&&x.label)return 'date-'+esc(x.date+'-'+x.label);
 throw Error('Training record has no stable identifier.');
}
function row(section,row){
 if(!plain(row)||Object.keys(row).some(k=>!['id','data'].includes(k))||typeof row.id!=='string'||!/^[-a-z0-9._@]{1,200}$/.test(row.id)||!plain(row.data))throw Error('Invalid training record.');
 const x=clean(row.data);if(recordId(section,x)!==row.id)throw Error('Training record identifier does not match its contents.');
 if(['practicals','theory'].includes(section)&&(!(typeof x.no==='string'&&x.no.length>0&&x.no.length<=180)&&!(Number.isSafeInteger(x.no)&&x.no>0)||!text(x.title)))throw Error('A topic needs its number and title.');
 if(['modules','notices'].includes(section)&&(!text(x.id)||!text(section==='modules'?x.name:x.title)))throw Error('A training resource needs its identifier and title.');
 if(section==='holidays'&&(!/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')||new Date(x.date+'T00:00:00Z').toISOString().slice(0,10)!==x.date||!text(x.label)))throw Error('Invalid holiday date or label.');
 if(JSON.stringify(x).length>100000)throw Error('A training record is too large.');return {id:row.id,data:x};
}
function parse(input,source){
 const raw=typeof input==='string'?input:JSON.stringify(input);if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Backup exceeds 10 MB.');
 const p=JSON.parse(raw);if(!plain(p)||p.backupFormat!==FORMAT||p.formatVersion!==1||Object.keys(p).some(k=>!['backupFormat','formatVersion','exportedAt','source','sections'].includes(k)))throw Error('Use a V15 training backup. Legacy whole-data imports need a separate reviewed migration.');
 if(!plain(p.source)||p.source.instituteId!==source.instituteId||p.source.workspaceId!==source.workspaceId||Object.keys(p.source).some(k=>!['instituteId','workspaceId'].includes(k)))throw Error('Backup belongs to a different institute or workspace.');
 if(typeof p.exportedAt!=='string'||!Number.isFinite(Date.parse(p.exportedAt))||!plain(p.sections)||!Object.keys(p.sections).length||Object.keys(p.sections).some(k=>!SECTIONS.includes(k)))throw Error('Invalid training backup sections or date.');
 const sections={};let count=0;for(const [s,rows] of Object.entries(p.sections)){if(!Array.isArray(rows))throw Error('Each training section must be a list.');const seen=new Set();sections[s]=rows.map(r=>{const item=row(s,r);if(seen.has(item.id))throw Error('Duplicate training record identifier.');seen.add(item.id);if(++count>500)throw Error('Backup exceeds 500 training records.');return item;});}
 return {...p,sections};
}
function payload(source,sections){const p={backupFormat:FORMAT,formatVersion:1,exportedAt:new Date().toISOString(),source,sections:{}};for(const s of SECTIONS)if(sections[s])p.sections[s]=sections[s].map(r=>({id:r.id,data:clean(r.data,0,true)}));return parse(p,source);}
async function restore({M,db,workspace,items,uid,current,allowed}){
 if(!Array.isArray(items)||items.some(x=>!SECTIONS.includes(x.section)))throw Error('Only training resources can be restored.');const seen=new Set();for(const item of items){row(item.section,{id:item.id,data:item.data});const key=item.section+'/'+item.id;if(seen.has(key))throw Error('Duplicate restore target.');seen.add(key);}
 if(!allowed()||!current())throw Error('Account or workspace changed. Preview the backup again.');if(items.length>50)throw Error('Restore at most 50 missing resources at once; select fewer sections.');
 return M.runTransaction(db,async tx=>{const snapshots=[];for(const item of items)snapshots.push(await tx.get(M.doc(workspace,item.section,item.id)));
  if(!allowed()||!current())throw Error('Account or workspace changed. Preview the backup again.');let created=0,existing=0;
  for(let i=0;i<items.length;i++){if(snapshots[i].exists()){existing++;continue;}const item=items[i];tx.set(M.doc(workspace,item.section,item.id),{data:item.data,updatedAt:new Date().toISOString(),updatedBy:uid});created++;}
  if(created)tx.set(workspace,{arraySections:M.arrayUnion(...new Set(items.map(x=>x.section)))},{merge:true});return {created,existing};
 });
}
function install(V){
 if(!V||typeof App==='undefined')return;let generation=0,preview=null,busy=false;
 const role=()=>typeof SESSION!=='undefined'?SESSION?.role:'',authorised=()=>V.ready&&V.fb?.user&&!!V.member?.active&&(V.member.owner||['principal','instructor'].includes(role())&&V.member.role===role());
 const canRestore=()=>authorised()&&(V.member.owner||role()==='instructor');
 const context=()=>({uid:V.fb?.user?.uid,workspaceId:V.workspaceId,instituteId:V.INSTITUTE_ID,data:DATA,role:role(),generation});
 const same=c=>c.uid===V.fb?.user?.uid&&c.workspaceId===V.workspaceId&&c.instituteId===V.INSTITUTE_ID&&c.data===DATA&&c.role===role()&&c.generation===generation;
 const source=c=>({instituteId:c.instituteId,workspaceId:c.workspaceId});
 function panel(){let p=document.getElementById('v15TrainingBackup');if(p)return p;const input=document.getElementById('importFile'),card=input?.closest('.card');if(!card)return null;p=document.createElement('div');p.id='v15TrainingBackup';p.setAttribute('role','status');card.append(p);const note=document.createElement('p');note.className='muted';note.textContent='Training resources only: modules, practicals, theory, notices and holidays. Restore adds missing records; existing records stay unchanged. Student records, attendance, marks, exams and accounts are excluded. Export and restore require connectivity. Legacy backup migration needs separate review.';card.insertBefore(note,p);return p;}
 function note(message){const p=panel();if(p){p.replaceChildren();p.textContent=message;}}
 function assertAccess(write=false){if(!(write?canRestore():authorised()))throw Error(write?'Only the assigned Instructor or System Admin can restore training resources.':'Sign in as Instructor, Principal or System Admin to export training resources.');if(!navigator.onLine)throw Error('Reconnect to verify the current workspace before backup or restore.');}
 async function snapshot(c){assertAccess();await V.diff();await V.flushQueue();if(!same(c))throw Error('Account or workspace changed. Retry the export.');if(V.queueRead().some(o=>o.workspaceId===c.workspaceId&&SECTIONS.includes(o.section)))throw Error('Sync pending training changes before exporting or restoring.');
  const sections={};for(const s of SECTIONS){const z=await V.fb.M.getDocs(V.fb.M.collection(V.ws(),s));sections[s]=z.docs.map(d=>({id:d.id,data:d.data().data}));if(!same(c))throw Error('Account or workspace changed. Retry the export.');}return payload(source(c),sections);
 }
 async function exportTraining(drive=false){if(busy)return;busy=true;try{assertAccess();const c=context(),p=await snapshot(c);if(!same(c)||!authorised())throw Error('Account or workspace changed.');const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),name='ITI-training-'+esc(c.workspaceId)+'-'+new Date().toISOString().slice(0,10)+'.json';
   if(drive){if(!window.CloudCenter?.drive?.connected)throw Error('Connect your Google Drive account first; Drive permission is required.');await CloudCenter.uploadDriveBlob(blob,name,'application/json');if(same(c))note('Training backup saved to your connected Google Drive.');}
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note('Training backup download requested. Verify that the file was saved on your device.');}
  }catch(e){note(e.message||'Training backup failed.');}finally{busy=false;}
 }
 function showPreview(p,c,server,fileName){
  const host=panel();if(!host)return;host.replaceChildren();const title=document.createElement('p');title.textContent='Review '+fileName+' — workspace '+c.workspaceId+', exported '+p.exportedAt+'. Existing records will not be changed. No records have been restored yet.';host.append(title);const choices=[];
  for(const [section,rows] of Object.entries(p.sections)){const current=new Map(server.sections[section].map(r=>[r.id,r.data])),missing=rows.filter(r=>!current.has(r.id)),conflicts=rows.filter(r=>current.has(r.id)&&JSON.stringify(current.get(r.id))!==JSON.stringify(r.data));const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.section=section;input.setAttribute('aria-label','Restore '+section);label.append(input,document.createTextNode(' '+section+': '+missing.length+' missing, '+(rows.length-missing.length)+' existing ('+conflicts.length+' different, kept unchanged).'));label.style.display='block';host.append(label);const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View missing '+section+' resources';details.append(summary);for(const r of missing){const line=document.createElement('p');line.textContent=r.id+' — '+String(r.data.title||r.data.name||r.data.label||'Training resource');details.append(line);}host.append(details);choices.push({section,input,missing});}const status=document.createElement('p');status.setAttribute('role','status');host.append(status);
  const button=document.createElement('button');button.type='button';button.className='btn secondary';button.textContent='Restore missing training resources';button.addEventListener('click',async()=>{
   if(busy)return;busy=true;try{assertAccess(true);if(!same(c)||preview!==p)throw Error('Account, workspace or backup changed. Preview again.');const items=choices.filter(x=>x.input.checked).flatMap(x=>x.missing.map(r=>({section:x.section,...r})));if(!items.length){note('Nothing to restore. Existing records were kept unchanged.');return;}if(items.length>50)throw Error('Restore at most 50 missing resources at once; select fewer sections.');
    const result=await restore({M:V.fb.M,db:V.fb.db,workspace:V.ws(),items,uid:c.uid,current:()=>same(c)&&preview===p,allowed:canRestore});if(!same(c))return;await V.audit?.('training.restore',{created:result.created,concurrentlyExisting:result.existing,sections:[...new Set(items.map(x=>x.section))],backupExportedAt:p.exportedAt},c.workspaceId);if(!same(c))return;preview=null;note('Restore complete: '+result.created+' added; '+result.existing+' concurrently created records kept unchanged. Reload the workspace to view restored sections.');
   }catch(e){if(same(c))status.textContent=e.message||'Restore failed; review sync status before retrying.';else{preview=null;note('Account or workspace changed. Preview the backup again.');}}finally{busy=false;}
  });button.disabled=!canRestore();host.append(button);
 }
 App.exportData=()=>exportTraining(false);
 App.importData=async function(event){if(busy)return;const file=event?.target?.files?.[0];if(!file)return;const c=context();const ticket=++generation;c.generation=ticket;preview=null;busy=true;try{assertAccess(true);if(file.size>MAX_BYTES)throw Error('Backup exceeds 10 MB.');const p=parse(await file.text(),source(c));if(!same(c))throw Error('Account or workspace changed. Preview again.');const server=await snapshot(c);if(!same(c)||!canRestore())throw Error('Account or workspace changed. Preview again.');preview=p;showPreview(p,c,server,file.name||'selected backup');}catch(e){if(same(c))note(e.message||'Invalid training backup.');else note('Account or workspace changed. Preview the backup again.');}finally{busy=false;if(event?.target)event.target.value='';}};
 if(window.CloudCenter){CloudCenter.saveBackupToDrive=()=>exportTraining(true);CloudCenter.downloadSafetyBackup=()=>exportTraining(false);CloudCenter.createLocalSafetySnapshot=()=>note('Full workspace snapshots are not stored locally in V15. Export a training backup; institution/student-data recovery needs a separate procedure.');CloudCenter.restoreFromCloud=async()=>note('Legacy whole-workspace cloud restore is disabled. Use the reviewed training backup preview; student-data migration needs separate review.');}
 // V14's device-quota/full-local-copy text does not describe V15 cloud storage.
 if(typeof Reports!=='undefined'){
  Reports.renderStorageStats=function(){const el=document.getElementById('storageStats');if(!el)return;el.replaceChildren();for(const message of ['Workspace records are stored in your authorised cloud workspace. Pending changes are saved on this device until they sync.','A training backup covers modules, practicals, theory, notices and holidays only. Student records, attendance, marks, examinations and accounts need a separate institution backup procedure.']){const p=document.createElement('p');p.textContent=message;el.append(p);}};
  Reports.renderStorageStats();const card=document.getElementById('storageStats')?.closest('.card'),description=card?.querySelector('p.muted');if(description)description.textContent='Use sync status and verified backup files before changing devices. This screen does not certify a full institution backup.';
 }
 const button=document.querySelector('[onclick="App.exportData()"]');if(button)button.textContent='Export training backup (.json)';const input=document.getElementById('importFile');if(input?.parentElement)input.parentElement.replaceChildren(document.createTextNode('Preview training backup '),input);
 const style=document.createElement('style');style.textContent='#tab-reports .card,#tab-reports .cards,#v15TrainingBackup{min-width:0;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}#tab-reports select,#tab-reports input:not([type=checkbox]){min-width:0;max-width:100%;width:100%;box-sizing:border-box}#tab-reports .btn{max-width:100%;white-space:normal}';document.head.append(style);
 const safety=document.querySelector('.data-safety-card');if(safety){const p=safety.querySelector('p');if(p)p.textContent='V15 records sync to your authorised cloud workspace. Training backups cover training resources only; student-data recovery needs a separate reviewed procedure.';const chip=safety.querySelector('.version-chip');if(chip)chip.textContent='V15';}
 const snapshotButton=document.querySelector('[onclick="CloudCenter.createLocalSafetySnapshot()"]');if(snapshotButton)snapshotButton.hidden=true;const safetyDownload=document.querySelector('[onclick="CloudCenter.downloadSafetyBackup()"]');if(safetyDownload)safetyDownload.textContent='Download training backup';
 const driveButton=document.querySelector('[onclick="CloudCenter.saveBackupToDrive()"]');if(driveButton)driveButton.textContent='Save training backup to Drive';panel();
}
return {SECTIONS,MAX_BYTES,parse,payload,recordId,restore,install};
});
