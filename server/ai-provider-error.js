'use strict';
// Never return/log provider bodies: they can contain request text or credential details.
async function providerError(response){
 const status=Number.isInteger(response.status)?response.status:0;
 let reason='';
 try{
  const body=await response.json();
  const allowed=new Set(['API_KEY_INVALID','API_KEY_EXPIRED','API_KEY_SERVICE_BLOCKED','API_KEY_HTTP_REFERRER_BLOCKED','SERVICE_DISABLED','BILLING_DISABLED','RATE_LIMIT_EXCEEDED']);
  for(const d of body?.error?.details||[])if(allowed.has(d?.reason)){reason=d.reason;break;}
 }catch(e){}
 const tag='AI provider HTTP '+(status||'unknown')+(reason?' / '+reason:'');
 if(status===429)return tag+': Gemini quota or rate limit reached. Wait for the provider quota to reset; paid billing was not enabled by this application.';
 if(status===401||status===403||reason.startsWith('API_KEY_'))return tag+': The server key or model access was rejected. Ask the administrator to check the backend secret and API restrictions.';
 if(status===404)return tag+': The configured model is unavailable for this key. Check the backend model setting.';
 if(status===400)return tag+': The provider rejected the request format or model configuration. No new draft was generated.';
 return tag+': The AI service is temporarily unavailable. Use guided mode or retry later.';
}
module.exports={providerError};
