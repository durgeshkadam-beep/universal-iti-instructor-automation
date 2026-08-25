/* Universal ITI FINAL — stable Google auth for mobile/GitHub Pages
 * Mobile Chrome should use popup-first. Firebase redirect auth can loop when the app
 * is hosted on github.io while authDomain is firebaseapp.com because redirect state
 * may be partitioned by modern browser storage protections.
 */
(function(V){
'use strict';
if(!V)return;

const K={role:'iti-v15-role-v2',email:'iti-v15-email-v2',redirect:'iti-v15-redirect-v2'};
let authorityPromise=null;

function expectedEmail(){return V.email(localStorage.getItem(K.email)||document.getElementById('v15ExpectedEmail')?.value||'');}
function clearRedirect(){try{localStorage.removeItem(K.redirect);}catch(e){}}
async function ready(M,auth){
  if(typeof auth.authStateReady==='function'){try{await auth.authStateReady();return;}catch(e){}}
  await new Promise(resolve=>{
    let done=false,un=null;
    try{un=M.onAuthStateChanged(auth,()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();});}
    catch(e){resolve();return;}
    setTimeout(()=>{if(done)return;done=true;try{un?.();}catch(e){}resolve();},2200);
  });
}
async function validateUser(ctx,user,M,auth,app,db){
  ctx.fb={M,app,auth,db,user};
  const want=expectedEmail(),got=V.email(user?.email||'');
  if(want&&want!==got){
    try{await M.signOut(auth);}catch(e){}
    ctx.fb.user=null;clearRedirect();
    throw new Error(`Google account mismatch. Entered ${want}, verified ${got||'another account'}.`);
  }
  clearRedirect();
  return user;
}

V.googleAuthority=async function(interactive=false){
  if(authorityPromise)return authorityPromise;
  authorityPromise=(async()=>{
    const M=await this.modules(),cfg=this.config();
    let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app)app=M.initializeApp(cfg,'iti-v15');
    const auth=M.getAuth(app);
    await M.setPersistence(auth,M.browserLocalPersistence);
    const db=M.getFirestore(app);

    // Always consume a pending redirect exactly once. This rescues users already
    // caught in an older redirect build, but new mobile logins do not depend on it.
    let rr=null;
    try{rr=await M.getRedirectResult(auth);}catch(e){clearRedirect();console.warn('FINAL redirect result',e);}
    await ready(M,auth);
    let user=rr?.user||auth.currentUser||null;
    if(user)return validateUser(this,user,M,auth,app,db);

    this.fb={M,app,auth,db,user:null};
    if(!interactive){
      clearRedirect();
      throw new Error('No saved Google session. Press “Verify Role & Continue with Google”.');
    }

    const provider=new M.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});

    // Popup-first on Android/iOS and desktop. This is initiated directly by the
    // user's button press, so it avoids fragile cross-domain redirect persistence.
    try{
      const result=await M.signInWithPopup(auth,provider);
      user=result?.user||auth.currentUser||null;
      if(!user)throw new Error('Google sign-in completed without a user session.');
      return validateUser(this,user,M,auth,app,db);
    }catch(e){
      const fallbackCodes=new Set(['auth/popup-blocked','auth/operation-not-supported-in-this-environment']);
      if(!fallbackCodes.has(e?.code)){
        clearRedirect();
        throw e;
      }
      // One redirect fallback only. On the return trip silent login consumes it;
      // if no Firebase user exists, the flag is cleared rather than redirecting again.
      localStorage.setItem(K.redirect,'1');
      await M.signInWithRedirect(auth,provider);
      return await new Promise(()=>{});
    }
  })();
  try{return await authorityPromise;}finally{authorityPromise=null;}
};

// If an old build left a redirect marker but there is no pending result/session,
// silent V15 login will clear it. Never start interactive auth automatically.
setTimeout(async()=>{
  try{
    if(localStorage.getItem(K.redirect)!=='1')return;
    const M=await V.modules(),cfg=V.config();let app=M.getApps().find(x=>x.name==='iti-v15');
    if(!app)app=M.initializeApp(cfg,'iti-v15');const auth=M.getAuth(app);
    await M.setPersistence(auth,M.browserLocalPersistence);await ready(M,auth);
    // Keep the marker only when a restored user is present; autoResume will finish it.
    if(!auth.currentUser){
      // Do not immediately clear here: getRedirectResult may still need to be consumed
      // by autoResume. Safety timeout below clears it if the page remains on login.
      setTimeout(()=>{if(!V.ready&&document.getElementById('loginScreen')?.style.display!=='none')clearRedirect();},3500);
    }
  }catch(e){clearRedirect();}
},80);

console.info('Universal ITI FINAL stable popup-first Google auth active.');
})(window.V15Sync);
