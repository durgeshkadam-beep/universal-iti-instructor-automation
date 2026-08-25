'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const controller=fs.readFileSync(path.join(root,'v15/v15-final-controller.js'),'utf8');
const PANEL_NAMES=['admin-console','dashboard','users','notices','record-formats','inspection','reports','ai-assistant','syllabus-ai','modules','trainees','attendance','practicals','theory','splitup','evaluation','leave','exams','ojt','gallery','activities','cloud'];
const EXPECTED={admin:1,principal:6,instructor:20,staff:4,student:11};
let failures=0;
function ok(cond,msg){if(cond)console.log('PASS',msg);else{console.error('FAIL',msg);failures++;}}
function html(){return `<!doctype html><html><head></head><body><div id="loginScreen"></div><div id="appShell"><header class="topbar"><div class="brand"><div class="brand-text"><strong>Universal ITI</strong><small>Institute</small></div></div><div class="who"><div class="old-trade"><span>Trade:</span><select><option>DTP</option></select></div><div id="v15WorkspaceSwitcher"><span>Trade:</span><select><option>DTP</option></select></div><span id="whoName"></span><button id="changePinBtn">Change PIN</button><button id="logoutBtn">Logout</button></div></header><nav id="tabs" class="tabs"><div class="sidebar-caption"><span>Workspace</span><small>Instructor Automation • V13</small></div>${PANEL_NAMES.map((n,i)=>`<button class="tab${i===1?' active':''}" data-tab="${n}">${n}</button>`).join('')}</nav><nav id="mobileNav"></nav><div id="mobileMoreGrid"></div><main id="main">${PANEL_NAMES.map(n=>`<section id="tab-${n}" class="panel${n==='dashboard'?' active':''}">${n==='attendance'?'<div class="card"><h3>Monthly Attendance Submission</h3></div><div class="card"><h3>Monthly Attendance Submission</h3></div>':''}</section>`).join('')}</main></div></body></html>`;}
async function build(r){
  const dom=new JSDOM(html(),{url:'https://example.test/final/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'';w.DATA={meta:{trade:'DTP',session:'2026-27',batch:'A'},trainees:[{id:'t1',name:'Student'}],attendance:{},practicals:[],theory:[],notices:[],leaves:[],exams:[]};
  w.Dashboard={render(){}};w.Trainees={render(){}};w.Attendance={loadDay(){}};w.Practicals={render(){}};w.Theory={render(){}};w.Schedule={render(){}};w.Evaluation={populateSelects(){},render(){}};w.Notices={render(){}};w.Leave={populateSelects(){},render(){}};w.Gallery={render(){}};w.ExtraTopics={render(){}};w.Activities={render(){}};w.Reports={populateSelects(){},renderSignatures(){}};w.Inspection={render(){}};w.ModuleManager={refresh(){}};w.InstructorAI={refreshTopicPicker(){},renderToday(){}};
  w.App={buildMobileNav(){},switchTab(){throw new Error('legacy switchTab must not own final navigation');}};
  const calls={principalStaff:0};
  const V={ready:true,sessionRole:r,currentRole:()=>r,currentSession:()=>({role:r,name:'TEST USER'}),member:{owner:r==='admin',displayName:'TEST USER',workspaceIds:['w1','w2']},workspaceId:'w1',fb:{user:{displayName:'TEST USER'}},
    listTradeWorkspaces:async()=>[{id:'w1',trade:'DTP',session:'2026-27',batch:'A'},{id:'w2',trade:'COPA',session:'2026-27',batch:'A'}],switchWorkspace:async wid=>{V.workspaceId=wid;},getAttendanceLock:async()=>null,submitAttendanceMonth:async()=>{},
    renderAdminPanel:async()=>{w.document.getElementById('tab-admin-console').innerHTML='<h2>Admin</h2>';},renderPrincipalDashboard:async()=>{w.document.getElementById('tab-dashboard').innerHTML='<h2>Principal</h2>';},renderPrincipalStaff:async()=>{calls.principalStaff++;w.document.getElementById('tab-users').innerHTML='<h2>Staff & Access</h2>';},renderPrincipalNotices:async()=>{},renderPrincipalInspection:async()=>{},renderPrincipalReports:async()=>{},renderStaffDashboard:()=>{},renderStudentDashboard:()=>{},getInstituteNotices:async()=>[],sanitizeStudent:()=>{},injectInstituteNotices:async()=>{},injectGalleryCloud:async()=>{},cloudUI:()=>{}};
  w.V15Sync=V;w.eval(controller);return {dom,w,V,calls};
}
(async()=>{
  for(const r of Object.keys(EXPECTED)){
    const {w,V,calls}=await build(r);await V.applyRolePortal();
    const tabs=[...w.document.querySelectorAll('#tabs .tab')];
    ok(tabs.length===EXPECTED[r],`${r}: exact role menu count ${EXPECTED[r]}`);
    ok((w.document.getElementById('tabs').dataset.v15FinalFooter||'').includes('V15 FINAL'),`${r}: V13 footer replaced`);
    ok(!/V13/.test(w.document.getElementById('tabs').dataset.v15FinalFooter||''),`${r}: no V13 role footer`);
    for(const b of tabs){await V.finalOpenTab(b.dataset.tab);ok(w.document.getElementById('tab-'+b.dataset.tab)?.classList.contains('active'),`${r}: ${b.dataset.tab} opens active panel`);}
    if(r==='principal'){await V.finalOpenTab('users');ok(calls.principalStaff>0,'principal: Staff & Access renderer executed');ok(/Staff & Access/.test(w.document.getElementById('tab-users').textContent),'principal: Staff & Access visible');}
    if(r==='instructor'){
      await V.applyRolePortal();await V.finalOpenTab('attendance');await V.finalOpenTab('attendance');
      ok(w.document.querySelectorAll('#v15FinalWorkspaceSwitcher').length===1,'instructor: exactly one Trade selector');
      const cards=[...w.document.querySelectorAll('#tab-attendance .card')].filter(x=>/Monthly Attendance Submission/i.test(x.textContent));
      ok(cards.length===1,'instructor: exactly one Monthly Attendance Submission card');
    }else ok(w.document.querySelectorAll('#v15FinalWorkspaceSwitcher').length===0,`${r}: no Instructor Trade selector`);
    w.close();
  }
  if(failures){console.error(`\n${failures} DOM smoke test(s) failed.`);process.exit(1);}console.log('\nAll Universal ITI FINAL DOM smoke tests passed.');
})().catch(e=>{console.error(e);process.exit(1);});