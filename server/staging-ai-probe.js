'use strict';
// Operator opt-in only: two fixed synthetic generation requests, no student data,
// no database writes, no credential/output-body logging, no public endpoint.
const {requestGemini}=require('./gemini-request'),{parseTeaching}=require('./teaching-json'),{providerError}=require('./ai-provider-error');
async function runStagingProbe(config,{env=process.env,fetchImpl=fetch,log=console.log}={}){
 if(!['synthetic-teaching-v1','synthetic-format-comparison-v1'].includes(env.AI_STAGING_PROBE))return;
 if(env.ITI_STAGING_ONLY!=='true'||env.GCLOUD_PROJECT!=='universal-iti-dk-staging'||config.provider!=='gemini'||!config.apiKey||!config.model){log('STAGING_AI_PROBE refused: isolated staging Gemini configuration required');return;}
 if(env.AI_STAGING_PROBE==='synthetic-format-comparison-v1'){
  for(const mode of ['plain','legacy-json']){
   try{
    const generationConfig={maxOutputTokens:512,...(mode==='legacy-json'?{responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{ok:{type:'BOOLEAN'}},required:['ok']}}:{})};
    const r=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},signal:AbortSignal.timeout(45000),body:JSON.stringify({contents:[{role:'user',parts:[{text:mode==='plain'?'Synthetic test: reply with OK.':'Synthetic test: return the JSON object with ok set to true.'}]}],generationConfig})});
    if(!r.ok){log('STAGING_AI_PROBE '+mode+' FAIL '+await providerError(r));return;}
    const b=await r.json(),text=(b.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
    if(!text.trim()||(mode==='legacy-json'&&JSON.parse(text).ok!==true))throw Error('Invalid test response');
    log('STAGING_AI_PROBE '+mode+' PASS: HTTP 200 and fixed synthetic response checked');
   }catch(e){log('STAGING_AI_PROBE '+mode+' FAIL: incomplete or unavailable fixed synthetic response');return;}
  }
  return;
 }
 for(const type of ['theory','practical']){
  try{
   const r=await requestGemini(config,'This is a synthetic integration test. Return a short teaching draft matching the schema. Use no personal information.','Synthetic topic: electrical workshop safety. Three concise objectives, three steps and three questions. No institute or learner records are supplied.',type,fetchImpl);
   if(!r.ok){
    let detail='';
    // Only this operator's fixed synthetic request can emit a redacted diagnostic.
    // Never use this diagnostic path for user prompts or normal API requests.
    try{const b=await r.clone().json();detail=String(b.error?.message||'').split(config.apiKey).join('[REDACTED]').replace(/https?:\/\/[^\s]+/g,'[URL]').replace(/[A-Za-z0-9_-]{32,}/g,'[REDACTED]').slice(0,500);}catch(e){}
    log('STAGING_AI_PROBE '+type+' FAIL '+await providerError(r)+(detail?' | synthetic diagnostic: '+detail:''));return;
   }
   const o=await r.json(),c=o.candidates?.[0];
   if(c?.finishReason!=='STOP')throw Error('Incomplete');
   parseTeaching((c.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''),type);
   log('STAGING_AI_PROBE '+type+' PASS: HTTP 200 and validated teaching JSON');
  }catch(e){log('STAGING_AI_PROBE '+type+' FAIL: incomplete, invalid or unavailable generation');return;}
 }
}
module.exports={runStagingProbe};
