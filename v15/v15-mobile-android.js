/* Universal ITI FINAL — Mobile/Android production pass
 * Fixes stale Google redirect login state, blank More menu, cramped top bar,
 * and gives the phone layout a native Android/Material-style shell.
 */
(function(V){
'use strict';
if(!V||!window.App)return;

const REDIRECT_KEY='iti-v15-redirect-v2';
const TAB_KEY='iti-v15-tab-v2';
const ICONS={
  dashboard:'🏠','admin-console':'⚙️',users:'👥',notices:'🔔','record-formats':'🗂️',inspection:'🛡️',reports:'📊',
  'ai-assistant':'✨','syllabus-ai':'🤖',modules:'🧩',trainees:'👥',attendance:'✅',practicals:'🛠️',theory:'📘',splitup:'🗓️',
  evaluation:'📝',leave:'🩺',exams:'📋',ojt:'🏭',gallery:'🖼️',activities:'🏆',cloud:'☁️'
};
const SHORT={
  dashboard:'Home','admin-console':'Admin',users:'Staff',notices:'Notices','record-formats':'Records',inspection:'Inspect',reports:'Reports',
  'ai-assistant':'AI','syllabus-ai':'Syllabus',modules:'Modules',trainees:'Trainees',attendance:'Attendance',practicals:'Practical',theory:'Theory',splitup:'Calendar',
  evaluation:'Marks',leave:'Leave',exams:'Tests',ojt:'OJT',gallery:'Gallery',activities:'Activity',cloud:'Cloud'
};
const PRIMARY={
  admin:['admin-console'],
  principal:['dashboard','users','notices','reports'],
  instructor:['dashboard','trainees','attendance','practicals'],
  staff:['dashboard','notices','record-formats','reports'],
  student:['dashboard','attendance','practicals','evaluation']
};
function role(){try{return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}}
function currentTab(){return localStorage.getItem(TAB_KEY)||document.querySelector('#tabs .tab.active')?.dataset.tab||'dashboard';}
function isPhone(){return window.matchMedia?.('(max-width:760px)')?.matches||window.innerWidth<=760;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function tabButtons(){return [...document.querySelectorAll('#tabs .tab[data-tab]')].filter(b=>b.style.display!=='none');}
function titleOf(b){return (b.textContent||'').replace(/^\s*\S+\s*/,'').trim()||SHORT[b.dataset.tab]||b.dataset.tab;}
function iconOf(name,b){const raw=(b?.textContent||'').trim().split(/\s+/)[0]||'';return /[^A-Za-z0-9]/.test(raw)?raw:(ICONS[name]||'•');}

function makeBottomButton(src,name,more=false){
  const b=document.createElement('button');b.type='button';b.dataset.tab=name;b.className=more?'more':'';
  const icon=more?'☰':iconOf(name,src),label=more?'More':(SHORT[name]||titleOf(src));
  b.innerHTML=`<span class="mn-icon">${esc(icon)}</span><span>${esc(label)}</span>`;
  if(more){b.removeAttribute('data-tab');b.addEventListener('click',e=>{e.preventDefault();App.openMobileMore();});}
  else b.addEventListener('click',e=>{e.preventDefault();App.closeMobileMore();App.switchTab(name);});
  return b;
}
function makeSheetButton(src){
  const name=src.dataset.tab,b=document.createElement('button');b.type='button';b.dataset.tab=name;
  b.innerHTML=`<span class="more-icon">${esc(iconOf(name,src))}</span><span>${esc(titleOf(src))}</span>`;
  b.addEventListener('click',e=>{e.preventDefault();App.closeMobileMore();App.switchTab(name);});return b;
}

App.openMobileMore=function(){const s=document.getElementById('mobileMoreSheet');if(!s)return;s.classList.add('open');s.setAttribute('aria-hidden','false');document.body.classList.add('mobile-sheet-open');};
App.closeMobileMore=function(){const s=document.getElementById('mobileMoreSheet');if(!s)return;s.classList.remove('open');s.setAttribute('aria-hidden','true');document.body.classList.remove('mobile-sheet-open');};
App.buildMobileNav=function(){
  const nav=document.getElementById('mobileNav'),grid=document.getElementById('mobileMoreGrid');if(!nav||!grid)return;
  nav.innerHTML='';grid.innerHTML='';
  const r=role(),all=tabButtons();if(!r||!all.length){nav.style.display='none';return;}
  const preferred=PRIMARY[r]||['dashboard'];
  const primary=preferred.map(n=>all.find(x=>x.dataset.tab===n)).filter(Boolean);
  if(!primary.length&&all[0])primary.push(all[0]);
  primary.slice(0,4).forEach(src=>nav.appendChild(makeBottomButton(src,src.dataset.tab,false)));
  const used=new Set(primary.slice(0,4).map(x=>x.dataset.tab)),extra=all.filter(x=>!used.has(x.dataset.tab));
  extra.forEach(src=>grid.appendChild(makeSheetButton(src)));
  if(extra.length)nav.appendChild(makeBottomButton(null,'',true));
  nav.style.gridTemplateColumns=`repeat(${Math.max(1,nav.children.length)},1fr)`;
  const active=currentTab();nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));grid.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));
};

