'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createRequire}=require('node:module');
const cli=createRequire(require.resolve('firebase-tools/package.json'));

test('Firebase CLI gaxios still sends multipart requests with the patched CommonJS uuid', {timeout:10000},async t=>{
 let received;const server=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);received={type:req.headers['content-type'],body:Buffer.concat(chunks).toString()};res.setHeader('Content-Type','application/json');res.end('{"accepted":true}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const agent=new http.Agent();t.after(()=>{agent.destroy();server.closeAllConnections();server.close();});
 const {Gaxios}=cli('gaxios');const result=await new Gaxios().request({url:'http://127.0.0.1:'+server.address().port,method:'POST',agent,timeout:3000,retry:false,multipart:[{headers:{'Content-Type':'text/plain'},content:'Synthetic multipart fixture'}]});
 assert.deepEqual(result.data,{accepted:true});const match=/^multipart\/related; boundary=([0-9a-f-]{36})$/.exec(received.type);assert.ok(match);assert.match(match[1],/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.ok(received.body.includes('--'+match[1]+'\r\nContent-Type: text/plain\r\n\r\nSynthetic multipart fixture'));assert.ok(received.body.endsWith('--'+match[1]+'--'));
});

test('Firebase CLI Pub/Sub tracing propagates and extracts context with patched OpenTelemetry',()=>{
 const pubsub=createRequire(cli.resolve('@google-cloud/pubsub')),telemetry=pubsub('./telemetry-tracing.js'),api=pubsub('@opentelemetry/api');
 const context={traceId:'0123456789abcdef0123456789abcdef',spanId:'0123456789abcdef',traceFlags:1},message={attributes:{fixture:'synthetic'}};
 telemetry.setGloballyEnabled(true);try{telemetry.injectSpan(api.trace.wrapSpanContext(context),message);assert.equal(message.attributes.googclient_traceparent,'00-'+context.traceId+'-'+context.spanId+'-01');assert.equal(message.attributes.fixture,'synthetic');delete message.parentSpan;assert.equal(telemetry.containsSpanContext(message),true);const extracted=telemetry.extractSpan(message,'synthetic-subscription');assert.equal(extracted.spanContext().traceId,context.traceId);assert.equal(extracted.spanContext().traceFlags,1);}finally{telemetry.setGloballyEnabled(false);}
});
