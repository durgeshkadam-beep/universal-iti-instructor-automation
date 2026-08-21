const {InstructorAI}=require('../ai.js');
const assert=require('assert');
let d=InstructorAI.normalizePlan('practical',{objective:['A'],tools:['T'],steps:[{procedure:'P',keyPoint:'K',spotHint:'S'}],questions:['Q'],nextDemo:'N'});
assert.deepStrictEqual(d.steps,[['P','K','S']]);
let l=InstructorAI.normalizePlan('theory',{objective:['A'],materials:['M'],review:'R',motivation:'Mo',steps:[{topic:'T',information:'I',spotHint:'S'}],questions:['Q'],summary:'Su',assignment:'As',nextLesson:'N'});
assert.deepStrictEqual(l.steps,[['T','I','S']]);
assert(InstructorAI.syllabusSchema().properties.items);
assert(InstructorAI.planSchema('practical').properties.steps);
console.log('PASS: V11 AI normalization/schema test');