// Keep active state/mobile menu synchronized after the V15 final router changes page.
const openBase=V.finalOpenTab?.bind(V);
if(openBase)V.finalOpenTab=async function(name){const out=await openBase(name);setTimeout(()=>App.buildMobileNav(),0);return out;};

// Clear a stale redirect marker. This marker can survive a cancelled/blocked mobile Google redirect
// and otherwise makes auto-resume show "No saved Google session" before the user presses Login.
function clearStaleLoginMessage(){
  const st=document.getElementById('v15LoginStatus'),txt=(st?.textContent||'').trim();
  if(/No saved Google session/i.test(txt)){try{localStorage.removeItem(REDIRECT_KEY);}catch(e){}if(st){st.textContent='';st.style.display='none';st.className='callout';}}
}
const startBase=V.startRoleLogin?.bind(V);
if(startBase)V.startRoleLogin=async function(){try{localStorage.removeItem(REDIRECT_KEY);}catch(e){}clearStaleLoginMessage();return startBase();};
const msgBase=V.loginMsg?.bind(V);
if(msgBase)V.loginMsg=function(t,err=false){
  // Passive restore should never paint a scary red error on a fresh login screen.
  if(/No saved Google session/i.test(String(t||''))&&document.getElementById('loginScreen')?.style.display!=='none'){
    try{localStorage.removeItem(REDIRECT_KEY);}catch(e){}return msgBase('',false);
  }
  return msgBase(t,err);
};

