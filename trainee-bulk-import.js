/* Instructor-only trainee roster import. Preview first; no Auth account or PIN provisioning. */
(function(root){
'use strict';
const MAX_ROWS=500;
const headers=['Roll No.','Name','PRN / Application ID','Category','Mobile'];
const key=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const txt=v=>String(v??'').trim();
const rollKey=v=>txt(v).toLowerCase();
const prnKey=v=>txt(v).toLowerCase();
const T={
  pending:null,
  api:null,
  bind(adapter){this.api=adapter;},
  data(){return this.api?.data?.();},
  headers,
  template(){
    if(!root.XLSX)throw Error('Excel reader is unavailable. Reload with an internet connection.');
    const wb=root.XLSX.utils.book_new(),sheet=root.XLSX.utils.aoa_to_sheet([headers]);
    sheet['!cols']=[{wch:18},{wch:40},{wch:30},{wch:18},{wch:22}];
    root.XLSX.utils.book_append_sheet(wb,sheet,'Trainees');return wb;
  },
  download(){
    try{root.XLSX.writeFile(this.template(),'ITI-Trainee-Master-Template.xlsx');}
    catch(e){this.message(e.message||String(e),true);}
  },
  parseBook(wb,existing=[]){
    if(!root.XLSX)throw Error('Excel reader is unavailable.');
    const sheetName=wb.SheetNames.find(n=>key(n)==='trainees')||wb.SheetNames[0];
    if(!sheetName)throw Error('The workbook has no sheet.');
    const rows=root.XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,raw:false,defval:'',blankrows:false});
    const aliases=[
      ['rollno','rollnumber','roll'],
      ['name','traineename','studentname','candidatename'],
      ['prnapplicationid','prn','applicationid','registrationnumber'],
      ['category','castecategory'],
      ['mobile','mobileno','mobilenumber','phone']
    ];
    const head=rows.findIndex(r=>aliases[0].some(k=>r.some(v=>key(v)===k))&&aliases[1].some(k=>r.some(v=>key(v)===k)));
    if(head<0)throw Error('Required headings Roll No. and Name were not found. Download the blank template.');
    const h=rows[head].map(key),ix=aliases.map(group=>h.findIndex(col=>group.includes(col)));
    if(ix[0]<0||ix[1]<0)throw Error('Roll No. and Name are mandatory columns.');
    const existingRoll=new Set(existing.map(x=>rollKey(x.roll)).filter(Boolean));
    const existingPrn=new Set(existing.map(x=>prnKey(x.prn||x.applicationId)).filter(Boolean));
    const fileRoll=new Set(),filePrn=new Set(),preview=[],errors=[];
    for(let i=head+1;i<rows.length;i++){
      const cells=rows[i];if(!cells.some(v=>txt(v)))continue;
      if(preview.length>=MAX_ROWS)throw Error('Maximum 500 rows per file; split the import.');
      const get=n=>ix[n]>=0?txt(cells[ix[n]]):'';
      const row={line:i+1,roll:get(0),name:get(1),prn:get(2),category:get(3)||'OPEN',phone:get(4)};
      const why=[];
      if(!row.roll)why.push('Roll No. required');
      if(!row.name)why.push('Name required');
      if(row.roll&&existingRoll.has(rollKey(row.roll)))why.push('Roll already exists');
      if(row.roll&&fileRoll.has(rollKey(row.roll)))why.push('Duplicate roll in file');
      if(row.prn&&existingPrn.has(prnKey(row.prn)))why.push('PRN already exists');
      if(row.prn&&filePrn.has(prnKey(row.prn)))why.push('Duplicate PRN in file');
      if(row.roll.length>60||row.name.length>200||row.prn.length>100||row.category.length>40||row.phone.length>30)why.push('A field exceeds the permitted length');
      if(row.roll)fileRoll.add(rollKey(row.roll));
      if(row.prn)filePrn.add(prnKey(row.prn));
      row.errors=why;
      if(why.length)errors.push({line:row.line,messages:why});
      preview.push(row);
    }
    if(!preview.length)throw Error('No trainee rows found after the header.');
    return {rows:preview,errors,valid:preview.length-errors.length,invalid:errors.length,sheetName};
  },
  access(){
    const V=root.V15Sync,role=V?.currentRole?.()||this.api?.role?.();
    return !!(this.api?.data&&V?.ready&&V.fb?.user?.uid&&V.workspaceId&&role==='instructor');
  },
  context(){
    const V=root.V15Sync;
    return {uid:V?.fb?.user?.uid||'',workspaceId:V?.workspaceId||'',instituteId:V?.INSTITUTE_ID||'',data:this.data(),
      roster:JSON.stringify((this.data()?.trainees||[]).map(t=>[t.id,t.roll,t.prn||t.applicationId]))};
  },
  sameContext(c){
    if(!c||!this.access())return false;
    const now=this.context();
    return c.uid===now.uid&&c.workspaceId===now.workspaceId&&c.instituteId===now.instituteId&&c.data===now.data&&c.roster===now.roster;
  },
  async previewFile(file){
    this.cancel();
    if(!this.access()){this.message('Instructor sign-in is required to import trainees.',true);return;}
    if(!file)return;
    const c=this.context();
    try{
      if(!root.XLSX)throw Error('Excel reader unavailable. Check internet and reload.');
      if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error('Choose an Excel or CSV file.');
      if(file.size>3*1024*1024)throw Error('File exceeds the 3 MB preview limit.');
      const wb=root.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
      if(!this.sameContext(c))throw Error('Workspace or roster changed during import. Select the file again.');
      const parsed=this.parseBook(wb,this.data().trainees||[]);
      this.pending={...parsed,c,fileName:file.name};this.render();
    }catch(e){this.cancel();this.message(e.message||String(e),true);}
  },
  render(){
    const host=root.document.getElementById('traineeBulkPreview');if(!host)return;
    host.replaceChildren();
    const p=this.pending;if(!p){host.hidden=true;return;}host.hidden=false;
    const title=root.document.createElement('h3');title.textContent='Import preview — '+p.fileName;host.append(title);
    const summary=root.document.createElement('p');summary.textContent=p.rows.length+' rows; '+p.valid+' valid, '+p.invalid+' require correction. Nothing has been imported yet.';host.append(summary);
    const table=root.document.createElement('table');table.className='datatable';
    const head=root.document.createElement('thead'),tr=root.document.createElement('tr');
    for(const name of ['Excel row','Roll No.','Name','PRN','Category','Status']){const th=root.document.createElement('th');th.textContent=name;tr.append(th);}
    head.append(tr);table.append(head);
    const body=root.document.createElement('tbody');
    for(const record of p.rows.slice(0,100)){
      const row=root.document.createElement('tr');
      for(const value of [record.line,record.roll,record.name,record.prn,record.category,record.errors.length?record.errors.join('; '):'Ready']){
        const td=root.document.createElement('td');td.textContent=String(value);row.append(td);
      }
      body.append(row);
    }
    table.append(body);const wrap=root.document.createElement('div');wrap.className='table-scroll';wrap.append(table);host.append(wrap);
    if(p.rows.length>100){const more=root.document.createElement('p');more.textContent='Showing first 100 rows; all '+p.rows.length+' rows were validated.';host.append(more);}
    const commit=root.document.createElement('button');commit.type='button';commit.className='btn primary';commit.textContent='Import '+p.valid+' trainees';commit.disabled=!!p.invalid;commit.addEventListener('click',()=>this.commit());host.append(commit);
    const cancel=root.document.createElement('button');cancel.type='button';cancel.className='btn ghost';cancel.textContent='Cancel import';cancel.addEventListener('click',()=>this.cancel());host.append(cancel);
  },
  commit(){
    const p=this.pending;
    if(!p||!this.sameContext(p.c)){this.cancel();this.message('Account, workspace or trainee roster changed. Review the file again.',true);return false;}
    // Revalidate immediately before saving, including duplicate identifiers.
    const again=this.parseRowsAgainstCurrent(p.rows,this.data().trainees||[]);
    if(again.length){this.cancel();this.message('Duplicate or invalid records found. Import cancelled; no trainees changed.',true);return false;}
    if(!root.confirm('Add '+p.rows.length+' trainee records to this workspace? No login accounts or PINs will be created.'))return false;
    if(!this.sameContext(p.c)){this.cancel();this.message('Workspace changed during confirmation; import cancelled.',true);return false;}
    const created=p.rows.map(x=>({id:(root.crypto?.randomUUID?.()||this.api?.id?.()||('import-'+x.line+'-'+Date.now())),roll:x.roll,name:x.name,prn:x.prn,prnStatus:x.prn?'Allotted':'Pending',category:x.category,phone:x.phone,accountStatus:'not-linked'}));
    this.data().trainees.push(...created);
    this.api.save();
    this.api.refresh();
    this.cancel();this.message('Added '+created.length+' trainee records. Cloud sync must complete before another device sees them. Student accounts are not created automatically.',false);
    return true;
  },
  parseRowsAgainstCurrent(rows,existing){
    const issues=[];const rolls=new Set(existing.map(t=>rollKey(t.roll))),prns=new Set(existing.map(t=>prnKey(t.prn||t.applicationId)).filter(Boolean));
    for(const r of rows){
      if(r.errors.length||!r.roll||!r.name||rolls.has(rollKey(r.roll))||(r.prn&&prns.has(prnKey(r.prn))))issues.push(r.line);
      rolls.add(rollKey(r.roll));if(r.prn)prns.add(prnKey(r.prn));
    }
    return issues;
  },
  cancel(){
    this.pending=null;
    const f=root.document?.getElementById('traineeBulkFile');if(f)f.value='';
    const box=root.document?.getElementById('traineeBulkPreview');if(box){box.hidden=true;box.replaceChildren();}
  },
  message(value,error){
    const e=root.document?.getElementById('traineeBulkStatus');if(e){e.textContent=String(value);e.style.color=error?'#b42318':'';}
  }
};
root.TraineeBulkImport=T;
})(window);
