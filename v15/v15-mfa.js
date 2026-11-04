/* Firebase-native TOTP challenge support. No local OTP verifier or role grant. */
(function(V){
'use strict';
if(!V)return;
let pending=false;
V.firebaseSignIn=async function(M,auth,operation){
 try{return await operation();}
 catch(error){
  if(error?.code!=='auth/multi-factor-auth-required')throw error;
  if(pending)throw Error('Finish or cancel the existing authenticator request.');
  if(!M.getMultiFactorResolver||!M.TotpMultiFactorGenerator)throw Error('This Firebase client cannot complete MFA. Contact your institute administrator.');
  const resolver=M.getMultiFactorResolver(auth,error),factors=resolver.hints.filter(h=>h.factorId===M.TotpMultiFactorGenerator.FACTOR_ID);
  if(!factors.length)throw Error('This account needs a second factor that this app does not support. Use your institution recovery procedure; security was not bypassed.');
  const card=document.querySelector('#loginScreen .login-card');if(!card)throw Error('Return to the sign-in screen to complete MFA.');
  pending=true;
  return await new Promise((resolve,reject)=>{
   const form=document.createElement('form');form.id='v15MfaChallenge';form.setAttribute('aria-label','Authenticator verification');
   form.style.cssText='margin-top:12px;padding:12px;border:2px solid #5269ac;border-radius:12px';
   const heading=document.createElement('h3');heading.textContent='Authenticator verification';
   const info=document.createElement('p');info.textContent='Enter the current code from your enrolled authenticator. Firebase verifies it; a Quick PIN cannot complete MFA.';
   const label=document.createElement('label');label.htmlFor='v15MfaFactor';label.textContent='Authenticator';
   const select=document.createElement('select');select.id='v15MfaFactor';
   factors.forEach((h,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=h.displayName||'Authenticator '+(i+1);select.append(o);});
   const codeLabel=document.createElement('label');codeLabel.htmlFor='v15MfaCode';codeLabel.textContent='Authenticator code';
   const code=document.createElement('input');code.id='v15MfaCode';code.type='text';code.inputMode='numeric';code.autocomplete='one-time-code';code.pattern='[0-9]{6}';code.maxLength=6;code.required=true;
   const submit=document.createElement('button');submit.type='submit';submit.className='btn primary';submit.textContent='Verify authenticator';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel verification';
   const status=document.createElement('p');status.setAttribute('role','status');
   form.append(heading,info,label,select,codeLabel,code,submit,cancel,status);card.append(form);code.focus();
   let closed=false;
   const close=()=>{closed=true;pending=false;code.value='';form.remove();};
   cancel.onclick=()=>{if(submit.disabled)return;close();reject(Object.assign(Error('Authenticator verification cancelled. No new session was opened.'),{code:'auth/user-cancelled'}));};
   form.onsubmit=async event=>{
    event.preventDefault();if(submit.disabled||closed)return;
    const otp=code.value.trim(),factor=factors[Number(select.value)];
    if(!/^\d{6}$/.test(otp)||!factor){status.textContent='Enter the six-digit authenticator code.';return;}
    submit.disabled=true;cancel.disabled=true;code.value='';status.textContent='Verifying with Firebase…';
    try{
     const assertion=M.TotpMultiFactorGenerator.assertionForSignIn(factor.uid,otp);
     const result=await resolver.resolveSignIn(assertion);
     if(!result?.user?.uid)throw Error('Missing Firebase user');close();resolve(result);
    }catch(err){
     if(['auth/invalid-multi-factor-session','auth/multi-factor-info-not-found','auth/too-many-requests'].includes(err?.code)){
      close();reject(Object.assign(Error('Authenticator session expired or temporarily limited. Sign in again later, or use institute recovery.'),{code:err.code}));return;
     }
     status.textContent=err?.code==='auth/invalid-verification-code'?'The code was not accepted. Check your authenticator and device time.':'Verification could not finish. Check your connection or cancel and try signing in later.';
    }finally{if(!closed){submit.disabled=false;cancel.disabled=false;code.focus();}}
   };
  });
 }
};
})(window.V15Sync);
