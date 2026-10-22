'use strict';
if(process.env.ITI_STAGING_ONLY==='true')require('./staging-runtime').validateStagingRuntime();
const http=require('node:http');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const {createService}=require('./service');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT});
const config={provider:process.env.AI_PROVIDER||'none',model:process.env.AI_MODEL,apiKey:process.env.AI_API_KEY,ollamaUrl:process.env.OLLAMA_URL,dailyLimit:process.env.AI_DAILY_LIMIT};
const service=createService({db:getFirestore(),verifyToken:t=>getAuth().verifyIdToken(t,true),config});
const {createHandler}=require('./http');
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
const handle=createHandler({service,origins});
if(require.main===module){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT)||8787;
 const server=http.createServer(handle);
 server.headersTimeout=10000;server.requestTimeout=15000;
 server.listen(port,host,()=>console.log('ITI API ready. Use HTTPS at the hosting proxy.'));
}
module.exports={handle};
