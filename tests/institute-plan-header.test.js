'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),formats=app.slice(app.indexOf('const RecordFormats ='),app.indexOf('/* ===================== INSPECTION / INSTRUCTOR PROFILE'));
const auth=fs.readFileSync('v15/v15-auth-roles-v2.js','utf8'),read=auth.slice(auth.indexOf('V.instituteInfo='),auth.indexOf('\nV.showRoleLogin='));
function setup(meta={}){
 const V={INSTITUTE_ID:'synthetic',fb:{user:{uid:'u'},app:{options:{projectId:'synthetic-project'}}},inst:()=>({}),startupRead:async()=>({exists:()=>true,data:()=>({name:'Synthetic Institute',ownerUid:'private-owner',email:'private@example.test'})})};
 const c={window:{__ITI_V15:true,V15Sync:V},DATA:{meta,practicals:[{no:1,title:'Synthetic practical'}],theory:[]},SESSION:{role:'instructor',name:'Synthetic Instructor'},V};vm.createContext(c);vm.runInContext(read+formats+';this.formats=RecordFormats;',c);return c;
}
test('plan uses the authorised institute name when workspace metadata omits it',async()=>{
 const c=setup();await c.V.instituteInfo();assert.equal(c.formats.profile().institute,'Synthetic Institute');assert(c.formats.render('practical',1).includes('Synthetic Institute'));
 assert.deepEqual(Object.keys(c.V.instituteIdentity).sort(),['instituteId','name','projectId','uid']);assert.equal(c.DATA.meta.institute,undefined);
});
test('configured workspace name wins and whitespace falls back to the current institute',async()=>{
 const c=setup({institute:' Workspace Institute '});await c.V.instituteInfo();assert.equal(c.formats.profile().institute,'Workspace Institute');c.DATA.meta.institute='  ';assert.equal(c.formats.profile().institute,'Synthetic Institute');
});
test('a different account or institute cannot reuse a cached plan header',async()=>{
 for(const key of ['uid','institute','project']){const c=setup();await c.V.instituteInfo();if(key==='uid')c.V.fb.user.uid='other';else if(key==='project')c.V.fb.app.options.projectId='other';else c.V.INSTITUTE_ID='other';assert.equal(c.formats.profile().institute,'Institute not configured');}
});
test('late institute reads cannot overwrite the newly selected identity',async()=>{
 for(const key of ['uid','institute','project']){const c=setup();let finish;c.V.startupRead=()=>new Promise(resolve=>{finish=resolve;});const pending=c.V.instituteInfo();if(key==='uid')c.V.fb.user.uid='other';else if(key==='project')c.V.fb.app.options.projectId='other';else c.V.INSTITUTE_ID='other';finish({exists:()=>true,data:()=>({name:'Old institute'})});await pending;assert.equal(c.V.instituteIdentity,undefined);assert.equal(c.formats.profile().institute,'Institute not configured');}
});
test('missing institute data never substitutes a bundled DTPO identity',async()=>{
 const c=setup();c.V.startupRead=async()=>({exists:()=>false});await c.V.instituteInfo();assert.equal(c.formats.profile().institute,'Institute not configured');assert.equal(c.formats.profile().trade,'Trade not configured');
});

test('institute display name is escaped and cannot create active plan markup',async()=>{
 const c=setup();c.V.startupRead=async()=>({exists:()=>true,data:()=>({name:'<img src=x onerror=alert(1)>'})});await c.V.instituteInfo();const html=c.formats.render('practical',1);assert(html.includes('&lt;img'));assert(!html.includes('<img'));
});
