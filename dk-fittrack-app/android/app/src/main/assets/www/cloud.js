(function(){
  let auth=null,db=null,user=null,configured=false,listeners=[];
  try{
    const cfg=window.LEANTRACK_FIREBASE;
    if(cfg?.enabled && cfg.config?.apiKey && window.firebase){
      if(!firebase.apps.length) firebase.initializeApp(cfg.config);
      auth=firebase.auth(); db=firebase.firestore(); configured=true;
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
      auth.onAuthStateChanged(u=>{user=u||null; listeners.forEach(fn=>fn(user));});
    }
  }catch(e){console.warn('DK FitTrack cloud init',e)}
  const ensure=()=>{if(!configured)throw new Error('Firebase is not configured.');if(!user)throw new Error('Sign in first.');};
  const ref=()=>db.doc(`users/${user.uid}/dkfittrack/state`);
  window.LeanCloud={
    status:()=>({configured,user}),
    onAuth:fn=>{listeners.push(fn);fn(user);},
    createAccount:async(email,password)=>{if(!configured)throw new Error('Firebase unavailable.');const r=await auth.createUserWithEmailAndPassword(email,password);user=r.user;return user;},
    loginEmail:async(email,password)=>{if(!configured)throw new Error('Firebase unavailable.');const r=await auth.signInWithEmailAndPassword(email,password);user=r.user;return user;},
    logout:async()=>{if(auth)await auth.signOut();user=null;},
    push:async(payload,updatedAtClient=Date.now())=>{ensure();await ref().set({payload,updatedAtClient,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});},
    pull:async()=>{ensure();const d=await ref().get();return d.exists?d.data():null;},
    subscribe:(fn)=>{ensure();return ref().onSnapshot(d=>{if(d.exists)fn(d.data())},e=>console.warn('sync listener',e));}
  };
})();
