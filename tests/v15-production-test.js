'use strict';
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const files=['v15/v15-auth-roles-v2.js','v15/v15-session-bridge.js','v15/v15-workspaces-v2.js','v15/v15-governance-v2.js','v15/v15-portals-v2.js','v15/v15-boot-final.js','v15/v15-role-enforcer.js','v15/sw.js'];
let failed=0;
function ok(cond,msg){if(cond)console.log('PASS',msg);else{console.error('FAIL',msg);failed++;}}
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
for(const f of files){ok(fs.existsSync(path.join(root,f)),`${f} exists`);try{cp.execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'});ok(true,`${f} JavaScript syntax`);}catch(e){console.error(String(e.stderr||e));ok(false,`${f} JavaScript syntax`);}}
const idx=text('v15/index.html'),recover=text('v15/recover.html'),sw=text('v15/sw.js');
for(const f of files.filter(x=>x!=='v15/sw.js'))ok(idx.includes(f),`V15 loader includes ${f}`);
ok(idx.indexOf('v15/v15-session-bridge.js')>idx.indexOf('v15/v15-auth-roles-v2.js'),'SESSION bridge loads after auth');
ok(idx.indexOf('v15/v15-role-enforcer.js')>idx.indexOf('v15/v15-portals-v2.js'),'role enforcer loads after role portals');
const old=['v15-mobile-auth.js','v15-fast-session.js','v15-authority-auth.js','v15-authority-final.js','v15-role-login.js','v15-role-matrix.js','v15-multitrade.js','v15-multitrade-hardening.js','v15-account-workspace-ux.js','v15-principal-login-stability.js','v15-auth-loop-fix.js'];
for(const f of old)ok(!idx.includes(f),`old patch not loaded: ${f}`);
const auth=text(files[0]),bridge=text(files[1]),ws=text(files[2]),gov=text(files[3]),portals=text(files[4]),boot=text(files[5]),enforcer=text(files[6]),rules=text('firestore.rules'),manifest=JSON.parse(text('v15/manifest.json'));
ok(auth.includes('signInWithRedirect')&&auth.includes('authStateReady'),'auth handles redirect + persisted session');
ok(auth.includes("OWNER_ROLES=new Set(['admin','principal','instructor'])"),'creator multi-role is explicit');
ok(bridge.includes("typeof SESSION!=='undefined'")&&bridge.includes('window.SESSION=s')&&bridge.includes('currentRole'),'legacy lexical SESSION is bridged into V15 role runtime');
ok(ws.includes('createTradeWorkspace')&&ws.includes("status:'active'"),'Trade/Session/Batch lifecycle exists');
ok(ws.includes('rebuildWorkspaceSummary')&&ws.includes('principalSummary'),'optimized Principal summary exists');
ok(gov.includes('iti-v15-opqueue-v2')&&gov.includes('flushQueue'),'durable offline operation queue exists');
ok(gov.includes('auditLog')&&gov.includes('recycleBin'),'audit + recycle governance exists');
ok(gov.includes('attendanceLocks')&&gov.includes('submitAttendanceMonth'),'attendance month approval workflow exists');
ok(gov.includes('traineeIndex')&&gov.includes('claimTraineeIdentity'),'institute trainee uniqueness index exists');
ok(gov.includes('syncGalleryToDrive')&&gov.includes('uploadDriveBlob'),'Drive gallery archive exists');
ok(portals.includes('Institute Notices')&&portals.includes('Institute Reports')&&portals.includes('Inspection & Compliance'),'Principal institute-wide portals exist');
ok(portals.includes("student:new Set(['dashboard','trainees','attendance'"),'Student least-privilege portal exists');
ok(enforcer.includes('ensureAdmin')&&enforcer.includes('Technical administration • V15')&&enforcer.includes('renderAdminPanel'),'final role UI enforcer can recover Admin menu/panel');
ok(idx.includes('Production 14')&&idx.includes("register('./sw.js?build=prod14'"),'V15 Production 14 registers dedicated worker');
ok(sw.includes("iti-v15-standalone-20260824-prod14")&&sw.includes('v15-session-bridge.js')&&sw.includes('v15-role-enforcer.js')&&sw.includes("req.destination==='document'"),'dedicated V15 worker caches bridge/enforcer and never HTML-fallbacks scripts');
ok(recover.includes('production-14')&&recover.includes('unregister()')&&recover.includes('caches.delete'),'one-click V15 cache recovery points to Production 14');
ok(boot.includes('ensureRolePortal'),'deterministic boot coordinator remains present');
for(const marker of ['match /auditLog/{auditId}','match /recycleBin/{recycleId}','match /traineeIndex/{identityId}','match /instituteNotices/{noticeId}','match /attendanceLocks/{month}','match /galleryCloud/{galleryId}'])ok(rules.includes(marker),`Firestore rule present: ${marker}`);
ok(rules.includes('allow delete: if false;'),'protected delete policy present');
ok(manifest.orientation==='any','PWA supports portrait and landscape');
if(failed){console.error(`\n${failed} V15 production test(s) failed.`);process.exit(1);}console.log('\nAll V15 production static/syntax tests passed.');
