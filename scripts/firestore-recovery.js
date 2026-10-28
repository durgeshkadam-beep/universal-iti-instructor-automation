'use strict';
// Operator-only encrypted database archive. Never served by Firebase Hosting.
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const PROJECT='universal-iti-dk-staging',FORMAT='EduSkill encrypted Firestore archive',MAX_BYTES=100*1024*1024,MAX_DOCS=100000;
const fail=code=>{throw Object.assign(Error(code),{code});};
const validPath=p=>typeof p==='string'&&p.length<=6000&&p.split('/').length%2===0&&p.split('/').every(s=>s&&s!=='.'&&s!=='..');
function encode(value,project){
 const {Timestamp,GeoPoint,DocumentReference}=require('firebase-admin/firestore');
 if(value===null)return ['null'];
 if(typeof value==='string'||typeof value==='boolean')return [typeof value,value];
 if(typeof value==='number')return ['number',Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':value];
 if(value instanceof Timestamp)return ['timestamp',value.seconds,value.nanoseconds];
 if(value instanceof Date)return encode(Timestamp.fromDate(value),project);
 if(value instanceof GeoPoint)return ['geopoint',value.latitude,value.longitude];
 if(value instanceof DocumentReference){if(value.firestore.projectId!==project)fail('EXTERNAL_REFERENCE_UNSUPPORTED');return ['reference',value.path];}
 if(Buffer.isBuffer(value)||value instanceof Uint8Array)return ['bytes',Buffer.from(value).toString('base64')];
 if(Array.isArray(value))return ['array',value.map(x=>encode(x,project))];
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return ['map',Object.keys(value).sort().map(k=>[k,encode(value[k],project)])];
 fail('UNSUPPORTED_FIRESTORE_VALUE');
}
function decode(v,db,depth=0){
 const {Timestamp,GeoPoint}=require('firebase-admin/firestore');
 if(depth>40||!Array.isArray(v))fail('INVALID_ARCHIVE');
 const [type,a,b]=v;
 if(type==='null'&&v.length===1)return null;
 if(type==='string'&&v.length===2&&typeof a==='string')return a;
 if(type==='boolean'&&v.length===2&&typeof a==='boolean')return a;
 if(type==='number'&&v.length===2){if(typeof a==='number'&&Number.isFinite(a))return a;if(['NaN','Infinity','-Infinity','-0'].includes(a))return a==='-0'?-0:Number(a);}
 if(type==='timestamp'&&v.length===3&&Number.isSafeInteger(a)&&Number.isInteger(b))return new Timestamp(a,b);
 if(type==='geopoint'&&v.length===3&&typeof a==='number'&&typeof b==='number')return new GeoPoint(a,b);
 if(type==='reference'&&v.length===2&&validPath(a))return db.doc(a);
 if(type==='bytes'&&v.length===2&&typeof a==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a))return Buffer.from(a,'base64');
 if(type==='array'&&v.length===2&&Array.isArray(a))return a.map(x=>decode(x,db,depth+1));
 if(type==='map'&&v.length===2&&Array.isArray(a)){
  const keys=new Set(),entries=[];
  for(const item of a){if(!Array.isArray(item)||item.length!==2||typeof item[0]!=='string'||keys.has(item[0]))fail('INVALID_ARCHIVE');keys.add(item[0]);entries.push([item[0],decode(item[1],db,depth+1)]);}
  return Object.fromEntries(entries);
 }
 fail('INVALID_ARCHIVE');
}
async function capture(db,{maxDocs=MAX_DOCS}={}){
 const startedAt=new Date().toISOString(),documents=[];let bytes=0;
 async function collection(col){
  // listDocuments also includes missing parent documents with live subcollections.
  for(const ref of await col.listDocuments()){
   const snap=await ref.get();
   if(snap.exists){const row={path:ref.path,value:encode(snap.data(),db.projectId)};bytes+=Buffer.byteLength(JSON.stringify(row));if(documents.length>=maxDocs||bytes>MAX_BYTES)fail('ARCHIVE_LIMIT');documents.push(row);}
   for(const child of await ref.listCollections())await collection(child);
  }
 }
 for(const col of await db.listCollections())await collection(col);
 documents.sort((a,b)=>a.path.localeCompare(b.path));
 return {format:FORMAT,version:1,project:db.projectId,startedAt,completedAt:new Date().toISOString(),consistentSnapshot:false,
  excludes:['Firebase Authentication identities/passwords/MFA secrets','Cloud Storage/Drive file bytes','IAM, rules, indexes and external configuration'],documents};
}
function validate(payload){
 if(!payload||payload.format!==FORMAT||payload.version!==1||payload.project!==PROJECT||payload.consistentSnapshot!==false||!Array.isArray(payload.documents)||payload.documents.length>MAX_DOCS)fail('INVALID_ARCHIVE');
 const seen=new Set();
 for(const r of payload.documents){if(!r||!validPath(r.path)||seen.has(r.path)||!Array.isArray(r.value)||r.value[0]!=='map')fail('INVALID_ARCHIVE');seen.add(r.path);}
 return payload;
}
function encrypt(payload,key){
 validate(payload);if(!Buffer.isBuffer(key)||key.length!==32)fail('INVALID_KEY');
 const body=Buffer.from(JSON.stringify(payload));if(body.length>MAX_BYTES)fail('ARCHIVE_LIMIT');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(FORMAT+'|1'));
 const encrypted=Buffer.concat([cipher.update(body),cipher.final()]);
 return Buffer.from(JSON.stringify({format:FORMAT,version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')}));
}
function decrypt(bytes,key){
 try{
  if(!Buffer.isBuffer(key)||key.length!==32||bytes.length>MAX_BYTES*1.4+1024)fail('INVALID_ARCHIVE');
  const p=JSON.parse(bytes),iv=Buffer.from(p.iv,'base64'),tag=Buffer.from(p.tag,'base64'),body=Buffer.from(p.ciphertext,'base64');
  if(p.format!==FORMAT||p.version!==1||iv.length!==12||tag.length!==16||body.length>MAX_BYTES)fail('INVALID_ARCHIVE');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(FORMAT+'|1'));decipher.setAuthTag(tag);
  return validate(JSON.parse(Buffer.concat([decipher.update(body),decipher.final()])));
 }catch{fail('ARCHIVE_AUTHENTICATION_FAILED');}
}
function privateParent(file){
 const parent=fs.realpathSync(path.dirname(path.resolve(file))),repo=fs.realpathSync(path.join(__dirname,'..')),s=fs.statSync(parent);
 if(parent===repo||parent.startsWith(repo+path.sep)||(s.mode&0o077)!==0||!s.isDirectory()||(process.getuid&&s.uid!==process.getuid()))fail('PRIVATE_DIRECTORY_REQUIRED');
 return path.join(parent,path.basename(file));
}
function savePrivate(file,bytes){
 const target=privateParent(file),fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return target;
}
function readPrivate(file,maxBytes){
 const target=privateParent(file),fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const s=fs.fstatSync(fd);if(!s.isFile()||(s.mode&0o077)!==0||s.size>maxBytes||(process.getuid&&s.uid!==process.getuid()))fail('PRIVATE_FILE_REQUIRED');return fs.readFileSync(fd);}finally{fs.closeSync(fd);}
}
function emulatorTarget(project,host){
 if(project!=='demo-eduskill-recovery'||!/^127\.0\.0\.1:\d{2,5}$/.test(host||''))fail('EMULATOR_ONLY');
}
async function restoreEmulator(db,payload,{host,confirmSource}={}){
 emulatorTarget(db.projectId,host);validate(payload);if(confirmSource!==payload.project)fail('SOURCE_CONFIRMATION_REQUIRED');
 if((await db.listCollections()).length)fail('DESTINATION_NOT_EMPTY');
 const values=payload.documents.map(r=>({ref:db.doc(r.path),data:decode(r.value,db)}));
 // Preflight before any write; individual create operations also reject races.
 for(let i=0;i<values.length;i+=100){for(const s of await db.getAll(...values.slice(i,i+100).map(x=>x.ref)))if(s.exists)fail('DESTINATION_NOT_EMPTY');}
 for(let i=0;i<values.length;i+=400){const batch=db.batch();for(const r of values.slice(i,i+400))batch.create(r.ref,r.data);await batch.commit();}
 let matched=0;
 for(let i=0;i<values.length;i+=100){const snaps=await db.getAll(...values.slice(i,i+100).map(x=>x.ref));for(let j=0;j<snaps.length;j++){const actual=JSON.stringify(encode(snaps[j].data(),db.projectId)),expected=JSON.stringify(encode(values[i+j].data,db.projectId));if(actual!==expected)fail('READBACK_MISMATCH');matched++;}}
 return {ok:true,mode:'emulator-restore',matchedDocuments:matched,liveDataChanged:false};
}
async function main(){
 let db;try{
  const args=process.argv.slice(2),mode=args.shift(),options={};
  while(args.length){const k=args.shift(),v=args.shift();if(!/^--[a-z-]+$/.test(k||'')||!v||v.startsWith('--')||k in options)fail('INVALID_ARGUMENTS');options[k]=v;}
  if(!['init-key','export','verify','restore-emulator'].includes(mode))fail('INVALID_ARGUMENTS');
  const allowed={ 'init-key':['--key-file'],export:['--key-file','--output','--confirm-project'],verify:['--key-file','--input'],'restore-emulator':['--key-file','--input','--confirm-source']}[mode];
  if(Object.keys(options).some(k=>!allowed.includes(k))||allowed.some(k=>!options[k]))fail('INVALID_ARGUMENTS');
  if(mode==='init-key'){savePrivate(options['--key-file'],crypto.randomBytes(32));console.log(JSON.stringify({ok:true,mode,keyPrinted:false}));return;}
  const key=readPrivate(options['--key-file'],32);if(key.length!==32)fail('INVALID_KEY');
  if(mode==='export'){
   if(options['--confirm-project']!==PROJECT||process.env.FIRESTORE_EMULATOR_HOST)fail('INVALID_PROJECT');
   privateParent(options['--output']);if(fs.existsSync(options['--output']))fail('DESTINATION_EXISTS');
   const {execFileSync}=require('node:child_process'),{Firestore}=require('firebase-admin/firestore'),{GoogleAuth,OAuth2Client}=require('google-gax').googleAuthLibrary;
   db=await require('./inspect-dtp-source').createInventoryDatabase({Firestore,GoogleAuth,OAuth2Client,projectId:PROJECT,accessToken:async()=>execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()});
   const p=await capture(db);savePrivate(options['--output'],encrypt(p,key));
   const check=decrypt(readPrivate(options['--output'],MAX_BYTES*1.4+1024),key);console.log(JSON.stringify({ok:true,mode,project:PROJECT,documents:check.documents.length,encrypted:true,readbackVerified:true,consistentSnapshot:false,dataChanged:false,excludes:p.excludes}));return;
  }
  const p=decrypt(readPrivate(options['--input'],MAX_BYTES*1.4+1024),key);
  if(mode==='verify'){console.log(JSON.stringify({ok:true,mode,project:p.project,documents:p.documents.length,encrypted:true,dataChanged:false,consistentSnapshot:false,excludes:p.excludes}));return;}
  emulatorTarget('demo-eduskill-recovery',process.env.FIRESTORE_EMULATOR_HOST);
  const {Firestore}=require('firebase-admin/firestore');db=new Firestore({projectId:'demo-eduskill-recovery'});
  console.log(JSON.stringify(await restoreEmulator(db,p,{host:process.env.FIRESTORE_EMULATOR_HOST,confirmSource:options['--confirm-source']})));
 }catch{console.error(JSON.stringify({ok:false,code:'RECOVERY_OPERATION_FAILED',hint:'Check the documented arguments, existing project access, private file permissions and emulator target. No secrets or raw provider errors are printed. A failed emulator restore may be partial; use a fresh emulator for another attempt.'}));process.exitCode=1;}
 finally{if(db)await db.terminate();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({ok:false,code:'RECOVERY_CLEANUP_FAILED',hint:'Review the private archive and emulator state before retrying. No raw error or credentials are printed.'}));process.exitCode=1;});
module.exports={PROJECT,FORMAT,MAX_BYTES,encode,decode,capture,validate,encrypt,decrypt,privateParent,savePrivate,readPrivate,emulatorTarget,restoreEmulator};
