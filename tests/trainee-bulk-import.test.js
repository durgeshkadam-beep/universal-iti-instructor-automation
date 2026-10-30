'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const dom={elems:{},getElementById(id){return this.elems[id]||null;},createElement(tag){
   const e={tagName:tag.toUpperCase(),children:[],style:{},textContent:'',hidden:false,disabled:false,
    append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},
    addEventListener(name,fn){this['on'+name]=fn;}};return e;
 }};
 dom.elems.traineeBulkPreview=dom.createElement('div');
 dom.elems.traineeBulkStatus=dom.createElement('div');
 dom.elems.traineeBulkFile={value:'file.xlsx'};
 const book={SheetNames:['Trainees'],Sheets:{Trainees:{rows:[['Roll No.','Name','PRN / Application ID','Category','Mobile'],['001','First trainee','PRN001','OPEN','0123456789'],['002','<img src=x onerror=bad()>','','SC','']]}}};
 const XLSX={utils:{sheet_to_json:s=>s.rows,book_new:()=>({SheetNames:[],Sheets:{}}),aoa_to_sheet:rows=>({rows}),book_append_sheet:(b,s,n)=>{b.SheetNames.push(n);b.Sheets[n]=s;}},writeFile(){},read(){return book;}};
 const V={ready:true,workspaceId:'ws1',INSTITUTE_ID:'institute-1',fb:{user:{uid:'instructor1'}},currentRole:()=>'instructor'};
 const data={trainees:[{id:'existing',roll:'010',name:'Existing trainee',prn:'PRN010'}]};
 let saves=0,refresh=0,confirm=true;
 const win={document:dom,XLSX,V15Sync:V,confirm:()=>confirm,crypto:{randomUUID:()=>String(Math.random())}};
 vm.runInNewContext(fs.readFileSync('trainee-bulk-import.js','utf8'),{window:win});
 const T=win.TraineeBulkImport;T.bind({data:()=>data,save:()=>saves++,refresh:()=>refresh++,id:()=>String(Math.random()),role:()=>V.currentRole()});
 return {T,dom,book,V,data,win,saves:()=>saves,refresh:()=>refresh,setConfirm:x=>confirm=x};
}
test('blank trainee workbook contains only headers and does not create logins or PINs',()=>{
 const f=setup(),w=f.T.template();assert.equal(w.SheetNames[0],'Trainees');
 assert.equal(w.Sheets.Trainees.rows[0][0],'Roll No.');
 assert.equal(w.Sheets.Trainees.rows.length,1);
});
test('preview parses leading-zero rolls as strings and does not mutate existing roster',async()=>{
 const f=setup(),before=JSON.stringify(f.data);
 await f.T.previewFile({name:'sample.xlsx',size:100,arrayBuffer:async()=>new ArrayBuffer(0)});
 assert.equal(f.T.pending.valid,2);assert.equal(f.T.pending.rows[0].roll,'001');
 assert.equal(JSON.stringify(f.data),before);assert.equal(f.saves(),0);
 const host=f.dom.elems.traineeBulkPreview;
 const flattened=(node)=>[node,...(node.children||[]).flatMap(flattened)];
 assert.equal(flattened(host).some(node=>node.tagName==='IMG'),false);
 assert.equal(flattened(host).some(node=>String(node.textContent).includes('<img')),true);
});
test('commit adds records and never generates PIN or Firebase accounts',async()=>{
 const f=setup();await f.T.previewFile({name:'sample.xlsx',size:100,arrayBuffer:async()=>new ArrayBuffer(0)});
 assert.equal(f.T.commit(),true);
 assert.equal(f.saves(),1);assert.equal(f.refresh(),1);
 assert.equal(f.data.trainees.length,3);assert.equal(f.data.trainees[1].roll,'001');
 assert.equal(f.data.trainees[1].accountStatus,'not-linked');
 assert.equal('pin' in f.data.trainees[1],false);
 assert.equal(f.T.pending,null);
});
test('duplicates and missing required values fail closed without partial imports',()=>{
 const f=setup(),rows=f.book.Sheets.Trainees.rows;
 rows.push(['010','Already exists','','OPEN',''],['003','','','OPEN',''],['001','Duplicate','','','']);
 const r=f.T.parseBook(f.book,f.data.trainees);
 assert.equal(r.invalid,3);assert.equal(r.valid,2);assert.equal(f.saves(),0);
});
test('role, workspace, user or roster changes block commit',async()=>{
 for(const changed of ['role','workspace','uid','roster','data']){
   const f=setup();await f.T.previewFile({name:'sample.xlsx',size:100,arrayBuffer:async()=>new ArrayBuffer(0)});
   if(changed==='role')f.V.currentRole=()=>'student';
   if(changed==='workspace')f.V.workspaceId='ws2';
   if(changed==='uid')f.V.fb.user.uid='other';
   if(changed==='roster')f.data.trainees.push({id:'other',roll:'21'});
   if(changed==='data')f.T.bind({data:()=>({trainees:[]}),save:()=>{},refresh:()=>{},role:()=>f.V.currentRole()});
   assert.equal(f.T.commit(),false);assert.equal(f.saves(),0);
 }
});
test('failed confirmation does not change roster',async()=>{
 const f=setup();await f.T.previewFile({name:'sample.xlsx',size:100,arrayBuffer:async()=>new ArrayBuffer(0)});
 f.setConfirm(false);assert.equal(f.T.commit(),false);assert.equal(f.saves(),0);assert.equal(f.data.trainees.length,1);
});
test('instructor UI and public build include guarded bulk import',()=>{
 const html=fs.readFileSync('index.html','utf8'),builder=fs.readFileSync('scripts/build-web.js','utf8');
 assert.match(html,/<script src="trainee-bulk-import\.js"><\/script>/);
 assert.match(html,/id="traineeBulkPreview"/);
 assert.match(html,/Download Excel Template/);
 assert.match(builder,/'trainee-bulk-import\.js'/);
});

test('offline CSV parses quoted commas, line breaks, unicode and leading zero rolls',()=>{
 const f=setup();
 const rows=f.T.parseCSV('\uFEFFRoll No.,Name,PRN / Application ID,Category,Mobile\r\n"001","More, One",PRN01,OPEN,0123\r\n"002","Line\nName",PRN02,SC,0456\r\n');
 const result=f.T.parseRows(rows,f.data.trainees);
 assert.equal(result.valid,2);assert.equal(result.rows[0].roll,'001');
 assert.equal(result.rows[0].name,'More, One');
 assert.equal(result.rows[1].name,'Line\nName');
});
test('offline CSV import works without SheetJS and never creates PIN',async()=>{
 const f=setup();f.win.XLSX=null;
 const csv='Roll No.,Name,PRN / Application ID,Category,Mobile\n004,Offline student,PRN004,OBC,0888\n';
 await f.T.previewFile({name:'batch.csv',size:csv.length,text:async()=>csv});
 assert.equal(f.T.pending.valid,1);assert.equal(f.T.commit(),true);assert.equal(f.data.trainees.at(-1).roll,'004');
 assert.equal(f.data.trainees.at(-1).pin,undefined);
});
test('CSV malformed quoting rejects before preview and without any saved data',async()=>{
 const f=setup();f.win.XLSX=null;
 const csv='Roll No.,Name\n001,"unclosed';
 await f.T.previewFile({name:'bad.csv',size:csv.length,text:async()=>csv});
 assert.equal(f.T.pending,null);assert.equal(f.saves(),0);
 assert.match(f.dom.elems.traineeBulkStatus.textContent,/Unclosed CSV quote/);
});
