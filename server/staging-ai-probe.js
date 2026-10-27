'use strict';
// Operator opt-in only: two fixed synthetic generation requests, no student data,
// no database writes, no credential/output-body logging, no public endpoint.
const {requestGemini}=require('./gemini-request'),{parseTeaching}=require('./teaching-json'),{providerError}=require('./ai-provider-error');
async function runStagingProbe(config,{env=process.env,fetchImpl=fetch,log=console.log}={}){
 if(env.AI_STAGING_PROBE!=='synthetic-teaching-v1')return;
 if(env.ITI_STAGING_ONLY!=='true'||env.GCLOUD_PROJECT!=='universal-iti-dk-staging'||config.provider!=='gemini'||!config.apiKey||!config.model){log('STAGING_AI_PROBE refused: isolated staging Gemini configuration required');return;}
 for(const type of ['theory','practical']){
  try{
   const r=await requestGemini(config,'This is a synthetic integration test. Return a short teaching draft matching the schema. Use no personal information.','Synthetic topic: electrical workshop safety. Three concise objectives, three steps and three questions. No institute or learner records are supplied.',type,fetchImpl);
   if(!r.ok){log('STAGING_AI_PROBE '+type+' FAIL '+await providerError(r));return;}
   const o=await r.json(),c=o.candidates?.[0];
   if(c?.finishReason!=='STOP')throw Error('Incomplete');
   parseTeaching((c.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''),type);
   log('STAGING_AI_PROBE '+type+' PASS: HTTP 200 and validated teaching JSON');
  }catch(e){log('STAGING_AI_PROBE '+type+' FAIL: incomplete, invalid or unavailable generation');return;}
 }
}
module.exports={runStagingProbe};
