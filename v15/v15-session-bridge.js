/* V15 session bridge.
 * The V14/V13 shell keeps SESSION as a global lexical binding, so it is not
 * guaranteed to exist as window.SESSION. Production V15 role modules use a
 * window-visible session. This bridge keeps both representations synchronized.
 */
(function(V){
'use strict';
if(!V)return;
let last='';
function legacySession(){
  try{return (typeof SESSION!=='undefined'&&SESSION)?SESSION:null;}catch(e){return null;}
}
function sync(){
  const s=legacySession();
  if(s){
    window.SESSION=s;
    window.__V15_SESSION=s;
    V.session=s;
    V.sessionRole=s.role||'';
    const sig=[s.role||'',s.userId||'',s.username||''].join('|');
    if(sig!==last){last=sig;try{V.enforceRoleUI?.(true);}catch(e){}try{V.ensureRolePortal?.(true);}catch(e){}}
    return true;
  }
  if(!V.ready){
    window.SESSION=null;window.__V15_SESSION=null;V.session=null;V.sessionRole='';last='';
  }
  return false;
}
V.currentSession=function(){return window.__V15_SESSION||window.SESSION||legacySession()||this.session||null;};
V.currentRole=function(){return this.currentSession()?.role||this.sessionRole||'';};
V.syncSessionBridge=sync;
let n=0,t=setInterval(()=>{n++;const ok=sync();if(ok&&n>80)clearInterval(t);if(n>240)clearInterval(t);},50);
window.addEventListener('pageshow',()=>setTimeout(sync,0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,0);});
console.info('V15 legacy SESSION bridge active.');
})(window.V15Sync);
