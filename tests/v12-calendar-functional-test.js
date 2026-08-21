const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
const full=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const a=full.indexOf('const UniversalSyllabus = {');
const b=full.indexOf('// The original app binds the tab events',a);
let code=full.slice(a,b).replace('const UniversalSyllabus =','globalThis.UniversalSyllabus =');
const els={
 uStart:{value:'2026-08-10'},uEnd:{value:'2026-09-30'},uHours:{value:'7'},uTheoryHours:{value:'1'},
 uHolidays:{value:''},uAltSat:{checked:true},uUseExistingHolidays:{checked:true},
 uStatus:{style:{},textContent:''},uCalendarBody:{innerHTML:''}
};
const ctx={console,Date,Math,Set,Map,JSON,Blob:function(){},URL:{createObjectURL(){return''}},
 DATA:{holidays:[],meta:{}},SESSION:{role:'instructor'},
 document:{getElementById(id){return els[id]||null},querySelectorAll(sel){if(sel==='#uDays input:checked')return [1,2,3,4,5,6].map(v=>({value:String(v)}));return[]}},
 todayISO(){return'2026-08-18'},uid(){return'x'},confirm(){return true},alert(){},window:{open(){return null}}
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const U=ctx.UniversalSyllabus;
U.state.items=[
{id:'t1',seq:1,type:'theory',module:'M1',title:'Theory One',hours:1,confidence:1},
{id:'p1',seq:1,type:'practical',module:'M1',title:'Practical One',hours:7,confidence:1},
{id:'t2',seq:2,type:'theory',module:'M1',title:'Theory Two',hours:2,confidence:1},
{id:'p2',seq:2,type:'practical',module:'M1',title:'Practical Two',hours:7,confidence:1}
];
U.loadMaharashtra2026Holidays();
U.generateCalendar();
const rows=U.state.calendar;
function row(d){return rows.find(r=>r.date===d)}
assert(row('2026-08-15').holiday && /Independence/.test(row('2026-08-15').label));
assert(row('2026-08-22').holiday && /2nd\/4th Saturday/.test(row('2026-08-22').label));
assert(row('2026-08-23').holiday && /Sunday/.test(row('2026-08-23').label));
assert(row('2026-08-26').holiday && /Id-E-Milad/.test(row('2026-08-26').label));
const first=row('2026-08-10');
assert.strictEqual(first.hours,7);assert.strictEqual(first.theoryItems[0].hours,1);assert.strictEqual(first.practicalItems[0].hours,6);
const allocated=rows.reduce((s,r)=>s+(r.hours||0),0);
assert.strictEqual(allocated,17); // 3 theory + 14 practical hours
assert(U.parseHolidayText('2026-08-15 | Independence Day')[0].label==='Independence Day');
console.log('PASS: V12 functional calendar allocation/holiday test');
