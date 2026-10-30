'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const written=[];
 const XLSX={utils:{
   book_new:()=>({SheetNames:[],Sheets:{}}),
   aoa_to_sheet:rows=>({rows}),
   book_append_sheet:(b,s,n)=>{b.SheetNames.push(n);b.Sheets[n]=s;},
   sheet_to_json:sheet=>sheet.rows
 },writeFile:(b,name)=>written.push({b,name})};
 const window={XLSX,alert:()=>{}};
 vm.runInNewContext(fs.readFileSync('instructor-templates.js','utf8'),{window});
 return {templates:window.InstructorTemplates,XLSX,written};
}
function filled(x){
 const book=x.templates.templateBook();
 book.Sheets.Theory.rows.push(['001','01.02.001','Introduce safety procedures','3.5','Safety']);
 book.Sheets.Practicals.rows.push(['001','01.02.001','Demonstrate safe workstation setup','5','Safety']);
 return book;
}
test('downloadable workbook has separate editable theory and practical headers',()=>{
 const x=setup();const book=x.templates.templateBook();
 assert.deepEqual(Array.from(book.SheetNames),['Theory','Practicals']);
 assert.equal(book.Sheets.Theory.rows[0][1],'Theory No.');
 assert.equal(book.Sheets.Practicals.rows[0][1],'Practical No.');
 x.templates.downloadSyllabus();
 assert.equal(x.written.length,1);
 assert.match(x.written[0].name,/\.xlsx$/);
});
test('reviewed workbook preserves typed official identifiers and precise hours without saving',()=>{
 const x=setup(),result=x.templates.parseWorkbook(filled(x));
 assert.equal(result.items.length,2);
 assert.equal(result.items[0].type,'theory');
 assert.equal(result.items[0].sourceNo,'01.02.001');
 assert.equal(result.items[0].sourceSrNo,'001');
 assert.equal(result.items[0].hours,3.5);
 assert.equal(result.items[1].type,'practical');
 assert.equal(result.items[1].hours,5);
 assert.equal(result.items[0].confidence,1);
});
test('duplicate exercise numbers within one sheet are rejected, but shared numbers across types are valid',()=>{
 const x=setup(),b=filled(x);
 assert.doesNotThrow(()=>x.templates.parseWorkbook(b));
 b.Sheets.Practicals.rows.push([2,'01.02.001','Duplicate practical',4,'Safety']);
 assert.throws(()=>x.templates.parseWorkbook(b),/duplicate practical number/);
});
test('blank or invalid hours cannot be silently converted into a full hour',()=>{
 for(const v of ['',0,-2,'N/A','NaN','0.0']){
   const x=setup(),b=filled(x);b.Sheets.Theory.rows[1][3]=v;
   assert.throws(()=>x.templates.parseWorkbook(b),/positive number of hours/);
 }
});
test('unknown workbook layout keeps legacy parser path but a partial reviewed template rejects',()=>{
 const x=setup(),b=x.templates.templateBook();
 b.SheetNames=['Sheet1'];b.Sheets={Sheet1:{rows:[['Free form syllabus']]}};
 assert.equal(x.templates.parseWorkbook(b),null);
 b.SheetNames=['Theory'];b.Sheets={Theory:{rows:[x.templates.headers.theory]}};
 assert.throws(()=>x.templates.parseWorkbook(b),/both Theory and Practicals/);
});
test('staging year planning includes a script for its template importer',()=>{
 const html=fs.readFileSync('index.html','utf8'),builder=fs.readFileSync('scripts/build-web.js','utf8');
 assert.match(html,/src="instructor-templates\.js"/);
 assert.match(html,/href="assets\/templates\/syllabus-template\.xlsx" download/);
 assert.match(builder,/'instructor-templates\.js'/);
});
