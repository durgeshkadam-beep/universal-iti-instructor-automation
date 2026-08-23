/* Universal ITI Instructor Automation — Other Printable Records UI
 * Functional print shortcuts inside Record Formats.
 * Reuses existing Reports functions and adds a secure Trainee Admission/Profile print.
 */
(function(){
  'use strict';

  const OtherPrintableRecords = {
    installed:false,

    init(){
      if(this.installed) return;
      const panel=document.getElementById('tab-record-formats');
      if(!panel || typeof Reports==='undefined') return;
      this.installed=true;

      // Remove the old placeholder block that only said records were "planned".
      [...panel.querySelectorAll('p')].forEach(p=>{
        if(/These are the next templates to be mapped to your supplied official examples/i.test(p.textContent||'')){
          const old=p.closest('.card') || p.parentElement;
          if(old && old!==panel) old.remove();
        }
      });
      const oldFunctional=document.getElementById('otherPrintableRecords');
      if(oldFunctional) oldFunctional.remove();

      const section=document.createElement('div');
      section.id='otherPrintableRecords';
      section.className='card';
      section.style.marginTop='18px';

      const title=document.createElement('h3');
      title.textContent='📋 Other Printable Records';
      const desc=document.createElement('p');
      desc.className='muted';
      desc.textContent='Select the saved record and generate the A4 print/PDF. Login PINs are never included in official profile prints.';
      section.append(title,desc);

      const grid=document.createElement('div');
      grid.className='cards';
      grid.style.gridTemplateColumns='repeat(auto-fit,minmax(235px,1fr))';
      section.appendChild(grid);

      grid.appendChild(this.monthCard());
      grid.appendChild(this.evaluationCard());
      grid.appendChild(this.progressCard());
      grid.appendChild(this.simpleCard('✅','Syllabus Completion Certificate','Generate the syllabus-completion certificate from current trade/session records.',()=>Reports.printCertificate()));
      grid.appendChild(this.simpleCard('📅','Actual Dates Taught Report','Print the actual completion dates marked while teaching.',()=>Reports.printCompletionReport()));

      grid.appendChild(this.visitCard('🏭','OJT / Visit Letter','Select an OJT / Industry Visit record and print the communication letter.','otherPrintVisitLetter',id=>Reports.printVisitLetter(id)));
      grid.appendChild(this.visitCard('📋','OJT / Visit Attendance','Select an OJT / Industry Visit record and print its attendance sheet.','otherPrintVisitAttendance',id=>Reports.printVisitAttendance(id)));
      grid.appendChild(this.warningCard());
      grid.appendChild(this.undertakingCard());
      grid.appendChild(this.projectCard());
      grid.appendChild(this.admissionProfileCard());

      panel.appendChild(section);
      this.refresh();

      const tab=document.querySelector('.tab[data-tab="record-formats"]');
      if(tab) tab.addEventListener('click',()=>this.refresh());
    },

    makeCard(icon,name,help){
      const card=document.createElement('div');
      card.className='card';
      const h=document.createElement('h4'); h.textContent=`${icon} ${name}`;
      const p=document.createElement('p'); p.className='muted'; p.textContent=help;
      card.append(h,p); return card;
    },

    addPrintButton(card,label,action){
      const b=document.createElement('button');
      b.type='button'; b.className='btn secondary'; b.style.marginTop='8px'; b.textContent=label||'🖨️ Generate / Print PDF';
      b.addEventListener('click',()=>{ if(this.canPrint()) action(); });
      card.appendChild(b); return b;
    },

    simpleCard(icon,name,help,action){
      const card=this.makeCard(icon,name,help);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',action);
      return card;
    },

    monthCard(){
      const card=this.makeCard('📆','Attendance Register','Select a month and print the monthly trainee attendance register.');
      const input=document.createElement('input'); input.type='month'; input.id='otherPrintAttMonth'; input.value=new Date().toISOString().slice(0,7);
      card.appendChild(input);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',()=>{
        if(!input.value){alert('Select a month.');return;}
        const source=document.getElementById('reportAttMonth'); if(source) source.value=input.value;
        Reports.printAttendance();
      });
      return card;
    },

    evaluationCard(){
      const card=this.makeCard('📝','Practical / Evaluation Sheet','Select a practical and print the trainee evaluation / marks sheet.');
      const sel=document.createElement('select'); sel.id='otherPrintEvalSelect'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',()=>{
        if(!sel.value){alert('No practical is available.');return;}
        const source=document.getElementById('reportEvalSelect'); if(source) source.value=sel.value;
        Reports.printEvaluation();
      });
      return card;
    },

    progressCard(){
      const card=this.makeCard('📊','Progress Card','Select a trainee and print attendance plus practical-progress details.');
      const sel=document.createElement('select'); sel.id='otherPrintTraineeSelect'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',()=>{
        if(!sel.value){alert('Add/import trainees first.');return;}
        const source=document.getElementById('reportTraineeSelect'); if(source) source.value=sel.value;
        Reports.printProgress();
      });
      return card;
    },

    visitCard(icon,name,help,id,action){
      const card=this.makeCard(icon,name,help);
      const sel=document.createElement('select'); sel.id=id; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',()=>{
        if(!sel.value){alert('Add an OJT / Industry Visit record first.');return;}
        action(sel.value);
      });
      return card;
    },

    warningCard(){
      const card=this.makeCard('⚠️','Warning / Takit Patra','Select a trainee and print the attendance-shortage warning using the latest/current attendance percentage.');
      const sel=document.createElement('select'); sel.id='otherPrintWarningTrainee'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Print Takit Patra',()=>{
        const t=(DATA?.trainees||[]).find(x=>x.id===sel.value);
        if(!t){alert('Select a trainee.');return;}
        const existing=(DATA?.warnings||[]).filter(w=>w.traineeId===t.id).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
        let pct=Number(existing?.attendancePct);
        if(!Number.isFinite(pct)) pct=parseInt(Trainees.attendancePct(t.id),10);
        if(!Number.isFinite(pct)){alert('No attendance percentage is available for this trainee yet.');return;}
        Reports.printTakitPatra(t,pct);
      });
      return card;
    },

    undertakingCard(){
      const card=this.makeCard('✍️','Parent Undertaking','Select an undertaking already saved under Leave & Discipline and print/reprint it.');
      const sel=document.createElement('select'); sel.id='otherPrintUndertaking'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Generate / Print PDF',()=>{
        const u=(DATA?.undertakings||[]).find(x=>x.id===sel.value);
        if(!u){alert('No undertaking record is available. Create one under Leave & Discipline first.');return;}
        const t=(DATA?.trainees||[]).find(x=>x.id===u.traineeId);
        if(!t){alert('The trainee for this undertaking could not be found.');return;}
        Reports.printUndertaking(u,t);
      });
      return card;
    },

    projectCard(){
      const card=this.makeCard('🏆','Project Certificate','Select a saved trainee project and print its completion certificate.');
      const sel=document.createElement('select'); sel.id='otherPrintProject'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Print Certificate',()=>{
        if(!sel.value){alert('No project record is available. Add a project under OJT & Projects first.');return;}
        Reports.printProjectCertificate(sel.value);
      });
      return card;
    },

    admissionProfileCard(){
      const card=this.makeCard('👤','Trainee Admission / Profile','Select a trainee and print their admission/profile record. Login PIN is deliberately excluded.');
      const sel=document.createElement('select'); sel.id='otherPrintAdmissionProfile'; card.appendChild(sel);
      this.addPrintButton(card,'🖨️ Print Admission Profile',()=>this.printAdmissionProfile(sel.value));
      return card;
    },

    esc(v){ return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); },

    printAdmissionProfile(traineeId){
      const t=(DATA?.trainees||[]).find(x=>x.id===traineeId);
      if(!t){alert('Select a trainee.');return;}
      const m=DATA.meta||{};
      const E=v=>this.esc(v||'—');
      const rows=[
        ['Roll No.',t.roll],['Application ID',t.applicationId],['Candidate Name',t.name],['PRN / Registration ID',t.prn],
        ['Gender',t.gender],['Date of Birth',t.dob],['Mobile No.',t.mobile||t.phone],['Category',t.category],
        ['Preference No.',t.preferenceNo],['Admission Round',t.admissionRound||t.admissionListRound],['Admission Date',t.admissionDate||t.admittedDateTime],
        ['IMC Seat',t.isImc],['Admitted By',t.admittedBy],['Guardian Name',t.guardianName],['Guardian Phone',t.guardianPhone],
        ['Trade',t.tradeAtAdmission||m.trade],['Institute',t.instituteAtAdmission||m.institute],['Admission Source',t.admissionSource],['Source File',t.admissionSourceFile]
      ].filter(([,v])=>v!==undefined && v!==null && String(v).trim()!=='');
      const tableRows=rows.map(([k,v])=>`<tr><th style="width:32%;text-align:left">${E(k)}</th><td>${E(v)}</td></tr>`).join('');
      const html=`${Reports.header('Trainee Admission / Profile Record')}
        <table class="print-table" style="margin-top:18px"><tbody>${tableRows}</tbody></table>
        <p style="font-size:10px;margin-top:12px"><b>Security note:</b> Login PIN is not printed on this official profile record.</p>
        ${typeof Reports.signBlock==='function'?Reports.signBlock():''}`;
      if(typeof Reports.markPending==='function') Reports.markPending('Trainee Admission Profile — '+t.name);
      Reports.doPrint(html);
    },

    fillSelect(id,items,placeholder){
      const sel=document.getElementById(id); if(!sel) return;
      const keep=sel.value; sel.textContent='';
      if(!items.length){const o=document.createElement('option');o.value='';o.textContent=placeholder||'No records available';sel.appendChild(o);return;}
      items.forEach(item=>{const o=document.createElement('option');o.value=item.value;o.textContent=item.label;sel.appendChild(o);});
      if([...sel.options].some(o=>o.value===keep)) sel.value=keep;
    },

    refresh(){
      this.fillSelect('otherPrintEvalSelect',(DATA?.practicals||[]).map(p=>({value:String(p.no),label:`${p.no}. ${p.title||'Practical'}`})),'No practicals');
      const trainees=(DATA?.trainees||[]).map(t=>({value:t.id,label:`${t.roll||''} — ${t.name||''}`}));
      this.fillSelect('otherPrintTraineeSelect',trainees,'No trainees');
      this.fillSelect('otherPrintWarningTrainee',trainees,'No trainees');
      this.fillSelect('otherPrintAdmissionProfile',trainees,'No trainees');

      const visits=(DATA?.visits||[]).map(v=>({value:v.id,label:`${v.date||''} — ${v.type||'OJT/Visit'} — ${v.organization||v.title||''}`}));
      this.fillSelect('otherPrintVisitLetter',visits,'No OJT / Visit records');
      this.fillSelect('otherPrintVisitAttendance',visits,'No OJT / Visit records');

      const undertakings=(DATA?.undertakings||[]).map(u=>{const t=(DATA?.trainees||[]).find(x=>x.id===u.traineeId);return {value:u.id,label:`${u.date||''} — ${t?.roll||''} ${t?.name||'Trainee'} — ${String(u.note||'').slice(0,45)}`};});
      this.fillSelect('otherPrintUndertaking',undertakings,'No undertaking records');

      const projects=(DATA?.projects||[]).map(p=>{const t=(DATA?.trainees||[]).find(x=>x.id===p.traineeId);return {value:p.id,label:`${t?.roll||''} ${t?.name||'Trainee'} — ${p.title||'Project'} — ${p.completedDate||''}`};});
      this.fillSelect('otherPrintProject',projects,'No project records');
    },

    canPrint(){
      if(!SESSION || !['instructor','principal'].includes(SESSION.role)){
        alert('Only Instructor / Principal can generate these records.');
        return false;
      }
      return true;
    }
  };

  window.OtherPrintableRecords=OtherPrintableRecords;
  const boot=()=>setTimeout(()=>OtherPrintableRecords.init(),0);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
