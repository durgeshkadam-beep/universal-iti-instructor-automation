'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{checkLogin}=require('../scripts/check-demo-login');
const row={role:'instructor',email:'instructor@iti-staging.example.test',password:'private-password',status:'reset'};
test('private file login diagnostic checks actual password and same user membership without exposing credentials',async()=>{
 let calls=0;const result=await checkLogin({row,apiKey:'public-config',request:async(url,opts)=>{
  if(++calls===1){assert.equal(JSON.parse(opts.body).password,row.password);return {ok:true,json:async()=>({localId:'staging-instructor',idToken:'private-token',refreshToken:'private-refresh'})};}
  assert.match(url,/members\/staging-instructor$/);assert.equal(opts.headers.Authorization,'Bearer private-token');return {ok:true,json:async()=>({fields:{role:{stringValue:'instructor'},active:{booleanValue:true},owner:{booleanValue:false}}})};
 }});assert.equal(result.code,'PASSWORD_AND_MEMBERSHIP_OK');assert.equal(calls,2);assert(!JSON.stringify(result).includes('private'));
});
test('bad credentials stop before membership and return fixed safe error only',async()=>{
 let calls=0;const result=await checkLogin({row,apiKey:'public-config',request:async()=>{calls++;return {ok:false,status:400,json:async()=>({error:{message:'INVALID_LOGIN_CREDENTIALS',private:'secret'}})};}});
 assert.equal(calls,1);assert.equal(result.code,'INVALID_LOGIN_CREDENTIALS');assert.equal(result.passwordAccepted,false);assert(!JSON.stringify(result).includes('secret'));
});
test('valid password with denied membership is distinguished from a password failure',async()=>{
 let n=0;const result=await checkLogin({row,apiKey:'public-config',request:async()=>++n===1?{ok:true,json:async()=>({localId:'staging-instructor',idToken:'private-token'})}:{ok:false,status:403}});assert.equal(result.passwordAccepted,true);assert.equal(result.code,'MEMBERSHIP_READ_REJECTED');
});
test('foreign identities and arbitrary provider error strings are not exposed',async()=>{
 await assert.rejects(checkLogin({row:{...row,email:'real@example.test'}}));
 const result=await checkLogin({row,request:async()=>({ok:false,status:403,json:async()=>({error:{message:'secret-private-error'}})})});assert.equal(result.code,'AUTH_REQUEST_REJECTED');assert(!JSON.stringify(result).includes('secret'));
});
