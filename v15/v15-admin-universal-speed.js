/* Universal ITI FINAL — universal institute profile + fast Admin entry
 * Loaded last so it augments the final System Admin Master without disturbing other roles.
 */
(function(V){
'use strict';
if(!V)return;

const CACHE='iti-v15-institute-profile-v1';
function role(){try{return V.currentRole?.()||V.currentSession?.()?.role||window.__V15_SESSION?.role||window.SESSION?.role||V.sessionRole||'';}catch(e){return '';}}
function isAdmin(){return role()==='admin'&&V.member?.owner===true;}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function addr(p){return [p.address,p.city,p.district,p.state,p.pinCode].filter(Boolean).join(', ');}
function cached(){try{return JSON.parse(localStorage.getItem(CACHE)||'null');}catch(e){return null;}}
function store(p){try{localStorage.setItem(CACHE,JSON.stringify(p));}catch(e){}}

V.applyUniversalInstituteBranding=function(p){
  if(!p)return;
  var name=String(p.name||p.institute||'').trim();
  if(!name)return;
  var a=addr(p);
  var brand=document.getElementById('brandSub');
  if(brand)brand.textContent=name+(p.city?' — '+p.city:'');
  var hero=document.getElementById('heroSub');
  if(hero)hero.textContent=name;
  var login=document.querySelector('.login-sub');
  if(login)login.innerHTML=esc(name)+(a?'<br><small>'+esc(a)+'</small>':'');
  if(window.DATA&&DATA.meta){
    DATA.meta.institute=name;
    DATA.meta.instituteCode=p.code||p.instituteCode||DATA.meta.instituteCode||'';
    ['authority','address','city','district','state','pinCode','phone','email','website'].forEach(function(k){if(p[k]!=null)DATA.meta[k]=p[k];});
  }
  store(p);
};

V.getUniversalInstituteProfile=async function(){
  var info={};
  try{info=await this.instituteInfo()||{};}catch(e){}
  var m=(window.DATA&&DATA.meta)||{};
  var p={
    name:info.name||m.institute||this.INSTITUTE_NAME||'',
    code:info.code||m.instituteCode||'',
    authority:info.authority||m.authority||'Directorate of Vocational Education and Training (DVET), Maharashtra',
    address:info.address||m.address||'',
    city:info.city||m.city||'',
    district:info.district||m.district||'',
    state:info.state||m.state||'Maharashtra',
    pinCode:info.pinCode||m.pinCode||'',
    phone:info.phone||m.phone||'',
    email:info.email||m.email||'',
    website:info.website||m.website||''
  };
  store(p);this.applyUniversalInstituteBranding(p);return p;
};

V.saveUniversalInstituteProfile=async function(p){
  if(!isAdmin())throw new Error('System Admin access required.');
  p=p||{};
  var name=String(p.name||'').trim(),code=String(p.code||'').trim();
  if(!name)throw new Error('Institute / College name is required.');
  if(!code)throw new Error('Institute code is required.');
  var clean={
    name:name,code:code,
    authority:String(p.authority||'').trim(),
    address:String(p.address||'').trim(),
    city:String(p.city||'').trim(),
    district:String(p.district||'').trim(),
    state:String(p.state||'').trim(),
    pinCode:String(p.pinCode||'').trim(),
    phone:String(p.phone||'').trim(),
    email:String(p.email||'').trim(),
    website:String(p.website||'').trim(),
    updatedAt:this.now(),updatedBy:this.fb.user.uid
  };
  var M=this.fb.M;
  await M.setDoc(this.inst(),clean,{merge:true});
  var workspaces=await this.listTradeWorkspaces({includeArchived:true});
  await Promise.all(workspaces.map(function(w){
    return M.setDoc(V.ws(w.id),{
      institute:name,instituteCode:code,authority:clean.authority,address:clean.address,
      city:clean.city,district:clean.district,state:clean.state,pinCode:clean.pinCode,
      phone:clean.phone,email:clean.email,website:clean.website,
      updatedAt:V.now(),updatedBy:V.fb.user.uid
    },{merge:true});
  }));
  this.applyUniversalInstituteBranding(clean);
  try{if(typeof saveData==='function')saveData();}catch(e){}
  try{await this.audit?.('institute.profile.update',{name:name,code:code,city:clean.city,district:clean.district});}catch(e){}
  return clean;
};

function profileHtml(){
  return '<div class="card ua-profile" id="uaInstituteProfile">'+
    '<div class="ua-head"><div><h3>🏫 Institute / College Profile</h3><p class="muted">Universal app identity. These details are used in the app header and printed reports.</p></div><span class="badge">System Admin</span></div>'+
    '<div class="ua-grid">'+
      '<div class="field ua-wide"><label>Institute / College name</label><input id="uaName"></div>'+
      '<div class="field"><label>Institute code</label><input id="uaCode"></div>'+
      '<div class="field"><label>Authority / Department</label><input id="uaAuthority"></div>'+
      '<div class="field ua-wide"><label>Full address</label><textarea id="uaAddress" rows="2"></textarea></div>'+
      '<div class="field"><label>City</label><input id="uaCity"></div>'+
      '<div class="field"><label>District</label><input id="uaDistrict"></div>'+
      '<div class="field"><label>State</label><input id="uaState"></div>'+
      '<div class="field"><label>PIN code</label><input id="uaPin"></div>'+
      '<div class="field"><label>Phone</label><input id="uaPhone"></div>'+
      '<div class="field"><label>Official email</label><input id="uaEmail" type="email"></div>'+
      '<div class="field ua-wide"><label>Website</label><input id="uaWebsite"></div>'+
    '</div>'+
    '<button class="btn primary" id="uaSave">Save institute profile</button> <span id="uaStatus" class="muted"></span>'+
  '</div>';
}

async function injectProfile(){
  if(!isAdmin())return;
  var panel=document.getElementById('tab-admin-console');
  if(!panel||document.getElementById('uaInstituteProfile'))return;
  var hero=panel.querySelector('.hero');
  if(hero)hero.insertAdjacentHTML('afterend',profileHtml());else panel.insertAdjacentHTML('afterbegin',profileHtml());
  var p=await V.getUniversalInstituteProfile();
  var set=function(id,v){var e=document.getElementById(id);if(e)e.value=v||'';};
  set('uaName',p.name);set('uaCode',p.code);set('uaAuthority',p.authority);set('uaAddress',p.address);
  set('uaCity',p.city);set('uaDistrict',p.district);set('uaState',p.state);set('uaPin',p.pinCode);
  set('uaPhone',p.phone);set('uaEmail',p.email);set('uaWebsite',p.website);
  var save=document.getElementById('uaSave');
  if(save)save.onclick=async function(){
    var status=document.getElementById('uaStatus');
    try{
      save.disabled=true;if(status)status.textContent='Saving…';
      await V.saveUniversalInstituteProfile({
        name:document.getElementById('uaName').value,
        code:document.getElementById('uaCode').value,
        authority:document.getElementById('uaAuthority').value,
        address:document.getElementById('uaAddress').value,
        city:document.getElementById('uaCity').value,
        district:document.getElementById('uaDistrict').value,
        state:document.getElementById('uaState').value,
        pinCode:document.getElementById('uaPin').value,
        phone:document.getElementById('uaPhone').value,
        email:document.getElementById('uaEmail').value,
        website:document.getElementById('uaWebsite').value
      });
      if(status)status.textContent='Saved ✓';
    }catch(e){if(status)status.textContent=e.message||String(e);}
    finally{save.disabled=false;}
  };
}

function injectLoginHealth(){
  if(!isAdmin())return;
  var panel=document.getElementById('tab-admin-console');
  if(!panel||document.getElementById('uaLoginHealth'))return;
  var sys=[].slice.call(panel.querySelectorAll('.card')).find(function(x){return /System Health/i.test(x.textContent||'');});
  if(!sys)return;
  var ms=0;try{ms=Number(sessionStorage.getItem('iti-v15-last-login-ms')||0);}catch(e){}
  var cls=ms>10000?'cloud-error':'cloud-ok';
  var label=ms?((ms/1000).toFixed(1)+' seconds'):'Not measured this session';
  sys.insertAdjacentHTML('beforeend','<div id="uaLoginHealth" class="callout '+cls+'" style="margin-top:8px"><b>Last secure login:</b> '+esc(label)+(ms>10000?' — slower than target.':'')+'</div>');
}

/* The final Admin Master performs several institute-wide queries.
 * Do not make authentication wait for those queries: enter the app first, then render Admin data.
 */
var heavyAdmin=typeof V.renderAdminPanel==='function'?V.renderAdminPanel.bind(V):null;
if(heavyAdmin){
  V.renderAdminPanel=function(){
    if(!isAdmin())return heavyAdmin.apply(V,arguments);
    var panel=(this.ensureAdminTab?.()||{}).p||document.getElementById('tab-admin-console');
    if(panel){
      panel.style.removeProperty('display');panel.hidden=false;
      panel.innerHTML='<div class="hero"><div class="hero-content"><div><span class="showcase-kicker">MASTER CONTROL</span><h2>⚙️ System Admin</h2><p>Secure login complete. Loading management data…</p></div></div></div><div class="card"><p class="muted">Workspaces, employees and audit history are loading after sign-in.</p></div>';
    }
    clearTimeout(this._uaAdminTimer);
    var args=arguments;
    this._uaAdminTimer=setTimeout(async function(){
      try{await heavyAdmin.apply(V,args);await injectProfile();injectLoginHealth();}catch(e){
        console.error('Admin background render',e);
        if(panel)panel.insertAdjacentHTML('beforeend','<div class="callout cloud-error">Admin data could not load: '+esc(e.message||e)+'</div>');
      }
    },0);
    return Promise.resolve(true);
  };
}

/* Re-apply branding after any role portal loads, using the current workspace metadata. */
var portal=typeof V.applyRolePortal==='function'?V.applyRolePortal.bind(V):null;
if(portal){
  V.applyRolePortal=async function(){
    var r=await portal.apply(V,arguments);
    try{if(window.DATA&&DATA.meta)V.applyUniversalInstituteBranding(DATA.meta);}catch(e){}
    return r;
  };
}

function style(){
  if(document.getElementById('uaUniversalStyle'))return;
  var s=document.createElement('style');s.id='uaUniversalStyle';
  s.textContent='.ua-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.ua-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}.ua-grid .ua-wide{grid-column:1/-1}@media(max-width:760px){.ua-grid{grid-template-columns:1fr}.ua-grid .ua-wide{grid-column:auto}.ua-profile{padding:13px!important}.ua-head{align-items:center}}';
  document.head.appendChild(s);
}
style();
try{var cp=cached();if(cp)V.applyUniversalInstituteBranding(cp);}catch(e){}
console.info('Universal ITI FINAL universal institute + fast Admin entry active.');
})(window.V15Sync);
