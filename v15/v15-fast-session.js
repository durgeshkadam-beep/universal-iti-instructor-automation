/* V15 fast session + refresh continuity.
 * - Keeps the signed-in Google/Firebase session across refresh.
 * - Restores the last opened workspace tab.
 * - Loads Firestore sections in parallel instead of one-by-one.
 */
(function(V){
'use strict';
if(!V) return;

const LAST_ROLE='iti-v15-last-role';
const LAST_TAB='iti-v15-last-tab';
const REDIRECT_KEY='iti-v15-auth-redirect-pending';
let resumeRunning=false;

function removeResumeOverlay(){
  document.getElementById('v15ResumeOverlay')?.remove();
}
function showResumeOverlay(){
  if(document.getElementById('v15ResumeOverlay')) return;
  const d=document.createElement('div');
  d.id='v15ResumeOverlay';
  d.style.cssText='position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#f5f7fb;color:#0b2740;font-family:Inter,Arial,sans-serif';
  d.innerHTML='<div style="text-align:center;padding:28px"><div style="width:42px;height:42px;border:4px solid #dce5ec;border-top-color:#0b2740;border-radius:50%;margin:0 auto 16px;animation:v15spin .9s linear infinite"></div><b style="font-size:20px">Restoring your workspace…</b><div style="margin-top:8px;color:#667085">Secure session + latest Firebase records</div></div><style>@keyframes v15spin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(d);
}
function naturalRoll(a,b){
  return String(a?.roll??'').localeCompare(String(b?.roll??''),undefined,{numeric:true,sensitivity:'base'});
}
function sortTrainees(){
  if(Array.isArray(window.DATA?.trainees)) DATA.trainees.sort(naturalRoll);
}
function rememberTab(tab){
  if(tab) localStorage.setItem(LAST_TAB,String(tab));
}
function restoreTab(){
  const tab=localStorage.getItem(LAST_TAB);
  if(!tab) return;
  const btn=[...document.querySelectorAll('[data-tab]')].find(x=>x.getAttribute('data-tab')===tab && x.offsetParent!==null);
  if(btn) btn.click();
}

document.addEventListener('click',e=>{
  const b=e.target?.closest?.('[data-tab]');
  if(b?.dataset?.tab) rememberTab(b.dataset.tab);
},{capture:true});

// Parallel Firestore load: this is much faster than awaiting every collection in sequence.
V.loadStudent=async function(){
  const M=this.fb.M,tid=this.member.traineeId;
  if(!tid) throw new Error('Student account is not linked to a trainee record.');
  const jobs=[];
  jobs.push((async()=>{
    try{
      const t=await M.getDoc(M.doc(this.col('trainees'),this.esc(tid)));
      DATA.trainees=t.exists()?[t.data().data]:[];
      sortTrainees();
    }catch(e){ DATA.trainees=[]; }
  })());
  for(const s of this.publicSections()) if(this.arraySections.has(s)) jobs.push((async()=>{
    try{ DATA[s]=await this.arr(s); }catch(e){ DATA[s]=[]; }
  })());
  for(const s of ['attendance','marks','submissions']) if(this.mapSections.has(s)) jobs.push((async()=>{
    try{ DATA[s]=await this.map(s,tid); }catch(e){ DATA[s]={}; }
  })());
  for(const s of ['leaves','examAttempts','projects']) if(this.arraySections.has(s)) jobs.push((async()=>{
    try{ DATA[s]=await this.arr(s,{field:'data.traineeId',value:tid}); }catch(e){ DATA[s]=[]; }
  })());
  await Promise.all(jobs);
};

V.load=async function(role){
  const M=this.fb.M,z=await M.getDoc(this.ws());
  if(!z.exists()) throw new Error('Shared workspace is missing.');
  const w=z.data(),g=Array.isArray(DATA?.gallery)?DATA.gallery:[],u=Array.isArray(DATA?.users)?DATA.users:[];
  DATA=DATA||{};
  DATA.meta={...(DATA.meta||{}),...w,schemaVersion:15,appVersion:'V15'};
  delete DATA.meta.ownerUid; delete DATA.meta.arraySections; delete DATA.meta.mapSections;
  DATA.gallery=g; DATA.users=u;
  this.arraySections=new Set(w.arraySections||[]);
  this.mapSections=new Set(w.mapSections||[]);
  if(role==='student'){
    await this.loadStudent();
  }else{
    const arrs=[...this.arraySections].filter(s=>s!=='gallery');
    const maps=[...this.mapSections];
    const [aa,mm]=await Promise.all([
      Promise.all(arrs.map(async s=>[s,await this.arr(s)])),
      Promise.all(maps.map(async s=>[s,await this.map(s)]))
    ]);
    aa.forEach(([s,v])=>{DATA[s]=v;});
    mm.forEach(([s,v])=>{DATA[s]=v;});
    sortTrainees();
  }
  this.suppressLocalSync=true;
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA)); }
  finally{ this.suppressLocalSync=false; }
};

