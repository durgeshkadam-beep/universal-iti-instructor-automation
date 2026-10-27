'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {providerError}=require('../server/ai-provider-error');
for(const [status,expected] of [[400,'request format'],[401,'server key'],[403,'server key'],[404,'model is unavailable'],[429,'quota or rate limit'],[500,'temporarily unavailable']])test('provider '+status+' gives a safe actionable error',async()=>{
 const secret='sensitive-provider-body-must-not-escape';const out=await providerError({status,json:async()=>({error:{message:secret,details:[{reason:secret,metadata:{key:secret}}]}})});assert(out.includes('HTTP '+status));assert(out.includes(expected));assert(!out.includes(secret));
});
test('only known API-key reason labels are exposed',async()=>{const out=await providerError({status:400,json:async()=>({error:{details:[{reason:'API_KEY_INVALID',metadata:{secret:'must not escape'}}]}})});assert(out.includes('API_KEY_INVALID'));assert(!out.includes('must not escape'));});
test('non-JSON provider errors still return a safe HTTP diagnostic',async()=>{assert((await providerError({status:502,json:async()=>{throw Error('private-body')}})).includes('HTTP 502'));});
