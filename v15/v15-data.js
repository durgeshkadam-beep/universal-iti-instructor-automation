/* V15 data: shared Firestore reads, realtime listeners and record-level writes. */
(function(V){
'use strict';
Object.assign(V,{
 publicSections(){return new Set(['theory','practicals','notices','holidays','exams','modules','extraTopics','visits','activities']);},
 async arr(s,q=null){const M=this.fb.M;let r=this.col(s);if(q)r=M.query(r,M.where(q.field,'==',q.value));const z=await M.getDocs(r),a=[];z.forEach(d=>{const x=d.data();if(x.data!=null)a.push(x.data);});return a;},
 async map(s,tid=null){const M=this.fb.M,o={};let r=['attendance','marks','submissions'].includes(s)?this.col(s):this.col('map_'+s);if(tid&&['attendance','marks','submissions'].includes(s))r=M.query(r,M.where('traineeId','==',tid));const z=await M.getDocs(r);z.forEach(d=>{const x=d.data();if(['attendance','marks','submissions'].includes(s)){if(x.key!=null&&x.subKey!=null){o[x.key]=o[x.key]||{};o[x.key][x.subKey]=x.data;}}else if(x.key!=null)o[x.key]=x.data;});return o;},
 async load(role){
   const M=this.fb.M;
   let z=null;
   if(this._loginWorkspaceSeed&&this._loginWorkspaceSeed.id===this.workspaceId){
     const seed=this._loginWorkspaceSeed;
     this._loginWorkspaceSeed=null;
     z={exists:()=>true,data:()=>seed.data};
   }else z=await M.getDoc(this.ws());
   if(!z.exists())throw new Error('Shared workspace is missing.');
   const w=z.data(),g=Array.isArray(DATA?.gallery)?DATA.gallery:[],u=Array.isArray(DATA?.users)?DATA.users:[];
   DATA=DATA||{};DATA.meta={...(DATA.meta||{}),...w,schemaVersion:15,appVersion:'V15'};delete DATA.meta.ownerUid;delete DATA.meta.arraySections;delete DATA.meta.mapSections;DATA.gallery=g;DATA.users=u;
   this.arraySections=new Set(w.arraySections||[]);this.mapSections=new Set(w.mapSections||[]);
   if(role==='student')await this.loadStudent();
   else{
     const jobs=[];
     for(const s of this.arraySections)if(s!=='gallery')jobs.push(this.arr(s).then(v=>({s,v})));
     for(const s of this.mapSections)jobs.push(this.map(s).then(v=>({s,v})));
     const results=await Promise.all(jobs);
     results.forEach(x=>{DATA[x.s]=x.v;});
   }
   this.suppressLocalSync=true;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));}finally{this.suppressLocalSync=false;}
 },
 async loadStudent(){
   const M=this.fb.M,tid=this.member.traineeId;if(!tid)throw new Error('Student account is not linked to a trainee record.');
   const jobs=[
     M.getDoc(M.doc(this.col('trainees'),this.esc(tid))).then(t=>({s:'trainees',v:t.exists()?[t.data().data]:[]})).catch(()=>({s:'trainees',v:[]}))
   ];
   for(const s of this.publicSections())if(this.arraySections.has(s))jobs.push(this.arr(s).then(v=>({s,v})).catch(()=>({s,v:[]})));
   for(const s of ['attendance','marks','submissions'])if(this.mapSections.has(s))jobs.push(this.map(s,tid).then(v=>({s,v})).catch(()=>({s,v:{}})));
   for(const s of ['leaves','examAttempts','projects'])if(this.arraySections.has(s))jobs.push(this.arr(s,{field:'data.traineeId',value:tid}).then(v=>({s,v})).catch(()=>({s,v:[]})));
   const results=await Promise.all(jobs);results.forEach(x=>{DATA[x.s]=x.v;});
 },
 realtime(role){this.unsubscribers.forEach(f=>{try{f();}catch(e){}});this.unsubscribers=[];if(role==='student'){const tid=this.member.traineeId;this.listenTrainee(tid);for(const s of this.publicSections())if(this.arraySections.has(s))this.listenArr(s);for(const s of ['attendance','marks','submissions'])if(this.mapSections.has(s))this.listenMap(s,tid);for(const s of ['leaves','examAttempts','projects'])if(this.arraySections.has(s))this.listenArr(s,{field:'data.traineeId',value:tid});}else{for(const s of this.arraySections)if(s!=='gallery')this.listenArr(s);for(const s of this.mapSections)this.listenMap(s);}const M=this.fb.M;this.unsubscribers.push(M.onSnapshot(this.ws(),x=>{if(!x.exists())return;DATA.meta={...(DATA.meta||{}),...x.data(),schemaVersion:15,appVersion:'V15'};delete DATA.meta.ownerUid;delete DATA.meta.arraySections;delete DATA.meta.mapSections;this.remote('meta');}));window.addEventListener('online',()=>this.schedule(100),{passive:true});},
 listenTrainee(tid){const M=this.fb.M;this.unsubscribers.push(M.onSnapshot(M.doc(this.col('trainees'),this.esc(tid)),x=>{DATA.trainees=x.exists()?[x.data().data]:[];this.remote('trainees');}));},
 listenArr(s,q=null){const M=this.fb.M;let r=this.col(s);if(q)r=M.query(r,M.where(q.field,'==',q.value));this.unsubscribers.push(M.onSnapshot(r,z=>{const a=[];z.forEach(d=>{const x=d.data();if(x.data!=null)a.push(x.data);});DATA[s]=a;this.remote(s);},e=>console.warn('V15 listener',s,e)));},
 listenMap(s,tid=null){const M=this.fb.M;let r=['attendance','marks','submissions'].includes(s)?this.col(s):this.col('map_'+s);if(tid&&['attendance','marks','submissions'].includes(s))r=M.query(r,M.where('traineeId','==',tid));this.unsubscribers.push(M.onSnapshot(r,z=>{const o={};z.forEach(d=>{const x=d.data();if(['attendance','marks','submissions'].includes(s)){if(x.key!=null&&x.subKey!=null){o[x.key]=o[x.key]||{};o[x.key][x.subKey]=x.data;}}else if(x.key!=null)o[x.key]=x.data;});DATA[s]=o;this.remote(s);},e=>console.warn('V15 map listener',s,e)));},
 remote(s){if(!this.ready)return;this.suppressLocalSync=true;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));this.shadow=this.shadow||{};this.shadow[s]=this.clone(DATA[s]);}finally{this.suppressLocalSync=false;}this.refresh();},
 schedule(ms=500){if(!this.ready||this.suppressLocalSync||this.syncing)return;clearTimeout(this.pendingTimer);this.pendingTimer=setTimeout(()=>this.diff().catch(console.error),ms);},
 staff(){return this.member?.owner||['principal','instructor'].includes(SESSION?.role||this.member?.role||'');},studentOwnArray(s,x){const t=this.member?.traineeId;return !!t&&['leaves','examAttempts'].includes(s)&&String(x?.traineeId||'')===String(t);},
 async diff(){if(!this.ready||!navigator.onLine||this.syncing)return;this.syncing=true;try{const M=this.fb.M,o=this.shadow||{},n=DATA||{},arrs=new Set([...this.arraySections,...Object.keys(n).filter(k=>Array.isArray(n[k])&&!['users','gallery'].includes(k))]);for(const s of arrs){const oa=Array.isArray(o[s])?o[s]:[],na=Array.isArray(n[s])?n[s]:[],om=new Map(oa.map((x,i)=>[this.itemId(s,x,i),x])),nm=new Map(na.map((x,i)=>[this.itemId(s,x,i),x]));for(const[id,x]of nm)if(!this.eq(x,om.get(id))&&(this.staff()||this.studentOwnArray(s,x)))await M.setDoc(M.doc(this.col(s),id),{data:this.safe(x),updatedAt:this.now(),updatedBy:this.fb.user.uid});for(const[id,x]of om)if(!nm.has(id)&&this.staff())await M.deleteDoc(M.doc(this.col(s),id));this.arraySections.add(s);}const maps=new Set([...this.mapSections,...Object.keys(n).filter(k=>n[k]&&typeof n[k]==='object'&&!Array.isArray(n[k])&&k!=='meta')]);for(const s of maps){const ov=o[s]||{},nv=n[s]||{};if(['attendance','marks','submissions'].includes(s)){for(const k of new Set([...Object.keys(ov),...Object.keys(nv)])){const a=ov[k]||{},b=nv[k]||{};for(const sk of new Set([...Object.keys(a),...Object.keys(b)])){if(this.eq(a[sk],b[sk]))continue;const can=this.staff()||(SESSION?.role==='student'&&s==='submissions'&&String(sk)===String(this.member.traineeId));if(!can)continue;const r=M.doc(this.col(s),this.esc(k+'--'+sk));if(b[sk]===undefined)await M.deleteDoc(r);else await M.setDoc(r,{key:k,subKey:sk,traineeId:sk,data:this.safe(b[sk]),updatedAt:this.now(),updatedBy:this.fb.user.uid});}}}else if(this.staff()){for(const k of new Set([...Object.keys(ov),...Object.keys(nv)])){if(this.eq(ov[k],nv[k]))continue;const r=M.doc(this.col('map_'+s),this.esc(k));if(nv[k]===undefined)await M.deleteDoc(r);else await M.setDoc(r,{key:k,data:this.safe(nv[k]),updatedAt:this.now(),updatedBy:this.fb.user.uid});}}this.mapSections.add(s);}if(this.staff()&&!this.eq(o.meta,n.meta)){const m=this.safe(n.meta||{});delete m.instructorPin;delete m.principalPin;delete m.ownerUid;await M.setDoc(this.ws(),{...m,schemaVersion:15,appVersion:'V15',arraySections:[...this.arraySections],mapSections:[...this.mapSections],updatedAt:this.now()},{merge:true});}this.shadow=this.clone(DATA);this.badge('Synced');}catch(e){console.error(e);this.badge('Sync pending');}finally{this.syncing=false;}},
 refresh(){try{Dashboard?.render?.();}catch(e){}try{Trainees?.render?.();}catch(e){}try{Notices?.render?.();}catch(e){}try{ExtraTopics?.render?.();}catch(e){}try{Holidays?.render?.();}catch(e){}try{Evaluation?.populateSelects?.();Reports?.populateSelects?.();Leave?.populateSelects?.();}catch(e){}},
 badge(t){const e=document.getElementById('v15RealtimeBadge');if(e)e.textContent='● '+t;}
});
})(window.V15Sync);
