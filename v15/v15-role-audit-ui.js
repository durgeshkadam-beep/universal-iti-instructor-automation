/* V15 role UI audit fixes.
 * Removes legacy trainee PIN UI and gives Principal useful read-only oversight
 * for sections whose original V14 content was completely instructor-only.
 */
(function(V){
'use strict';
if(!V) return;

function isPrincipal(){ return SESSION?.role==='principal' || V.member?.role==='principal'; }
function td(text){const e=document.createElement('td');e.textContent=String(text??'');return e;}
function badge(text,cls=''){const e=document.createElement('span');e.className='badge '+cls;e.textContent=text;return e;}
function pct(v){const n=Number(v);return Number.isFinite(n)?`${Math.round(n)}%`:'—';}

function patchTraineeLoginColumn(){
  const table=document.querySelector('#tab-trainees table.datatable');
  if(!table) return;
  const heads=table.querySelectorAll('thead th');
  if(heads[6]) heads[6].textContent='Google Login';
  const rows=[...document.querySelectorAll('#traineeTableBody tr')];
  rows.forEach((tr,i)=>{
    const t=(DATA?.trainees||[])[i];
    if(!t||tr.children.length<7) return;
    const cell=tr.children[6];
    cell.replaceChildren();
    if(t.email){
      cell.appendChild(badge('Approved','success'));
      const s=document.createElement('small');s.className='muted';s.style.display='block';s.style.marginTop='4px';s.textContent=t.email;cell.appendChild(s);
    }else cell.appendChild(badge('Not set','pending'));
    if(isPrincipal()) tr.querySelectorAll('.v15-set-email').forEach(x=>x.remove());
  });
  let note=document.getElementById('v15TraineeLoginNote');
  if(!note){
    note=document.createElement('div');note.id='v15TraineeLoginNote';note.className='callout';
    note.innerHTML='<b>V15 student access:</b> Students sign in with an approved Google account. Legacy Roll No./PIN login is not used in V15.';
    table.parentElement?.insertBefore(note,table);
  }
}

function principalAttendance(){
  const panel=document.getElementById('tab-attendance');if(!panel||!isPrincipal())return;
  let host=document.getElementById('v15PrincipalAttendance');
  if(!host){host=document.createElement('div');host.id='v15PrincipalAttendance';host.className='card';const h=panel.querySelector('h2');h?.insertAdjacentElement('afterend',host);}
  const trainees=[...(DATA?.trainees||[])];
  host.replaceChildren();
  const title=document.createElement('h3');title.textContent='Principal Attendance Overview';
  const p=document.createElement('p');p.className='muted';p.textContent='Read-only overview from the shared Firebase attendance records.';
  host.append(title,p);
  const wrap=document.createElement('div');wrap.className='table-wrap';
  const table=document.createElement('table');table.className='datatable';
  table.innerHTML='<thead><tr><th>Roll</th><th>Trainee</th><th>Attendance %</th><th>Practical Avg</th></tr></thead>';
  const body=document.createElement('tbody');
  trainees.forEach(t=>{const tr=document.createElement('tr');tr.append(td(t.roll),td(t.name),td(pct(Trainees?.attendancePct?.(t.id))),td(Trainees?.practicalAvg?.(t.id)??'—'));body.appendChild(tr);});
  if(!trainees.length){const tr=document.createElement('tr'),x=td('No trainees available.');x.colSpan=4;tr.appendChild(x);body.appendChild(tr);}
  table.appendChild(body);wrap.appendChild(table);host.appendChild(wrap);
}

function principalEvaluation(){
  const panel=document.getElementById('tab-evaluation');if(!panel||!isPrincipal())return;
  let host=document.getElementById('v15PrincipalEvaluation');
  if(!host){host=document.createElement('div');host.id='v15PrincipalEvaluation';host.className='card';panel.appendChild(host);}
  host.replaceChildren();
  const h=document.createElement('h3');h.textContent='Principal Evaluation Overview';
  const p=document.createElement('p');p.className='muted';p.textContent='Read-only trainee practical performance summary.';host.append(h,p);
  const table=document.createElement('table');table.className='datatable';table.innerHTML='<thead><tr><th>Roll</th><th>Trainee</th><th>Practical Average</th><th>Evaluated Practicals</th></tr></thead>';
  const body=document.createElement('tbody');
  (DATA?.trainees||[]).forEach(t=>{
    let count=0;for(const v of Object.values(DATA?.marks||{})){if(v&&v[t.id])count++;}
    const tr=document.createElement('tr');tr.append(td(t.roll),td(t.name),td(Trainees?.practicalAvg?.(t.id)??'—'),td(count));body.appendChild(tr);
  });
  if(!(DATA?.trainees||[]).length){const tr=document.createElement('tr'),x=td('No evaluation records available.');x.colSpan=4;tr.appendChild(x);body.appendChild(tr);}
  table.appendChild(body);const wrap=document.createElement('div');wrap.className='table-wrap';wrap.appendChild(table);host.appendChild(wrap);
}

function principalExams(){
  const panel=document.getElementById('tab-exams');if(!panel||!isPrincipal())return;
  let host=document.getElementById('v15PrincipalExams');
  if(!host){host=document.createElement('div');host.id='v15PrincipalExams';host.className='card';panel.appendChild(host);}
  host.replaceChildren();
  const h=document.createElement('h3');h.textContent='Principal Class Test Overview';
  const p=document.createElement('p');p.className='muted';p.textContent='Read-only exam and submission summary.';host.append(h,p);
  const table=document.createElement('table');table.className='datatable';table.innerHTML='<thead><tr><th>Test</th><th>Date</th><th>Status</th><th>Questions</th><th>Attempts</th></tr></thead>';
  const body=document.createElement('tbody');
  (DATA?.exams||[]).forEach(e=>{
    const attempts=(DATA?.examAttempts||[]).filter(a=>a.examId===e.id).length;
    const tr=document.createElement('tr');tr.append(td(e.title),td(e.date||'—'),td(e.status||'draft'),td((e.questions||[]).length),td(attempts));body.appendChild(tr);
  });
  if(!(DATA?.exams||[]).length){const tr=document.createElement('tr'),x=td('No class tests created yet.');x.colSpan=5;tr.appendChild(x);body.appendChild(tr);}
  table.appendChild(body);const wrap=document.createElement('div');wrap.className='table-wrap';wrap.appendChild(table);host.appendChild(wrap);
}

function principalModules(){
  const panel=document.getElementById('tab-modules');if(!panel||!isPrincipal())return;
  const edit=panel.querySelector('.cards');if(edit)edit.style.display='none';
  let note=document.getElementById('v15PrincipalModuleNote');
  if(!note){note=document.createElement('div');note.id='v15PrincipalModuleNote';note.className='callout';note.innerHTML='<b>Principal oversight:</b> Module and syllabus structure is read-only here. The Instructor manages teaching topics.';panel.querySelector('.hero')?.insertAdjacentElement('afterend',note);}
  try{ModuleManager?.refresh?.();}catch(e){}
}

function apply(){
  if(!V.ready||!SESSION)return;
  patchTraineeLoginColumn();
  if(isPrincipal()){
    principalAttendance();principalEvaluation();principalExams();principalModules();
  }
}

// Patch after every normal render/realtime refresh.
const refreshBase=V.refresh?.bind(V);
if(refreshBase){V.refresh=function(){const r=refreshBase();setTimeout(apply,0);return r;};}
const roleBase=V.applyRoleWorkspace?.bind(V);
if(roleBase){V.applyRoleWorkspace=async function(){const r=await roleBase();apply();return r;};}

// Trainee render can be called independently.
if(typeof Trainees!=='undefined'&&!Trainees.__v15NoPin){
  Trainees.__v15NoPin=true;
  const renderBase=Trainees.render?.bind(Trainees);
  if(renderBase)Trainees.render=function(){const r=renderBase();patchTraineeLoginColumn();return r;};
}

setTimeout(apply,0);
console.info('V15 role UI audit fixes active.');
})(window.V15Sync);
