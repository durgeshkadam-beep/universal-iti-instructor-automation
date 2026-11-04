'use strict';
const staging=process.env.ITI_STAGING_ONLY==='true'?require('./staging-runtime').validateStagingRuntime():null;
if(!staging&&process.env.ITI_STAGING_SERVICE_ACCOUNT_JSON)throw Error('Staging credential requires the staging guard');
delete process.env.ITI_STAGING_SERVICE_ACCOUNT_JSON;
const http=require('node:http');
const {initializeApp,getApps,cert}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const {createService}=require('./service');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT,...(staging?{credential:cert(staging.credential)}:{})});
const config={provider:process.env.AI_PROVIDER||'none',model:process.env.AI_MODEL,apiKey:process.env.AI_API_KEY,ollamaUrl:process.env.OLLAMA_URL,dailyLimit:process.env.AI_DAILY_LIMIT,globalAiDailyLimit:process.env.AI_GLOBAL_DAILY_LIMIT};
const service=createService({db:getFirestore(),verifyToken:t=>getAuth().verifyIdToken(t,true),config});
const {createHandler}=require('./http');
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
const handle=createHandler({service,origins});
if(require.main===module){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT)||8787;
 const server=http.createServer(handle);
 server.headersTimeout=10000;server.requestTimeout=15000;
 server.listen(port,host,()=>{console.log('ITI API ready. Use HTTPS at the hosting proxy.');require('./staging-ai-probe').runStagingProbe(config).catch(()=>console.log('STAGING_AI_PROBE FAIL: diagnostic unavailable'));});
}
module.exports={handle};
