'use strict';
const fs=require('node:fs');
const {createPrivateKey}=require('node:crypto');
const PROJECT='universal-iti-dk-staging';
const ORIGINS=new Set([`https://${PROJECT}.web.app`,`https://${PROJECT}.firebaseapp.com`]);

// Render has no Google workload identity by default. This opt-in deployment
// guard validates its mounted staging credential before opening a listener.
function validateStagingRuntime(env=process.env){
 const fail=message=>{throw Error('Staging configuration: '+message);};
 if(env.GCLOUD_PROJECT!==PROJECT||(env.GOOGLE_CLOUD_PROJECT&&env.GOOGLE_CLOUD_PROJECT!==PROJECT))fail('select the isolated staging project');
 if(env.FIRESTORE_EMULATOR_HOST||env.FIREBASE_AUTH_EMULATOR_HOST||env.FIREBASE_CONFIG)fail('remove emulator and alternate Firebase configuration');
 const origins=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!origins.length||origins.some(origin=>!ORIGINS.has(origin)))fail('allow only the staging HTTPS origins');
 if(!env.GOOGLE_APPLICATION_CREDENTIALS)fail('mount the staging service account as a secret file');
 let credential;
 try{credential=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));}
 catch{fail('the credential secret file is missing or invalid');}
 if(credential.type!=='service_account'||credential.project_id!==PROJECT||
    typeof credential.client_email!=='string'||!credential.client_email.endsWith('@'+PROJECT+'.iam.gserviceaccount.com'))fail('use a service account belonging to the staging project');
 try{const key=createPrivateKey(credential.private_key);if(key.asymmetricKeyType!=='rsa')fail('use a valid staging RSA credential');}
 catch{fail('the credential private key is invalid');}
 const provider=env.AI_PROVIDER||'none';
 if(!['none','gemini','ollama'].includes(provider))fail('unsupported AI provider');
 if(provider==='gemini'&&(!env.AI_MODEL||!env.AI_API_KEY))fail('configure the backend AI model and secret key');
 if(provider==='ollama'){
  let url;try{url=new URL(env.OLLAMA_URL);}catch{fail('configure the model server URL');}
  if(!env.AI_MODEL||!['https:','http:'].includes(url.protocol)||url.username||url.password)fail('configure the model server and model');
 }
 if(env.AI_DAILY_LIMIT&&(!/^[1-9]\d*$/.test(env.AI_DAILY_LIMIT)||Number(env.AI_DAILY_LIMIT)>1000))fail('AI daily limit must be 1–1000');
 return {projectId:PROJECT,origins,provider};
}
module.exports={validateStagingRuntime};
