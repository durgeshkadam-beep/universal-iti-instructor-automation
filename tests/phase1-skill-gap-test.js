'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const V={currentRole:()=> 'student'};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v15/v15-skill-gap.js'),'utf8'),{
 window:{V15Sync:V,SESSION:{role:'student'}},console
},{filename:'v15-skill-gap.js'});
assert.equal(typeof V.calculateSkillGap,'function','calculator is exported on V15');
const verified={skills:{
 'practical-1':{status:'verified',verifiedBy:'instructor-1'},
 'practical-2':{status:'learning'},
 'practical-3':{status:'verified'},
 'practical-4':{status:'verified'}
}};
const result=V.calculateSkillGap(['practical-1','practical-2','practical-3','practical-5','practical-1'],verified,{
 'practical-2':'can-demonstrate',
 'practical-5':'learning'
});
assert.equal(result.total,4,'duplicate practical requirements must not inflate denominator');
assert.equal(result.completed,2,'only instructor verified skills count');
assert.equal(result.percent,50,'coverage uses only verified skill counts');
assert.equal(result.missing.join(','),'practical-2,practical-5');
assert.match(result.steps[0].action,/Instructor assessment/,'student demonstration needs teacher review');
assert.match(result.steps[1].action,/practical exercises/,'learning student gets continued-practice recommendation');
const unverified=V.calculateSkillGap(['practical-9'],{skills:{'practical-9':{status:'self-reported'}}},{'practical-9':'can-demonstrate'});
assert.equal(unverified.percent,0,'self-rated skill is never counted as verified');
const empty=V.calculateSkillGap([],verified,{});
assert.equal(empty.percent,null,'empty requirements produce no misleading percentage');
const only=V.calculateSkillGap(['practical-3'],verified,{});
assert.equal(only.percent,100,'fully instructor-verified track gives 100 percent');
console.log('PASS skill gap calculation: verified-only scoring, correct gaps, self-rating separation.');
