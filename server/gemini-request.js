'use strict';
const {providerSchema}=require('./teaching-json');
function geminiBody(system,input,type){
 return {systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens:type?4096:2000,...(type?{responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:providerSchema(type)}}}:{})}};
}
async function requestGemini(config,system,input,type,fetchImpl=fetch){
 return fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},signal:AbortSignal.timeout(45000),body:JSON.stringify(geminiBody(system,input,type))});
}
module.exports={geminiBody,requestGemini};
