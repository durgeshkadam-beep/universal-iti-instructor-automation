'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../shared/syllabus-planning');
const opts={startDate:'2026-10-30',endDate:'2026-11-02',practicalHours:5,theoryHours:3,workdays:[1,2,3,4,5,6],alternateSaturdays:false,holidays:[{date:'2026-10-31',label:'Closure'}]};
const items=[{seq:1,type:'practical',no:'1.1.01',title:'Layout',hours:7,module:'DTP'},{seq:2,type:'theory',no:'001',title:'Install concepts',hours:4,module:'Theory'}];
test('structured sheet types, exercise numbers, ordering and decimal hours survive without keyword guessing',()=>{
 const sheets={Theory:[['Sr No.','Theory No.','Theory Name','Required Hours','Unit / Module (optional)'],['2','010','Install software','1.25',''],['1','001','Explain basics','2.75','Unit 1']],Practicals:[['Sr No.','Practical No.','Practical Name','Required Hours'],['1','1.1.01','Describe a practical safely','7.5']]};const rows=P.fromSheets(sheets);
 assert.deepEqual(rows.map(x=>[x.type,x.no,x.hours]),[['practical','1.1.01',7.5],['theory','001',2.75],['theory','010',1.25]]);assert.equal(rows[1].module,'Unit 1');
 for(const edit of [r=>r.Theory[2][1]='010',r=>r.Theory[2][3]='0',r=>r.Theory[2][3]='not hours',r=>r.Theory[2][0]='2',r=>r.Theory[2][2]='']){const copy=structuredClone(sheets);edit(copy);assert.throws(()=>P.fromSheets(copy));}
});
test('separate 5+3 capacities carry remaining hours over holidays, without transferring unused capacity',()=>{
 const r=P.allocate(items,opts);assert.deepEqual(r.rows.filter(x=>x.hours).map(x=>[x.date,x.practicalItems.reduce((n,x)=>n+x.hours,0),x.theoryItems.reduce((n,x)=>n+x.hours,0)]),[['2026-10-30',5,3],['2026-11-02',2,1]]);assert.equal(r.summary.practical.finishDate,'2026-11-02');assert.equal(r.summary.practical.capacityHours,10);assert.equal(r.summary.theory.capacityHours,6);assert.equal(r.summary.practical.remainingHours,0);assert.deepEqual(r.years,[2026]);
 const decimals=P.allocate([{seq:1,type:'practical',title:'First',hours:6.5},{seq:2,type:'practical',title:'Second',hours:1.5},{seq:3,type:'theory',title:'Theory',hours:1.25}],opts);assert.equal(decimals.rows.at(-1).hours,3);assert.equal(decimals.rows[0].hours,6.25);assert.equal(decimals.rows.at(-1).practicalItems[1].hours,1.5);
});
test('partial allocations expose remaining hours, and zero theory budget is not silently replaced',()=>{
 const r=P.allocate(items,{...opts,endDate:'2026-10-30',theoryHours:0});assert.equal(r.summary.practical.remainingHours,2);assert.equal(r.summary.theory.remainingHours,4);assert.equal(r.summary.practical.finishDate,null);assert.equal(r.rows[0].hours,5);
 for(const settings of [{practicalHours:-1},{theoryHours:13},{practicalHours:0,theoryHours:0},{workdays:[]},{endDate:'2026-02-30'},{holidays:[{date:'2026-02-30',label:'Bad'}]}])assert.throws(()=>P.allocate(items,{...opts,...settings}));
});
test('reviewed reimport retains IDs, completed dates, plans, materials and unmatched records without duplicates',()=>{
 const plan={objective:['Kept objective']},old={no:'1.1.01',id:'original-doc',title:'Layout',hours:7,unit:'DTP',sequence:1,status:'completed',doneDate:'2026-10-20',plan,planMeta:{status:'approved',version:3},materials:{pdfLink:'https://example.test/notes'}};
 const source={practicals:[old,{no:20,title:'Existing extra',hours:2,sequence:2,status:'pending'}],theory:[],holidays:[]},before=P.canonical(source),r=P.candidate(items,opts,source),again=P.candidate(items,opts,r);
 assert.equal(r.practicals.length,2);assert.equal(again.practicals.length,2);assert.equal(r.practicals[0].id,'original-doc');assert.equal(r.practicals[0].doneDate,'2026-10-20');assert.deepEqual(r.practicals[0].plan,plan);assert.equal(r.practicals[0].planMeta.version,3);assert.equal(r.practicals[0].materials.pdfLink,old.materials.pdfLink);assert.equal(r.retained,1);assert.equal(r.rows.at(-1).practicalItems[0].seq,'1.1.01');assert.equal(r.theory[0].no,'001');assert.equal(P.canonical(source),before);
 assert.throws(()=>P.candidate([{...items[0],title:'A different skill'}],opts,source),/Protected/);assert.throws(()=>P.mergeTopics('practical',[{seq:1,type:'practical',title:'Same',hours:1}],[{no:1,title:'Same'},{no:2,title:'Same'}]),/Ambiguous/);
});
test('period views total allocated hours across boundaries without double-counting whole topics',()=>{
 const rows=P.allocate(items,opts).rows,copy=P.canonical(rows),oct=P.periodRows(rows,'month','2026-10');assert.equal(oct.length,1);assert.equal(oct[0].hours,8);assert.equal(oct[0].practicalItems[0].hours,5);assert.equal(P.periodRows(rows,'month')[1].hours,3);assert.equal(P.periodRows(rows,'week').reduce((n,r)=>n+r.hours,0),11);assert.equal(P.canonical(rows),copy);
 const years=P.allocate(items,{...opts,endDate:'2027-01-02'}).years;assert.deepEqual(years,[2026,2027]);
});
test('source fingerprint input excludes actual progress but detects schedule identity, hours, holidays and revisions',()=>{
 const source={meta:{trade:'DTP',session:'2026-27',batch:'A'},practicals:[{no:1,title:'Layout',hours:7}],theory:[],holidays:[]};const get=()=>P.canonical(P.sourceState(source.meta,source.practicals,source.theory,source.holidays)),before=get();source.practicals[0].doneDate='2026-10-20';source.practicals[0].status='completed';source.practicals[0].plan={objective:['New content']};assert.equal(get(),before);source.practicals[0].hours=8;assert.notEqual(get(),before);source.practicals[0].hours=7;source.holidays.push({date:'2026-10-31',label:'Closure'});assert.notEqual(get(),before);
});
test('changed hours retain an existing plan with an explicit review flag; mismatched numbering cannot duplicate its topic',()=>{
 const original={no:'001',title:'Theory',hours:1,status:'completed',doneDate:'2026-10-20',plan:{objective:['Kept']},planMeta:{status:'approved',version:2}},r=P.mergeTopics('theory',[{seq:1,type:'theory',no:'001',title:'Theory',hours:3}],[original]);assert.equal(r.records[0].hours,3);assert.equal(r.records[0].doneDate,original.doneDate);assert.deepEqual(r.records[0].plan,original.plan);assert.equal(r.records[0].planMeta.status,'approved');assert.deepEqual(r.records[0].planReviewRequired,{reason:'duration-changed',previousHours:1,hours:3});assert.throws(()=>P.mergeTopics('theory',[{seq:1,type:'theory',no:'010',title:'Theory',hours:1}],[original]),/existing number/);
});
test('source fingerprints use a fixed character ordering independent of browser collation',()=>{
 const localeCompare=String.prototype.localeCompare;let value;try{String.prototype.localeCompare=function(){throw Error('Locale-dependent ordering is not allowed for a source hash');};value=P.canonical(P.sourceState({trade:'DTP'},[{no:'010',title:'दहा'},{no:'001',title:'एक'}],[],[{date:'2026-10-30',label:'छुट्टी'},{date:'2026-10-30',label:'Holiday'}]));}finally{String.prototype.localeCompare=localeCompare;}assert(value.indexOf('"no":"001"')<value.indexOf('"no":"010"'));
});

