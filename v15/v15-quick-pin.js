/* EduSkill 360 optional 6-digit Quick PIN (local UI lock ONLY).
 * Not authentication, not encryption, not a replacement for Google/password.
 * Works exclusively with an already active, authorized Firebase login.
 */
(function(V){
'use strict';
if(!V)return;
const runtime=window.ITI_RUNTIME||{};
if(runtime.quickPinEnabled!==true)return;
const prefix='iti-v15-local-quick-pin-v1:';
const locked='iti-v15-quick-pin-locked-v1';
const tries='iti-v15-quick-pin-tries-v1:';
const enc=new TextEncoder();
const iterations=260000;
function scope(){
 if(!V.ready||!V.fb?.user?.uid||V.fb.auth?.currentUser?.uid!==V.fb.user.uid)return null;
 const project=String(V.config?.()?.projectId||'unknown');
 return project+':'+V.fb.user.uid;
}
function pinKey(key){return prefix+key;}
function local(key){try{return localStorage.getItem(key);}catch(e){return null;}}
function attemptKey(key){return tries+key;}
function sessionValue(key){try{return sessionStorage.getItem(key);}catch(e){return null;}}
function sessionPut(key,val){try{if(val===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,val);}catch(e){}}
function encode(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function fromHex(hex){return new Uint8Array(hex.match(/.{2}/g).map(s=>parseInt(s,16)));}
async function derivation(pin,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);
 return encode(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations,salt},key,256)));
}
function validPin(pin){
 if(!/^\d{6}$/.test(pin))return false;
 if(/^(\d)\1{5}$/.test(pin))return false;
 if(['123456','654321','012345','987654','111222','000123'].includes(pin))return false;
 return true;
}
async function savePin(pin){
 const key=scope();
 if(!key||!validPin(pin)||!crypto.subtle)return false;
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const digest=await derivation(pin,salt);
 localStorage.setItem(pinKey(key),JSON.stringify({v:1,algorithm:'PBKDF2-SHA256',iterations,salt:encode(salt),hash:digest}));
 sessionPut(attemptKey(key),'0');
 return true;
}
async function matches(pin,key){
 const raw=local(pinKey(key));if(!raw||!/^\d{6}$/.test(pin))return false;
 let record;
 try{record=JSON.parse(raw);}catch(e){return false;}
 if(record?.v!==1||record.iterations!==iterations||
    typeof record.salt!=='string'||!/^[0-9a-f]{32}$/.test(record.salt)||
    typeof record.hash!=='string'||!/^[0-9a-f]{64}$/.test(record.hash))return false;
 const hash=await derivation(pin,fromHex(record.salt));
 let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^record.hash.charCodeAt(i);
 return diff===0;
}
function element(tag,text){const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;}
function removeGuard(){
 document.getElementById('v15QuickPinGuard')?.remove();
 document.body.style.overflow='';
}
V.quickPinSet=savePin;
V.quickPinLock=function(){
 const key=scope();if(!key||!local(pinKey(key))||sessionValue(attemptKey(key))==='5')return false;
 sessionPut(locked,key);
 V.quickPinShowLock();
 return true;
};
V.quickPinShowLock=function(){
 const key=scope();
 if(!key||sessionValue(locked)!==key||!local(pinKey(key)))return;
 if(document.getElementById('v15QuickPinGuard'))return;
 const mask=element('div');mask.id='v15QuickPinGuard';mask.setAttribute('role','dialog');mask.setAttribute('aria-modal','true');
 mask.setAttribute('aria-label','Quick PIN local screen lock');
 mask.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0b2740;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
 const panel=element('form');panel.style.cssText='max-width:360px;width:100%;padding:24px;border-radius:16px;background:#fff;color:#132333;box-sizing:border-box';
 panel.append(element('h2','🔒 Quick Unlock'));
 panel.append(element('p','Your existing Firebase session must still be active. This PIN only hides the screen on this device; it is not a substitute for account authentication.'));
 const field=element('input');field.type='password';field.inputMode='numeric';field.autocomplete='off';field.maxLength=6;
 field.minLength=6;field.pattern='[0-9]{6}';field.required=true;field.setAttribute('aria-label','Six digit Quick PIN');
 field.style.cssText='display:block;width:100%;font-size:20px;padding:10px;box-sizing:border-box;margin:14px 0';
 panel.append(field);
 const status=element('p','');status.setAttribute('role','status');panel.append(status);
 const unlock=element('button','Unlock this screen');unlock.type='submit';unlock.style.cssText='padding:12px;width:100%';panel.append(unlock);
 const signout=element('button','Sign out — use full login');
 signout.type='button';signout.style.cssText='padding:10px;width:100%;margin-top:12px';
 panel.append(signout);
 signout.onclick=async()=>{sessionPut(locked,null);removeGuard();await V.logout?.();};
 panel.addEventListener('submit',async e=>{
   e.preventDefault();const current=scope();
   if(!current||current!==key){status.textContent='The Firebase session changed. Sign in again.';return;}
   unlock.disabled=true;
   try{
     const success=await matches(field.value,key);
     field.value='';
     if(!success){
       const attempts=Math.min(5,Number(sessionValue(attemptKey(key))||0)+1);
       sessionPut(attemptKey(key),String(attempts));
       status.textContent='Incorrect PIN. Remaining attempts: '+(5-attempts);
       if(attempts>=5){sessionPut(locked,null);removeGuard();await V.logout?.();}
       return;
     }
     sessionPut(attemptKey(key),'0');sessionPut(locked,null);removeGuard();
   }catch(e){status.textContent='Quick unlock unavailable. Sign out and use full login.';}
   finally{unlock.disabled=false;}
 });
 mask.append(panel);document.body.append(mask);field.focus();
};
function openSetup(){
 const key=scope();if(!key)return;
 if(document.getElementById('v15QuickPinSetup'))return;
 const modal=element('div');modal.id='v15QuickPinSetup';
 modal.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:18px';
 const form=element('form');form.style.cssText='max-width:380px;width:100%;background:white;padding:24px;border-radius:16px;color:#132333';
 form.append(element('h3','Optional 6-digit Quick PIN'));
 form.append(element('p','Personal device only. This is a convenience screen lock, not a secure login or data encryption. For shared institute computers, use Google/password and Sign Out.'));
 const input=element('input');input.type='password';input.inputMode='numeric';input.maxLength=6;input.pattern='[0-9]{6}';input.placeholder='Choose six digits';input.required=true;
 form.append(input);
 const confirm=element('input');confirm.type='password';confirm.inputMode='numeric';confirm.maxLength=6;confirm.pattern='[0-9]{6}';confirm.placeholder='Repeat PIN';confirm.required=true;form.append(confirm);
 const status=element('p','');status.setAttribute('role','status');form.append(status);
 const save=element('button','Save Quick PIN');save.type='submit';form.append(save);
 const cancel=element('button','Cancel');cancel.type='button';cancel.style.marginLeft='10px';cancel.onclick=()=>modal.remove();form.append(cancel);
 const remove=element('button','Disable PIN');remove.type='button';remove.style.margin='10px 0 0';remove.onclick=()=>{
   if(scope()!==key)return;
   localStorage.removeItem(pinKey(key));sessionPut(attemptKey(key),null);sessionPut(locked,null);modal.remove();removeGuard();
 };form.append(remove);
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(scope()!==key)return;
   if(!validPin(input.value)||input.value!==confirm.value){status.textContent='Enter matching 6-digit PINs; avoid easy repeated or sequential codes.';return;}
   save.disabled=true;
   try{const ok=await savePin(input.value);input.value='';confirm.value='';
     if(ok){status.textContent='Quick PIN saved only on this device. Use Quick Lock to activate.';setTimeout(()=>modal.remove(),700);}
     else status.textContent='Secure PIN storage is unavailable on this device.';
   }catch(e){status.textContent='Could not save PIN on this device.';}
   finally{save.disabled=false;}
 });
 modal.append(form);document.body.append(modal);input.focus();
}
function controls(){
 const key=scope();if(!key)return;
 const target=document.querySelector('#appShell .topbar .who');
 if(!target)return;
 if(!document.getElementById('v15QuickPinSetupButton')){
   const settings=element('button','Quick PIN');
   settings.id='v15QuickPinSetupButton';settings.type='button';settings.className='btn';
   settings.onclick=openSetup;target.append(settings);
 }
 if(!document.getElementById('v15QuickPinLockButton')){
   const lock=element('button','Quick Lock');
   lock.id='v15QuickPinLockButton';lock.type='button';lock.className='btn';
   lock.onclick=()=>{if(!V.quickPinLock())openSetup();};
   target.append(lock);
 }
 if(sessionValue(locked)===key)V.quickPinShowLock();
}
const oldPortal=V.applyRolePortal;
if(oldPortal){
 V.applyRolePortal=async function(...args){
   const result=await oldPortal.apply(this,args);
   if(result)controls();
   return result;
 };
}
const oldLogout=V.logout;
if(oldLogout)V.logout=async function(...args){
 sessionPut(locked,null);removeGuard();
 return oldLogout.apply(this,args);
};
})(window.V15Sync);
