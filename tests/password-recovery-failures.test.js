'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('password recovery hides account existence but reports provider outages and configuration errors',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://synthetic.example.test',runScripts:'outside-only'}),w=dom.window;let code;
 const M={getApps:()=>[{name:'iti-v15'}],getAuth:()=>({}),sendPasswordResetEmail:async()=>{if(code)throw Object.assign(Error('private provider details'),{code});}};
 w.ITI_RUNTIME={institutePasswordEnabled:true};w.V15Sync={showRoleLogin:()=>{},modules:async()=>M,config:()=>({})};
 try{w.eval(fs.readFileSync('v15/v15-institute-auth.js','utf8'));const V=w.V15Sync,normal=await V.requestInstitutePasswordReset('synthetic@example.in');code='auth/user-not-found';assert.equal(await V.requestInstitutePasswordReset('synthetic@example.in'),normal);
  for(code of ['auth/operation-not-allowed','auth/invalid-api-key','auth/network-request-failed','auth/too-many-requests','auth/internal-error'])await assert.rejects(V.requestInstitutePasswordReset('synthetic@example.in'),/temporarily unavailable/);
  await assert.rejects(V.requestInstitutePasswordReset('student@iti-staging.example.test'),/full email/);
 }finally{w.close();}
});
