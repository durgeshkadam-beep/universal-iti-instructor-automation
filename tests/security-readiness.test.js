'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{inspect,readers,PROJECT}=require('../scripts/inspect-security-readiness');
const root={get:async()=>({exists:true,data:()=>({ownerUid:'private-owner-uid'})}),collection:()=>({where:()=>({get:async()=>({docs:[{id:'private-principal-uid',data:()=>({active:true})},{id:'disabled',data:()=>({active:false})}]})})})};
test('MFA preflight reports owner and active principals without printing identities or setup secrets',async()=>{
 const result=await inspect({db:{doc:()=>root},readConfig:async()=>({mfa:{providerConfigs:[{state:'ENABLED',totpProviderConfig:{}}]}}),lookupUser:async uid=>({localId:uid,email:'private@example.in',emailVerified:true,mfaInfo:[{totpInfo:{secret:'never-output'},mfaEnrollmentId:'private-enrollment'}]})});
 assert.equal(result.totpProviderEnabled,true);assert.equal(result.allPrivilegedTotpEnrolled,true);assert.equal(result.applicationPolicyEnforced,false);assert.equal(result.privilegedAccounts.length,2);assert.equal(result.recoveryTested,false);
 for(const privateText of ['private-owner','private-principal','private@example','never-output','private-enrollment'])assert(!JSON.stringify(result).includes(privateText));
});
test('missing accounts, SMS-only factors and synthetic aliases do not certify TOTP or recovery',async()=>{
 const result=await inspect({db:{doc:()=>root},readConfig:async()=>({}),lookupUser:async uid=>uid.includes('owner')?null:{email:'principal@iti-staging.example.test',emailVerified:true,mfaInfo:[{phoneInfo:'+000000000'}]}});
 assert.equal(result.totpProviderEnabled,false);assert.equal(result.allPrivilegedTotpEnrolled,false);assert.equal(result.privilegedAccounts[1].potentialRecoveryInbox,false);assert.equal(result.privilegedAccounts[1].totpEnrolled,false);
});
test('Auth preflight uses quota project and existing credential only for GET config and known UID lookup',async()=>{
 const calls=[];const r=readers({accessToken:async()=> 'private-test-token',request:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({users:[{localId:'one'}]})};}});
 await r.readConfig();assert.equal((await r.lookupUser('one')).localId,'one');assert.equal(calls[0].opts.method,undefined);assert(calls[0].url.endsWith('/config'));assert.equal(calls[1].opts.method,'POST');assert.deepEqual(JSON.parse(calls[1].opts.body),{localId:['one']});assert(calls.every(c=>c.opts.headers['x-goog-user-project']===PROJECT));
});
test('Auth permission failures are classified without attributing them to database rules or leaking response bodies',async()=>{
 const r=readers({accessToken:async()=> 'private-test-token',request:async()=>({ok:false,status:403,json:async()=>({secret:'private-error'})})});
 await assert.rejects(r.readConfig(),{code:'AUTH_CONFIGURATION_PERMISSION_DENIED'});
});
