/* V15 multi-trade hardening.
 * Prevents records from one Trade leaking into another empty/new workspace.
 * Uses direct document reads for Instructor multi-workspace switching so Firestore
 * does not need to list workspaces the Instructor is not assigned to.
 * Keeps Admin Student selector linked to the chosen Trade workspace.
 */
(function(V){
'use strict';
if(!V) return;

const PREF='iti-v15-workspace-pref';
function role(){return SESSION?.role||'';}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function label(w){return [w.trade||'Unnamed trade',w.session||'',w.batch||''].filter(Boolean).join(' • ');}

// Critical isolation: clear old workspace arrays/maps before loading another workspace.
// V15 then repopulates only the sections declared by the selected Firestore workspace.
const loadBase=V.load?.bind(V);
if(loadBase){
  V.load=async function(accountRole){
    if(window.DATA&&typeof DATA==='object'){
      for(const k of Object.keys(DATA)){
        if(k==='meta'||k==='gallery'||k==='users') continue;
        if(Array.isArray(DATA[k])) DATA[k]=[];
        else if(DATA[k]&&typeof DATA[k]==='object') DATA[k]={};
      }
    }
    return loadBase(accountRole);
  };
}

V.readAssignedWorkspaces=async function(ids){
  const M=this.fb.M,out=[];
  for(const id of [...new Set((ids||[]).filter(Boolean))]){
    try{const z=await M.getDoc(M.doc(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',id));if(z.exists())out.push({id:z.id,...z.data()});}catch(e){console.warn('Assigned workspace read',id,e);}
  }
  out.sort((a,b)=>String(a.trade||'').localeCompare(String(b.trade||''),undefined,{numeric:true,sensitivity:'base'})||String(a.batch||'').localeCompare(String(b.batch||'')));
  return out;
};

V.ensureWorkspaceSwitcher=async function(){
  if(!V.ready||!['instructor','staff'].includes(role()))return;
  const ids=Array.isArray(V.member?.workspaceIds)?V.member.workspaceIds:[];
  document.getElementById('v15WorkspaceSwitcher')?.remove();
  if(ids.length<2)return;
  const mine=await V.readAssignedWorkspaces(ids);if(mine.length<2)return;
  const host=document.querySelector('.topbar .who');if(!host)return;
  const wrap=document.createElement('div');wrap.id='v15WorkspaceSwitcher';wrap.style.cssText='display:flex;align-items:center;gap:6px';
  wrap.innerHTML=`<small class="muted">Trade:</small><select style="max-width:280px">${mine.map(w=>`<option value="${esc(w.id)}" ${w.id===V.workspaceId?'selected':''}>${esc(label(w))}</option>`).join('')}</select>`;
  host.insertBefore(wrap,host.firstChild);
  wrap.querySelector('select').onchange=async e=>{
    const wid=e.target.value;if(!wid||wid===V.workspaceId)return;
    localStorage.setItem(PREF+'-'+V.fb.user.uid,wid);
    V.unsubscribers.forEach(f=>{try{f();}catch(_){}});V.unsubscribers=[];
    V.workspaceId=wid;
    await V.load(role());
    V.shadow=V.clone(DATA);V.realtime(role());V.refresh();
    const w=mine.find(x=>x.id===wid),sub=document.getElementById('brandSub');
    if(sub&&w)sub.textContent=`${V.INSTITUTE_NAME} • ${label(w)}`;
  };
};

V.populateAdminTraineesForWorkspace=async function(){
  if(role()!=='admin')return;
  const wid=document.getElementById('v15AdminWorkspace')?.value||'';
  const sel=document.getElementById('v15AdminTrainee');if(!sel||!wid)return;
  try{
    const M=this.fb.M,z=await M.getDocs(M.collection(this.fb.db,'institutes',this.INSTITUTE_ID,'workspaces',wid,'trainees')),rows=[];
    z.forEach(d=>{const t=d.data()?.data;if(t)rows.push(t);});
    rows.sort((a,b)=>String(a.roll||'').localeCompare(String(b.roll||''),undefined,{numeric:true,sensitivity:'base'}));
    sel.innerHTML='<option value="">Select trainee…</option>'+rows.map(t=>`<option value="${esc(t.id)}">${esc(t.roll||'')} — ${esc(t.name||'')}</option>`).join('');
  }catch(e){console.warn('Admin trainee workspace selector',e);}
};

const adminSelectBase=V.injectAdminWorkspaceSelect?.bind(V);
if(adminSelectBase){
  V.injectAdminWorkspaceSelect=async function(){
    const r=await adminSelectBase();
    const ws=document.getElementById('v15AdminWorkspace');
    if(ws&&!ws.dataset.v15Bound){ws.dataset.v15Bound='1';ws.addEventListener('change',()=>V.populateAdminTraineesForWorkspace());}
    const rr=document.getElementById('v15AdminRole');
    if(rr&&!rr.dataset.v15TradeBound){rr.dataset.v15TradeBound='1';rr.addEventListener('change',()=>{if(rr.value==='student')V.populateAdminTraineesForWorkspace();});}
    await this.populateAdminTraineesForWorkspace();
    return r;
  };
}

// If a user has several assigned trades, return to their last chosen one after login.
const selectedBase=V.applySelectedRoleUI?.bind(V);
if(selectedBase){
  V.applySelectedRoleUI=async function(...args){
    const r=await selectedBase(...args);
    if(['instructor','staff'].includes(role())){
      const preferred=localStorage.getItem(PREF+'-'+V.fb.user.uid)||'';
      const ids=Array.isArray(V.member?.workspaceIds)?V.member.workspaceIds:[];
      if(preferred&&ids.includes(preferred)&&preferred!==V.workspaceId){
        V.unsubscribers.forEach(f=>{try{f();}catch(_){}});V.unsubscribers=[];
        V.workspaceId=preferred;await V.load(role());V.shadow=V.clone(DATA);V.realtime(role());V.refresh();
      }
      await V.ensureWorkspaceSwitcher();
    }
    return r;
  };
}

console.info('V15 multi-trade isolation hardening active.');
})(window.V15Sync);
