'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),A=require('../shared/admin-authority');
const grant=()=>({uid:'delegate',email:'delegate@example.test',active:true,googleOnly:true,schemaVersion:1,createdAt:'2026-10-29T00:00:00.000Z',createdBy:'operator',updatedAt:'2026-10-29T00:00:00.000Z',updatedBy:'operator'});
const member=()=>({uid:'delegate',email:'delegate@example.test',active:true,owner:true,role:'instructor',workspaceIds:['assigned']});
const identity=()=>({uid:'delegate',email:'delegate@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}});
test('server-managed delegation requires exact verified Google identity and active member/grant',()=>{
 assert(A.allowed(grant(),member(),identity()));
 for(const mutate of [g=>g.active=false,g=>g.uid='different',g=>g.email='other@example.test',g=>g.googleOnly=false,g=>g.extra=true,g=>g.createdAt='invalid',g=>g.schemaVersion=2]){const g=grant();mutate(g);assert.equal(A.allowed(g,member(),identity()),false);}
 for(const mutate of [m=>m.active=false,m=>m.owner=false,m=>m.uid='other',m=>m.email='other@example.test']){const m=member();mutate(m);assert.equal(A.allowed(grant(),m,identity()),false);}
 for(const mutate of [u=>u.firebase.sign_in_provider='password',u=>u.email_verified=false,u=>u.uid='other',u=>delete u.firebase]){const u=identity();mutate(u);assert.equal(A.allowed(grant(),member(),u),false);}
 assert.equal(A.allowed(null,member(),identity()),false);assert.equal(A.allowed(grant(),null,null),false);
});
test('client derives Admin/Principal UI from authoritative grant/token without changing saved role or UID',async()=>{
 const d=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=d.window;let g=grant(),claims=identity(),current='delegate';
 const V={INSTITUTE_ID:'synthetic',fb:{user:{uid:'delegate',getIdTokenResult:async()=>({claims})},db:{},M:{doc:(...x)=>x,getDoc:async()=>({exists:()=>!!g,data:()=>g})}}};
 w.V15Sync=V;w.ITIAdminAuthority=A;w.eval(fs.readFileSync('v15/v15-admin-authority.js','utf8'));
 try{const original=member(),result=await V.resolveAdminMembership(original,{ownerUid:'root'});assert.equal(result.owner,true);assert.equal(result.role,'instructor');assert.deepEqual(original,member());
  claims={...identity(),firebase:{sign_in_provider:'password'}};assert.equal((await V.resolveAdminMembership(original,{ownerUid:'root'})).owner,false);
  claims=identity();g=null;assert.equal((await V.resolveAdminMembership(original,{ownerUid:'root'})).owner,false);
  assert.equal((await V.resolveAdminMembership({...original,uid:'root'},{ownerUid:'delegate'})).owner,true,'existing root remains usable');
 }finally{d.window.close();}
});
