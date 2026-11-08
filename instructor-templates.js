/* Reviewed, keyless Excel syllabus import. Preview only: never overwrites records on import. */
(function(root){
  'use strict';
  const T={
    headers:{
      theory:['Sr. No.','Theory No.','Theory Name','Required Time to Complete','Module / Unit'],
      practical:['Sr. No.','Practical No.','Practical Name','Required Time to Complete','Module / Unit']
    },
    norm(value){return String(value==null?'':value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'');},
    templateBook(){
      if(!root.XLSX)throw Error('Excel library is unavailable. Reconnect and reload.');
      const wb=root.XLSX.utils.book_new();
      for(const [kind,name] of [['theory','Theory'],['practical','Practicals']]){
        const sheet=root.XLSX.utils.aoa_to_sheet([this.headers[kind]]);
        sheet['!cols']=[{wch:12},{wch:22},{wch:56},{wch:28},{wch:30}];
        root.XLSX.utils.book_append_sheet(wb,sheet,name);
      }
      return wb;
    },
    downloadSyllabus(){
      try{root.XLSX.writeFile(this.templateBook(),'ITI-Theory-Practical-Syllabus-Template.xlsx');}
      catch(error){root.alert?.(error.message||String(error));}
    },
    async parseFile(file){
      if(!root.XLSX)throw Error('Excel library is unavailable. Reconnect and reload.');
      const book=root.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
      return this.parseWorkbook(book);
    },
    parseWorkbook(book){
      if(!root.XLSX)throw Error('Excel library is unavailable.');
      const names=book.SheetNames||[];
      const getName=target=>names.find(n=>this.norm(n)===target);
      const sheets=[['theory',getName('theory')],['practical',getName('practicals')||getName('practical')]];
      if(!sheets.some(x=>x[1]))return null; // Other Excel layouts keep the legacy parser.
      if(sheets.some(x=>!x[1]))throw Error('The reviewed Excel template must contain both Theory and Practicals sheets.');
      const items=[], seen={theory:new Set(),practical:new Set()};
      for(const [kind,name] of sheets){
        const rows=root.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',raw:true,blankrows:false});
        if(!rows.length)throw Error(name+' sheet is empty. Add the template header.');
        const wanted=this.headers[kind].slice(0,4).map(h=>this.norm(h));
        const hidx=rows.findIndex(row=>wanted.every(h=>row.some(cell=>this.norm(cell)===h)));
        if(hidx<0)throw Error(name+': required column headings are missing. Use the downloaded template.');
        const hdr=rows[hidx].map(x=>this.norm(x));
        const positions=wanted.map(h=>hdr.indexOf(h));
        const modulePosition=hdr.indexOf(this.norm('Module / Unit'));
        for(let i=hidx+1;i<rows.length;i++){
          const row=rows[i];if(!row.some(cell=>String(cell??'').trim()))continue;
          const [sr,no,title,hours]=positions.map(pos=>String(row[pos]??'').trim());
          const unit=modulePosition>=0?String(row[modulePosition]??'').trim():'';
          const label=name+' row '+(i+1);
          if(!no||!title)throw Error(label+': topic number and name are required.');
          if(!/^(?:\d+)(?:\.\d+)?$/.test(hours)||!(Number(hours)>0)||Number(hours)>10000)
            throw Error(label+': required time must be a positive number of hours.');
          if(seen[kind].has(no.toLowerCase()))throw Error(label+': duplicate '+kind+' number '+no+'.');
          seen[kind].add(no.toLowerCase());
          if(items.length>=1000)throw Error('Template limit: 1000 topics. Split the import and review the syllabus.');
          items.push({id:'excel-'+(items.length+1),seq:items.length+1,type:kind,
            module:unit||'General',title,sourceNo:no,sourceSrNo:sr,hours:Number(hours),confidence:1});
        }
      }
      if(!items.length)throw Error('Both sheets are blank. Enter topic names and hours before importing.');
      return {items,format:'reviewed-excel-template'};
    }
  };
  root.InstructorTemplates=T;
})(window);
