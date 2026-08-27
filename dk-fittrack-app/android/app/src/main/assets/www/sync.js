(function(){
  let stopRemote=null, applyingRemote=false, pushTimer=null;
  const cloud=()=>window.LeanCloud;
  const storageKey='dkfittrack_state';
  function updateUI(){
    const el=document.querySelector('#cloudStatus'), userEl=document.querySelector('#cloudUser');
    if(!el)return; const st=cloud()?.status?.()||{};
    if(!st.configured){el.textContent='Not configured'; if(userEl)userEl.textContent=''; return;}
    el.textContent=st.user?'Auto-sync ON':'Ready to sign in';
    if(userEl) userEl.textContent=st.user?`Signed in: ${st.user.email||st.user.uid} • local-first + automatic cloud sync`:'Create or sign in with the same account on each device.';
  }
  async function pushNow(){
    const c=cloud(); if(!c?.status?.().user || applyingRemote)return;
    try{const raw=localStorage.getItem(storageKey);if(!raw)return;const obj=JSON.parse(raw);await c.push(raw,obj._syncUpdatedAt||Date.now());updateUI();}catch(e){console.warn(e)}
  }
  function schedulePush(){clearTimeout(pushTimer);pushTimer=setTimeout(pushNow,900)}
  function startRemote(){
    if(stopRemote){stopRemote();stopRemote=null}
    const c=cloud();if(!c?.status?.().user)return;
    try{stopRemote=c.subscribe(async doc=>{
      if(!doc?.payload)return;
      try{
        const remote=JSON.parse(doc.payload), local=JSON.parse(localStorage.getItem(storageKey)||'{}');
        const rt=Number(doc.updatedAtClient||remote._syncUpdatedAt||0), lt=Number(local._syncUpdatedAt||0);
        if(rt>lt){
          applyingRemote=true;localStorage.setItem(storageKey,doc.payload);state=remote;
          try{renderAll()}catch(e){} applyingRemote=false;toast('Cloud changes synced to this device');
        }
      }catch(e){console.warn(e)}
    })}catch(e){console.warn(e)}
  }
  const originalSave=window.saveState;
  window.saveState=function(){
    if(!applyingRemote){state._syncUpdatedAt=Date.now()}
    originalSave(); if(!applyingRemote)schedulePush();
  };
  async function pullLatest(force=false){
    const c=cloud();if(!c?.status?.().user)throw new Error('Sign in first.');const doc=await c.pull();if(!doc?.payload)return false;
    const remote=JSON.parse(doc.payload),local=JSON.parse(localStorage.getItem(storageKey)||'{}');
    const rt=Number(doc.updatedAtClient||remote._syncUpdatedAt||0),lt=Number(local._syncUpdatedAt||0);
    if(force||rt>lt){applyingRemote=true;localStorage.setItem(storageKey,doc.payload);state=remote;renderAll();applyingRemote=false;}
    return true;
  }
  function email(){return (document.querySelector('#cloudEmail')?.value||'').trim()}
  function password(){return document.querySelector('#cloudPassword')?.value||''}
  async function create(){try{if(password().length<6)throw new Error('Password needs at least 6 characters.');await cloud().createAccount(email(),password());await pushNow();startRemote();updateUI();toast('Account created and sync enabled')}catch(e){toast(e.message||'Account creation failed')}}
  async function login(){try{await cloud().loginEmail(email(),password());await pullLatest(false);startRemote();updateUI();toast('Signed in and synced')}catch(e){toast(e.message||'Sign-in failed')}}
  async function pull(){try{const ok=await pullLatest(true);toast(ok?'Latest cloud data loaded':'No cloud data yet')}catch(e){toast(e.message||'Pull failed')}}
  async function logout(){try{if(stopRemote)stopRemote();stopRemote=null;await cloud().logout();updateUI();toast('Signed out; local data remains on this device')}catch(e){toast(e.message||'Sign-out failed')}}
  function bind(){
    const c=document.querySelector('#cloudCreate'),l=document.querySelector('#cloudLogin'),p=document.querySelector('#cloudPush'),g=document.querySelector('#cloudPull'),o=document.querySelector('#cloudLogout');
    if(c)c.onclick=create;if(l)l.onclick=login;if(p)p.onclick=()=>pushNow().then(()=>toast('Cloud sync complete'));if(g)g.onclick=pull;if(o)o.onclick=logout;
    cloud()?.onAuth?.(u=>{updateUI();if(u){startRemote();pullLatest(false).catch(()=>{})}});updateUI();
  }
  setTimeout(bind,0);
})();
