'use strict';
const MAX_BODY=200000;
const PUBLIC_STATUS=new Set([400,401,403,404,409,413,415,429,503]);
function createHandler({service,origins=[]}){
 if(typeof service?.execute!=='function')throw Error('API service required');
 const allowed=new Set(origins);
 return async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json');
  const send=(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value));};
  const origin=req.headers.origin;
  if(origin&&!allowed.has(origin))return send(403,{error:'Origin is not allowed'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{return send(400,{error:'Invalid URL'});}
  if(req.method==='GET'&&pathname==='/healthz')return send(200,{ok:true});
  if(pathname!=='/api')return send(404,{error:'Route not found'});
  if(req.method==='OPTIONS'){
   if(req.headers['access-control-request-method']&&req.headers['access-control-request-method']!=='POST')return send(405,{error:'POST required'});
   res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','POST');res.writeHead(204);res.end();return;
  }
  if(req.method!=='POST')return send(405,{error:'POST required'});
  const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];if(!token)return send(401,{error:'Sign in required'});
  if(!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type']||''))return send(415,{error:'JSON content type required'});
  if(Number(req.headers['content-length'])>MAX_BODY)return send(413,{error:'Request too large'});
  try{
   let body=req.body;
   if(body===undefined){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>MAX_BODY)return send(413,{error:'Request too large'});chunks.push(c);}body=JSON.parse(Buffer.concat(chunks).toString());}
   if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'JSON object required'});
   if(Buffer.byteLength(JSON.stringify(body))>MAX_BODY)return send(413,{error:'Request too large'});
   return send(200,await service.execute(token,body));
  }catch(e){const status=PUBLIC_STATUS.has(e.status)?e.status:e instanceof SyntaxError?400:500;return send(status,{error:status===500?'Request failed. Retry later.':e instanceof SyntaxError?'Invalid JSON':e.message});}
 };
}
module.exports={createHandler};
