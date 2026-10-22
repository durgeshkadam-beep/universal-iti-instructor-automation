'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function core(runtime){const context={window:{ITI_RUNTIME:runtime},Set,Uint32Array,console};vm.createContext(context);vm.runInContext(fs.readFileSync('v15/v15-core.js','utf8'),context);return context.window.V15Sync;}
test('staging transport uses long polling only for explicit isolated staging config',()=>{
 const V=core({staging:true,firebaseConfig:{projectId:'synthetic-staging'}}),app={};let settings;
 const M={initializeFirestore:(a,s)=>{assert.equal(a,app);settings=s;return 'long-poll-db';},getFirestore:()=>{throw Error('wrong transport');}};
 assert.equal(V.firestore(app,M),'long-poll-db');assert.equal(settings.experimentalForceLongPolling,true);assert.equal(settings.useFetchStreams,false);
});
test('ordinary projects retain their normal Firestore transport even if staging flag is injected',()=>{
 for(const runtime of [{firebaseConfig:{projectId:'synthetic-staging'}},{staging:true,firebaseConfig:{projectId:'production-project'}}]){
  const V=core(runtime);assert.equal(V.firestore({}, {getFirestore:()=> 'normal-db',initializeFirestore:()=>{throw Error('unexpected staging transport');}}),'normal-db');
 }
});
