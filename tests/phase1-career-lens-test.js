'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const V={},ctx={window:{V15Sync:V},URL,Date,console};
for(const name of ['v15-local-market.js','v15-career-lens.js']){
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v15',name),'utf8'),ctx,{filename:name});
}
const profile={skills:{'practical-1':{status:'verified',verifiedBy:'i1'},'practical-2':{status:'learning'}}};
const opportunities=[
 {status:'active',title:'Junior trainee',employer:'Institute-reviewed Alpha',city:'Mumbai',
  practicalIds:['practical-1'],skills:['layout'],sourceUrl:'https://example.org/job/1',expiresAt:'2026-12-01'},
 {status:'active',title:'Junior trainee',employer:'Institute-reviewed Alpha',city:'Mumbai',
  practicalIds:['practical-1'],skills:['layout'],sourceUrl:'https://example.org/job/1',expiresAt:'2026-12-01'},
 {status:'active',title:'Second trainee',employer:'Institute-reviewed Beta',city:'Pune',
  practicalIds:['practical-1','practical-2'],skills:['print'],sourceUrl:'https://example.org/job/2',expiresAt:'2026-12-01'},
 {status:'withdrawn',title:'Withdrawn',employer:'Not active',city:'Mumbai',
  practicalIds:['practical-1'],skills:['layout'],sourceUrl:'https://example.org/job/3',expiresAt:'2026-12-01'},
 {status:'active',title:'Expired',employer:'Expired',city:'Mumbai',
  practicalIds:['practical-1'],skills:['layout'],sourceUrl:'https://example.org/job/4',expiresAt:'2026-01-01'},
 {status:'active',title:'Unmapped',employer:'Other',city:'Mumbai',
  skills:['layout'],sourceUrl:'https://example.org/job/5',expiresAt:'2026-12-01'}
];
const m=V.careerLensEvidence('practical-1',profile,opportunities,'Mumbai','2026-10-27');
assert.equal(m.status,'verified');
assert.equal(m.sourceCount,1,'only one deduplicated, current, city-matched, explicitly mapped source');
assert.equal(m.sources[0].title,'Junior trainee');
const p=V.careerLensEvidence('practical-2',profile,opportunities,'Pune','2026-10-27');
assert.equal(p.status,'not verified','self-rating cannot grant verification');
assert.equal(p.sourceCount,1,'mapping is reviewed even if trainee has not passed the practical');
const no=V.careerLensEvidence('practical-3',profile,opportunities,'Mumbai','2026-10-27');
assert.equal(no.sourceCount,0,'never infer opportunities from job title or skill text alone');
const notFound=V.careerLensEvidence('practical-1',profile,opportunities,'Ratnagiri','2026-10-27');
assert.equal(notFound.sourceCount,0,'city filter must be respected');
const notMapped=V.careerLensEvidence('practical-2',profile,[opportunities[0]],'Mumbai','2026-10-27');
assert.equal(notMapped.sourceCount,0,'mapping must match exact practical ID');
const source=fs.readFileSync(path.join(__dirname,'../v15/v15-career-lens.js'),'utf8');
assert.match(source,/No instructor-mapped, current source/,'empty data is explicitly explained');
assert.match(source,/does NOT mean the skill has no industry value/i,'zero sources is not zero demand');
assert.doesNotMatch(source,/GEMINI_API_KEY|x-goog-api-key|fetch\s*\(/,'lens never leaks shared AI key or invents remote employer fetch');
console.log('PASS Skill-to-Career Lens: verified progress, source-only mapping, city, expiry, no fabricated demand.');
