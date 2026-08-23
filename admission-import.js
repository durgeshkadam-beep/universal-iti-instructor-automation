/* Universal ITI Instructor Automation — DVET Admission Importer
 * Imports DVET Round Wise Admitted Candidate List exports (.xls HTML, .xlsx, .csv).
 * Creates trainee profiles and local trainee login credentials (Roll No + PIN).
 * Designed to be trade-neutral: metadata is detected from the uploaded admission file.
 */
(function(){
  'use strict';

  const AdmissionImporter = {
    pending:null,
    lastImported:[],

    escText(v){ return String(v ?? '').replace(/\s+/g,' ').trim(); },
    norm(v){ return this.escText(v).toLowerCase().replace(/[^a-z0-9]+/g,''); },
    field(row,idx){ return idx>=0 ? this.escText(row[idx]) : ''; },

    init(){
      this.installUI();
      this.installProfileModal();
      this.wrapTraineeRender();
    },

    installUI(){
      const host=document.getElementById('instructorOnlyTrainees');
      if(!host || document.getElementById('admissionImportFile')) return;

      const input=document.createElement('input');
      input.type='file'; input.id='admissionImportFile'; input.accept='.xls,.xlsx,.csv'; input.style.display='none';
      input.addEventListener('change',e=>this.handleFile(e));
      host.appendChild(input);

      const btn=document.createElement('button');
      btn.type='button'; btn.className='btn secondary'; btn.textContent='📥 Import DVET Admitted List';
      btn.addEventListener('click',()=>{ input.value=''; input.click(); });
      host.appendChild(btn);

      const help=document.createElement('small');
      help.className='muted'; help.style.width='100%'; help.style.marginTop='4px';
      help.textContent='Accepts DVET Round Wise Admitted Candidate List (.xls/.xlsx/.csv). Candidate profile + Roll No/PIN login are created automatically; duplicate Application IDs are skipped.';
      host.appendChild(help);

      const box=document.createElement('div');
      box.id='admissionImportPreview'; box.className='card'; box.style.display='none'; box.style.width='100%'; box.style.marginTop='12px';
      host.parentElement.insertBefore(box,host.nextSibling);
    },

    installProfileModal(){
      if(document.getElementById('admissionProfileModal')) return;
      const modal=document.createElement('div');
      modal.id='admissionProfileModal'; modal.className='modal'; modal.style.display='none';
      const card=document.createElement('div'); card.className='modal-card'; card.style.maxWidth='760px'; card.style.width='min(94vw,760px)'; card.style.maxHeight='90vh'; card.style.overflow='auto';
      const head=document.createElement('div'); head.className='field-row'; head.style.justifyContent='space-between';
      const title=document.createElement('h3'); title.id='admissionProfileTitle'; title.textContent='Trainee Admission Profile';
      const close=document.createElement('button'); close.type='button'; close.className='btn ghost small'; close.textContent='✕ Close'; close.onclick=()=>this.closeProfile();
      head.append(title,close);
      const body=document.createElement('div'); body.id='admissionProfileBody';
      card.append(head,body); modal.appendChild(card); document.body.appendChild(modal);
    },

    wrapTraineeRender(){
      if(typeof Trainees==='undefined' || Trainees.__admissionProfileWrapped) return;
      Trainees.__admissionProfileWrapped=true;
      const original=Trainees.render.bind(Trainees);
      Trainees.render=()=>{ original(); this.addProfileButtons(); };
    },

    addProfileButtons(){
      if(typeof SESSION==='undefined' || SESSION?.role!=='instructor') return;
      const rows=[...document.querySelectorAll('#traineeTableBody tr')];
      (DATA?.trainees||[]).forEach((t,i)=>{
        const row=rows[i]; if(!row || !t) return;
        const cell=row.lastElementChild; if(!cell || cell.querySelector('.admission-profile-btn')) return;
        const b=document.createElement('button'); b.type='button'; b.className='btn ghost small admission-profile-btn'; b.style.marginLeft='4px'; b.textContent='Profile';
        b.onclick=()=>this.openProfile(t.id); cell.appendChild(b);
      });
    },

    openProfile(id){
      const t=(DATA?.trainees||[]).find(x=>x.id===id); if(!t) return;
      const title=document.getElementById('admissionProfileTitle');
      const body=document.getElementById('admissionProfileBody');
      title.textContent=t.name || 'Trainee Admission Profile';
      body.textContent='';
      const rows=[
        ['Roll No / Login ID',t.roll],
        ['Login PIN',SESSION?.role==='instructor' ? t.pin : 'Hidden'],
        ['Application ID',t.applicationId],
        ['Candidate Name',t.name],
        ['Gender',t.gender],
        ['Date of Birth',t.dob],
        ['Mobile No.',t.mobile],
        ['Allotted Category',t.category],
        ['Preference No.',t.preferenceNo],
        ['Allotted Round',t.admissionRound],
        ['Admitted Date',t.admissionDate],
        ['IMC Seat',t.isImc],
        ['Admitted By',t.admittedBy],
        ['PRN',t.prn || 'Pending'],
        ['Trade in Admission File',t.tradeAtAdmission],
        ['Institute in Admission File',t.instituteAtAdmission],
        ['Source File',t.admissionSourceFile]
      ];
      const table=document.createElement('table'); table.className='datatable';
      const tb=document.createElement('tbody');
      rows.forEach(([label,value])=>{
        if(value===undefined || value===null || value==='') return;
        const tr=document.createElement('tr'); const th=document.createElement('th'); const td=document.createElement('td');
        th.textContent=label; td.textContent=String(value); tr.append(th,td); tb.appendChild(tr);
      });
      table.appendChild(tb); body.appendChild(table);
      document.getElementById('admissionProfileModal').style.display='flex';
    },
    closeProfile(){ const m=document.getElementById('admissionProfileModal'); if(m)m.style.display='none'; },

    async handleFile(e){
      if(typeof SESSION!=='undefined' && SESSION?.role!=='instructor'){ alert('Only the instructor can import admitted candidates.'); return; }
      const file=e.target.files?.[0]; if(!file) return;
      try{
        const parsed=await this.parseFile(file);
        if(!parsed.candidates.length) throw new Error('No admitted candidate rows were detected.');
        this.pending={...parsed,fileName:file.name};
        this.renderPreview();
      }catch(err){
        console.error(err); alert('Admission import could not read this file: '+(err.message||err));
      }
    },

    async parseFile(file){
      let rows=[];
      let text='';
      try{text=await file.text();}catch(e){}
      if(/<table\b/i.test(text||'')){
        rows=this.rowsFromHtml(text);
      }else{
        if(!window.XLSX) throw new Error('Excel reader is not available. Reload once with internet and try again.');
        const ab=await file.arrayBuffer();
        const wb=XLSX.read(ab,{type:'array',cellDates:false});
        if(!wb.SheetNames.length) throw new Error('Workbook has no worksheet.');
        rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});
      }
      return this.parseRows(rows);
    },

    rowsFromHtml(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const table=doc.querySelector('table'); if(!table) return [];
      return [...table.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(c=>this.escText(c.textContent)));
    },

    parseRows(rows){
      const clean=(rows||[]).map(r=>(r||[]).map(v=>this.escText(v)));
      let headerIndex=-1;
      for(let i=0;i<clean.length;i++){
        const norms=clean[i].map(x=>this.norm(x));
        if(norms.includes('candidatename') && norms.some(x=>x==='applicationiddisplay'||x==='applicationid') && norms.some(x=>x==='mobileno'||x==='mobilenumber'||x==='mobile')){ headerIndex=i; break; }
      }
      if(headerIndex<0) throw new Error('DVET candidate header row was not found.');

      const metadata={institute:'',trade:'',round:''};
      clean.slice(0,headerIndex).flat().forEach(v=>{
        const s=this.escText(v);
        if(/^institute\s*:/i.test(s)) metadata.institute=s.replace(/^institute\s*:\s*/i,'');
        else if(/^trade\s*:/i.test(s)) metadata.trade=s.replace(/^trade\s*:\s*/i,'');
        else if(/^round\s*:/i.test(s)) metadata.round=s.replace(/^round\s*:\s*/i,'');
      });

      const header=clean[headerIndex]; const H=header.map(x=>this.norm(x));
      const col=(...aliases)=>{const set=aliases.map(a=>this.norm(a)); return H.findIndex(h=>set.includes(h));};
      const ix={
        applicationId:col('Application Id Display','Application ID','Candidate ID'),
        name:col('Candidate Name','Name'), gender:col('Gender'), dob:col('DOB','Date of Birth'),
        mobile:col('Mobile No','Mobile Number','Mobile'), isImc:col('Allotted Is Imc','Is IMC'),
        category:col('Allotted Category','Category'), preferenceNo:col('Allotted Preference No','Preference No'),
        round:col('Allotted Round','Round'), admittedAt:col('Admitted Date Time','Admitted Date','Admission Date'),
        admittedBy:col('Admitted By User Name','Admitted By'), prn:col('PRN','Registration ID','Registration No')
      };
      if(ix.name<0 || ix.applicationId<0) throw new Error('Candidate Name/Application ID columns are missing.');

      const candidates=[];
      for(let r=headerIndex+1;r<clean.length;r++){
        const row=clean[r]; const name=this.field(row,ix.name), applicationId=this.field(row,ix.applicationId);
        if(!name || !applicationId) continue;
        candidates.push({
          applicationId,name,gender:this.field(row,ix.gender),dob:this.field(row,ix.dob),mobile:this.field(row,ix.mobile),
          isImc:this.field(row,ix.isImc),category:this.field(row,ix.category),preferenceNo:this.field(row,ix.preferenceNo),
          admissionRound:this.field(row,ix.round),admittedAt:this.field(row,ix.admittedAt),admittedBy:this.field(row,ix.admittedBy),
          prn:this.field(row,ix.prn)
        });
      }
      return {metadata,candidates};
    },

    renderPreview(){
      const box=document.getElementById('admissionImportPreview'); if(!box || !this.pending) return;
      box.textContent=''; box.style.display='block';
      const h=document.createElement('h3'); h.textContent='DVET Admission Import Preview'; box.appendChild(h);
      const meta=document.createElement('p'); meta.className='muted';
      meta.textContent=`${this.pending.candidates.length} candidates detected${this.pending.metadata.trade?' · '+this.pending.metadata.trade:''}${this.pending.metadata.round?' · '+this.pending.metadata.round:''}`; box.appendChild(meta);

      if(this.pending.metadata.trade && DATA?.meta?.trade && this.norm(this.pending.metadata.trade)!==this.norm(DATA.meta.trade)){
        const warn=document.createElement('div'); warn.className='callout';
        warn.textContent=`Trade check: file says “${this.pending.metadata.trade}” while current workspace says “${DATA.meta.trade}”. Import will keep the file trade inside each candidate profile and will not silently change the workspace trade.`; box.appendChild(warn);
      }

      const table=document.createElement('table'); table.className='datatable';
      const thead=document.createElement('thead'); const hr=document.createElement('tr');
      ['Application ID','Candidate','Gender','DOB','Mobile','Category','Round'].forEach(x=>{const th=document.createElement('th');th.textContent=x;hr.appendChild(th);});
      thead.appendChild(hr); table.appendChild(thead);
      const tb=document.createElement('tbody');
      this.pending.candidates.slice(0,25).forEach(c=>{
        const tr=document.createElement('tr');
        [c.applicationId,c.name,c.gender,c.dob,c.mobile,c.category,c.admissionRound].forEach(v=>{const td=document.createElement('td');td.textContent=v||'—';tr.appendChild(td);});
        tb.appendChild(tr);
      });
      table.appendChild(tb); const wrap=document.createElement('div');wrap.className='table-scroll';wrap.appendChild(table);box.appendChild(wrap);

      const actions=document.createElement('div'); actions.className='field-row'; actions.style.marginTop='12px';
      const imp=document.createElement('button'); imp.type='button'; imp.className='btn primary'; imp.textContent=`Import ${this.pending.candidates.length} Candidates`;
      imp.onclick=()=>this.commitImport();
      const cancel=document.createElement('button'); cancel.type='button'; cancel.className='btn ghost'; cancel.textContent='Cancel'; cancel.onclick=()=>{this.pending=null;box.style.display='none';box.textContent='';};
      actions.append(imp,cancel); box.appendChild(actions);
    },

    nextRollFactory(){
      const used=new Set((DATA?.trainees||[]).map(t=>String(t.roll||'').trim()));
      let n=Math.max(0,...[...used].map(x=>/^\d+$/.test(x)?Number(x):0));
      return ()=>{ do{n++;}while(used.has(String(n))||used.has(String(n).padStart(2,'0'))); const roll=String(n).padStart(2,'0');used.add(roll);return roll; };
    },

    isDuplicate(c){
      const aid=this.norm(c.applicationId), mobile=this.norm(c.mobile), dob=this.norm(c.dob), name=this.norm(c.name);
      return (DATA?.trainees||[]).find(t=>
        (aid && this.norm(t.applicationId)===aid) ||
        (mobile && dob && this.norm(t.mobile)===mobile && this.norm(t.dob)===dob) ||
        (name && dob && this.norm(t.name)===name && this.norm(t.dob)===dob)
      );
    },

    commitImport(){
      if(!this.pending) return;
      if(typeof SESSION!=='undefined' && SESSION?.role!=='instructor'){alert('Only the instructor can import candidates.');return;}
      const total=this.pending.candidates.length;
      if(!confirm(`Import ${total} admitted candidates into Trainee Master?\n\nNew candidates will receive the next Roll No. and a random 4-digit trainee PIN. Existing matching Application IDs/candidates will be skipped.`)) return;

      const nextRoll=this.nextRollFactory(); const imported=[]; let skipped=0;
      this.pending.candidates.forEach(c=>{
        if(this.isDuplicate(c)){skipped++;return;}
        const roll=nextRoll(); const pin=(typeof generatePin==='function'?generatePin():String(Math.floor(1000+Math.random()*9000)));
        const admittedDate=(c.admittedAt||'').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || c.admittedAt || '';
        const trainee={
          id:typeof uid==='function'?uid():'tr_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
          roll,name:c.name,prn:c.prn||'',prnStatus:c.prn?'Allotted':'Pending',category:c.category||'',pin,
          applicationId:c.applicationId,gender:c.gender||'',dob:c.dob||'',mobile:c.mobile||'',
          isImc:c.isImc||'',preferenceNo:c.preferenceNo||'',admissionRound:c.admissionRound||'',admissionDate:admittedDate,
          admittedDateTime:c.admittedAt||'',admittedBy:c.admittedBy||'',
          instituteAtAdmission:this.pending.metadata.institute||'',tradeAtAdmission:this.pending.metadata.trade||'',
          admissionListRound:this.pending.metadata.round||'',admissionSource:'DVET Centralized Online ITI Admission',
          admissionSourceFile:this.pending.fileName||'',importedAt:new Date().toISOString()
        };
        DATA.trainees.push(trainee); imported.push(trainee);
      });

      DATA.meta=DATA.meta||{};
      DATA.meta.lastAdmissionImport={at:new Date().toISOString(),file:this.pending.fileName||'',trade:this.pending.metadata.trade||'',detected:total,imported:imported.length,skipped};
      if(typeof saveData==='function') saveData(); else localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));
      this.lastImported=imported;
      if(typeof Trainees!=='undefined') Trainees.render();
      try{Evaluation.populateSelects();}catch(e){} try{Reports.populateSelects();}catch(e){} try{Dashboard.render();}catch(e){}
      this.pending=null;
      const box=document.getElementById('admissionImportPreview'); if(box){box.style.display='none';box.textContent='';}
      this.showResult(imported,skipped);
    },

    showResult(imported,skipped){
      const box=document.getElementById('admissionImportPreview'); if(!box)return;
      box.textContent=''; box.style.display='block';
      const h=document.createElement('h3');h.textContent='✅ Admission Import Complete';box.appendChild(h);
      const p=document.createElement('p');p.textContent=`${imported.length} trainee profile/account(s) created. ${skipped} duplicate(s) skipped.`;box.appendChild(p);
      if(imported.length){
        const note=document.createElement('div');note.className='callout';note.textContent='Trainee login uses Roll No. + PIN. Keep the login list private and give each trainee only their own credentials.';box.appendChild(note);
        const table=document.createElement('table');table.className='datatable';const head=document.createElement('tr');['Roll/Login','Candidate','Application ID','PIN'].forEach(x=>{const th=document.createElement('th');th.textContent=x;head.appendChild(th);});
        const thead=document.createElement('thead');thead.appendChild(head);table.appendChild(thead);const tb=document.createElement('tbody');
        imported.forEach(t=>{const tr=document.createElement('tr');[t.roll,t.name,t.applicationId,t.pin].forEach(v=>{const td=document.createElement('td');td.textContent=v||'';tr.appendChild(td);});tb.appendChild(tr);});
        table.appendChild(tb);const wrap=document.createElement('div');wrap.className='table-scroll';wrap.appendChild(table);box.appendChild(wrap);
        const b=document.createElement('button');b.type='button';b.className='btn secondary';b.style.marginTop='10px';b.textContent='Download Private Login List (CSV)';b.onclick=()=>this.downloadCredentials();box.appendChild(b);
      }
    },

    downloadCredentials(){
      if(!this.lastImported.length){alert('No newly imported login list is available.');return;}
      if(!confirm('This file contains trainee PINs. Download it only to a trusted device and keep it private. Continue?')) return;
      const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
      const rows=[['Roll/Login ID','Candidate Name','PIN','Application ID','Mobile No','DOB','Category','Round']].concat(this.lastImported.map(t=>[t.roll,t.name,t.pin,t.applicationId,t.mobile,t.dob,t.category,t.admissionRound]));
      const csv='\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`Trainee-Login-List-${typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    }
  };

  window.AdmissionImporter=AdmissionImporter;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>AdmissionImporter.init());
  else AdmissionImporter.init();
})();
