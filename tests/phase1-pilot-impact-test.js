'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><section id="tab-pilot-impact"></section></body></html>',{
  url:'https://example.test/v15/',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window;let activeRole='instructor';
const V={ready:true,INSTITUTE_ID:'test-iti',workspaceId:'dtp-2026',fb:{user:{uid:'teacher-a'}},currentRole:()=>activeRole};
w.V15Sync=V;
w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-pilot-evidence.js'),'utf8'));
const sample=[
 {task:'attendance',method:'before',date:'2026-10-22',batchSize:20,minutes:30},
 {task:'attendance',method:'app',date:'2026-10-22',batchSize:20,minutes:20},
 {task:'reports',method:'before',date:'2026-10-22',batchSize:25,minutes:40},
 {task:'reports',method:'app',date:'2026-10-22',batchSize:25,minutes:25}
];
let x=V.calculatePilotTimeSavings(sample,'attendance',20);
assert.equal(x.beforeMean,30);assert.equal(x.appMean,20);assert.equal(x.savingsPercent,33);
assert.equal(x.smallSample,true,'small evidence is clearly labelled');
assert.equal(V.calculatePilotTimeSavings(sample,'attendance',21).savingsPercent,null,'unmatched batch is never compared');
assert.equal(V.calculatePilotTimeSavings([sample[0]],'attendance',20).savingsPercent,null,'one-sided baseline is not impact');
assert.equal(V.calculatePilotTimeSavings([...sample,{...sample[0],date:'2026-02-31',minutes:100}], 'attendance',20).beforeMean,30,'impossible calendar dates excluded');
assert.equal(V.calculatePilotTimeSavings([...sample,{...sample[0],minutes:0}], 'attendance',20).beforeMean,30,'zero-minute measurements excluded');
assert.match(V.pilotEvidenceCsv(sample),/Measured_Minutes/);
assert.doesNotMatch(V.pilotEvidenceCsv(sample),/student-a|aadhaar/);
V.renderPilotTimeEvidence();
let host=w.document.getElementById('tab-pilot-impact');
assert.match(host.textContent,/No measurements entered/);
const get=id=>w.document.getElementById('pilot-'+id);
get('date').value='2026-10-22';
get('batch').value='20';
get('minutes').value='30';
const save=[...host.querySelectorAll('button')].find(x=>x.textContent==='Save observation');
save.click();
assert.match(host.textContent,/Insufficient paired observations/);
get('method').value='app';get('minutes').value='20';save.click();
assert.match(host.textContent,/33%/);
assert.match(host.textContent,/Small sample/);
const key='eduskill360-pilot-v1-test-iti-teacher-a-dtp-2026';
assert.equal(JSON.parse(w.localStorage.getItem(key)).length,2);
V.fb.user.uid='teacher-b';
V.renderPilotTimeEvidence();
assert.match(host.textContent,/No measurements entered/,'another instructor does not inherit previous account measurements');
V.workspaceId='copa-2026';
V.renderPilotTimeEvidence();
assert.match(host.textContent,/No measurements entered/,'another workspace gets separate records');
activeRole='student';V.renderPilotTimeEvidence();
assert.equal(V.calculatePilotTimeSavings(sample,'reports',25).savingsPercent,38);
w.close();
console.log('PASS pilot diary: matched, actual timings only; sample warning, account/workspace isolation, no fabricated impact.');