// Earlier released workspaces keep internal topic references separate from source numbering.
test('legacy source numbers match the original internal IDs in a reviewed revision',()=>{
 const old={no:42,sourceNo:'01.02.003',id:'original-42',title:'Layout',hours:7,plan:{objective:['Kept']},status:'completed',doneDate:'2026-10-20'};
 const source={practicals:[old],theory:[],holidays:[]},r=P.candidate([{seq:1,type:'practical',sourceNo:old.sourceNo,title:old.title,hours:7}],opts,source);
 assert.equal(r.practicals.length,1);assert.equal(r.practicals[0].no,42);assert.equal(r.practicals[0].id,'original-42');assert.equal(r.practicals[0].sourceNo,old.sourceNo);assert.equal(r.practicals[0].doneDate,old.doneDate);assert.equal(r.rows[0].practicalItems[0].seq,42);assert.match(r.rows[0].practical,/01\.02\.003/);assert.match(P.periodRows(r.rows,'month')[0].practical,/01\.02\.003/);
 const sheets={Theory:[['Sr. No.','Theory No.','Theory Name','Required Time to Complete','Module / Unit'],['1','001','Legacy workbook',3,'Unit 1']]};assert.equal(P.fromSheets(sheets)[0].hours,3);assert.equal(P.fromSheets(sheets)[0].module,'Unit 1');
});
