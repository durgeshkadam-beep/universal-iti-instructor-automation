/* V15 hardening: safe owner bootstrap, one-time activation cleanup and fast queued sync. */
(function(V){
'use strict';
if(!V) return;

// Only migrate the shared institute from an existing V14 cloud workspace.
// This prevents a clean outsider device from claiming the fixed institute ID.
V.bootstrap=async function(role,legacy){
  const M=this.fb.M,u=this.fb.user;
  if((await M.getDoc(this.inst())).exists()) return false;
  if(!legacy?.meta) throw new Error('Safe V15 setup requires the existing V14 cloud workspace. Your current records were not changed.');
  let legacyWorkspaceId='';
  try{ legacyWorkspaceId=window.CloudCenter?.workspaceId?.()||''; }catch(e){}
  if(!legacyWorkspaceId) legacyWorkspaceId=this.wid(legacy.meta);
  const meta=legacy.meta||{};
  const w=this.wid(meta);
  await M.setDoc(this.inst(),{
    name:meta.institute||this.INSTITUTE_NAME,
    code:meta.instituteCode||'MUMBAI-01',
    schemaVersion:15,
    ownerUid:u.uid,
    legacyWorkspaceId,
    createdAt:this.now(),
    updatedAt:this.now()
  });
  await M.setDoc(this.memberRef(),{
    uid:u.uid,
    email:this.email(u.email),
    displayName:u.displayName||meta.instructor||'Owner',
    role:role==='student'?'instructor':role,
    active:true,
    owner:true,
    workspaceIds:[w],
    createdAt:this.now()
  });
  this.member=(await M.getDoc(this.memberRef())).data();
  this.workspaceId=w;
  return true;
};

// Mark a successful first-login code as used. The V15 rules permit only the
// just-activated Google account to switch its own secret from active to false.
const baseActivate=V.activate.bind(V);
V.activate=async function(role){
  const r=await baseActivate(role);
  if(r==='ok'){
    try{
      const email=this.email(this.fb.user?.email||'');
      await this.fb.M.updateDoc(this.secret(email),{active:false,usedAt:this.now(),usedBy:this.fb.user.uid});
    }catch(e){ console.warn('V15 activation code cleanup pending',e); }
  }
  return r;
};

// Capture changes quickly and never drop a second save while a Firestore write
// is already in progress. This is important when two devices add different records.
V.resyncRequested=false;
V.syncQueued=false;
V.schedule=function(ms=0){
  if(!this.ready||this.suppressLocalSync) return;
  if(this.syncing){ this.resyncRequested=true; return; }
  if(this.syncQueued) return;
  this.syncQueued=true;
  const run=()=>{
    this.syncQueued=false;
    this.diff().catch(e=>console.error('V15 sync',e));
  };
  if(ms>0) setTimeout(run,ms); else queueMicrotask(run);
};
const baseDiff=V.diff.bind(V);
V.diff=async function(){
  if(this.syncing){ this.resyncRequested=true; return; }
  await baseDiff();
  if(this.resyncRequested&&!this.syncing){
    this.resyncRequested=false;
    this.schedule(0);
  }
};

console.info('Universal ITI V15 hardening active.');
})(window.V15Sync);
