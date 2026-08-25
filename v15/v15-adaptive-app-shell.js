/* Universal ITI FINAL — Adaptive desktop + mobile app shell
 * Desktop keeps the full management workspace.
 * Phones get a dedicated Android/PWA shell while sharing the same V15 data/auth.
 */
(function(V){
'use strict';
if(!V||!window.App)return;
const PHONE='(max-width:760px)';
const LABEL={admin:'System Admin',principal:'Principal',instructor:'Instructor',staff:'Staff',student:'Student / Trainee'};
const PAGE={dashboard:'Home','admin-console':'System Admin',users:'Staff & Access',notices:'Notices','record-formats':'Record Formats',inspection:'Inspection',reports:'Reports','ai-assistant':'AI Assistant','syllabus-ai':'Syllabus AI',modules:'Modules',trainees:'Trainees',attendance:'Attendance',practicals:'Practicals',theory:'Theory',splitup:'Training Calendar',evaluation:'Evaluation',leave:'Leave & Discipline',exams:'Class Tests',ojt:'OJT & Projects',gallery:'Gallery',activities:'Activities',cloud:'Cloud & Drive'};
function phone(){return window.matchMedia?.(PHONE)?.matches||innerWidth<=760;}
function session(){try{return V.currentSession?.()||window.__V15_SESSION||window.SESSION||V.session||null;}catch(e){return null;}}
function role(){return V.currentRole?.()||session()?.role||'';}
function tab(){return localStorage.getItem('iti-v15-tab-v2')||document.querySelector('#tabs .tab.active')?.dataset.tab||'dashboard';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function initials(s){return String(s||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U';}
function currentWorkspace(){const w=V.workspaceId||'';const m=window.DATA?.meta||{};return {id:w,trade:m.trade||'',session:m.session||'',batch:m.batch||''};}
function workspaceLabel(){const w=currentWorkspace();return [w.trade,w.session,w.batch&&`Batch ${w.batch}`].filter(Boolean).join(' • ');}
function ensureShell(){
  const app=document.getElementById('appShell');if(!app)return;
  let bar=document.getElementById('v15MobileAppBar');
  if(!bar){
    bar=document.createElement('header');bar.id='v15MobileAppBar';bar.className='v15-mobile-appbar';
    bar.innerHTML='<div class="v15-appbar-brand"><img src="logo.png" alt=""><div><b id="v15MobilePageTitle">Home</b><small id="v15MobilePageSub"></small></div></div><div class="v15-appbar-actions"><button id="v15MobileAccount" type="button" aria-label="Account"></button><button id="v15MobileLogout" class="v15-power" type="button" aria-label="Logout" title="Logout">⏻</button></div>';
    const old=document.querySelector('#appShell > .topbar');old?.insertAdjacentElement('afterend',bar);
    bar.querySelector('#v15MobileAccount').onclick=()=>{App.openMobileMore?.();setTimeout(renderAccountCard,0);};
    bar.querySelector('#v15MobileLogout').onclick=logoutConfirm;
  }
  let strip=document.getElementById('v15MobileContext');
  if(!strip){strip=document.createElement('div');strip.id='v15MobileContext';strip.className='v15-mobile-context';bar.insertAdjacentElement('afterend',strip);}
}
function logoutConfirm(){
  const s=session();if(!confirm(`Sign out${s?.name?' '+s.name:''}?`))return;
  App.closeMobileMore?.();V.logout?.();
}
function updateShell(){
  ensureShell();if(!phone()||!V.ready)return;
  const s=session(),r=role(),name=tab(),bar=document.getElementById('v15MobileAppBar');if(!bar)return;
  const title=document.getElementById('v15MobilePageTitle'),sub=document.getElementById('v15MobilePageSub'),acct=document.getElementById('v15MobileAccount'),ctx=document.getElementById('v15MobileContext');
  if(title)title.textContent=PAGE[name]||'Universal ITI';
  if(sub)sub.textContent=LABEL[r]||r;
  if(acct){acct.textContent=initials(s?.name||V.member?.displayName||V.fb?.user?.email);acct.title=s?.name||'Account';}
  if(ctx){const wl=workspaceLabel();ctx.innerHTML=`<span class="v15-context-role">${esc(LABEL[r]||r)}</span>${wl?`<span class="v15-context-dot">•</span><span class="v15-context-trade">${esc(wl)}</span>`:''}`;ctx.style.display=(r==='instructor'||r==='staff'||r==='student')&&wl?'flex':'none';}
  renderAccountCard();
}
function renderAccountCard(){
  if(!phone())return;const panel=document.querySelector('#mobileMoreSheet .mobile-sheet-panel'),grid=document.getElementById('mobileMoreGrid');if(!panel||!grid)return;
  let box=document.getElementById('v15MobileAccountCard');
  if(!box){box=document.createElement('section');box.id='v15MobileAccountCard';box.className='v15-mobile-account-card';grid.insertAdjacentElement('beforebegin',box);}
  const s=session(),r=role(),wl=workspaceLabel();
  box.innerHTML=`<div class="v15-account-avatar">${esc(initials(s?.name||V.member?.displayName))}</div><div class="v15-account-copy"><b>${esc(s?.name||V.member?.displayName||'Signed in')}</b><span>${esc(LABEL[r]||r)}</span>${wl?`<small>${esc(wl)}</small>`:''}</div><button type="button" id="v15SheetLogout">Sign out</button>`;
  box.querySelector('#v15SheetLogout').onclick=logoutConfirm;
}
function relabelSheet(){const h=document.querySelector('.mobile-sheet-head b'),s=document.querySelector('.mobile-sheet-head small');if(h)h.textContent='More';if(s)s.textContent='Tools and account';}
function injectStyle(){if(document.getElementById('v15AdaptiveShellStyle'))return;const st=document.createElement('style');st.id='v15AdaptiveShellStyle';st.textContent=`
.v15-mobile-appbar,.v15-mobile-context{display:none}
@media(max-width:760px){
  html,body{width:100%;max-width:100%;overflow-x:hidden;background:#f5f7fa!important}
  body{padding-bottom:76px!important}
  #appShell>.topbar{display:none!important}
  .v15-mobile-appbar{height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1040;padding:0 12px;background:#fff;border-bottom:1px solid #e5eaf0;box-shadow:0 1px 8px rgba(15,35,50,.05)}
  .v15-appbar-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.v15-appbar-brand img{width:34px;height:34px;object-fit:contain;border-radius:10px}.v15-appbar-brand>div{min-width:0}.v15-appbar-brand b{display:block;font:700 1rem/1.15 Poppins,Inter,sans-serif;color:#123047;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v15-appbar-brand small{display:block;margin-top:2px;font-size:.69rem;color:#778493}
  .v15-appbar-actions{display:flex;align-items:center;gap:7px}.v15-appbar-actions button{border:0;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;cursor:pointer}.v15-appbar-actions #v15MobileAccount{background:#e7f4f2;color:#0f6f68;font:800 .73rem Poppins,sans-serif}.v15-power{background:#fff0ef!important;color:#a9362c!important;font-size:1.18rem!important}
  .v15-mobile-context{display:none;align-items:center;gap:6px;padding:7px 13px;background:#fff;border-bottom:1px solid #edf0f3;color:#627281;font-size:.71rem;white-space:nowrap;overflow:hidden}.v15-context-role{font-weight:700;color:#0e746c}.v15-context-trade{overflow:hidden;text-overflow:ellipsis}.v15-context-dot{color:#aeb8c0}
  #main{margin:0!important;padding:12px 10px 22px!important;width:100%!important;max-width:none!important}
  #main>.panel{width:100%;max-width:100%;overflow:visible}
  #main>.panel>.hero:first-child{padding:15px 16px!important;border-radius:18px!important;margin-bottom:10px!important;box-shadow:none!important;background:linear-gradient(135deg,#103b55,#0f766e)!important}
  #main>.panel>.hero:first-child .showcase-kicker{display:none!important}#main>.panel>.hero:first-child h2{font-size:1.06rem!important;margin-bottom:3px!important}#main>.panel>.hero:first-child p{font-size:.76rem!important;line-height:1.4!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .cards{display:grid!important;grid-template-columns:1fr!important;gap:9px!important}.card,.profile-card,.principal-stat,.format-card{border-radius:18px!important;border:1px solid #e6eaee!important;box-shadow:0 2px 9px rgba(19,42,58,.035)!important;background:#fff!important}
  .card{padding:14px!important;margin-bottom:9px!important}.card h3{font-size:.98rem!important}.card p,.muted{line-height:1.45}
  .profile-card{padding:14px!important;margin:9px 0!important}.profile-avatar{width:48px!important;height:48px!important}.profile-main h3{font-size:1rem!important}.profile-main p{font-size:.8rem!important}
  .field-row{gap:8px!important}.field input,.field select,.field textarea,.field-row input,.field-row select{min-height:46px!important;border-radius:13px!important;font-size:16px!important}.btn{min-height:44px!important;border-radius:13px!important}
  .table-wrap,.table-scroll{width:100%;max-width:100%;overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  .mobile-nav{left:0!important;right:0!important;bottom:0!important;border-radius:0!important;border:0!important;border-top:1px solid #dfe5ea!important;padding:4px 5px calc(4px + env(safe-area-inset-bottom))!important;background:#fff!important;box-shadow:0 -3px 14px rgba(20,40,55,.07)!important}.mobile-nav button{min-height:54px!important;border-radius:13px!important}.mobile-nav button.active{background:#e9f5f3!important;color:#0e746c!important;box-shadow:none!important}
  .mobile-sheet-panel{background:#f7f9fb!important;border-radius:26px 26px 0 0!important;padding:9px 12px calc(18px + env(safe-area-inset-bottom))!important}.mobile-more-grid{margin-top:10px!important}.v15-mobile-account-card{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e3e8ed;border-radius:18px;padding:12px;margin-bottom:10px;box-shadow:0 2px 10px rgba(20,42,58,.035)}.v15-account-avatar{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:#e7f4f2;color:#0e746c;font:800 .8rem Poppins,sans-serif;flex:0 0 auto}.v15-account-copy{min-width:0;flex:1}.v15-account-copy b,.v15-account-copy span,.v15-account-copy small{display:block}.v15-account-copy b{font-size:.87rem;color:#18354a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v15-account-copy span{font-size:.7rem;color:#0e746c;font-weight:700;margin-top:2px}.v15-account-copy small{font-size:.66rem;color:#788592;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v15-mobile-account-card button{border:0;border-radius:12px;background:#fff0ef;color:#a9362c;font-weight:800;font-size:.72rem;padding:10px 11px;white-space:nowrap}
  #loginScreen.login-wrap{padding:16px!important;align-items:center!important}#loginScreen .login-card{border-radius:24px!important;padding:24px 20px!important}#loginScreen .login-title{font-size:1.42rem!important}
}
@media(min-width:761px){#appShell>.topbar{display:flex}.v15-mobile-appbar,.v15-mobile-context{display:none!important}}
`;
document.head.appendChild(st);}
function refresh(){injectStyle();if(phone()&&V.ready){ensureShell();updateShell();relabelSheet();App.buildMobileNav?.();}else{document.getElementById('v15MobileAppBar')?.setAttribute('aria-hidden','true');}}
const openBase=V.finalOpenTab?.bind(V);if(openBase)V.finalOpenTab=async function(name){const x=await openBase(name);setTimeout(refresh,0);return x;};
const applyBase=V.applyRolePortal?.bind(V);if(applyBase)V.applyRolePortal=async function(){const x=await applyBase();setTimeout(refresh,0);return x;};
window.addEventListener('resize',()=>setTimeout(refresh,40),{passive:true});window.addEventListener('orientationchange',()=>setTimeout(refresh,120),{passive:true});window.addEventListener('pageshow',()=>setTimeout(refresh,80));
injectStyle();setTimeout(refresh,260);
console.info('Universal ITI FINAL adaptive desktop/mobile shell active.');
})(window.V15Sync);