/* =========================================================
   Universal ITI Instructor Automation — V14 Cloud & Drive
   Optional free-tier integration. Local data remains primary
   until the instructor explicitly initializes cloud sync.
   ========================================================= */

const CloudCenter = {
  VERSION: 14,
  configKey: 'iti-v14-cloud-settings',
  preUpgradeKey: 'iti-v14-pre-upgrade-snapshot',
  cfg: { firebaseConfig:'', driveClientId:'', driveFolderId:'', driveFolderName:'Universal ITI Instructor Automation', autoSync:false },
  fb: {connected:false, app:null, auth:null, db:null, user:null, mod:null},
  drive: {connected:false, accessToken:'', tokenClient:null},
  syncTimer:null,
  syncing:false,
  lastReportName:'',
  lastReportHtml:'',

  init(){
    try{ this.cfg={...this.cfg,...JSON.parse(localStorage.getItem(this.configKey)||'{}')}; }catch(e){}
    this.applySettingsToUI();
    this.renderStatus();
    this.installReportCapture();
  },

  applySettingsToUI(){
    const f=document.getElementById('cloudFirebaseConfig'); if(f)f.value=this.cfg.firebaseConfig||'';
    const d=document.getElementById('driveClientId'); if(d)d.value=this.cfg.driveClientId||'';
    const fi=document.getElementById('driveFolderId'); if(fi)fi.value=this.cfg.driveFolderId||'';
    const fn=document.getElementById('driveFolderName'); if(fn)fn.value=this.cfg.driveFolderName||'Universal ITI Instructor Automation';
    const a=document.getElementById('cloudAutoSync'); if(a)a.checked=!!this.cfg.autoSync;
  },

  saveSettings(){
    const f=document.getElementById('cloudFirebaseConfig');
    const d=document.getElementById('driveClientId');
    const fi=document.getElementById('driveFolderId');
    const fn=document.getElementById('driveFolderName');
    const a=document.getElementById('cloudAutoSync');
    if(f)this.cfg.firebaseConfig=f.value.trim();
    if(d)this.cfg.driveClientId=d.value.trim();
    if(fi)this.cfg.driveFolderId=fi.value.trim();
    if(fn)this.cfg.driveFolderName=fn.value.trim()||'Universal ITI Instructor Automation';
    if(a)this.cfg.autoSync=!!a.checked;
    localStorage.setItem(this.configKey,JSON.stringify(this.cfg));
    this.renderStatus('Settings saved on this device.');
  },

  statusEl(){return document.getElementById('cloudStatusMessage');},
  setMessage(msg,type='info'){
    const el=this.statusEl(); if(!el)return;
    el.className='callout '+(type==='error'?'cloud-error':type==='ok'?'cloud-ok':''); el.textContent=msg;
  },
  renderStatus(message){
    const fb=document.getElementById('firebaseStatusBadge');
    const dr=document.getElementById('driveStatusBadge');
    const schema=document.getElementById('dataSchemaVersion');
    if(fb){fb.textContent=this.fb.connected?`● Cloud connected — ${this.fb.user?.email||'Google user'}`:'○ Cloud not connected';fb.className='badge '+(this.fb.connected?'done':'pending');}
    if(dr){dr.textContent=this.drive.connected?'● Drive connected':'○ Drive not connected';dr.className='badge '+(this.drive.connected?'done':'pending');}
    if(schema)schema.textContent=String(DATA?.meta?.schemaVersion||this.VERSION);
    if(message)this.setMessage(message,'ok');
  },

  sanitize(v){return String(v||'workspace').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'workspace';},
  workspaceId(){
    const m=DATA?.meta||{};
    return this.sanitize(`${m.instituteCode||m.institute||'iti'}-${m.trade||'trade'}-${m.session||'session'}`);
  },
  sectionKeys(){return Object.keys(DATA||{}).filter(k=>!['gallery','users'].includes(k));},
  cloudValue(key){
    const v=JSON.parse(JSON.stringify(DATA?.[key]));
    if(key==='meta' && v){ delete v.instructorPin; delete v.principalPin; }
    if(key==='trainees' && Array.isArray(v)) v.forEach(t=>{ delete t.pin; });
    return v;
  },
  galleryIndex(){return (DATA?.gallery||[]).map(x=>({id:x.id,date:x.date,caption:x.caption,cloudNote:'Photo binary remains local/Drive archive'}));},

  async firebaseModules(){
    if(this.fb.mod)return this.fb.mod;
    const ver='12.16.0';
    const [appMod,authMod,fsMod]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${ver}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${ver}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${ver}/firebase-firestore.js`)
    ]);
    this.fb.mod={...appMod,...authMod,...fsMod}; return this.fb.mod;
  },

  parseFirebaseConfig(){
    const raw=(document.getElementById('cloudFirebaseConfig')?.value||this.cfg.firebaseConfig||'').trim();
    if(!raw)throw new Error('Paste the Firebase Web App configuration JSON first.');
    let cfg; try{cfg=JSON.parse(raw);}catch(e){throw new Error('Firebase configuration is not valid JSON.');}
    if(!cfg.apiKey||!cfg.projectId||!cfg.appId)throw new Error('Firebase config must include apiKey, projectId and appId.');
    this.cfg.firebaseConfig=raw; localStorage.setItem(this.configKey,JSON.stringify(this.cfg)); return cfg;
  },

  async connectFirebase(){
    try{
      this.setMessage('Connecting to Firebase and Google sign-in…');
      const cfg=this.parseFirebaseConfig(); const M=await this.firebaseModules();
      let app;
      try{ app=M.getApps().find(x=>x.name==='iti-v14-cloud') || M.initializeApp(cfg,'iti-v14-cloud'); }
      catch(e){ app=M.initializeApp(cfg,'iti-v14-cloud-'+Date.now()); }
      const auth=M.getAuth(app); await M.setPersistence(auth,M.browserLocalPersistence);
      const provider=new M.GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
      const result=await M.signInWithPopup(auth,provider);
      this.fb={...this.fb,connected:true,app,auth,db:M.getFirestore(app),user:result.user,mod:M};
      this.renderStatus();
      const exists=await this.cloudHasData();
      this.setMessage(exists?'Cloud connected. Existing cloud data found. Choose “Restore from Cloud” or “Push This Device → Cloud”.':'Cloud connected. No cloud workspace found yet. Push this device to initialize it.','ok');
    }catch(e){console.error(e);this.setMessage('Cloud connection failed: '+(e.message||e),'error');}
  },

  async disconnectFirebase(){
    try{if(this.fb.auth&&this.fb.mod)await this.fb.mod.signOut(this.fb.auth);}catch(e){}
    this.fb={connected:false,app:null,auth:null,db:null,user:null,mod:this.fb.mod}; this.renderStatus('Cloud disconnected. Local records are unchanged.');
  },

  sectionsCollection(){
    const M=this.fb.mod; return M.collection(this.fb.db,'itiInstructorUsers',this.fb.user.uid,'workspaces',this.workspaceId(),'sections');
  },
  async cloudHasData(){
    if(!this.fb.connected)return false;
    const snap=await this.fb.mod.getDocs(this.sectionsCollection()); return !snap.empty;
  },

  async pushNow(silent=false){
    if(!this.fb.connected){if(!silent)this.setMessage('Connect Firebase first.','error');return false;}
    if(this.syncing)return false;
    this.syncing=true;
    try{
      if(!silent)this.setMessage('Uploading current records to cloud…');
      const M=this.fb.mod, col=this.sectionsCollection(), now=new Date().toISOString();
      const keys=this.sectionKeys();
      for(const key of keys){
        await M.setDoc(M.doc(col,key),{key,value:this.cloudValue(key),schemaVersion:this.VERSION,updatedAt:now},{merge:false});
      }
      await M.setDoc(M.doc(col,'galleryIndex'),{key:'galleryIndex',value:this.galleryIndex(),schemaVersion:this.VERSION,updatedAt:now},{merge:false});
      await M.setDoc(M.doc(col,'_manifest'),{schemaVersion:this.VERSION,updatedAt:now,workspaceId:this.workspaceId(),instructor:SESSION?.name||DATA.meta?.instructor||'',trade:DATA.meta?.trade||'',session:DATA.meta?.session||''},{merge:false});
      DATA.meta.lastCloudSync=now; localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));
      this.cfg.autoSync=true; const a=document.getElementById('cloudAutoSync');if(a)a.checked=true; localStorage.setItem(this.configKey,JSON.stringify(this.cfg));
      if(!silent)this.setMessage('Cloud sync complete. Future changes will auto-sync from this device.','ok');
      this.renderStatus(); return true;
    }catch(e){console.error(e);if(!silent)this.setMessage('Cloud upload failed: '+(e.message||e),'error');return false;}
    finally{this.syncing=false;}
  },

  async restoreFromCloud(){
    if(!this.fb.connected){this.setMessage('Connect Firebase first.','error');return;}
    if(!confirm('Restore cloud records onto this device? A local safety snapshot will be created first.'))return;
    try{
      this.createLocalSafetySnapshot(true);
      this.setMessage('Downloading cloud records…');
      const snap=await this.fb.mod.getDocs(this.sectionsCollection());
      if(snap.empty){this.setMessage('No cloud data exists for this workspace.','error');return;}
      const incoming={}; snap.forEach(doc=>{const d=doc.data();if(d.key && !d.key.startsWith('_') && d.key!=='galleryIndex')incoming[d.key]=d.value;});
      if(!incoming.meta)throw new Error('Cloud workspace does not contain core metadata.');
      const localGallery=Array.isArray(DATA.gallery)?DATA.gallery:[];
      const localUsers=Array.isArray(DATA.users)?DATA.users:[]; const localMeta=DATA.meta||{};
      DATA={...DATA,...incoming,gallery:localGallery,users:localUsers,meta:{...localMeta,...(incoming.meta||{}),instructorPin:localMeta.instructorPin,principalPin:localMeta.principalPin}};
      DATA.meta.schemaVersion=this.VERSION; DATA.meta.lastCloudRestore=new Date().toISOString();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));
      this.cfg.autoSync=true; localStorage.setItem(this.configKey,JSON.stringify(this.cfg));
      alert('Cloud data restored. The app will reload now.'); location.reload();
    }catch(e){console.error(e);this.setMessage('Cloud restore failed: '+(e.message||e),'error');}
  },

  scheduleSync(){
    if(!this.fb.connected||!this.cfg.autoSync||this.syncing)return;
    clearTimeout(this.syncTimer); this.syncTimer=setTimeout(()=>this.pushNow(true),2500);
  },

  createLocalSafetySnapshot(silent=false){
    try{
      const snapshot={createdAt:new Date().toISOString(),schemaVersion:DATA?.meta?.schemaVersion||this.VERSION,data:DATA};
      localStorage.setItem(this.preUpgradeKey,JSON.stringify(snapshot));
      if(!silent)this.setMessage('Local safety snapshot created. It is separate from the live app data.','ok');
    }catch(e){if(!silent)this.setMessage('Could not create local snapshot: '+e.message,'error');}
  },

  downloadSafetyBackup(){
    const payload={backupFormat:'Universal ITI Instructor Automation',appVersion:'V14',schemaVersion:this.VERSION,exportedAt:new Date().toISOString(),data:DATA};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    this.downloadBlob(blob,`Universal-ITI-backup-${todayISO()}.json`);
    DATA.lastBackup=todayISO(); localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));
  },
  downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);},

  async loadGoogleIdentity(){
    if(window.google?.accounts?.oauth2)return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load Google Identity Services.'));document.head.appendChild(s);});
  },
  async connectDrive(){
    try{
      this.saveSettings();
      if(!this.cfg.driveClientId)throw new Error('Enter the Google OAuth Web Client ID first.');
      await this.loadGoogleIdentity();
      await new Promise((resolve,reject)=>{
        this.drive.tokenClient=google.accounts.oauth2.initTokenClient({client_id:this.cfg.driveClientId,scope:'https://www.googleapis.com/auth/drive.file',callback:(resp)=>{if(resp.error)reject(new Error(resp.error));else{this.drive.accessToken=resp.access_token;this.drive.connected=true;resolve();}}});
        this.drive.tokenClient.requestAccessToken({prompt:'consent'});
      });
      this.renderStatus('Google Drive connected. The app can create/upload only files it manages through the granted drive.file scope.');
    }catch(e){console.error(e);this.setMessage('Drive connection failed: '+(e.message||e),'error');}
  },
  disconnectDrive(){this.drive={connected:false,accessToken:'',tokenClient:null};this.renderStatus('Drive disconnected. Existing Drive files are unchanged.');},

  async driveFetch(url,opts={}){
    if(!this.drive.connected||!this.drive.accessToken)throw new Error('Connect Google Drive first.');
    const headers=new Headers(opts.headers||{});headers.set('Authorization','Bearer '+this.drive.accessToken);
    const res=await fetch(url,{...opts,headers}); if(!res.ok){const t=await res.text();throw new Error(`Drive API ${res.status}: ${t.slice(0,240)}`);} return res;
  },
  async ensureDriveFolder(){
    if(this.cfg.driveFolderId)return this.cfg.driveFolderId;
    const name=this.cfg.driveFolderName||'Universal ITI Instructor Automation';
    const meta={name,mimeType:'application/vnd.google-apps.folder'};
    const res=await this.driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(meta)});
    const obj=await res.json(); this.cfg.driveFolderId=obj.id; localStorage.setItem(this.configKey,JSON.stringify(this.cfg)); const fi=document.getElementById('driveFolderId');if(fi)fi.value=obj.id; return obj.id;
  },
  async uploadDriveBlob(blob,fileName,mimeType){
    const folderId=await this.ensureDriveFolder();
    const boundary='-------iti'+Math.random().toString(36).slice(2);
    const metadata={name:fileName,parents:[folderId]};
    const body=new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,blob,`\r\n--${boundary}--`
    ],{type:`multipart/related; boundary=${boundary}`});
    const res=await this.driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
    return res.json();
  },
  async saveBackupToDrive(){
    try{
      const blob=new Blob([JSON.stringify({backupFormat:'Universal ITI Instructor Automation',appVersion:'V14',schemaVersion:this.VERSION,exportedAt:new Date().toISOString(),data:DATA},null,2)],{type:'application/json'});
      const obj=await this.uploadDriveBlob(blob,`Universal-ITI-Backup-${todayISO()}.json`,'application/json');
      DATA.lastBackup=todayISO(); localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));
      this.setMessage(`Backup saved to Drive: ${obj.name}`,'ok');
    }catch(e){console.error(e);this.setMessage('Drive backup failed: '+(e.message||e),'error');}
  },

  installReportCapture(){
    if(typeof Reports==='undefined'||Reports.__cloudCaptureInstalled)return;
    Reports.__cloudCaptureInstalled=true;
    const originalMark=Reports.markPending.bind(Reports);
    Reports.markPending=(key)=>{this.lastReportName=key;return originalMark(key);};
    const originalDo=Reports.doPrint.bind(Reports);
    Reports.doPrint=(html)=>{this.lastReportHtml=html;return originalDo(html);};
  },
  async ensureHtml2Pdf(){
    if(window.html2pdf)return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.14.0/html2pdf.bundle.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Could not load the PDF helper library. Internet is required for this action.'));document.head.appendChild(s);});
  },
  safeFileName(v){return String(v||'ITI-Report').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,120);},
  async reportPdfBlob(){
    if(!this.lastReportHtml)throw new Error('Generate a report first. Then use “Save Last Generated Report to Drive”.');
    await this.ensureHtml2Pdf();
    const stage=document.createElement('div');stage.className='drive-pdf-stage';stage.innerHTML=this.lastReportHtml;document.body.appendChild(stage);
    try{
      return await html2pdf().set({margin:[8,8,10,8],filename:'report.pdf',image:{type:'jpeg',quality:.96},html2canvas:{scale:1.4,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(stage).toPdf().outputPdf('blob');
    }finally{stage.remove();}
  },
  async saveLastReportToDrive(){
    try{
      const blob=await this.reportPdfBlob();
      const name=this.safeFileName(this.lastReportName||'ITI Report')+' - '+todayISO()+'.pdf';
      const obj=await this.uploadDriveBlob(blob,name,'application/pdf');
      this.setMessage(`Report PDF saved to Drive: ${obj.name}`,'ok');
    }catch(e){console.error(e);this.setMessage('Report upload failed: '+(e.message||e),'error');}
  }
};

window.CloudCenter=CloudCenter;
document.addEventListener('DOMContentLoaded',()=>CloudCenter.init());
