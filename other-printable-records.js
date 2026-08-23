/* Universal ITI Instructor Automation — Other Printable Records UI
 * Restores the missing printable-records block inside Record Formats.
 * Reuses the existing Reports functions so print/PDF logic stays in one place.
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

      const section=document.createElement('div');
      section.id='otherPrintableRecords';
      section.className='card';
      section.style.marginTop='18px';

      const title=document.createElement('h3');
      title.textContent='📋 Other Printable Records';
      const desc=document.createElement('p');
      desc.className='muted';
      desc.textContent='Generate the other inspection/use records from the same saved trainee, attendance, evaluation and syllabus data.';
      section.append(title,desc);

      const grid=document.createElement('div');
      grid.className='cards';
      grid.style.gridTemplateColumns='repeat(auto-fit,minmax(220px,1fr))';
      section.appendChild(grid);

      grid.appendChild(this.monthCard());
      grid.appendChild(this.evaluationCard());
      grid.appendChild(this.progressCard());
      grid.appendChild(this.simpleCard('✅','Syllabus Completion Certificate','Generate the syllabus-completion certificate from current trade/session records.',()=>Reports.printCertificate()));
      grid.appendChild(this.simpleCard('📅','Actual Dates Taught Report','Print the actual completion dates you marked while teaching.',()=>Reports.printCompletionReport()));

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

    simpleCard(icon,name,help,action){
      const card=this.makeCard(icon,name,help);
      const b=document.createElement('button'); b.type='button'; b.className='btn secondary'; b.textContent='🖨️ Generate / Print PDF';
      b.addEventListener('click',()=>{ if(!this.canPrint()) return; action(); });
      card.appendChild(b); return card;
    },

    monthCard(){
      const card=this.makeCard('📆','Attendance Register','Select a month and print the monthly trainee attendance register.');
      const input=document.createElement('input'); input.type='month'; input.id='otherPrintAttMonth';
      input.value=new Date().toISOString().slice(0,7);
      const b=document.createElement('button'); b.type='button'; b.className='btn secondary'; b.style.marginTop='8px'; b.textContent='🖨️ Generate / Print PDF';
      b.addEventListener('click',()=>{
        if(!this.canPrint()) return;
        if(!input.value){alert('Select a month.');return;}
        const source=document.getElementById('reportAttMonth'); if(source) source.value=input.value;
        Reports.printAttendance();
      });
      card.append(input,b); return card;
    },

    evaluationCard(){
      const card=this.makeCard('📝','Evaluation Sheet','Select a practical and print the full trainee evaluation/marks sheet.');
      const sel=document.createElement('select'); sel.id='otherPrintEvalSelect';
      const b=document.createElement('button'); b.type='button'; b.className='btn secondary'; b.style.marginTop='8px'; b.textContent='🖨️ Generate / Print PDF';
      b.addEventListener('click',()=>{
        if(!this.canPrint()) return;
        if(!sel.value){alert('No practical is available.');return;}
        const source=document.getElementById('reportEvalSelect'); if(source) source.value=sel.value;
        Reports.printEvaluation();
      });
      card.append(sel,b); return card;
    },

    progressCard(){
      const card=this.makeCard('👤','Progress Card','Select a trainee and print attendance plus practical-progress details.');
      const sel=document.createElement('select'); sel.id='otherPrintTraineeSelect';
      const b=document.createElement('button'); b.type='button'; b.className='btn secondary'; b.style.marginTop='8px'; b.textContent='🖨️ Generate / Print PDF';
      b.addEventListener('click',()=>{
        if(!this.canPrint()) return;
        if(!sel.value){alert('Add/import trainees first.');return;}
        const source=document.getElementById('reportTraineeSelect'); if(source) source.value=sel.value;
        Reports.printProgress();
      });
      card.append(sel,b); return card;
    },

    refresh(){
      const evalSel=document.getElementById('otherPrintEvalSelect');
      if(evalSel){
        evalSel.textContent='';
        (DATA?.practicals||[]).forEach(p=>{const o=document.createElement('option');o.value=String(p.no);o.textContent=`${p.no}. ${p.title||'Practical'}`;evalSel.appendChild(o);});
      }
      const trSel=document.getElementById('otherPrintTraineeSelect');
      if(trSel){
        trSel.textContent='';
        (DATA?.trainees||[]).forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.roll||''} — ${t.name||''}`;trSel.appendChild(o);});
      }
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
