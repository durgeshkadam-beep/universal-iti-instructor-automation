const assert=require('node:assert/strict');
global.window={ITI_RUNTIME:{apiUrl:'https://api.example.test'},V15Sync:{backendRequest:async body=>{assert.equal(body.action,'ai');assert.equal(body.task,'teaching');assert.equal(body.consent,true);return {mode:'ai-draft',text:'{"ok":true}'};}}};
global.V15Sync=window.V15Sync;global.confirm=()=>true;
global.document={getElementById(){return null},addEventListener(){}};
const {InstructorAI}=require('../ai.js');
(async()=>{assert.deepEqual(await InstructorAI.geminiJSON('test',{type:'object'}),{ok:true});console.log('PASS teacher AI uses authenticated backend, no browser key.');})().catch(e=>{console.error(e);process.exitCode=1;});
