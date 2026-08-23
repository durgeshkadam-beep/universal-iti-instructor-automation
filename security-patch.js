/* Universal ITI Instructor Automation — V14.3 Security Patch
 * Defence-in-depth for the current local-first/PWA architecture.
 * - Neutralises HTML-like content in free-text record fields before rendering/saving.
 * - Replaces high-risk renderers with DOM/textContent rendering.
 * - Enforces role checks on mutating UI actions.
 * - Fixes staff Change PIN to update the actual DATA.users login credential.
 * - Removes persistent localStorage login sessions (re-login after reload/close).
 * - Removes PINs from Google Drive backups.
 * - Detects newer cloud data before overwrite and pauses unsafe auto-sync.
 * - Reuses an existing app-created Drive folder when visible to drive.file.
 */
(function(){
  'use strict';

  const SecurityPatch = {
    VERSION:'14.3-security',
    installed:false,

    text(v){ return String(v ?? '').replace(/\u0000/g,''); },
    neutralText(v){
      const s=this.text(v);
      return /<\s*\/?\s*[a-zA-Z][^>]*>/.test(s) ? s.replace(/</g,'＜').replace(/>/g,'＞') : s;
    },
    safeUrl(v){
      const s=this.text(v).trim(); if(!s) return '';
      try{
        const u=new URL(s,location.href);
        if(!['https:','http:'].includes(u.protocol)) return '';
        return u.href;
      }catch(e){ return ''; }
    },
    safeImageData(v){
      const s=this.text(v);
      return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(s) ? s : '';
    },
    safeId(v){
      const s=this.text(v);
      return /^[A-Za-z0-9_-]{1,120}$/.test(s) ? s : '';
    },
    roleAllowed(roles){ return !!SESSION && roles.includes(SESSION.role); },
    deny(roles){ alert(`This action is allowed only for: ${roles.join(' / ')}.`); },
    guard(obj,names,roles){
      if(!obj) return;
      names.forEach(name=>{
        if(typeof obj[name]!=='function' || obj[name].__itiRoleGuard) return;
        const original=obj[name];
        const wrapped=function(...args){
          if(!SecurityPatch.roleAllowed(roles)){ SecurityPatch.deny(roles); return; }
          return original.apply(this,args);
        };
        wrapped.__itiRoleGuard=true; wrapped.__itiOriginal=original; obj[name]=wrapped;
      });
    },
    mk(tag,text,className){
      const e=document.createElement(tag); if(className)e.className=className;
      if(text!==undefined && text!==null)e.textContent=String(text); return e;
    },
    btn(text,cls,fn){ const b=this.mk('button',text,cls||'btn ghost small'); b.type='button'; b.addEventListener('click',fn); return b; },
    cell(tr,content){ const td=document.createElement('td'); if(content instanceof Node)td.appendChild(content); else td.textContent=String(content ?? ''); tr.appendChild(td); return td; },
    badge(text,cls){ return this.mk('span',text,'badge '+(cls||'')); },

    sanitizeDataInPlace(){
      if(!DATA) return;
      const cleanFields=(obj,keys)=>{ if(!obj)return; keys.forEach(k=>{ if(typeof obj[k]==='string')obj[k]=this.neutralText(obj[k]); }); };
      (DATA.users||[]).forEach(x=>cleanFields(x,['name','username','role']));
      (DATA.trainees||[]).forEach(x=>cleanFields(x,['roll','name','prn','category','phone','mobile','gender','dob','guardianName','guardianPhone','applicationId','admittedBy','instituteAtAdmission','tradeAtAdmission','admissionSourceFile']));
      (DATA.notices||[]).forEach(x=>cleanFields(x,['date','title','body']));
      (DATA.gallery||[]).forEach(x=>{ cleanFields(x,['date','caption']); if(x.dataUrl && !this.safeImageData(x.dataUrl))x.dataUrl=''; });
      (DATA.extraTopics||[]).forEach(x=>cleanFields(x,['date','title','description']));
      (DATA.leaves||[]).forEach(x=>{ cleanFields(x,['type','fromDate','toDate','reason','status','appliedDate']); x.certNote=this.safeUrl(x.certNote); });
      (DATA.warnings||[]).forEach(x=>cleanFields(x,['date','status','ackDate']));
      (DATA.undertakings||[]).forEach(x=>cleanFields(x,['date','note','status','filedDate']));
      (DATA.activities||[]).forEach(x=>cleanFields(x,['name','date','remarks']));
      (DATA.visits||[]).forEach(x=>cleanFields(x,['type','title','organization','date','purpose']));
      (DATA.projects||[]).forEach(x=>cleanFields(x,['title','completedDate','description']));
      (DATA.holidays||[]).forEach(x=>cleanFields(x,['date','label']));
      (DATA.exams||[]).forEach(e=>{ cleanFields(e,['title','date','status']); (e.questions||[]).forEach(q=>{cleanFields(q,['text']); if(Array.isArray(q.options))q.options=q.options.map(v=>this.neutralText(v));}); });
      [...(DATA.practicals||[]),...(DATA.theory||[])].forEach(item=>{
        if(item.materials){ item.materials.pdfLink=this.safeUrl(item.materials.pdfLink); item.materials.youtubeLink=this.safeUrl(item.materials.youtubeLink); }
      });
    },

    sanitizeBackupData(){
      const out=JSON.parse(JSON.stringify(DATA||{}));
      if(out.meta){ delete out.meta.instructorPin; delete out.meta.principalPin; }
      if(Array.isArray(out.users)) out.users.forEach(u=>{ delete u.pin; });
      if(Array.isArray(out.trainees)) out.trainees.forEach(t=>{ delete t.pin; });
      return out;
    },

    installSaveSanitizer(){
      try{
        if(typeof saveData==='function' && !saveData.__itiSecurityWrapped){
          const original=saveData;
          const wrapped=function(){ SecurityPatch.sanitizeDataInPlace(); return original(); };
          wrapped.__itiSecurityWrapped=true;
          saveData=wrapped;
        }
      }catch(e){ console.warn('Security save wrapper unavailable',e); }
    },

    installSessionHardening(){
      try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
      if(SESSION){
        SESSION=null;
        document.body.classList.remove('role-principal','role-instructor','role-student');
        const login=document.getElementById('loginScreen'), shell=document.getElementById('appShell');
        if(login)login.style.display='flex'; if(shell)shell.style.display='none';
      }
      if(typeof App!=='undefined' && typeof App.login==='function' && !App.login.__itiSessionWrapped){
        const original=App.login;
        App.login=function(...args){
          const r=original.apply(this,args);
          try{localStorage.removeItem(SESSION_KEY);}catch(e){}
          return r;
        };
        App.login.__itiSessionWrapped=true;
      }
      if(typeof App!=='undefined' && typeof App.logout==='function' && !App.logout.__itiSessionWrapped){
        const original=App.logout;
        App.logout=function(...args){ try{localStorage.removeItem(SESSION_KEY);}catch(e){} return original.apply(this,args); };
        App.logout.__itiSessionWrapped=true;
      }
    },

    installPinFix(){
      if(typeof App==='undefined') return;
      App.savePinChange=function(){
        const role=SESSION?.role;
        if(!['instructor','principal'].includes(role)){ SecurityPatch.deny(['instructor','principal']); return; }
        const oldPin=document.getElementById('pinOld')?.value.trim()||'';
        const newPin=document.getElementById('pinNew')?.value.trim()||'';
        if(newPin.length<4 || newPin.length>12){ alert('New PIN must be 4 to 12 characters.'); return; }
        const users=Array.isArray(DATA.users)?DATA.users:[];
        const current=users.find(u=>u.id===SESSION.userId) || users.find(u=>String(u.username||'').toLowerCase()===String(SESSION.username||'').toLowerCase() && u.role===role);
        const legacyKey=role==='instructor'?'instructorPin':'principalPin';
        const expected=current ? String(current.pin??'') : String(DATA.meta?.[legacyKey]??'');
        if(oldPin!==expected){ alert('Current PIN is incorrect.'); return; }
        if(current) current.pin=newPin;
        const isDefault=(role==='principal') || ['durgesh','instructor'].includes(String(SESSION.username||'').toLowerCase()) || String(SESSION.userId||'').startsWith('legacy-');
        if(isDefault){ DATA.meta=DATA.meta||{}; DATA.meta[legacyKey]=newPin; }
        saveData(); App.closePinChange(); alert('PIN updated. Use the new PIN on your next login.');
      };
    },

    installRoleGuards(){
      this.guard(typeof Users!=='undefined'?Users:null,['create','resetPin','toggle'],['principal']);
      this.guard(typeof Trainees!=='undefined'?Trainees:null,['openForm','submitForm','loadSample','clearAll','remove','resetPin'],['instructor']);
      this.guard(typeof Attendance!=='undefined'?Attendance:null,['loadDay','setStatus','saveDay'],['instructor']);
      this.guard(typeof Holidays!=='undefined'?Holidays:null,['add','remove','autoGenerate'],['instructor']);
      this.guard(typeof MarkComplete!=='undefined'?MarkComplete:null,['open','confirm'],['instructor']);
      this.guard(typeof Schedule!=='undefined'?Schedule:null,['useRealCalendar','generate'],['instructor']);
      this.guard(typeof Notices!=='undefined'?Notices:null,['openForm','submitForm','remove'],['instructor']);
      this.guard(typeof Gallery!=='undefined'?Gallery:null,['openForm','submitForm','remove'],['instructor']);
      this.guard(typeof ExtraTopics!=='undefined'?ExtraTopics:null,['add','remove'],['instructor']);
      this.guard(typeof Leave!=='undefined'?Leave:null,['approve','reject','saveThreshold','generateWarning','ackWarning','addUndertaking','markUndertakingFiled'],['instructor']);
      this.guard(typeof Leave!=='undefined'?Leave:null,['apply'],['student']);
      this.guard(typeof Exam!=='undefined'?Exam:null,['openCreate','submitCreate','deleteExam','manage','deleteQuestion','openAddQuestion','submitAddQuestion','togglePublish','viewResults'],['instructor']);
      this.guard(typeof Exam!=='undefined'?Exam:null,['start','setAnswer','submitAttempt'],['student']);
      this.guard(typeof Visits!=='undefined'?Visits:null,['openCreate','submitCreate','remove','openAttendance','saveAttendance'],['instructor']);
      this.guard(typeof Projects!=='undefined'?Projects:null,['openCreate','submitCreate','remove'],['instructor']);
      this.guard(typeof Activities!=='undefined'?Activities:null,['add','remove'],['instructor']);
      if(typeof ModuleManager!=='undefined') this.guard(ModuleManager,['createModule','saveModule','deleteModule','addTopic','deleteTopic','approveImport'],['instructor']);
      if(typeof App!=='undefined' && typeof App.switchTab==='function' && !App.switchTab.__itiRoleGuard){
        const original=App.switchTab;
        App.switchTab=function(name){
          const tab=document.querySelector(`.tab[data-tab="${CSS.escape(String(name))}"]`);
          if(tab && SESSION){ const roles=(tab.dataset.roles||'').split(','); if(!roles.includes(SESSION.role)) return original.call(this,'dashboard'); }
          return original.call(this,name);
        };
        App.switchTab.__itiRoleGuard=true;
      }
    },

    installSecureRenderers(){
      if(typeof Users!=='undefined') Users.render=function(){
        const body=document.getElementById('usersTable'); if(!body)return; body.replaceChildren();
        (DATA.users||[]).filter(u=>u.role!=='student').forEach(u=>{
          const tr=document.createElement('tr');
          const strong=SecurityPatch.mk('strong',u.name); SecurityPatch.cell(tr,strong);
          SecurityPatch.cell(tr,u.username);
          SecurityPatch.cell(tr,SecurityPatch.badge(u.role,''));
          SecurityPatch.cell(tr,SecurityPatch.badge(u.active===false?'Disabled':'Active',u.active===false?'danger':'success'));
          const actions=document.createElement('div');
          actions.appendChild(SecurityPatch.btn('Reset PIN','btn small',()=>Users.resetPin(u.id)));
          if(u.username!=='principal') actions.appendChild(SecurityPatch.btn(u.active===false?'Enable':'Disable','btn small danger',()=>Users.toggle(u.id)));
          SecurityPatch.cell(tr,actions); body.appendChild(tr);
        });
      };

      if(typeof Trainees!=='undefined') Trainees.render=function(){
        const body=document.getElementById('traineeTableBody'); if(!body)return; body.replaceChildren();
        if(!(DATA.trainees||[]).length){ const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No trainees added yet.');td.colSpan=8;td.className='muted';body.appendChild(tr);return; }
        DATA.trainees.forEach(t=>{
          const tr=document.createElement('tr'); SecurityPatch.cell(tr,t.roll);
          const nameCell=document.createElement('div');nameCell.className='name-cell';
          const av=SecurityPatch.mk('span',(String(t.name||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'?').toUpperCase(),'avatar');
          nameCell.append(av,SecurityPatch.mk('span',t.name)); SecurityPatch.cell(tr,nameCell);
          SecurityPatch.cell(tr,t.prn?String(t.prn):SecurityPatch.badge('Pending','pending'));
          SecurityPatch.cell(tr,t.category||''); SecurityPatch.cell(tr,Trainees.attendancePct(t.id)); SecurityPatch.cell(tr,Trainees.practicalAvg(t.id));
          const pinCell=document.createElement('div');
          if(SESSION?.role==='instructor'){ pinCell.append(SecurityPatch.mk('code',t.pin||''),document.createTextNode(' '),SecurityPatch.btn('Reset','btn ghost small',()=>Trainees.resetPin(t.id))); }
          SecurityPatch.cell(tr,pinCell);
          const act=document.createElement('div'); if(SESSION?.role==='instructor')act.appendChild(SecurityPatch.btn('Remove','btn ghost small',()=>Trainees.remove(t.id))); SecurityPatch.cell(tr,act);
          body.appendChild(tr);
        });
      };

      if(typeof Notices!=='undefined') Notices.render=function(){
        const host=document.getElementById('noticeList'); if(!host)return; host.replaceChildren();
        if(!(DATA.notices||[]).length){host.appendChild(SecurityPatch.mk('p','No notices posted yet.','muted'));return;}
        DATA.notices.forEach(n=>{ const d=SecurityPatch.mk('div',null,'notice');d.append(SecurityPatch.mk('span',n.date,'date'),SecurityPatch.mk('h4',n.title),SecurityPatch.mk('p',n.body||''));if(SESSION?.role==='instructor')d.appendChild(SecurityPatch.btn('Delete','btn ghost small',()=>Notices.remove(n.id)));host.appendChild(d); });
      };

      if(typeof Gallery!=='undefined') Gallery.render=function(){
        const host=document.getElementById('galleryGrid');if(!host)return;host.replaceChildren();
        if(!(DATA.gallery||[]).length){host.appendChild(SecurityPatch.mk('p','No photos added yet.','muted'));return;}
        DATA.gallery.forEach(g=>{const wrap=SecurityPatch.mk('div',null,'gallery-item');const src=SecurityPatch.safeImageData(g.dataUrl);if(src){const img=document.createElement('img');img.src=src;img.alt=SecurityPatch.text(g.caption);wrap.appendChild(img);}const c=SecurityPatch.mk('div',null,'gallery-caption');c.append(SecurityPatch.mk('b',g.caption||'(no caption)'),SecurityPatch.mk('span',g.date,'date'));if(SESSION?.role==='instructor'){const b=SecurityPatch.btn('Delete','btn ghost small',()=>Gallery.remove(g.id));b.style.marginTop='6px';c.appendChild(b);}wrap.appendChild(c);host.appendChild(wrap);});
      };

      if(typeof ExtraTopics!=='undefined') ExtraTopics.render=function(){
        const body=document.getElementById('extraTopicsTableBody');if(!body)return;body.replaceChildren();
        if(!(DATA.extraTopics||[]).length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'Nothing logged yet.');td.colSpan=4;td.className='muted';body.appendChild(tr);return;}
        DATA.extraTopics.forEach(x=>{const tr=document.createElement('tr');SecurityPatch.cell(tr,x.date);SecurityPatch.cell(tr,x.title);SecurityPatch.cell(tr,x.description||'');const a=document.createElement('div');if(SESSION?.role==='instructor')a.appendChild(SecurityPatch.btn('Remove','btn ghost small',()=>ExtraTopics.remove(x.id)));SecurityPatch.cell(tr,a);body.appendChild(tr);});
      };

      if(typeof Holidays!=='undefined') Holidays.render=function(){
        const body=document.getElementById('holidayTableBody');if(!body)return;body.replaceChildren();
        if(!(DATA.holidays||[]).length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No holidays marked yet.');td.colSpan=3;td.className='muted';body.appendChild(tr);return;}
        DATA.holidays.forEach(h=>{const tr=document.createElement('tr');SecurityPatch.cell(tr,h.date);SecurityPatch.cell(tr,h.label);SecurityPatch.cell(tr,SecurityPatch.btn('Remove','btn ghost small',()=>Holidays.remove(h.date)));body.appendChild(tr);});
      };

      if(typeof Attendance!=='undefined'){
        Attendance.loadDay=function(){
          if(!SecurityPatch.roleAllowed(['instructor'])){SecurityPatch.deny(['instructor']);return;}
          const date=document.getElementById('attDate')?.value||'';const holiday=(DATA.holidays||[]).find(h=>h.date===date);const warn=document.getElementById('attHolidayWarning');
          if(warn){warn.replaceChildren();if(holiday){const d=SecurityPatch.mk('div',null,'notice');d.style.borderLeftColor='var(--bad)';d.append(SecurityPatch.mk('b',`⚠ This is marked a holiday: ${holiday.label}`),document.createTextNode(" — attendance on this day won't count toward working-day totals."));warn.appendChild(d);}}
          const rec=DATA.attendance[date]||{},body=document.getElementById('attTableBody');if(!body)return;body.replaceChildren();
          if(!(DATA.trainees||[]).length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'Add trainees first.');td.colSpan=3;td.className='muted';body.appendChild(tr);return;}
          DATA.trainees.forEach(t=>{const tr=document.createElement('tr');tr.dataset.trainee=t.id;SecurityPatch.cell(tr,t.roll);SecurityPatch.cell(tr,t.name);const td=document.createElement('td');const cur=rec[t.id]||'P';['P','A','L'].forEach(s=>{const b=SecurityPatch.btn(s,`att-btn ${s} ${cur===s?'on':''}`,()=>Attendance.setStatus(t.id,s,b));td.appendChild(b);});tr.appendChild(td);body.appendChild(tr);});
        };
        Attendance.saveDay=function(){
          if(!SecurityPatch.roleAllowed(['instructor'])){SecurityPatch.deny(['instructor']);return;}
          const date=document.getElementById('attDate')?.value||'';if(!date){alert('Select attendance date.');return;}const rec={};
          document.querySelectorAll('#attTableBody tr[data-trainee]').forEach(row=>{const b=row.querySelector('.att-btn.on');if(row.dataset.trainee)rec[row.dataset.trainee]=b?b.textContent.trim():'P';});
          DATA.attendance[date]=rec;saveData();alert('Attendance saved for '+date);Trainees.render();Dashboard.render();
        };
        Attendance.renderMyAttendance=function(){
          const id=SESSION?.traineeId,body=document.getElementById('myAttTableBody');if(!body)return;body.replaceChildren();let present=0,total=0;
          Object.keys(DATA.attendance||{}).filter(d=>!isHoliday(d)).sort().forEach(d=>{const s=DATA.attendance[d]?.[id];if(!s)return;total++;if(s==='P')present++;const tr=document.createElement('tr');SecurityPatch.cell(tr,d);SecurityPatch.cell(tr,s);body.appendChild(tr);});
          if(!total){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No records yet.');td.colSpan=2;td.className='muted';body.appendChild(tr);}const pct=total?Math.round(present/total*100):0;const threshold=Number(DATA.meta?.attendanceThreshold||80);const sum=document.getElementById('myAttSummary');if(sum){sum.replaceChildren();const stat=SecurityPatch.mk('div',pct+'%','stat '+(pct<threshold?'bad':''));sum.append(stat,SecurityPatch.mk('p',`${present} present of ${total} working days marked (holidays excluded). Current institute threshold: ${threshold}%.`,'muted'));}
        };
      }

      if(typeof Leave!=='undefined'){
        Leave.populateSelects=function(){const s=document.getElementById('undertakingTrainee');if(!s)return;s.replaceChildren();(DATA.trainees||[]).forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.roll} — ${t.name}`;s.appendChild(o);});};
        Leave.render=function(){
          const isStudent=SESSION?.role==='student',rows=isStudent?(DATA.leaves||[]).filter(l=>l.traineeId===SESSION.traineeId):(DATA.leaves||[]),body=document.getElementById('leaveTableBody');if(!body)return;body.replaceChildren();
          if(!rows.length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No leave applications yet.');td.colSpan=7;td.className='muted';body.appendChild(tr);} else rows.forEach(l=>{const tr=document.createElement('tr'),t=(DATA.trainees||[]).find(x=>x.id===l.traineeId);SecurityPatch.cell(tr,t?`${t.roll} — ${t.name}`:'—');SecurityPatch.cell(tr,l.type);SecurityPatch.cell(tr,l.fromDate);SecurityPatch.cell(tr,l.toDate);const reason=document.createElement('div');reason.appendChild(document.createTextNode(l.reason||''));const cert=SecurityPatch.safeUrl(l.certNote);if(cert){reason.appendChild(document.createElement('br'));const a=SecurityPatch.mk('a','Certificate');a.href=cert;a.target='_blank';a.rel='noopener noreferrer';reason.appendChild(a);}SecurityPatch.cell(tr,reason);SecurityPatch.cell(tr,SecurityPatch.badge(l.status==='approved'?'Approved':l.status==='rejected'?'Rejected':'Pending',l.status==='approved'?'signed':'pending'));const a=document.createElement('div');if(!isStudent&&l.status==='pending'&&SESSION?.role==='instructor'){a.append(SecurityPatch.btn('Approve','btn ghost small',()=>Leave.approve(l.id)),document.createTextNode(' '),SecurityPatch.btn('Reject','btn ghost small',()=>Leave.reject(l.id)));}SecurityPatch.cell(tr,a);body.appendChild(tr);});
          Leave.renderWarnings();Leave.renderUndertakings();
        };
        Leave.renderWarnings=function(){
          const input=document.getElementById('attThresholdInput');if(input)input.value=DATA.meta.attendanceThreshold;const threshold=Number(DATA.meta.attendanceThreshold||80);const below=(DATA.trainees||[]).filter(t=>{const p=Trainees.attendancePct(t.id);return p!=='—'&&parseInt(p)<threshold;});const body=document.getElementById('belowThresholdTableBody');if(body){body.replaceChildren();if(!below.length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,`No trainees currently below ${threshold}%.`);td.colSpan=4;td.className='muted';body.appendChild(tr);}below.forEach(t=>{const tr=document.createElement('tr');SecurityPatch.cell(tr,`${t.roll} — ${t.name}`);const p=SecurityPatch.cell(tr,Trainees.attendancePct(t.id));p.className='bad';p.style.color='var(--bad)';p.style.fontWeight='700';SecurityPatch.cell(tr,t.guardianName?`${t.guardianName}${t.guardianPhone?' ('+t.guardianPhone+')':''}`:'—');SecurityPatch.cell(tr,SESSION?.role==='instructor'?SecurityPatch.btn('Generate Takit Patra','btn ghost small',()=>Leave.generateWarning(t.id)):'');body.appendChild(tr);});}
          const wb=document.getElementById('warningsTableBody');if(wb){wb.replaceChildren();(DATA.warnings||[]).forEach(w=>{const tr=document.createElement('tr'),t=(DATA.trainees||[]).find(x=>x.id===w.traineeId);SecurityPatch.cell(tr,t?`${t.roll} — ${t.name}`:'—');SecurityPatch.cell(tr,w.date);SecurityPatch.cell(tr,String(w.attendancePct)+'%');SecurityPatch.cell(tr,SecurityPatch.badge(w.status==='acknowledged'?`Acknowledged ${w.ackDate||''}`:'Issued',w.status==='acknowledged'?'signed':'pending'));SecurityPatch.cell(tr,w.status!=='acknowledged'&&SESSION?.role==='instructor'?SecurityPatch.btn('Mark Acknowledged','btn ghost small',()=>Leave.ackWarning(w.id)):'');wb.appendChild(tr);});if(!(DATA.warnings||[]).length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No warnings issued yet.');td.colSpan=5;td.className='muted';wb.appendChild(tr);}}
        };
        Leave.renderUndertakings=function(){const body=document.getElementById('undertakingsTableBody');if(!body)return;body.replaceChildren();(DATA.undertakings||[]).forEach(u=>{const tr=document.createElement('tr'),t=(DATA.trainees||[]).find(x=>x.id===u.traineeId);SecurityPatch.cell(tr,t?`${t.roll} — ${t.name}`:'—');SecurityPatch.cell(tr,u.date);SecurityPatch.cell(tr,u.note);SecurityPatch.cell(tr,SecurityPatch.badge(u.status==='filed'?`Filed ${u.filedDate||''}`:'Pending',u.status==='filed'?'signed':'pending'));SecurityPatch.cell(tr,u.status!=='filed'&&SESSION?.role==='instructor'?SecurityPatch.btn('Print & Mark Filed','btn ghost small',()=>Leave.markUndertakingFiled(u.id)):'');body.appendChild(tr);});if(!(DATA.undertakings||[]).length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No undertakings logged yet.');td.colSpan=5;td.className='muted';body.appendChild(tr);}};
      }

      if(typeof Visits!=='undefined') Visits.render=function(){const body=document.getElementById('visitsTableBody');if(!body)return;body.replaceChildren();const isStudent=SESSION?.role==='student';let shown=0;(DATA.visits||[]).forEach(v=>{if(isStudent&&!(v.attendees||[]).includes(SESSION.traineeId))return;shown++;const tr=document.createElement('tr');SecurityPatch.cell(tr,v.date);SecurityPatch.cell(tr,v.type);SecurityPatch.cell(tr,v.title);SecurityPatch.cell(tr,v.organization);SecurityPatch.cell(tr,(v.attendees||[]).length);const a=document.createElement('div');if(SESSION?.role==='instructor'){a.append(SecurityPatch.btn('Attendance','btn ghost small',()=>Visits.openAttendance(v.id)),document.createTextNode(' '),SecurityPatch.btn('Letter','btn ghost small',()=>Reports.printVisitLetter(v.id)),document.createTextNode(' '),SecurityPatch.btn('Delete','btn ghost small',()=>Visits.remove(v.id)));}SecurityPatch.cell(tr,a);body.appendChild(tr);});if(!shown){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No OJT/visit records yet.');td.colSpan=6;td.className='muted';body.appendChild(tr);}};
      if(typeof Projects!=='undefined') Projects.render=function(){const body=document.getElementById('projectsTableBody');if(!body)return;body.replaceChildren();const isStudent=SESSION?.role==='student',rows=isStudent?(DATA.projects||[]).filter(p=>p.traineeId===SESSION.traineeId):(DATA.projects||[]);rows.forEach(p=>{const tr=document.createElement('tr'),t=(DATA.trainees||[]).find(x=>x.id===p.traineeId);SecurityPatch.cell(tr,t?`${t.roll} — ${t.name}`:'—');SecurityPatch.cell(tr,p.title);SecurityPatch.cell(tr,p.completedDate);SecurityPatch.cell(tr,p.description||'');const a=document.createElement('div');a.appendChild(SecurityPatch.btn('Certificate','btn ghost small',()=>Reports.printProjectCertificate(p.id)));if(!isStudent&&SESSION?.role==='instructor')a.appendChild(SecurityPatch.btn('Delete','btn ghost small',()=>Projects.remove(p.id)));SecurityPatch.cell(tr,a);body.appendChild(tr);});if(!rows.length){const tr=document.createElement('tr'),td=SecurityPatch.cell(tr,'No projects logged yet.');td.colSpan=5;td.className='muted';body.appendChild(tr);}};
    },

    installCloudProtection(){
      if(typeof CloudCenter==='undefined') return;
      CloudCenter.saveBackupToDrive=async function(){
        try{
          const payload={backupFormat:'Universal ITI Instructor Automation',appVersion:'V14.3-security',schemaVersion:this.VERSION,exportedAt:new Date().toISOString(),securityNote:'PINs intentionally excluded from Drive backup',data:SecurityPatch.sanitizeBackupData()};
          const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
          const obj=await this.uploadDriveBlob(blob,`Universal-ITI-Backup-${todayISO()}.json`,'application/json');
          DATA.lastBackup=todayISO();localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));this.setMessage(`Secure backup saved to Drive: ${obj.name} (PINs excluded)`,'ok');
        }catch(e){console.error(e);this.setMessage('Drive backup failed: '+(e.message||e),'error');}
      };

      CloudCenter.ensureDriveFolder=async function(){
        if(this.cfg.driveFolderId)return this.cfg.driveFolderId;
        const name=this.cfg.driveFolderName||'Universal ITI Instructor Automation';
        try{
          const escaped=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
          const q=encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false`);
          const found=await this.driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&pageSize=10&fields=files(id,name,createdTime)&orderBy=createdTime`);
          const list=(await found.json()).files||[];
          if(list.length){this.cfg.driveFolderId=list[0].id;localStorage.setItem(this.configKey,JSON.stringify(this.cfg));const f=document.getElementById('driveFolderId');if(f)f.value=list[0].id;return list[0].id;}
        }catch(e){console.warn('Drive folder lookup unavailable; creating an app folder.',e);}
        const res=await this.driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder'})});
        const obj=await res.json();this.cfg.driveFolderId=obj.id;localStorage.setItem(this.configKey,JSON.stringify(this.cfg));const f=document.getElementById('driveFolderId');if(f)f.value=obj.id;return obj.id;
      };

      const baseKey=()=>`iti-v14-cloud-base-${CloudCenter.workspaceId()}`;
      const remoteManifest=async()=>{
        if(!CloudCenter.fb.connected)return null;const M=CloudCenter.fb.mod,col=CloudCenter.sectionsCollection();const snap=await M.getDoc(M.doc(col,'_manifest'));return snap.exists()?snap.data():null;
      };
      if(!CloudCenter.pushNow.__itiConflictProtected){
        const original=CloudCenter.pushNow.bind(CloudCenter);
        CloudCenter.pushNow=async function(silent=false){
          if(this.fb.connected&&!this.syncing){
            try{
              const remote=await remoteManifest();const remoteAt=remote?.updatedAt||'';const base=localStorage.getItem(baseKey())||'';
              if(remoteAt && (!base || remoteAt>base)){
                if(silent){this.cfg.autoSync=false;const a=document.getElementById('cloudAutoSync');if(a)a.checked=false;localStorage.setItem(this.configKey,JSON.stringify(this.cfg));this.setMessage('Auto-sync paused: newer/unbased cloud data detected. Restore from Cloud first, review it, then enable sync again.','error');return false;}
                const msg=!base?'This device has no verified cloud sync base, but cloud data already exists. Restoring from Cloud first is safest.\n\nOverwrite cloud anyway?':'Cloud contains changes newer than this device last synced. Restore from Cloud first to avoid losing records.\n\nOverwrite the newer cloud copy anyway?';
                if(!confirm(msg))return false;
              }
            }catch(e){console.warn('Cloud conflict pre-check failed',e);if(silent)return false;}
          }
          const ok=await original(silent);if(ok){const stamp=DATA.meta?.lastCloudSync||new Date().toISOString();localStorage.setItem(baseKey(),stamp);}return ok;
        };
        CloudCenter.pushNow.__itiConflictProtected=true;
      }
      if(!CloudCenter.restoreFromCloud.__itiConflictProtected){
        const original=CloudCenter.restoreFromCloud.bind(CloudCenter);
        CloudCenter.restoreFromCloud=async function(...args){
          try{const remote=await remoteManifest();if(remote?.updatedAt)localStorage.setItem(baseKey(),remote.updatedAt);}catch(e){}
          return original(...args);
        };
        CloudCenter.restoreFromCloud.__itiConflictProtected=true;
      }
    },

    install(){
      if(this.installed)return;this.installed=true;
      this.sanitizeDataInPlace();
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));}catch(e){}
      this.installSaveSanitizer();
      this.installSessionHardening();
      this.installPinFix();
      this.installSecureRenderers();
      this.installRoleGuards();
      this.installCloudProtection();
      try{if(SESSION){Trainees.render();Notices.render();Gallery.render();ExtraTopics.render();Leave.populateSelects();Leave.render();Holidays.render();Visits.render();Projects.render();if(SESSION.role==='student')Attendance.renderMyAttendance();}}catch(e){console.warn('Security re-render',e);}
      console.info('Universal ITI Security Patch active:',this.VERSION);
    }
  };

  window.SecurityPatch=SecurityPatch;
  SecurityPatch.install();
  setTimeout(()=>{
    try{
      if(window.AdmissionImporter && typeof AdmissionImporter.commitImport==='function' && !AdmissionImporter.commitImport.__itiSecurityWrapped){
        const original=AdmissionImporter.commitImport.bind(AdmissionImporter);
        AdmissionImporter.commitImport=function(...args){if(!SecurityPatch.roleAllowed(['instructor'])){SecurityPatch.deny(['instructor']);return;}if(this.pending?.candidates)this.pending.candidates.forEach(c=>{['applicationId','name','gender','dob','mobile','category','admittedBy','prn'].forEach(k=>{if(typeof c[k]==='string')c[k]=SecurityPatch.neutralText(c[k]);});});return original(...args);};
        AdmissionImporter.commitImport.__itiSecurityWrapped=true;
      }
    }catch(e){console.warn('Admission security hook',e);}
  },0);
})();
