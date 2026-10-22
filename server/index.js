'use strict';
const http=require('node:http');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const {createService}=require('./service');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT});
const config={provider:process.env.AI_PROVIDER||'none',model:process.env.AI_MODEL,apiKey:process.env.AI_API_KEY,ollamaUrl:process.env.OLLAMA_URL,dailyLimit:process.env.AI_DAILY_LIMIT};
const service=createService({db:getFirestore(),verifyToken:t=>getAuth().verifyIdToken(t,true),config});
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean);
async function handle(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const origin=req.headers.origin;
 if(origin&&!origins.includes(origin)){res.writeHead(403);res.end();return;}
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','POST');res.writeHead(204);res.end();return;}
 res.setHeader('Content-Type','application/json');
 try{
  if(req.method!=='POST'){res.writeHead(405);res.end(JSON.stringify({error:'POST required'}));return;}
  const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];if(!token){res.writeHead(401);res.end(JSON.stringify({error:'Sign in required'}));return;}
  let body=req.body;
  if(!body){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>200000){res.writeHead(413);res.end(JSON.stringify({error:'Request too large'}));return;}chunks.push(c);}body=JSON.parse(Buffer.concat(chunks).toString());}
  if(Buffer.byteLength(JSON.stringify(body))>200000){res.writeHead(413);res.end(JSON.stringify({error:'Request too large'}));return;}
  const out=await service.execute(token,body);res.writeHead(200);res.end(JSON.stringify(out));
 }catch(e){const status=e.status||(e instanceof SyntaxError?400:500);res.writeHead(status);res.end(JSON.stringify({error:status===500?'Request failed. Retry later.':e.message}));}
}
if(require.main===module)http.createServer(handle).listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log('ITI API listening on loopback. Place behind an HTTPS reverse proxy for remote access.'));
module.exports={handle};
