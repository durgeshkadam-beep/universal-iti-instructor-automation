/* V15 mobile Google auth compatibility.
 * Mobile browsers and installed PWAs may block Firebase popup auth.
 * This layer uses redirect auth on mobile/standalone and automatically
 * resumes the selected role after Google returns to the app.
 */
(function(V){
'use strict';
if(!V) return;

const ROLE_KEY='iti-v15-pending-role';
const REDIRECT_KEY='iti-v15-auth-redirect-pending';

function isMobileLike(){
  try{
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'') ||
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone===true;
  }catch(e){ return false; }
}

V.google=async function(promptUser=true){
  const M=await this.modules(),cfg=this.config();
  let app=M.getApps().find(x=>x.name==='iti-v15');
  if(!app) app=M.initializeApp(cfg,'iti-v15');
  const auth=M.getAuth(app);
  await M.setPersistence(auth,M.browserLocalPersistence);
  const db=M.getFirestore(app);

  // Complete a previous signInWithRedirect() before deciding whether to prompt again.
  let redirectResult=null;
  try{ redirectResult=await M.getRedirectResult(auth); }
  catch(e){
    console.warn('V15 redirect result',e);
    sessionStorage.removeItem(REDIRECT_KEY);
    throw e;
  }

  let user=redirectResult?.user || auth.currentUser;
  this.fb={M,app,auth,db,user};

  // If Google just redirected back, continue without opening another account chooser.
  const returning=sessionStorage.getItem(REDIRECT_KEY)==='1';
  if(user && (returning || !promptUser)){
    sessionStorage.removeItem(REDIRECT_KEY);
    return user;
  }

  const provider=new M.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});

  // Mobile/PWA: redirect is more reliable than popup.
  if(isMobileLike()){
    sessionStorage.setItem(REDIRECT_KEY,'1');
    await M.signInWithRedirect(auth,provider);
    return await new Promise(()=>{}); // navigation takes over
  }

  // Desktop: keep popup UX, but fall back to redirect if the browser blocks it.
  try{
    user=(await M.signInWithPopup(auth,provider)).user;
    this.fb={M,app,auth,db,user};
    return user;
  }catch(e){
    if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e?.code)){
      sessionStorage.setItem(REDIRECT_KEY,'1');
      await M.signInWithRedirect(auth,provider);
      return await new Promise(()=>{});
    }
    throw e;
  }
};

const originalLogin=V.login.bind(V);
V.login=async function(role){
  role=role||'instructor';
  sessionStorage.setItem(ROLE_KEY,role);
  const result=await originalLogin(role);
  if(this.ready){
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
  }
  return result;
};

const originalLogout=V.logout?.bind(V);
if(originalLogout){
  V.logout=async function(){
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return originalLogout();
  };
}

// After Google redirects back to /v15/, automatically continue the login flow.
setTimeout(()=>{
  const role=sessionStorage.getItem(ROLE_KEY);
  if(role && sessionStorage.getItem(REDIRECT_KEY)==='1' && !V.ready){
    const sel=document.getElementById('loginRole');
    if(sel) sel.value=role;
    V.loginMsg?.('Google verified. Finishing secure login…');
    V.login(role);
  }
},350);

console.info('V15 mobile auth redirect compatibility active.');
})(window.V15Sync);
