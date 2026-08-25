'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const polish=fs.readFileSync(path.join(root,'v15/v15-final-polish.js'),'utf8');
const workspaces=fs.readFileSync(path.join(root,'v15/v15-workspaces-v2.js'),'utf8');
let fail=0;
function ok(v,m){if(v)console.log('PASS',m);else{console.error('FAIL',m);fail++;}}

(async()=>{
  // Regression 1: Principal Staff & Access must render even when window.SESSION is absent,
  // as happens after Firebase restores V15's authoritative session before the legacy shell catches up.
  const dom=new JSDOM('<!doctype html><html><body><section id="tab-users"></section></body></html>',{runScripts:'outside-only',url:'https://example.test/final/'});
  const w=dom.window;w.console=console;w.SESSION=null;w.__V15_SESSION=null;
  let openSawRole='';
  const V={
    currentRole:()=> 'principal',currentSession:()=>({role:'principal',name:'Principal Test'}),sessionRole:'principal',session:null,
    finalOpenTab:async()=>{openSawRole=w.SESSION?.role||'';return true;},applyRolePortal:async()=>true,
    listTradeWorkspaces:async()=>[{id:'dtp',trade:'DTP',session:'2026-27',batch:'A'},{id:'copa',trade:'COPA',session:'2026-27',batch:'A'}],
    accountDirectory:async()=>[{uid:'i1',email:'i1@gmail.com',displayName:'DTP Instructor',role:'instructor',workspaceIds:['dtp'],active:true}],
    createOrUpdateAccount:async()=>({updated:false,code:'123456'})
  };
  w.V15Sync=V;w.eval(polish);
  await V.renderPrincipalStaff();
  const txt=w.document.getElementById('tab-users').textContent;
  ok(/Staff & Access/.test(txt),'Principal Staff & Access renders without legacy window.SESSION');
  ok(w.document.querySelectorAll('#psWs option').length===3,'Principal Staff & Access lists both active Trade workspaces plus placeholder');
  ok(/DTP Instructor/.test(txt),'Principal Staff & Access shows active staff directory');
  w.SESSION=null;await V.finalOpenTab('users');
  ok(openSawRole==='principal','final navigation synchronizes authoritative V15 session before portal render');
  dom.window.close();

  // Regression 2: technical creator privileges must not leak all institute Trade workspaces
  // into Instructor mode. Only Admin/Principal are institute-wide; Instructor uses member.workspaceIds.
  ok(workspaces.includes("if(['admin','principal'].includes(r))"),'workspace engine grants institute-wide listing only to Admin/Principal roles');
  ok(!workspaces.includes("['admin','principal'].includes(role())||this.member?.owner"),'creator owner flag no longer bypasses Instructor workspace assignment');
  ok(workspaces.includes("const elevated=['admin','principal'].includes(role()),ids=elevated?null:(this.member?.workspaceIds||[])"),'workspace switching enforces assigned workspaceIds for Instructor/Staff/Student');
  ok(workspaces.includes("function role(){return V.currentRole?.()"),'workspace engine uses authoritative V15 role instead of window.SESSION only');

  if(fail){console.error(`\n${fail} final polish regression test(s) failed.`);process.exit(1);}console.log('\nAll final Principal/workspace polish regression tests passed.');
})().catch(e=>{console.error(e);process.exit(1);});
