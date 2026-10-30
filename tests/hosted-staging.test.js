'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareManifest,verifyFiles,bytes,hash,ORIGIN}=require('../scripts/verify-hosted-staging');
const body=Buffer.from('synthetic public script'),manifest={files:[{path:'v15/test.js',sha256:hash(body)}]};
test('hosted manifest rejects duplicates, traversal, foreign URLs and wrong release hashes',()=>{
 assert.equal(compareManifest(manifest,manifest).size,1);
 for(const files of [[],[...manifest.files,...manifest.files],[{path:'../private',sha256:hash(body)}],[{path:'https://elsewhere.test/file.js',sha256:hash(body)}],[{path:'/private',sha256:hash(body)}],[{path:'v15/test.js',sha256:'0'.repeat(64)}]])assert.throws(()=>compareManifest(manifest,{files}));
});
test('public release checks fetch every asset and detect a stale response behind a matching manifest',async()=>{
 const requests=[],fetcher=async(url,options)=>{requests.push({url,options});return new Response(url.endsWith('build-manifest.json')?JSON.stringify(manifest):body);};
 assert.deepEqual(await verifyFiles(manifest,fetcher),{files:1,allHashesMatch:true});
 assert.equal(requests.length,2);for(const {url,options} of requests){assert(url.startsWith(ORIGIN+'/'));assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);}
 await assert.rejects(verifyFiles(manifest,async url=>new Response(url.endsWith('build-manifest.json')?JSON.stringify(manifest):'stale asset')),/Published asset differs/);
});
test('public transport rejects non-staging endpoints and HTTP failures without printing response bodies',async()=>{
 let called=false;const fetcher=async()=>{called=true;return new Response('private-looking diagnostic',{status:403});};
 for(const url of ['http://universal-iti-dk-staging.web.app/file','https://production.example.test/file',ORIGIN.replace('https://','https://user:secret@')+'/file',ORIGIN+'/file#fragment'])await assert.rejects(bytes(url,fetcher),/approved public staging/);
 assert.equal(called,false);await assert.rejects(bytes(ORIGIN+'/file',fetcher),e=>e.message.includes('403')&&!e.message.includes('private-looking'));
});