function injectStyle(){if(document.getElementById('v15AndroidMobileStyle'))return;const s=document.createElement('style');s.id='v15AndroidMobileStyle';s.textContent=`
@media(max-width:760px){
  :root{--android-bg:#f7f9fc;--android-card:#fff;--android-line:#e6ebf0;--android-primary:#0f766e;--android-navy:#0b2c45}
  html,body{background:var(--android-bg)!important;overscroll-behavior-y:none}
  body{padding-bottom:86px!important}
  body.mobile-sheet-open{overflow:hidden}
  #appShell{min-height:100dvh}
  .topbar{position:sticky!important;top:0!important;z-index:900!important;height:64px!important;min-height:64px!important;padding:0 14px!important;background:rgba(255,255,255,.97)!important;backdrop-filter:blur(18px);border-bottom:1px solid var(--android-line)!important;box-shadow:0 2px 12px rgba(20,38,55,.055)!important;overflow:visible!important;flex-wrap:nowrap!important}
  .topbar::before{display:none!important}
  .brand{gap:10px!important;min-width:0;flex:1}
  .brand img{width:38px!important;height:38px!important;object-fit:contain;background:#fff;border-radius:10px}
  .brand-text{min-width:0}.brand-text strong{font-size:.94rem!important;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#132f46}.brand-text small{display:none!important}
  .topbar .who{width:auto!important;min-width:auto!important;flex:0 0 auto!important;gap:6px!important;flex-wrap:nowrap!important;justify-content:flex-end!important}
  .topbar #whoName,#v15FinalWorkspaceSwitcher,#v15WorkspaceSwitcher{display:none!important}
  .topbar .who .btn{width:40px;height:40px;min-height:40px!important;padding:0!important;border-radius:12px!important;font-size:0!important;background:#f1f5f8!important;border:1px solid #e3e9ee!important;color:#1f394e!important;display:grid;place-items:center}
  .topbar .who .btn[onclick*="logout"],.topbar .who .btn:last-child{font-size:0!important}.topbar .who .btn[onclick*="logout"]::before,.topbar .who .btn:last-child::before{content:'↪';font-size:1.25rem;font-weight:800;transform:rotate(180deg)}
  main{padding:14px 12px 28px!important;max-width:none!important}
  .panel{padding:0!important}
  .hero{border-radius:22px!important;padding:20px 18px!important;margin:0 0 12px!important;background:linear-gradient(145deg,#0c334e,#0f766e)!important;box-shadow:0 12px 28px rgba(15,70,85,.13)!important}
  .hero h2{font-size:1.24rem!important;line-height:1.25}.hero p{font-size:.82rem!important;line-height:1.5!important}
  .cards{grid-template-columns:1fr!important;gap:10px!important;margin-bottom:10px!important}
  .card{border-radius:20px!important;padding:16px!important;margin-bottom:10px!important;border:1px solid var(--android-line)!important;box-shadow:0 3px 14px rgba(24,45,63,.045)!important;background:var(--android-card)!important}
  .card:hover{transform:none!important}.card h3{font-size:1rem!important;margin-bottom:10px}
  .profile-card{border-radius:20px!important;padding:16px!important;box-shadow:0 3px 14px rgba(24,45,63,.045)!important}
  .field{margin-bottom:14px!important}.field label{font-size:.72rem!important;letter-spacing:.05em!important;margin-bottom:7px!important}
  input,select,textarea,.field input,.field select,.field textarea{font-size:16px!important;min-height:48px!important;border-radius:14px!important;padding:11px 13px!important;background:#fff!important}
  .btn{min-height:46px!important;border-radius:14px!important;padding:10px 15px!important}.btn.primary{background:linear-gradient(135deg,#0f766e,#0d8a7d)!important}
  .table-wrap,.table-scroll{overflow-x:auto!important;-webkit-overflow-scrolling:touch;border-radius:15px!important}
  table{min-width:max-content}table.datatable{font-size:.76rem!important}
  .mobile-nav{display:grid!important;position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:1050!important;border:0!important;border-top:1px solid #dfe6ec!important;border-radius:0!important;background:rgba(255,255,255,.985)!important;backdrop-filter:blur(20px)!important;box-shadow:0 -5px 22px rgba(20,40,58,.10)!important;padding:5px 6px calc(5px + env(safe-area-inset-bottom))!important;gap:2px!important}
  .mobile-nav button{min-height:58px!important;padding:5px 2px!important;border-radius:14px!important;font-size:.66rem!important;font-weight:700!important;color:#687887!important;gap:3px!important}
  .mobile-nav button .mn-icon{font-size:1.28rem!important}.mobile-nav button.active{background:#e8f5f3!important;color:#0b6b64!important;box-shadow:none!important}.mobile-nav button.more.active{background:#eef3f6!important;color:#244158!important}
  .mobile-more-sheet{z-index:1200!important}.mobile-sheet-backdrop{background:rgba(7,22,34,.48)!important;backdrop-filter:blur(2px)}
  .mobile-sheet-panel{max-height:82dvh!important;border-radius:28px 28px 0 0!important;background:#f8fafc!important;padding:9px 14px calc(20px + env(safe-area-inset-bottom))!important;box-shadow:0 -18px 50px rgba(7,25,38,.22)!important}
  .mobile-sheet-head{padding:3px 3px 14px!important}.mobile-sheet-head b{font-size:1.15rem!important;color:#17364d!important}.mobile-sheet-head small{font-size:.82rem!important}
  .mobile-more-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important}
  .mobile-more-grid button{min-height:88px!important;border-radius:18px!important;border:1px solid #e1e7ec!important;background:#fff!important;color:#253d50!important;font-size:.72rem!important;font-weight:700!important;box-shadow:0 3px 12px rgba(20,42,60,.05)!important;padding:11px 6px!important}
  .mobile-more-grid button .more-icon{font-size:1.45rem!important}.mobile-more-grid button.active{background:#e9f6f4!important;border-color:#b8ddd8!important;color:#0d6e67!important}
  #loginScreen.login-wrap{min-height:100dvh!important;padding:20px 16px!important;background:linear-gradient(155deg,#06263d 0%,#0a5962 100%)!important;align-items:center!important}
  #loginScreen .login-card{max-width:440px!important;border-radius:28px!important;padding:26px 22px 24px!important;box-shadow:0 22px 60px rgba(0,0,0,.25)!important}
  #loginScreen .login-card>img{width:76px!important;border-radius:20px!important}
  #loginScreen .login-title{font-size:1.55rem!important;line-height:1.25!important;margin-top:10px!important}
  #loginScreen .login-sub{font-size:.9rem!important;margin-bottom:24px!important}
  #loginScreen #v15AuthHelp{border-radius:16px!important;padding:12px 14px!important;font-size:.84rem!important;line-height:1.45!important;background:#f3f8fa!important}
  #loginScreen #v15LoginStatus{border-radius:16px!important;padding:12px 14px!important;font-size:.84rem!important;line-height:1.45!important}
  #loginScreen .developer-credit-login{border-radius:18px!important;margin-top:14px!important;padding:12px!important}
}
@media(max-width:390px){.mobile-more-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.brand-text strong{font-size:.86rem!important}}
`;
document.head.appendChild(s);}

injectStyle();
window.addEventListener('resize',()=>{if(isPhone())App.buildMobileNav();},{passive:true});
window.addEventListener('pageshow',()=>{setTimeout(()=>{clearStaleLoginMessage();if(V.ready)App.buildMobileNav();},80);});
setTimeout(()=>{clearStaleLoginMessage();if(V.ready)App.buildMobileNav();},250);
console.info('Universal ITI FINAL mobile Android shell active.');
})(window.V15Sync);
