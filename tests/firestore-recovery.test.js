'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Timestamp,GeoPoint,Firestore}=require('firebase-admin/firestore'),B=require('../scripts/firestore-recovery');
const archive=()=>({format:B.FORMAT,version:1,project:B.PROJECT,consistentSnapshot:false,documents:[{path:'institutes/synthetic',value:B.encode({trainees:['Synthetic trainee'],attendance:{present:true},marks:73},B.PROJECT)}]});
test('encrypted archive conceals records and rejects changed bytes or another key',()=>{
 const p=archive(),key=crypto.randomBytes(32),blob=B.encrypt(p,key);assert(!blob.includes('Synthetic trainee'));assert.deepEqual(B.decrypt(blob,key),p);
 const changed=JSON.parse(blob);changed.ciphertext=(changed.ciphertext[0]==='A'?'B':'A')+changed.ciphertext.slice(1);
 assert.throws(()=>B.decrypt(Buffer.from(JSON.stringify(changed)),key),/AUTHENTICATION/);
 assert.throws(()=>B.decrypt(blob,crypto.randomBytes(32)),/AUTHENTICATION/);
 assert.notDeepEqual(B.encrypt(p,key),blob,'fresh nonce for each archive');
});
test('codec round-trips Firestore timestamps, bytes, references, coordinates, maps and special numbers',async()=>{
 const db=new Firestore({projectId:B.PROJECT});try{
  const original={timestamp:new Timestamp(1700000000,123456789),point:new GeoPoint(19.1,72.9),reference:db.doc('institutes/synthetic'),bytes:Buffer.from([0,255,4]),values:[NaN,Infinity,-Infinity,-0,null,true],nested:{'__tag':['timestamp',0,0]}};
  const encoded=B.encode(original,B.PROJECT),decoded=B.decode(encoded,db);
  assert.deepEqual(B.encode(decoded,B.PROJECT),encoded);assert.equal(decoded.timestamp.nanoseconds,123456789);assert.equal(decoded.reference.path,'institutes/synthetic');assert(Object.is(decoded.values[3],-0));
 }finally{await db.terminate();}
});
test('codec and archive validation reject foreign projects, duplicate paths, traversal and malformed values',()=>{
 const db={doc:p=>({path:p})};
 for(const value of [['unknown',1],['number','oops'],['timestamp',1,-1],['reference','a/../b/c'],['map',[['x',['null']],['x',['null']]]],['bytes','invalid!']])assert.throws(()=>B.decode(value,db));
 for(const change of [p=>p.project='production',p=>p.documents.push(p.documents[0]),p=>p.documents[0].path='../private',p=>p.documents[0].value=['array',[]]]){const p=archive();change(p);assert.throws(()=>B.validate(p));}
 assert.throws(()=>B.encode(undefined,B.PROJECT));assert.throws(()=>B.encrypt(archive(),Buffer.alloc(31)));
});
test('recursive capture includes orphan subcollections and every protected data section without modifying the source',async()=>{
 const data=new Map([['institutes/synthetic',{ownerUid:'synthetic-owner'}],['institutes/synthetic/workspaces/w/trainees/t',{name:'Synthetic'}],['orphan/missing/examKeys/e',{answers:[0]}],['apiLimits/a',{count:2}]]);
 function col(p){return {listDocuments:async()=>{const paths=new Set();for(const k of data.keys())if(k.startsWith(p+'/'))paths.add(k.split('/').slice(0,p.split('/').length+1).join('/'));return [...paths].map(ref);}};}
 function ref(p){return {path:p,get:async()=>({exists:data.has(p),data:()=>data.get(p)}),listCollections:async()=>{const names=new Set();for(const k of data.keys())if(k.startsWith(p+'/'))names.add(k.split('/').slice(0,p.split('/').length+1).join('/'));return [...names].map(col);}};}
 const db={projectId:B.PROJECT,listCollections:async()=>['institutes','orphan','apiLimits'].map(col)},before=JSON.stringify([...data]);
 const p=await B.capture(db);assert.equal(p.documents.length,4);assert(p.documents.some(x=>x.path==='orphan/missing/examKeys/e'));assert.equal(p.consistentSnapshot,false);assert.equal(JSON.stringify([...data]),before);
 await assert.rejects(B.capture(db,{maxDocs:1}),/ARCHIVE_LIMIT/);
});
test('private archive files cannot overwrite, follow symlinks, use a public directory or enter checkout',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eduskill-private-'));fs.chmodSync(dir,0o700);const f=path.join(dir,'archive');
 try{B.savePrivate(f,Buffer.from('encrypted'));assert.equal(fs.statSync(f).mode&0o777,0o600);assert.equal(B.readPrivate(f,20).toString(),'encrypted');assert.throws(()=>B.savePrivate(f,Buffer.from('replace')));assert.throws(()=>B.readPrivate(f,2));
  const link=path.join(dir,'link');fs.symlinkSync(f,link);assert.throws(()=>B.readPrivate(link,20));
  fs.chmodSync(f,0o644);assert.throws(()=>B.readPrivate(f,20));fs.chmodSync(dir,0o755);assert.throws(()=>B.privateParent(f));assert.throws(()=>B.privateParent(path.join(__dirname,'private-backup')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('restore refuses live hosts, arbitrary projects, missing confirmation and existing data before writes',async()=>{
 for(const [project,host] of [[B.PROJECT,'127.0.0.1:8080'],['demo-eduskill-recovery','localhost:8080'],['demo-eduskill-recovery','remote.example:8080']])assert.throws(()=>B.emulatorTarget(project,host));
 let writes=0;const db={projectId:'demo-eduskill-recovery',listCollections:async()=>[{}],batch:()=>{writes++;}};
 await assert.rejects(B.restoreEmulator(db,archive(),{host:'127.0.0.1:8080'}),/SOURCE_CONFIRMATION/);
 await assert.rejects(B.restoreEmulator(db,archive(),{host:'127.0.0.1:8080',confirmSource:B.PROJECT}),/DESTINATION_NOT_EMPTY/);assert.equal(writes,0);
});
