'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {resetPasswords}=require('../scripts/reset-demo-passwords');
const roles=['admin','principal','instructor','staff','student'];
const report={project:'universal-iti-dk-staging',workspace:'staging-dtp-2026',accountsConfigured:true,accounts:roles.map(role=>({role,ready:true}))};
test('reset only allowlisted synthetic accounts after durable private storage, without printing passwords',async()=>{
 let saved=false,writes=0;const result=await resetPasswords({report,confirmProject:report.project,accessToken:async()=>'synthetic-token',randomPassword:()=> 'synthetic-private-password',savePrivate:async(rows,first)=>{assert.equal(rows.length,5);if(first)saved=true;},request:async(url,options)=>{assert(saved);assert.equal(url,'https://identitytoolkit.googleapis.com/v1/projects/universal-iti-dk-staging/accounts:update');const body=JSON.parse(options.body);assert.equal(body.localId,'staging-'+roles[writes++]);assert.deepEqual(Object.keys(body).sort(),['localId','password']);assert.equal(options.headers['x-goog-user-project'],report.project);return {ok:true};}});
 assert.equal(writes,5);assert(!JSON.stringify(result).includes('synthetic-private-password'));assert.equal(result.firestoreChanged,false);
});
test('wrong project or readiness blocks all password changes',async()=>{
 for(const changed of [{confirmProject:'production'},{report:{...report,accountsConfigured:false}}])await assert.rejects(resetPasswords({report,confirmProject:report.project,...changed}),{code:'RESET_PRECONDITION_FAILED'});
});
test('private file failure prevents all remote calls',async()=>{let called=false;await assert.rejects(resetPasswords({report,confirmProject:report.project,randomPassword:()=> 'synthetic',savePrivate:async()=>{throw Error('disk full');},request:async()=>{called=true;}}),/disk full/);assert.equal(called,false);});
test('interrupted reset preserves statuses, stops remaining resets and omits credentials from errors',async()=>{
 let requests=0,last;await assert.rejects(resetPasswords({report,confirmProject:report.project,randomPassword:()=> 'private-password',accessToken:async()=> 'private-token',savePrivate:async rows=>{last=structuredClone(rows);},request:async()=>({ok:++requests===1,status:403})}),e=>e.code==='RESET_INTERRUPTED'&&!JSON.stringify(e).includes('private'));
 assert.equal(requests,2);assert.deepEqual(last.map(x=>x.status),['reset','check-required','pending','pending','pending']);
});
