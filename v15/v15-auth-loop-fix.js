/* V15 final authentication loop guard.
 * Loaded last.
 * Fixes repeated Google account chooser / redirect loops by:
 *  - never opening Google interactively during a silent restore;
 *  - waiting for Firebase auth state to settle before deciding no user exists;
 *  - accepting completed redirect sessions exactly once;
 *  - clearing stale redirect flags after a valid Firebase user is available;
 *  - serializing Google auth calls so older wrappers cannot launch a second chooser.
 */
(function(V){
'use strict';
if(!V) return;

const AUTH_PENDING='iti-v15-auth-pending-v2';
const OLD_REDIRECT='iti-v15-auth-redirect-pending';
const OLD_ROLE='iti-v15-pending-role';
const EXPECTED_EMAIL='iti-v15-expected-email-v3';
let authPromise=null;

function mobileLike(){
  try{
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'') ||
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone===true;
  }catch(e){return false;}
}
function clearPending(){
  try{localStorage.removeItem(AUTH_PENDING);}catch(e){}
  try{sessionStorage.removeItem(OLD_REDIRECT);sessionStorage.removeItem(OLD_ROLE);}catch(e){}
}
async function waitAuthReady(M,auth){
  if(typeof auth.authStateReady==='function'){
    try{await auth.authStateReady();return;}catch(e){}
  }
  await new Promise(resolve=>{
    let done=false,un=null;
    try{un=M.onAuthStateChanged(auth,()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();});}
    catch(e){resolve();return;}
    setTimeout(()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();},1800);
  });
}

V.googleAuthority=async function(interactive=false){
  if(authPromise) return authPromise;
  authPromise=(async()=>{
    const M=await this.modules(),cfg=this.config();
    let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app) app=M.initializeApp(cfg,'iti-v15');
    const auth=M.getAuth(app);
    await M.setPersistence(auth,M.browserLocalPersistence);
    const db=M.getFirestore(app);

    // Consume a redirect result first, then wait for persisted auth state to settle.
    let rr=null;
    try{rr=await M.getRedirectResult(auth);}catch(e){
      clearPending();
      throw e;
    }
    await waitAuthReady(M,auth);

    let user=rr?.user||auth.currentUser||null;
    this.fb={M,app,auth,db,user};

    if(user){
      clearPending();
      const expected=this.email(localStorage.getItem(EXPECTED_EMAIL)||'');
      const got=this.email(user.email||'');
      if(expected&&got!==expected){
        try{await M.signOut(auth);}catch(e){}
        this.fb.user=null;
        throw new Error(`Google account mismatch. You entered ${expected}, but Google verified ${got||'another account'}.`);
      }
      return user;
    }

    // Critical loop fix: a background/session restore must NEVER launch Google UI.
    if(!interactive){
      clearPending();
      throw new Error('No saved Google session. Press “Verify Role & Continue with Google” to sign in.');
    }

    const provider=new M.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    if(mobileLike()){
      localStorage.setItem(AUTH_PENDING,'1');
      sessionStorage.setItem(OLD_REDIRECT,'1');
      await M.signInWithRedirect(auth,provider);
      return await new Promise(()=>{});
    }

    try{
      user=(await M.signInWithPopup(auth,provider)).user;
      this.fb={M,app,auth,db,user};
      clearPending();
      const expected=this.email(localStorage.getItem(EXPECTED_EMAIL)||'');
      const got=this.email(user?.email||'');
      if(expected&&got!==expected){
        try{await M.signOut(auth);}catch(e){}
        this.fb.user=null;
        throw new Error(`Google account mismatch. You entered ${expected}, but Google verified ${got||'another account'}.`);
      }
      return user;
    }catch(e){
      if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e?.code)){
        localStorage.setItem(AUTH_PENDING,'1');
        sessionStorage.setItem(OLD_REDIRECT,'1');
        await M.signInWithRedirect(auth,provider);
        return await new Promise(()=>{});
      }
      clearPending();
      throw e;
    }
  })();
  try{return await authPromise;}finally{authPromise=null;}
};

// If a stale redirect flag remains from an older build, clear it unless Firebase really has a user.
setTimeout(async()=>{
  try{
    const M=await V.modules(),cfg=V.config();
    let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app) app=M.initializeApp(cfg,'iti-v15');
    const auth=M.getAuth(app);
    await M.setPersistence(auth,M.browserLocalPersistence);
    await waitAuthReady(M,auth);
    if(auth.currentUser) clearPending();
    else if(localStorage.getItem(AUTH_PENDING)==='1') clearPending();
  }catch(e){}
},20);

console.info('V15 final auth loop guard active.');
})(window.V15Sync);
