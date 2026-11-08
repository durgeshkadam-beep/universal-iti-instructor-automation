'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {clean,digest,prepare,preview,apply,SOURCE,TARGET}=require('../scripts/transfer-dtp-staging');
test('private transfer strips credentials but preserves trainee details and typing fields in memory',()=>{
 assert.deepEqual(clean({name:'Private',pin:'1234',plan:{instructorPin:'4321',typing:'practice',objective:['Learn']},password:'secret',accessToken:'secret'}),{name:'Private',plan:{typing:'practice',objective:['Learn']}});
});
test('fingerprints are deterministic and detect changes independent of field order',()=>{
 assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));assert.notEqual(digest({a:1}),digest({a:2}));
});
test('preview emits only counts, fixed targets and fingerprint',()=>{
 const output=preview({counts:{trainees:{records:15}},fingerprint:'abc',bundle:{private:'Private learner'}});
 assert.equal(output.dataChanged,false);assert.equal(output.target,TARGET);assert(!JSON.stringify(output).includes('Private'));
});
test('wrong projects and unconfirmed apply cannot read or write records',async()=>{
 await assert.rejects(prepare({projectId:TARGET},{projectId:SOURCE}),{code:'TARGET_MISMATCH'});
 await assert.rejects(apply({projectId:TARGET},{fingerprint:'abc'},{target:SOURCE,fingerprint:'abc'}),{code:'CONFIRMATION_MISMATCH'});
 await assert.rejects(apply({projectId:TARGET},{fingerprint:'abc'},{target:TARGET,fingerprint:'changed'}),{code:'CONFIRMATION_MISMATCH'});
});