// When auto-resuming, reuse Firebase's persisted user instead of opening Google again.
const googleBase=V.google.bind(V);
V.google=async function(promptUser=true){
  if(this._silentResume && this.fb?.auth?.currentUser){
    this.fb.user=this.fb.auth.currentUser;
    return this.fb.user;
  }
  return googleBase(promptUser);
};

const loginBase=V.login.bind(V);
V.login=async function(role){
  role=role||'instructor';
  const r=await loginBase(role);
  if(this.ready){
    localStorage.setItem(LAST_ROLE,role);
    setTimeout(()=>{ restoreTab(); removeResumeOverlay(); },80);
  }else if(!this._silentResume){
    removeResumeOverlay();
  }
  return r;
};

const logoutBase=V.logout?.bind(V);
if(logoutBase){
  V.logout=async function(){
    localStorage.removeItem(LAST_ROLE);
    localStorage.removeItem(LAST_TAB);
    removeResumeOverlay();
    return logoutBase();
  };
}

async function persistedUser(){
  const M=await V.modules(),cfg=V.config();
  let app=M.getApps().find(x=>x.name==='iti-v15');
  if(!app) app=M.initializeApp(cfg,'iti-v15');
  const auth=M.getAuth(app);
  await M.setPersistence(auth,M.browserLocalPersistence);
  if(typeof auth.authStateReady==='function') await auth.authStateReady();
  else await new Promise(resolve=>{
    let done=false;
    const un=M.onAuthStateChanged(auth,()=>{if(done)return;done=true;try{un();}catch(e){}resolve();});
    setTimeout(()=>{if(!done){done=true;try{un();}catch(e){}resolve();}},2500);
  });
  const user=auth.currentUser;
  V.fb={M,app,auth,db:M.getFirestore(app),user};
  return user;
}

async function autoResume(){
  if(resumeRunning||V.ready) return;
  // Google redirect return is handled by v15-mobile-auth.js.
  if(sessionStorage.getItem(REDIRECT_KEY)==='1') return;
  const role=localStorage.getItem(LAST_ROLE) || window.SESSION?.role || '';
  if(!role) return;
  resumeRunning=true;
  showResumeOverlay();
  try{
    const user=await persistedUser();
    if(!user){ removeResumeOverlay(); return; }
    const sel=document.getElementById('loginRole'); if(sel) sel.value=role;
    V.loginMsg?.('Restoring secure session…');
    V._silentResume=true;
    await V.login(role);
  }catch(e){
    console.warn('V15 auto-resume',e);
    removeResumeOverlay();
  }finally{
    V._silentResume=false;
    resumeRunning=false;
  }
}

setTimeout(autoResume,80);
console.info('V15 fast session/refresh continuity active.');
})(window.V15Sync);
