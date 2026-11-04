'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const V={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v15/v15-local-market.js'),'utf8'),{
 window:{V15Sync:V},console,URL,Date
},{filename:'v15/v15-local-market.js'});
assert.equal(typeof V.analyzeLocalSkillMarket,'function');
const entries=[
 {status:'active',title:'Junior Designer',employer:'ABC Printers',city:'Mumbai',skills:['Photoshop','coreldraw','Photoshop'],sourceUrl:'https://example.org/jobs/1',expiresAt:'2026-11-03'},
 {status:'active',title:'DTP trainee',employer:'ABC Printers',city:'MUMBAI',skills:['CorelDRAW','Typography'],sourceUrl:'https://example.org/jobs/2',expiresAt:'2026-11-04'},
 {status:'active',title:'Print assistant',employer:'XYZ Studio',city:'Mumbai',skills:['coreldraw','Photoshop'],sourceUrl:'https://example.org/jobs/3',expiresAt:'2026-11-05'},
 {status:'active',title:'Editor',employer:'PQR Studio',city:'Pune',skills:['Illustrator'],sourceUrl:'https://example.org/jobs/4',expiresAt:'2026-11-03'},
 {status:'active',title:'Expired',employer:'OLD Press',city:'Mumbai',skills:['Photoshop'],sourceUrl:'https://example.org/jobs/5',expiresAt:'2026-01-01'},
 {status:'withdrawn',title:'Withdrawn',employer:'BAD Press',city:'Mumbai',skills:['Adobe'],sourceUrl:'https://example.org/jobs/6',expiresAt:'2026-11-03'},
 {status:'active',title:'Bad link',employer:'Bad Press',city:'Mumbai',skills:['Adobe'],sourceUrl:'javascript:alert(1)',expiresAt:'2026-11-03'},
];
const x=V.analyzeLocalSkillMarket(entries,'mumbai','photoshop','2026-10-22');
assert.equal(x.trackedPostings,3,'counts only live, correctly sourced, selected city postings');
assert.equal(x.trackedEmployers,2,'counts DISTINCT recorded employers, not job postings');
assert.equal(x.topSkills[0].skill,'coreldraw','rank by number of actual posting mentions');
assert.equal(x.topSkills[0].postings,3,'duplicate skill in one posting is not double counted');
assert.equal(x.mentioned,2,'liked skill mentions grounded in tracked listings');
assert.equal(x.ratio,67,'relative demand is within tracked records only');
assert.equal(x.sampleAdequate,false,'3 postings is weak demand evidence');
const unavailable=V.analyzeLocalSkillMarket(entries,'Ratnagiri','photoshop','2026-10-22');
assert.equal(unavailable.trackedPostings,0);
assert.equal(unavailable.mentioned,0,'zero means zero in tracked data, not entire labour market');
assert.equal(unavailable.ratio,null,'do not give misleading percentage without data');
assert.equal(V.marketIsValidSourceUrl('https://example.com/jobs'),true);
assert.equal(V.marketIsValidSourceUrl('http://example.com'),false);
assert.equal(V.marketIsValidSourceUrl('javascript:alert(1)'),false);
assert.equal(V.marketIsValidSourceUrl('https://user:pass@example.com'),false);
const src=fs.readFileSync(path.join(__dirname,'../v15/v15-local-market.js'),'utf8');
assert.doesNotMatch(src,/fetch\s*\(/,'no unverified automated job feed or AI calls');
assert.doesNotMatch(src,/GEMINI_API_KEY|x-goog-api-key/,'no API secrets required');
const maps=V.marketEmployerSearchUrl('Mumbai','Photoshop');
assert.ok(maps.startsWith('https://www.google.com/maps/search/?api=1&query='));
assert.equal(new URL(maps).searchParams.get('query'),'Photoshop companies in Mumbai, India');
assert.equal(new URL(V.marketEmployerSearchUrl('Pune','')).searchParams.get('query'),'companies in Pune, India');
assert.equal(V.marketEmployerSearchUrl('','Photoshop'),null,'no GPS fallback or unrequested current location');
assert.equal(new URL(V.marketEmployerSearchUrl('Ratnagiri','Graphic Design')).searchParams.get('api'),'1');
console.log('PASS market employer search URLs: city and skill encoded; no key, GPS or company-count claim.');
console.log('PASS Local Market: accurate source-bound counts, popular skill ranking, city filter, expiry, and safe URLs.');

assert.equal(V.analyzeLocalSkillMarket([...entries,entries[0]],'Mumbai','','2026-10-22').trackedPostings,3,'duplicate source links do not inflate market counts');
assert.equal(V.analyzeLocalSkillMarket([{...entries[0],expiresAt:'2026-02-31'}],'Mumbai','','2026-01-01').trackedPostings,0,'invalid calendar dates are rejected');
