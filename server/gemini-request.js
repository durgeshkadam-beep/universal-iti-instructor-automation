'use strict';
const {providerSchema}=require('./teaching-json');
function restSchema(type){
 const clean=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!['maxLength','additionalProperties'].includes(k)).map(([k,v])=>[k,k==='type'&&typeof v==='string'?v.toUpperCase():Array.isArray(v)?v.map(x=>x&&typeof x==='object'?clean(x):x):v&&typeof v==='object'?clean(v):v]));
 return clean(providerSchema(type));
}
function geminiBody(system,input,type){
 const instruction=system+(type?'\nReturn ONLY valid JSON matching this server-owned schema. Keep objectives, steps and questions concise. No markdown fences. Schema: '+JSON.stringify(providerSchema(type)):'');
 return {systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens:type?4096:2000,...(type?{responseMimeType:'application/json'}:{})}};
}
async function requestGemini(config,system,input,type,fetchImpl=fetch){
 return fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},signal:AbortSignal.timeout(45000),body:JSON.stringify(geminiBody(system,input,type))});
}
module.exports={geminiBody,requestGemini,restSchema};
