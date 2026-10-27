'use strict';
const {providerSchema}=require('./teaching-json');
const {setTimeout:delay}=require('node:timers/promises');
function restSchema(type){
 const clean=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!['maxLength','additionalProperties'].includes(k)).map(([k,v])=>[k,k==='type'&&typeof v==='string'?v.toUpperCase():Array.isArray(v)?v.map(x=>x&&typeof x==='object'?clean(x):x):v&&typeof v==='object'?clean(v):v]));
 return clean(providerSchema(type));
}
function geminiBody(system,input,type){
 const detail=type==='practical'?'Prepare a complete instructor demonstration, not a summary. Use a sensible topic-specific sequence: preparation and safety checks, instructor demonstration, trainee practice, verification and cleanup where relevant. Aim for 6–10 substantive procedure rows when the topic warrants them. Each row must explain what to do, its specific key point or safety precaution, and what to show as a spot hint. Do not pad the plan with repeated generic rows.':type==='theory'?'Follow the teaching phases Preparation / Introduction, Presentation / Development, Application / Recapitulation, and Consolidation / Checking. Give actual topic-specific information and a chalkboard or visual hint for each phase. Include usable review, motivation, summary and assignment.':'';
 const instruction=system+(type?'\nReturn ONLY valid JSON matching this server-owned schema. '+detail+' Keep objectives and questions concise, but give enough detail to teach each procedure or concept. The application supplies the institute, instructor, title and schedule header; never invent those fields. No markdown fences. Schema: '+JSON.stringify(providerSchema(type)):'');
 return {systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens:type?4096:2000,...(type?{responseMimeType:'application/json'}:{})}};
}
async function requestGemini(config,system,input,type,fetchImpl=fetch,pause=signal=>delay(2000,undefined,{signal})){
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
 // One retry for an explicit transient 503, within the original total deadline.
 // Never retry quota, access, malformed-output or ambiguous network failures.
 const signal=AbortSignal.timeout(45000),options={method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},signal,body:JSON.stringify(geminiBody(system,input,type))};
 const response=await fetchImpl(url,options);
 if(response.status!==503||signal.aborted)return response;
 try{await response.body?.cancel();}catch{}
 await pause(signal);signal.throwIfAborted();
 return fetchImpl(url,options);
}
module.exports={geminiBody,requestGemini,restSchema};
