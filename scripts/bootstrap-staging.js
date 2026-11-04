'use strict';
// Explicit, one-time staging initialization. Never imports or alters student records.
const {initializeApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getFirestore}=require('firebase-admin/firestore');
(async()=>{
 const project=process.env.GCLOUD_PROJECT||'';
 if(!project.startsWith('demo-')&&!(project.endsWith('-staging')&&process.env.ALLOW_STAGING_BOOTSTRAP==='true'))throw Error('Only a demo project or explicitly acknowledged *-staging project may be initialized.');
 if(!process.env.BOOTSTRAP_OWNER_EMAIL)throw Error('Set BOOTSTRAP_OWNER_EMAIL to an existing verified staging Auth user.');
 initializeApp({projectId:project});const auth=getAuth(),db=getFirestore(),owner=await auth.getUserByEmail(process.env.BOOTSTRAP_OWNER_EMAIL);
 if(!owner.emailVerified||owner.disabled)throw Error('Owner must be a verified active Auth user.');
 const inst=db.doc('institutes/brdbagiti-mumbai-01'),ws=inst.collection('workspaces').doc('staging-trade-a');
 await db.runTransaction(async tx=>{
  if((await tx.get(inst)).exists)throw Error('Institute already exists; refusing to overwrite it.');
  tx.set(inst,{ownerUid:owner.uid,schemaVersion:15,name:'Staging ITI',code:'STAGING'});
  tx.set(inst.collection('members').doc(owner.uid),{uid:owner.uid,email:owner.email,displayName:owner.displayName||'Staging Owner',owner:true,role:'instructor',active:true,workspaceIds:[ws.id]});
  tx.set(ws,{schemaVersion:15,trade:'Staging Trade',session:'2026-27',batch:'A',status:'active',arraySections:[],mapSections:[]});
 });console.log('Empty staging institute initialized; no trainee records created.');await db.terminate();
})().catch(e=>{console.error(e.message);process.exitCode=1;});
