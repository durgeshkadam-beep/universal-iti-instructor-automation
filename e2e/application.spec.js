const {test,expect}=require('@playwright/test');
const testPassword=process.env.ITI_EMULATOR_TEST_PASSWORD;
if(!testPassword)throw Error('Run browser tests through the emulator test runner.');
for(const desired of ['admin','principal'])test('verified Google delegate opens '+desired+' view using the same Instructor UID without replacing root',async({page})=>{
 await page.route(/https:\/\/.*/,r=>r.abort());await page.goto('/v15/index.html');await page.waitForFunction(()=>window.V15Sync?.resolveAdminMembership);await page.addScriptTag({url:'/.tmp/test-sdk.js'});
 const actual=await page.evaluate(async desired=>{
  const V=V15Sync,M=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;
  const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});M.connectFirestoreEmulator(db,'127.0.0.1',8080);
  await M.signInWithCredential(auth,M.GoogleAuthProvider.credential(JSON.stringify({sub:'synthetic-google-admin',email:'google-admin@example.test',email_verified:true})));
  localStorage.setItem('iti-v15-role-v2',desired);localStorage.setItem('iti-v15-email-v2','google-admin@example.test');window.ITI_RUNTIME={apiUrl:'http://127.0.0.1:8787/api'};await V.login({interactive:false});
  const token=await auth.currentUser.getIdTokenResult();return {uid:auth.currentUser.uid,provider:token.claims.firebase.sign_in_provider};
 },desired);
 expect(actual).toEqual({uid:'google-admin',provider:'google.com'});await expect.poll(()=>page.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole()}))).toEqual({ready:true,role:desired});await expect(page.locator('#appShell')).toBeVisible();
 const retained=await page.evaluate(async()=>{const V=V15Sync,M=V.fb.M;return {root:(await M.getDoc(V.inst())).data().ownerUid,role:(await M.getDoc(V.memberRef())).data().role,assigned:(await M.getDoc(V.memberRef())).data().workspaceIds};});
 expect(retained).toEqual({root:'admin',role:'instructor',assigned:[]});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('authenticator challenge UI with synthetic provider stays contained and cancels without opening the app',async({page})=>{
 await page.route(/https:\/\/.*/,r=>r.abort());await page.goto('/v15/index.html');
 await page.waitForFunction(()=>window.V15Sync?.firebaseSignIn);
 await page.evaluate(()=>{
  const M={getMultiFactorResolver:()=>({hints:[{factorId:'totp',uid:'synthetic-factor',displayName:'Synthetic authenticator'}],resolveSignIn:async()=>{throw Error('No provider call expected in cancellation check');}}),TotpMultiFactorGenerator:{FACTOR_ID:'totp'}};
  window.mfaTestOutcome='pending';V15Sync.firebaseSignIn(M,{},async()=>{throw Object.assign(Error('Synthetic MFA challenge'),{code:'auth/multi-factor-auth-required'});}).then(()=>window.mfaTestOutcome='unexpected-success',()=>window.mfaTestOutcome='cancelled');
 });
 await expect(page.getByRole('form',{name:'Authenticator verification'})).toBeVisible();
 await expect(page.getByLabel('Authenticator code',{exact:true})).toHaveAttribute('autocomplete','one-time-code');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.getByRole('button',{name:'Cancel verification',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.mfaTestOutcome)).toBe('cancelled');
 await expect(page.locator('#v15MfaChallenge')).toHaveCount(0);await expect(page.locator('#appShell')).not.toBeVisible();
 expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
});
async function login(page,role){
 // No production request is permitted in tests. Use real Auth/Firestore emulators and local SDK.
 await page.route(/https:\/\/.*/,r=>r.abort());
 await page.goto('/v15/index.html');
 await page.waitForFunction(()=>window.V15Sync?.renderSecureExams);
 await page.addScriptTag({url:'/.tmp/test-sdk.js'});
 await page.evaluate(async ({role,password})=>{
  const V=V15Sync,M=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};
  V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;
  const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);
  M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});M.connectFirestoreEmulator(db,'127.0.0.1',8080);
  await M.signInWithEmailAndPassword(auth,role+'@example.test',password);
  localStorage.setItem('iti-v15-role-v2',role);localStorage.setItem('iti-v15-email-v2',role+'@example.test');
  window.ITI_RUNTIME={apiUrl:'http://127.0.0.1:8787/api'};
  await V.login({interactive:false});
  return {ready:V.ready,role:V.currentRole(),message:document.querySelector('#v15LoginStatus')?.textContent};
 },{role,password:testPassword});
 // A restored session can already own the in-progress login. Wait for its
 // observable completion instead of treating the busy-guard return as failure.
 await expect.poll(()=>page.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole(),message:document.querySelector('#v15LoginStatus')?.textContent})),{timeout:30000}).toMatchObject({ready:true,role});
 await expect(page.locator('#appShell')).toBeVisible();
}
for(const role of ['admin','principal','instructor','staff','student'])test(role+' actual login, every route and mobile containment',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,role);
 if(role!=='admin'){
  await page.evaluate(()=>V15Sync.finalOpenTab('dashboard'));
  await expect(page.locator('#v15QuickStart')).toHaveCount(1);
  expect(await page.locator('#v15QuickStart button').evaluateAll(buttons=>buttons.every(button=>{const box=button.getBoundingClientRect();return [...button.children].every(child=>{const text=child.getBoundingClientRect();return text.top>=box.top&&text.bottom<=box.bottom;});}))).toBeTruthy();
  if(role==='student'&&test.info().project.name==='mobile')await page.locator('#v15QuickStart').screenshot({path:'.tmp/simple-student-mobile.png'});
  const targets=await page.locator('#v15QuickStart button').evaluateAll(nodes=>nodes.map(n=>n.dataset.quickTab));
  expect(targets).toHaveLength(3);
  for(const target of targets){
   await page.locator('#v15QuickStart button[data-quick-tab="'+target+'"]').click();
   await expect(page.locator('#tab-'+target)).toHaveClass(/active/);
   await page.evaluate(()=>V15Sync.finalOpenTab('dashboard'));
   await expect(page.locator('#v15QuickStart')).toHaveCount(1);
  }
 }
 const tabs=await page.locator('#tabs .tab').evaluateAll(nodes=>nodes.map(n=>n.dataset.tab));
 for(const tab of tabs){
  await page.evaluate(tab=>V15Sync.finalOpenTab(tab),tab);
  await expect(page.locator('#tab-'+tab)).toHaveClass(/active/);
  await expect(page.locator('#tab-'+tab)).not.toContainText('Page could not load');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),role+' '+tab+' width').toBeTruthy();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 expect(errors).toEqual([]);
 if(test.info().project.name==='mobile')await page.screenshot({path:'.tmp/'+role+'-mobile.png',fullPage:true});
 // Visiting an unauthorized route returns the role's dashboard.
 if(role!=='admin'){await page.evaluate(()=>V15Sync.finalOpenTab('admin-console'));await expect(page.locator('#tab-dashboard')).toHaveClass(/active/);}
});
test('student guided practice stays usable offline without an online assistance service',async({page,context})=>{
 await login(page,'student');
 await page.evaluate(()=>{window.ITI_RUNTIME.apiUrl='';return V15Sync.finalOpenTab('career-coach');});
 await expect(page.getByRole('button',{name:'Request optional AI draft'})).toHaveCount(0);
 await expect(page.getByLabel('I consent')).toHaveCount(0);
 await context.setOffline(true);
 for(const lang of ['mr','hi','en']){await page.locator('#coach-language').selectOption(lang);await page.getByRole('button',{name:'Start free guided practice'}).click();await expect(page.locator('#coach-output')).not.toBeEmpty();}
 await context.setOffline(false);
 await page.evaluate(()=>V15Sync.finalOpenTab('exams'));
 await expect(page.locator('#tab-exams')).toContainText('Online tests are not yet available');
 await page.getByRole('button',{name:'Back to dashboard'}).click();
 await expect(page.locator('#tab-dashboard')).toHaveClass(/active/);
});
test('student private skill plan, multilingual assistance and protected exam through HTTP',async({page})=>{
 await login(page,'student');
 await page.evaluate(()=>V15Sync.finalOpenTab('skills'));
 await page.getByLabel('Self assessment for practical 1').selectOption('learning');
 await page.evaluate(()=>V15Sync.finalOpenTab('skill-gap'));
 await page.locator('#v15CareerRole').fill('Synthetic Layout Operator');
 await page.getByRole('button',{name:'Save personal learning plan'}).click();
 await expect(page.locator('#tab-skill-gap')).toContainText('Private learning plan synced');
 await page.evaluate(()=>V15Sync.finalOpenTab('career-coach'));
 for(const lang of ['mr','hi','en']){await page.locator('#coach-language').selectOption(lang);await page.getByRole('button',{name:'Start free guided practice'}).click();await expect(page.locator('#coach-output')).not.toBeEmpty();}
 await expect(page.locator('#coach-ai-status')).toContainText('AI-generated drafts are not enabled');
 await expect(page.getByLabel('I consent')).toHaveCount(0);await expect(page.getByRole('button',{name:'Request optional AI draft'})).toHaveCount(0);
 await page.evaluate(()=>V15Sync.finalOpenTab('exams'));
 const originalExam=page.locator('#tab-exams section').filter({has:page.getByRole('heading',{name:'Synthetic browser test',exact:true})});
 await originalExam.getByRole('button',{name:'Start / resume test'}).click();
 const radio=originalExam.getByLabel('Four',{exact:true});
 await expect.poll(async()=> (await radio.count()) || ((await page.locator('#tab-exams').textContent()).includes('Result:')?1:0)).toBe(1);
 if(await radio.count()){await radio.check();await page.getByRole('button',{name:'Submit answers for server grading'}).click();}
 await expect(page.locator('#tab-exams')).toContainText('Result: 1 / 1');
 expect(await page.evaluate(()=>localStorage.getItem('dtpoAppData_v1'))).toBeNull();
});

test('instructor creates a reviewed MCQ with the form and student receives server grading',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('exams'));
 const form=page.locator('#exam-publisher'),publish=form.getByRole('button',{name:'Publish protected exam'});
 // Required answers/review prevent an accidental publication. Bad schedules
 // remain editable, and a failed HTTP request must retain the teacher's work.
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toBeEmpty();
 const title='Synthetic form exam '+test.info().project.name+' '+Date.now();
 await form.getByLabel('Test title',{exact:true}).fill(title);
 await form.getByRole('button',{name:'Add question'}).click();
 await expect(form.locator('fieldset')).toHaveCount(2);
 await form.locator('fieldset').nth(1).getByRole('button',{name:'Remove question'}).click();
 await expect(form.locator('fieldset')).toHaveCount(1);
 await expect(form.getByRole('button',{name:'Remove question'})).toBeDisabled();
 const question=form.locator('fieldset');
 await question.getByLabel('Question text',{exact:true}).fill('Synthetic layout question: which format preserves page layout for printing?');
 for(const [i,option] of ['TXT','PDF','CSV','LOG'].entries())await question.getByLabel('Option '+(i+1),{exact:true}).fill(option);
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toBeEmpty();
 await question.getByLabel('Correct answer',{exact:true}).selectOption('1');
 await form.getByLabel('I reviewed the questions').check();
 const times=await page.evaluate(()=>{const local=t=>{const d=new Date(t);return new Date(t-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};return {open:local(Date.now()-60000),close:local(Date.now()+3600000)};});
 await form.getByLabel('Opens at',{exact:true}).fill(times.open);await form.getByLabel('Closes at',{exact:true}).fill(times.open);
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Closing time must be later');
 await form.getByLabel('Closes at',{exact:true}).fill(times.close);
 const endpoint='http://127.0.0.1:8787/api';await page.route(endpoint,r=>r.abort());
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Your form is retained');
 await expect(form.getByLabel('Test title',{exact:true})).toHaveValue(title);await page.unroute(endpoint);
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Exam published with private answer key. Students can now open it');
 await expect(publish).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 const studentContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});
 try{
  const student=await studentContext.newPage();await login(student,'student');await student.evaluate(()=>V15Sync.finalOpenTab('exams'));
  await student.evaluate(()=>Promise.all([V15Sync.renderSecureExams(),V15Sync.renderSecureExams()]));
  await expect(student.locator('#exam-publisher')).toHaveCount(0);
  const card=student.locator('#tab-exams section').filter({has:student.getByRole('heading',{name:title,exact:true})});
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'Start / resume test'}).click();await card.getByLabel('PDF',{exact:true}).check();
  await card.getByRole('button',{name:'Submit answers for server grading'}).click();await expect(card).toContainText('Result: 1 / 1');
  await login(student,'student');
  await student.evaluate(()=>V15Sync.finalOpenTab('exams'));await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'Start / resume test'}).click();await expect(card).toContainText('Result: 1 / 1');
 }finally{await studentContext.close();}
});
test('instructor assessment is visible to student; offline queue flush preserves concurrent work',async({page,context,browser})=>{
 await login(page,'instructor');
 page.on('dialog',d=>d.accept());
 await page.evaluate(()=>V15Sync.finalOpenTab('skill-review'));
 await page.locator('#v15SkillReviewStudent').selectOption('student');
 await page.getByLabel('Evidence for practical 1').fill('Synthetic supervised layout assessment');
 await page.getByLabel('Evidence for practical 1').locator('..').getByRole('button').click();
 await expect(page.locator('#tab-skill-review')).toContainText('Saved to Firebase');
 // Capture an offline attendance change with the real implemented diff and queue.
 await context.setOffline(true);
 const date=test.info().project.name==='mobile'?'2026-09-02':'2026-09-01';
 await page.evaluate(async date=>{DATA.attendance[date]={t1:'P'};await V15Sync.diff();},date);
 expect(await page.evaluate(()=>V15Sync.queueRead().some(x=>x.section==='attendance'))).toBeTruthy();
 await context.setOffline(false);
 await page.evaluate(()=>V15Sync.flushQueue());
 await expect.poll(()=>page.evaluate(()=>V15Sync.queueRead().length)).toBe(0);
 const confirmed=await page.evaluate(async date=>{const V=V15Sync,M=V.fb.M;return (await M.getDoc(M.doc(V.col('attendance'),V.esc(date+'--t1')))).data().data;},date);expect(confirmed).toBe('P');
 const studentContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});const studentPage=await studentContext.newPage();await login(studentPage,'student');await studentPage.evaluate(()=>V15Sync.finalOpenTab('skills'));await expect(studentPage.locator('#v15VerifiedSkills')).toContainText('Synthetic supervised layout assessment');await studentContext.close();
});

// Verify the actual deployment bundle, not the source checkout.
test('hosting bundle keeps backend and repository files private',async({request})=>{for(const file of ['/server/service.js','/server/.env','/package.json','/firestore.rules','/.git/config'])expect((await request.get(file)).status()).toBe(404);expect((await request.get('/build-manifest.json')).status()).toBe(200);});
test('staging password form rejects bad credentials and authenticates assigned student',async({page})=>{
 await page.route(/https:\/\/.*/,r=>r.abort());await page.goto('/v15/index.html');
 await page.waitForFunction(()=>window.V15Sync?.renderSecureExams);await page.addScriptTag({url:'/.tmp/test-sdk.js'});
 await page.evaluate(()=>{
  const V=V15Sync,M=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};
  V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;
  const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);
  M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});M.connectFirestoreEmulator(db,'127.0.0.1',8080);
  window.ITI_RUNTIME={staging:true,instituteLoginDomain:'example.test',firebaseConfig:{projectId:'demo-iti-staging'},apiUrl:''};
 });
 await page.addScriptTag({url:'/v15/v15-staging-login.js'});
 await expect(page.locator('#stagingNotice')).toContainText('Institute records — authorised access only.');
 await page.locator('#loginRole').selectOption('student');await page.locator('#v15ExpectedEmail').fill('student@example.test');
 await page.locator('#stagingPassword').fill(testPassword+'invalid');await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('Staging sign-in failed');
 expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 await page.locator('#loginRole').selectOption('admin');await page.locator('#stagingPassword').fill(testPassword);await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('Staging sign-in failed');
 expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 expect(await page.evaluate(()=>V15Sync.fb.auth.currentUser)).toBeNull(); // Rejected role must also clear the authenticated session.
 await page.locator('#loginRole').selectOption('student');
 await page.locator('#v15ExpectedEmail').fill('student'); // Institute ID shorthand maps to existing Firebase Auth identity.
 await page.locator('#stagingPassword').fill(testPassword);await page.locator('#stagingSignIn').click();
 await expect(page.locator('#appShell')).toBeVisible();expect(await page.evaluate(()=>V15Sync.currentRole())).toBe('student');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('a newly created module survives cloud sync and a fresh login',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('modules'));
 const name='Synthetic persisted module '+test.info().project.name;
 await page.locator('#moduleName').fill(name);await page.locator('#moduleCode').fill('SYNC-'+test.info().project.name);
 await page.getByRole('button',{name:'Create Module'}).click();
 await expect(page.locator('#moduleManagerBody')).toContainText(name);
 await expect.poll(()=>page.evaluate(async name=>{const V=V15Sync,M=V.fb.M;const [records,workspace]=await Promise.all([M.getDocs(V.col('modules')),M.getDoc(V.ws())]);return {saved:records.docs.some(d=>d.data().data?.name===name),registered:workspace.data()?.arraySections?.includes('modules')===true};},name)).toEqual({saved:true,registered:true});
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('modules'));
 await expect(page.locator('#moduleManagerBody')).toContainText(name);
});

test('module manager treats imported markup and opaque identifiers as text',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('modules'));
 await page.evaluate(()=>{
  const markup='<img src=x onerror="window.moduleInjection=true">',id="x');window.moduleInjection=true;//";
  DATA.modules=[{id,code:'Synthetic',name:markup,description:markup,hours:markup,topics:[{id,type:markup,title:markup,hours:markup}]}];ModuleManager.refresh();
 });
 const body=page.locator('#moduleManagerBody');
 await expect(body.locator('img,script,[onclick],[onerror]')).toHaveCount(0);
 await expect(body).toContainText('<img src=x onerror="window.moduleInjection=true">');
 expect(await page.evaluate(()=>window.moduleInjection)).toBeUndefined();
 const dialog=page.waitForEvent('dialog'),click=body.getByRole('button',{name:'Delete',exact:true}).click();
 const confirmation=await dialog;expect(confirmation.message()).toContain('<img src=x');await confirmation.dismiss();await click;
 await expect(body.locator('tbody tr')).toHaveCount(1);
});

test('syllabus tables keep hostile fields inert and reject stale completion dialogs',async({page})=>{
 await login(page,'instructor');
 for(const kind of ['practical','theory']){
  await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);
  await page.evaluate(kind=>{const V=V15Sync;V.suppressLocalSync=true;clearTimeout(V.pendingTimer);const key=kind==='practical'?'practicals':'theory';window.syllabusOriginal=DATA[key];const markup='<img src=x onerror="window.syllabusInjection=true">';DATA[key]=[{no:"x');window.syllabusInjection=true;//",title:markup,unit:markup,hours:markup,sequence:1,status:'pending'}];(kind==='practical'?Practicals:Theory).render();},kind);
  const body=page.locator('#'+kind+'TableBody'),modal=page.locator('#'+kind+'EditModal');
  await expect(body.locator('img,script,[onclick],[onchange],[onerror]')).toHaveCount(0);await expect(body).toContainText('<img src=x');
  await body.locator('summary').click();await body.getByRole('button',{name:'Edit',exact:true}).click();await expect(modal.locator('textarea')).toHaveValue('<img src=x onerror="window.syllabusInjection=true">');await modal.getByRole('button',{name:'Cancel',exact:true}).click();
  await body.getByRole('button',{name:'Mark Complete',exact:true}).click();await expect(page.locator('#markCompleteItemLabel')).toContainText('<img src=x');
  await page.evaluate(kind=>{const key=kind==='practical'?'practicals':'theory';DATA[key]=[{...DATA[key][0],title:'Replacement topic'}];},kind);
  const dialog=page.waitForEvent('dialog'),click=page.locator('#markCompleteModal').getByRole('button',{name:'Confirm',exact:true}).click();const warning=await dialog;expect(warning.message()).toContain('syllabus changed');await warning.dismiss();await click;
  expect(await page.evaluate(kind=>DATA[kind==='practical'?'practicals':'theory'][0].status,kind)).toBe('pending');expect(await page.evaluate(()=>window.syllabusInjection)).toBeUndefined();
  await page.evaluate(kind=>{DATA[kind==='practical'?'practicals':'theory']=window.syllabusOriginal;delete window.syllabusOriginal;V15Sync.suppressLocalSync=false;},kind);
 }
});

test('Instructor syllabus forms and dated completion persist through real cloud sync',async({page})=>{
 await login(page,'instructor');const titles={};
 // Hold the real flush to exercise saves made while an earlier network sync is busy.
 await page.evaluate(()=>{const V=V15Sync,base=V.flushQueue.bind(V);let release;const held=new Promise(r=>{release=r;});V.flushQueue=async()=>{await held;return base();};window.releaseSyllabusFlush=()=>{V.flushQueue=base;release();};});
 for(const kind of ['practical','theory']){
  await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);
  const title='Synthetic '+kind+' "Layout & print" '+test.info().project.name+' '+Date.now();titles[kind]=title;
  await page.getByRole('button',{name:kind==='practical'?'+ Add Custom Practical':'+ Add Theory Topic',exact:true}).click();
  const modal=page.locator('#'+kind+'EditModal');await modal.locator('textarea').fill(title);if(kind==='practical'){await page.locator('#pracEditUnit').fill('Synthetic publishing');await page.locator('#pracEditHours').fill('2');}
  await modal.getByRole('button',{name:'Save',exact:true}).click();const row=page.locator('#'+kind+'TableBody tr').filter({hasText:title});await expect(row).toHaveCount(1);
  await row.locator('input[type=date]').fill('2026-10-22');await row.getByRole('button',{name:'Mark Complete',exact:true}).click();await page.locator('#markCompleteDate').fill('2026-10-23');await page.locator('#markCompleteModal').getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toContainText('Done 2026-10-23');
  await expect.poll(()=>page.evaluate(title=>V15Sync.queueRead().some(o=>o.value?.title===title&&o.value.status==='completed'&&o.value.plannedDate==='2026-10-22'),title)).toBe(true);
 }
 await page.evaluate(()=>window.releaseSyllabusFlush());
 try{ for(const kind of ['practical','theory'])await expect.poll(()=>page.evaluate(async ({kind,title})=>{const V=V15Sync,M=V.fb.M,z=await M.getDocs(V.col(kind==='practical'?'practicals':'theory'));return z.docs.some(d=>{const x=d.data().data;return x?.title===title&&x.status==='completed'&&x.doneDate==='2026-10-23'&&x.plannedDate==='2026-10-22';});},{kind,title:titles[kind]})).toBe(true);}catch(e){await test.info().attach('syllabus-form-sync-state',{contentType:'application/json',body:JSON.stringify(await page.evaluate(titles=>{const V=V15Sync;return {ready:V.ready,workspace:V.workspaceId,syncing:V.syncing,flushing:V._queueFlushing,local:Object.fromEntries(['practicals','theory'].map(k=>[k,DATA[k].filter(x=>Object.values(titles).includes(x.title))])),shadow:Object.fromEntries(['practicals','theory'].map(k=>[k,V.shadow?.[k]?.filter(x=>Object.values(titles).includes(x.title))])),pending:V.queueRead().filter(o=>Object.values(titles).includes(o.value?.title))};},titles))});throw e;}
 await login(page,'instructor');for(const kind of ['practical','theory']){await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);const row=page.locator('#'+kind+'TableBody tr').filter({hasText:titles[kind]});await expect(row).toHaveCount(1);await expect(row).toContainText('Done 2026-10-23');await expect(row.getByRole('button',{name:'Mark Complete'})).toHaveCount(0);}
});

test('reviewed plan text and HTTPS materials persist and Student can open the correct notes',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('practicals'));
 const row=page.locator('#practicalTableBody tr').filter({has:page.locator('td:first-child').filter({hasText:/^1$/})});await row.getByRole('button',{name:'View Plan',exact:true}).click();const modal=page.locator('#planModal');
 await modal.getByLabel('Notes PDF link',{exact:true}).fill('javascript:alert(1)');await modal.getByRole('button',{name:'Save Materials',exact:true}).click();await expect(modal.locator('#planMaterialsStatus')).toContainText('valid absolute HTTPS');
 const notes='https://example.test/synthetic-notes.pdf',video='https://youtu.be/synthetic';await modal.getByLabel('Notes PDF link',{exact:true}).fill(notes);await modal.getByLabel('YouTube video link',{exact:true}).fill(video);page.once('dialog',d=>d.accept());await modal.getByRole('button',{name:'Save Materials',exact:true}).click();
 await modal.getByRole('button',{name:'Edit Text Sections',exact:true}).click();const objective='Synthetic reviewed objective '+test.info().project.name+' '+Date.now();await modal.locator('#planField_objective').fill(objective);page.once('dialog',d=>d.accept());await modal.getByRole('button',{name:'Save & View Full Plan',exact:true}).click();await expect(modal.locator('.plan-document-wrap')).toContainText(objective);
 try{ await expect.poll(()=>page.evaluate(async ({notes,objective})=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('practicals'));return z.docs.some(d=>{const x=d.data().data;return x?.no===1&&x.materials?.pdfLink===notes&&x.plan?.objective?.includes(objective);});},{notes,objective})).toBe(true);}catch(e){await test.info().attach('plan-sync-state',{contentType:'application/json',body:JSON.stringify(await page.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole(),flushing:V15Sync._queueFlushing,syncing:V15Sync.syncing,local:DATA.practicals.filter(x=>String(x.no)==='1'),shadow:V15Sync.shadow?.practicals?.filter(x=>String(x.no)==='1'),pending:V15Sync.queueRead().filter(o=>o.section==='practicals')})))});throw e;}
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('practicals'));await row.getByRole('button',{name:'View Plan',exact:true}).click();await expect(modal.locator('.plan-document-wrap')).toContainText(objective);
 const popupPromise=page.waitForEvent('popup');await modal.getByRole('button',{name:'Print / Save PDF',exact:true}).click();const popup=await popupPromise;await expect(popup.locator('body')).toContainText(objective);await popup.close();
 const context=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});try{const student=await context.newPage();await login(student,'student');await student.evaluate(()=>V15Sync.finalOpenTab('practicals'));const studentRow=student.locator('#practicalTableBody tr').filter({has:student.locator('td:first-child').filter({hasText:/^1$/})});await studentRow.getByRole('button',{name:'View Notes',exact:true}).click();await expect(student.locator('#planModal').getByRole('link',{name:'Open Notes PDF'})).toHaveAttribute('href',notes);await expect(student.locator('#planModal').getByRole('link',{name:'Watch on YouTube'})).toHaveAttribute('href',video);await expect(student.locator('#planModal').getByRole('button',{name:'Save Materials'})).toHaveCount(0);await expect(student.locator('#planModal').getByRole('button',{name:'Edit Text Sections'})).toHaveCount(0);}finally{await context.close();}
});

test('plan preview keeps imported fields inert and rejects a stale editor',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('practicals'));
 await page.evaluate(()=>{const V=V15Sync;V.suppressLocalSync=true;clearTimeout(V.pendingTimer);const payload='<img src=x onerror="window.planInjection=true">';DATA.practicals=[{no:"opaque');window.planInjection=true;//",title:payload,hours:2,plan:{objective:'Legacy scalar objective',steps:'Malformed steps'},planMeta:{status:payload,version:payload},materials:{pdfLink:'" autofocus onfocus="window.planInjection=true',youtubeLink:'javascript:alert(1)',updatedDate:payload}}];Practicals.render();});
 await page.locator('#practicalTableBody').getByRole('button',{name:'View Plan',exact:true}).click();const modal=page.locator('#planModal');await expect(modal.locator('#planModalBody').locator('img,[onerror],[onfocus],[onclick]')).toHaveCount(0);await expect(modal.locator('.plan-document-wrap')).toContainText('<img src=x');await modal.getByRole('button',{name:'Edit Text Sections'}).click();await expect(modal.locator('#planField_objective')).toHaveValue('Legacy scalar objective');
 const workspace=await page.evaluate(()=>V15Sync.workspaceId);await page.evaluate(()=>{V15Sync.workspaceId='changed-test-workspace';});const dialog=page.waitForEvent('dialog'),click=modal.getByRole('button',{name:'Save & View Full Plan'}).click();const warning=await dialog;expect(warning.message()).toContain('changed');await warning.dismiss();await click;await expect(modal).toBeHidden();expect(await page.evaluate(()=>window.planInjection)).toBeUndefined();await page.evaluate(workspace=>{V15Sync.workspaceId=workspace;},workspace);
});

test('Student leave approval is atomic across locked months and persists after Principal reopen',async({page,browser})=>{
 await login(page,'student');await page.evaluate(()=>V15Sync.finalOpenTab('leave'));const reason='Synthetic atomic leave '+test.info().project.name+' '+Date.now();await page.locator('#leaveType').selectOption('Medical');await page.locator('#leaveFrom').fill('2040-10-31');await page.locator('#leaveTo').fill('2040-11-01');await page.locator('#leaveReason').fill(reason);await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.locator('#v15LeaveStatus')).toContainText('pending Instructor review');
 await expect.poll(()=>page.evaluate(async reason=>{const V=V15Sync,M=V.fb.M,z=await M.getDocs(M.query(V.col('leaves'),M.where('data.traineeId','==',V.member.traineeId)));return z.docs.some(d=>d.data().data.reason===reason&&d.data().data.status==='pending');},reason)).toBe(true);
 const instructorContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'}),principalContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});
 try{
  const instructor=await instructorContext.newPage(),principal=await principalContext.newPage();await login(instructor,'instructor');await login(principal,'principal');
  await instructor.evaluate(async()=>{const V=V15Sync;await V.fb.M.setDoc(V.lockRef('2040-11'),{month:'2040-11',status:'submitted',submittedBy:V.fb.user.uid,submittedAt:V.now(),updatedAt:V.now()},{merge:true});});await instructor.evaluate(()=>V15Sync.finalOpenTab('leave'));const row=instructor.locator('#leaveTableBody tr').filter({hasText:reason});await expect(row).toHaveCount(1);await row.getByRole('button',{name:'Approve',exact:true}).click();await expect(instructor.locator('#v15LeaveStatus')).toContainText('locked');await expect(row).toContainText('Pending');
  const state=()=>instructor.evaluate(async reason=>{const V=V15Sync,M=V.fb.M,z=await M.getDocs(V.col('leaves')),leave=z.docs.find(d=>d.data().data.reason===reason)?.data().data;const a=await M.getDoc(M.doc(V.col('attendance'),V.esc('2040-10-31--t1')));return {status:leave.status,attendance:a.exists()?a.data().data:null};},reason);
  expect((await state()).status).toBe('pending'); // The open month must not receive a partial write.
  await principal.evaluate(()=>V15Sync.reviewAttendanceMonth('w1','2040-11','reopened','Synthetic leave approval test'));
  await row.getByRole('button',{name:'Approve',exact:true}).click();await expect(instructor.locator('#v15LeaveStatus')).toContainText('all requested attendance dates saved together');await expect.poll(state).toMatchObject({status:'approved',attendance:'L'});
  await expect(page.locator('#leaveTableBody tr').filter({hasText:reason})).toContainText('Approved'); // Realtime update on the already-open Student screen.
  // Simulate a committed request whose local acknowledgement was interrupted before review.
  await page.context().setOffline(true);
  const nextId=await page.evaluate(reason=>{
   const V=V15Sync,approved=DATA.leaves.find(x=>x.reason===reason),pending={...approved,status:'pending'};
   delete pending.reviewedAt;delete pending.reviewedBy;
   const enqueue=value=>V.queuePush({workspaceId:V.workspaceId,kind:'array',section:'leaves',docId:value.id,action:'set',value,data:{data:value,updatedAt:V.now(),updatedBy:V.fb.user.uid}});
   enqueue(pending);const next={...pending,id:crypto.randomUUID(),reason:reason+' next request'};enqueue(next);
   V.applyQueuedToSection('leaves');V.refresh();return next.id;
  },reason);
  await expect(page.locator('#leaveTableBody tr').filter({hasText:reason}).first()).toContainText('Approved');
  expect(await page.evaluate(()=>V15Sync.queueRead().length)).toBe(2);
  await page.context().setOffline(false);
  await expect.poll(()=>page.evaluate(()=>V15Sync.queueRead().length)).toBe(0);
  const replayState=await page.evaluate(async nextId=>{const V=V15Sync,M=V.fb.M,z=await M.getDocFromServer(M.doc(V.col('leaves'),nextId));return {next:z.data()?.data.status};},nextId);
  expect(replayState.next).toBe('pending');
  await login(page,'student');await page.evaluate(()=>V15Sync.finalOpenTab('leave'));
  await expect(page.locator('#leaveTableBody tr').filter({hasText:reason}).filter({hasNotText:'next request'})).toContainText('Approved');
  await expect(page.locator('#leaveTableBody tr').filter({hasText:reason+' next request'})).toContainText('Pending');
 }finally{await instructorContext.close();await principalContext.close();}
});

test('clients cannot forge leave reviews and the backend rejects leave without changing attendance',async({page,browser})=>{
 await login(page,'student');const denied=await page.evaluate(async()=>{const V=V15Sync,M=V.fb.M;const make=(id,traineeId,status)=>({data:{id,traineeId,type:'Medical',fromDate:'2041-01-01',toDate:'2041-01-01',reason:'Synthetic attack',certNote:'',status,appliedDate:'2041-01-01'},updatedAt:V.now(),updatedBy:V.fb.user.uid});const results=[];for(const [suffix,tid,status] of [['status',V.member.traineeId,'approved'],['owner','other-trainee','pending']]){const id=crypto.randomUUID();try{await M.setDoc(M.doc(V.col('leaves'),id),make(id,tid,status));results.push('unexpected-write');}catch(e){results.push(e.code);}}return results;});expect(denied).toEqual(['permission-denied','permission-denied']);
 const request=await page.evaluate(async()=>{const V=V15Sync,id=crypto.randomUUID(),data={id,traineeId:V.member.traineeId,type:'Other',fromDate:'2041-02-01',toDate:'2041-02-01',reason:'Synthetic authority boundary '+id,certNote:'',status:'pending',appliedDate:'2041-01-01'};await V.fb.M.setDoc(V.fb.M.doc(V.col('leaves'),id),{data,updatedAt:V.now(),updatedBy:V.fb.user.uid});let error;try{await V.backendRequest({action:'reviewLeave',leaveId:id,status:'approved',role:'instructor'});}catch(e){error=e.message;}return {id,data,error};});expect(request.error).toContain('Instructor');
 const context=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});try{const instructor=await context.newPage();await login(instructor,'instructor');const attacks=await instructor.evaluate(async request=>{const V=V15Sync,M=V.fb.M,ref=M.doc(V.col('leaves'),request.id),answers=[];for(const act of [()=>M.updateDoc(ref,{'data.status':'approved','data.reviewedBy':V.fb.user.uid,'data.reviewedAt':V.now(),updatedBy:V.fb.user.uid}),()=>M.setDoc(M.doc(V.col('leaves'),'forged-'+request.id),{data:{...request.data,id:'forged-'+request.id,status:'approved',reviewedBy:V.fb.user.uid,reviewedAt:V.now()},updatedAt:V.now(),updatedBy:V.fb.user.uid}),()=>M.deleteDoc(ref)]){try{await act();answers.push('unexpected-write');}catch(e){answers.push(e.code);}}return answers;},request);expect(attacks).toEqual(['permission-denied','permission-denied','permission-denied']);await instructor.evaluate(()=>V15Sync.finalOpenTab('leave'));const row=instructor.locator('#leaveTableBody tr').filter({hasText:request.data.reason});await expect(row).toHaveCount(1);await row.getByRole('button',{name:'Reject',exact:true}).click();await expect(instructor.locator('#v15LeaveStatus')).toContainText('Leave rejected; attendance unchanged');const saved=await instructor.evaluate(async id=>{const V=V15Sync,M=V.fb.M,d=(await M.getDocFromServer(M.doc(V.col('leaves'),id))).data().data,a=await M.getDocFromServer(M.doc(V.col('attendance'),V.esc('2041-02-01--t1')));return {status:d.status,reviewedBy:d.reviewedBy,uid:V.fb.user.uid,attendance:a.exists()};},request.id);expect(saved.status).toBe('rejected');expect(saved.reviewedBy).toBe(saved.uid);expect(saved.attendance).toBe(false);}finally{await context.close();}
});

test('training backup downloads, previews and atomically restores only missing resources',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('reports'));await expect(page.locator('#storageStats')).toContainText('Pending changes are saved on this device');await expect(page.locator('#storageStats')).not.toContainText('5 MB');
 const id='backup-'+require('node:crypto').randomUUID(),title='Synthetic backup '+test.info().project.name;
 await page.evaluate(async({id,title})=>{const V=V15Sync;await V.fb.M.setDoc(V.fb.M.doc(V.col('notices'),id),{data:{id,title,body:'Synthetic restore acceptance'}});},{id,title});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export training backup (.json)',exact:true}).click();const download=await downloadPromise;
 const backup=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));expect(backup.backupFormat).toBe('Universal ITI training backup');expect(backup.source.workspaceId).toBe('w1');expect(Object.keys(backup.sections).sort()).toEqual(['holidays','modules','notices','practicals','theory']);expect(backup.sections.notices.some(r=>r.id===id)).toBe(true);
 // Delete only this test's new synthetic notice to simulate a missing training resource.
 await page.evaluate(async id=>{const V=V15Sync;await V.fb.M.deleteDoc(V.fb.M.doc(V.col('notices'),id));},id);
 const file={...backup,sections:{notices:backup.sections.notices.filter(r=>r.id===id||r.id==='n1')}};
 const conflict=file.sections.notices.find(r=>r.id==='n1');if(conflict)conflict.data.title='Untrusted replacement must not overwrite';
 await page.locator('#importFile').setInputFiles({name:'synthetic-training.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
 const panel=page.locator('#v15TrainingBackup');await expect(panel).toContainText('No records have been restored yet');await expect(panel).toContainText('1 missing');await page.evaluate(()=>{document.getElementById('reportEvalSelect').add(new Option('Synthetic long training report title '.repeat(20),'long'));});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('#importFile').locator('..')).toHaveText('Preview training backup');
 expect(await page.evaluate(async id=>{const V=V15Sync;return(await V.fb.M.getDocFromServer(V.fb.M.doc(V.col('notices'),id))).exists();},id)).toBe(false);
 await panel.getByRole('button',{name:'Restore missing training resources',exact:true}).click();await expect(panel).toContainText('Restore complete: 1 added');
 const saved=await page.evaluate(async id=>{const V=V15Sync,M=V.fb.M,a=await M.getDocFromServer(M.doc(V.col('notices'),id)),b=await M.getDocFromServer(M.doc(V.col('notices'),'n1'));return {restored:a.data().data.title,existing:b.data().data.title};},id);expect(saved.restored).toBe(title);expect(saved.existing).toBe('Synthetic notice');
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('notices'));await expect(page.locator('#tab-notices')).toContainText(title);
});

test('backup rejects legacy or foreign files without changing workspace data; Student cannot export',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('reports'));const before=await page.evaluate(()=>JSON.stringify(DATA.trainees));
 await page.locator('#importFile').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({meta:{},trainees:[]}))});await expect(page.locator('#v15TrainingBackup')).toContainText('Legacy whole-data imports');expect(await page.evaluate(()=>JSON.stringify(DATA.trainees))).toBe(before);
 const foreign={backupFormat:'Universal ITI training backup',formatVersion:1,exportedAt:new Date().toISOString(),source:{instituteId:'brdbagiti-mumbai-01',workspaceId:'foreign'},sections:{notices:[]}};
 await page.locator('#importFile').setInputFiles({name:'foreign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(foreign))});await expect(page.locator('#v15TrainingBackup')).toContainText('different institute or workspace');expect(await page.evaluate(()=>localStorage.getItem('iti-v14-pre-import-snapshot'))).toBe(null);await page.evaluate(()=>CloudCenter.createLocalSafetySnapshot());expect(await page.evaluate(()=>localStorage.getItem(CloudCenter.preUpgradeKey))).toBe(null);
 const studentContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});try{const student=await studentContext.newPage();await login(student,'student');const denied=await student.evaluate(async()=>{const V=V15Sync,M=V.fb.M,old=M.getDocs;let reads=0;M.getDocs=async()=>{reads++;throw Error('Unexpected read');};try{await App.exportData();await App.importData({target:{files:[{size:10,text:async()=>'{"meta":{}}'}]}});return {reads,trainees:DATA.trainees.length};}finally{M.getDocs=old;}});expect(denied.reads).toBe(0);expect(denied.trainees).toBe(1);}finally{await studentContext.close();}
});

test('common reports retain selections, render print media and produce a real Chromium PDF',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>{V15Sync.finalOpenTab('reports');window.reportKeysBefore=Object.keys(DATA.signatures||{});});
 await page.locator('#reportAttMonth').fill('2044-02');await page.locator('#reportEvalSelect').selectOption('1');await page.locator('#reportTraineeSelect').selectOption('t1');await page.evaluate(()=>{window.reportPrintCalls=0;window.print=()=>window.reportPrintCalls++;V15Sync.refresh();});
 await expect(page.locator('#reportAttMonth')).toHaveValue('2044-02');await expect(page.locator('#reportTraineeSelect')).toHaveValue('t1');
 await page.locator('#reportAttMonth').locator('..').getByRole('button',{name:'Generate PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.reportPrintCalls)).toBe(1);await expect(page.locator('#printArea')).toContainText('Attendance Register — 2044-02');await expect(page.locator('#printArea thead th')).toHaveCount(34);
 await page.emulateMedia({media:'print'});await expect(page.locator('#appShell')).toBeHidden();await expect(page.locator('#printArea')).toBeVisible();const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.length).toBeGreaterThan(4000);expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length).toBe(1);await test.info().attach('synthetic-attendance.pdf',{body:pdf,contentType:'application/pdf'});await page.emulateMedia({media:'screen'});
 await page.locator('#reportTraineeSelect').locator('..').getByRole('button',{name:'Generate PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.reportPrintCalls)).toBe(2);await expect(page.locator('#printArea')).toContainText('Synthetic Student');await expect(page.locator('#printArea')).toContainText('Trainee Progress Card');
 await page.locator('#reportEvalSelect').locator('..').getByRole('button',{name:'Generate PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.reportPrintCalls)).toBe(3);await expect(page.locator('#printArea')).toContainText('Practical Evaluation Sheet — 1');
 await expect.poll(()=>page.evaluate(async()=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('map_signatures'));return z.docs.some(d=>!window.reportKeysBefore.includes(d.data().key)&&d.data().data?.label==='Attendance Register — 2044-02'&&d.data().data?.status==='pending');})).toBe(true);
 const key=await page.evaluate(()=>Object.keys(DATA.signatures).find(k=>!window.reportKeysBefore.includes(k)&&DATA.signatures[k].label==='Attendance Register — 2044-02'));
 const signatureRow=page.locator('#signaturesTableBody tr[data-report-key="'+key+'"]');page.once('dialog',d=>d.accept());await signatureRow.getByRole('button',{name:'Record physical signature',exact:true}).click();await expect(signatureRow).toContainText('Signed');await expect.poll(()=>page.evaluate(async key=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('map_signatures'));return z.docs.some(d=>d.data().key===key&&d.data().data?.status==='signed'&&d.data().data?.signedBy===V.fb.user.uid);},key)).toBe(true);
});

test('reports reject stale selections and executable saved markup without printing after workspace change',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('reports'));let probes=0;page.on('request',r=>{if(r.url().includes('report-probe'))probes++;});
 await page.evaluate(()=>{const V=V15Sync;window.securityReportKeys=Object.keys(DATA.signatures||{});window.reportPrintCalls=0;window.print=()=>window.reportPrintCalls++;const text='<img src="https://example.invalid/report-probe" onerror="window.reportInjected=true"><script>window.reportInjected=true</script>';DATA.meta.institute=text;DATA.trainees[0].name=text;Reports.populateSelects();});
 await page.locator('#reportTraineeSelect').selectOption('t1');await page.locator('#reportTraineeSelect').locator('..').getByRole('button',{name:'Generate PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.reportPrintCalls)).toBe(1);await expect(page.locator('#printArea')).toContainText('<img src=');expect(await page.locator('#printArea [onerror],#printArea script,#printArea iframe').count()).toBe(0);expect(probes).toBe(0);expect(await page.evaluate(()=>window.reportInjected)).toBeUndefined();await expect.poll(()=>page.evaluate(async()=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('map_signatures'));return z.docs.some(d=>!window.securityReportKeys.includes(d.data().key)&&d.data().data?.label==='Progress Card — t1');})).toBe(true);expect(await page.evaluate(async()=>{const V=V15Sync;return(await V.fb.M.getDocFromServer(V.fb.M.doc(V.col('trainees'),'t1'))).data().data.name;})).toBe('Synthetic Student');expect(await page.evaluate(async()=>{const V=V15Sync;return(await V.fb.M.getDocFromServer(V.ws())).data().institute||'';})).not.toContain('report-probe');
 await page.evaluate(()=>Reports.doPrint('<div onclick="window.reportInjected=true"><script>window.reportInjected=true</script><iframe src="https://example.invalid/report-probe"></iframe><img src="https://example.invalid/report-probe" onerror="window.reportInjected=true"><svg onload="window.reportInjected=true"></svg><p>Safe legacy report text</p></div>'));await expect.poll(()=>page.evaluate(()=>window.reportPrintCalls)).toBe(2);await expect(page.locator('#printArea')).toContainText('Safe legacy report text');expect(await page.locator('#printArea script,#printArea iframe,#printArea img,#printArea svg,#printArea [onclick]').count()).toBe(0);expect(probes).toBe(0);expect(await page.evaluate(()=>window.reportInjected)).toBeUndefined();
 await page.locator('#reportEvalSelect').selectOption('');await page.locator('#reportEvalSelect').locator('..').getByRole('button',{name:'Generate PDF',exact:true}).click();await expect(page.locator('#v15ReportStatus')).toContainText('Select practical');await expect(page.locator('#printArea')).toBeEmpty();expect(await page.evaluate(()=>window.reportPrintCalls)).toBe(2);
 await page.evaluate(()=>{window.reportTimers=[];const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>ms===100?(window.reportTimers.push(()=>fn(...args)),1):original(fn,ms,...args);Reports.printCertificate();V15Sync.workspaceId='changed-context';window.reportTimers.forEach(fn=>fn());});await expect(page.locator('#v15ReportStatus')).toContainText('workspace changed');expect(await page.evaluate(()=>window.reportPrintCalls)).toBe(2);
 const context=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});try{const student=await context.newPage();await login(student,'student');const denied=await student.evaluate(()=>{let calls=0;window.print=()=>calls++;Reports.printAttendance();Reports.printProgress();Reports.markSigned('unknown');return {calls,signatures:Object.keys(DATA.signatures||{}).length,message:document.querySelector('#v15ReportStatus')?.textContent};});expect(denied.calls).toBe(0);expect(denied.signatures).toBe(0);expect(denied.message).toContain('active Instructor');}finally{await context.close();}
});

test('obsolete MCQ controls send no requests while current controls still publish and grade',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('exams'));let publications=0;page.on('request',r=>{if(r.url().endsWith('/api')&&r.method()==='POST'&&r.postDataJSON()?.action==='publishExam')publications++;});
 const title='Synthetic MCQ context '+test.info().project.name+' '+Date.now(),form=page.locator('#exam-publisher');
 const fill=async()=>{await form.getByLabel('Test title',{exact:true}).fill(title);await form.getByLabel('Question text',{exact:true}).fill('Synthetic context check');for(const [i,x]of ['One','Two','Three','Four'].entries())await form.getByLabel('Option '+(i+1),{exact:true}).fill(x);await form.getByLabel('Correct answer',{exact:true}).selectOption('1');await form.getByLabel('I reviewed the questions').check();};await fill();
 await page.evaluate(async()=>{const V=V15Sync,wid=V.workspaceId;window.oldMCQPublish=document.querySelector('#exam-publisher').onsubmit;V.workspaceId='stale-workspace';try{await window.oldMCQPublish({preventDefault(){}});}finally{V.workspaceId=wid;}});expect(publications).toBe(0);await expect(page.locator('#tab-exams [role=status]')).toContainText('Reopen Tests');
 await page.evaluate(()=>V15Sync.renderSecureExams());await page.evaluate(()=>window.oldMCQPublish({preventDefault(){}}));expect(publications).toBe(0);await fill();await form.getByRole('button',{name:'Publish protected exam',exact:true}).click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Exam published');expect(publications).toBe(1);
 const examId=await page.evaluate(async title=>{const V=V15Sync,M=V.fb.M,z=await M.getDocsFromServer(M.query(V.col('secureExams'),M.where('title','==',title)));return z.docs[0].id;},title);
 const context=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});try{const student=await context.newPage();await login(student,'student');await student.evaluate(()=>V15Sync.finalOpenTab('exams'));const calls=[];student.on('request',r=>{if(r.url().endsWith('/api')&&r.method()==='POST')calls.push(r.postDataJSON()?.action);});
 const card=student.locator('#tab-exams .card').filter({hasText:title});await expect(card).toHaveCount(1);await student.evaluate(async title=>{const V=V15Sync,wid=V.workspaceId,card=[...document.querySelectorAll('#tab-exams .card')].find(x=>x.querySelector('h3')?.textContent===title);window.oldMCQStart=card.querySelector('button').onclick;V.workspaceId='stale-workspace';try{await window.oldMCQStart();}finally{V.workspaceId=wid;}},title);expect(calls).toEqual([]);
 await card.getByRole('button',{name:'Start / resume test',exact:true}).click();await expect(card.locator('input[type=radio]')).toHaveCount(4);await card.getByLabel('Two',{exact:true}).check();
 await student.evaluate(async title=>{const V=V15Sync,wid=V.workspaceId,card=[...document.querySelectorAll('#tab-exams .card')].find(x=>x.querySelector('h3')?.textContent===title);window.oldMCQSubmit=card.querySelector('button').onclick;V.workspaceId='stale-workspace';try{await window.oldMCQSubmit();}finally{V.workspaceId=wid;}},title);expect(calls.filter(x=>x==='submitExam')).toHaveLength(0);
 const studentUid=await student.evaluate(()=>V15Sync.fb.user.uid);expect(await page.evaluate(async({examId,studentUid})=>{const V=V15Sync;return(await V.fb.M.getDocFromServer(V.fb.M.doc(V.col('secureResults'),examId+'--'+studentUid))).exists();},{examId,studentUid})).toBe(false);
 await student.evaluate(()=>V15Sync.renderSecureExams());await student.evaluate(()=>window.oldMCQSubmit());expect(calls.filter(x=>x==='submitExam')).toHaveLength(0);await card.getByRole('button',{name:'Start / resume test',exact:true}).click();await expect(card.locator('input[type=radio]')).toHaveCount(4);await card.getByLabel('Two',{exact:true}).check();await card.getByRole('button',{name:'Submit answers for server grading',exact:true}).click();await expect(card).toContainText('Result: 1 / 1');expect(calls.filter(x=>x==='submitExam')).toHaveLength(1);
 }finally{await context.close();}
});

test('Student plan and self ratings restore from scoped cloud data in a fresh browser',async({page,browser})=>{
 await login(page,'student');await page.evaluate(()=>V15Sync.finalOpenTab('skills'));
 await page.getByLabel('Self assessment for practical 1').selectOption('learning');
 await page.evaluate(()=>V15Sync.finalOpenTab('skill-gap'));
 const goal='Synthetic private goal '+test.info().project.name+' '+Date.now();
 await page.locator('#v15CareerRole').fill(goal);
 for(const box of await page.locator('#tab-skill-gap input[type=checkbox]').all())await box.uncheck();
 await page.getByLabel('Include Practical 2: Typography',{exact:true}).check();
 await page.getByRole('button',{name:'Save personal learning plan',exact:true}).click();
 await expect(page.locator('#tab-skill-gap')).toContainText('Private learning plan synced');
 const fresh=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});
 try{
  const student=await fresh.newPage();await login(student,'student');
  await student.evaluate(()=>{const V=V15Sync,k=V.studentStorageKeys();localStorage.setItem(k.legacyGoal,JSON.stringify({roleName:'Unscoped legacy goal',requiredIds:['practical-1']}));localStorage.setItem(k.legacyGoal+'-pending','1');});
  await student.evaluate(()=>V15Sync.finalOpenTab('skills'));
  await expect(student.getByLabel('Self assessment for practical 1')).toHaveValue('learning');
  await student.evaluate(()=>V15Sync.finalOpenTab('skill-gap'));
  await expect(student.locator('#v15CareerRole')).toHaveValue(goal);
  await expect(student.getByLabel('Include Practical 1: Layout basics',{exact:true})).not.toBeChecked();
  await expect(student.getByLabel('Include Practical 2: Typography',{exact:true})).toBeChecked();
  await expect(student.locator('#tab-skill-gap')).toContainText('older browser draft is retained');
  const saved=await student.evaluate(async()=>{const V=V15Sync,k=V.studentStorageKeys(),s=await V.fb.M.getDocFromServer(V.fb.M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'studentPlans',V.fb.user.uid));return {plan:s.data().plan,self:s.data().selfRatings,legacy:localStorage.getItem(k.legacyGoal+'-pending')};});
  expect(saved.plan.roleName).toBe(goal);expect(saved.plan.requiredIds).toEqual(['practical-2']);expect(saved.self['practical-1']).toBe('learning');expect(saved.legacy).toBe('1');
 }finally{await fresh.close();}
});

test('AI lesson JSON error hides the previous preview and saves no record',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('ai-assistant'));
 const before=await page.evaluate(()=>JSON.stringify({practicals:DATA.practicals,theory:DATA.theory}));
 await page.evaluate(()=>{InstructorAI.getKey=()=>false;InstructorAI.openPlanDraft('theory',DATA.theory[0].no);});
 await page.locator('#aiResultText').fill(JSON.stringify({objective:['Synthetic objective'],materials:[],review:'Review',motivation:'Motivation',steps:[{topic:'Synthetic topic',information:'Synthetic information',spotHint:'Hint'}],questions:['Synthetic question'],summary:'Summary',assignment:'Assignment',nextLesson:'Next lesson'}));
 await page.getByRole('button',{name:'Preview Result',exact:true}).click();await expect(page.locator('#aiPreviewBox')).toBeVisible();
 await page.locator('#aiResultText').fill('{"questions":[ What are the hazards? ]}');
 await page.getByRole('button',{name:'Preview Result',exact:true}).click();await expect(page.locator('#aiModalStatus')).toContainText('JSON error');await expect(page.locator('#aiPreviewBox')).toBeHidden();
 expect(await page.evaluate(()=>JSON.stringify({practicals:DATA.practicals,theory:DATA.theory}))).toBe(before);
 await page.locator('#aiModal').getByRole('button',{name:/Close/}).click();
});

test('AI demonstration previews the complete document before approval on desktop and mobile',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('ai-assistant'));
 const details=await page.evaluate(()=>{
  InstructorAI.getKey=()=>false; // Fixed synthetic draft; no external provider or quota use.
  const originalIdentity={hasInstructor:Object.hasOwn(DATA.meta,'instructor'),instructor:DATA.meta.instructor??null,hasInstitute:Object.hasOwn(DATA.meta,'institute'),institute:DATA.meta.institute??null};DATA.meta={...DATA.meta,institute:'',instructor:'Synthetic Preview Instructor'};
  const item=DATA.practicals[0];InstructorAI.openPlanDraft('practical',item.no);
  return {no:item.no,title:item.title,before:JSON.stringify(DATA),originalIdentity};
 });
 const draft={objective:['Check a synthetic training layout'],tools:['Synthetic training diagram'],steps:[{procedure:'Inspect the synthetic layout before proceeding.',keyPoint:'Check the isolated training setup.',spotHint:'Point to the labelled training diagram.'}],questions:['What did you check first?'],nextDemo:'Synthetic follow-up layout'};
 await page.locator('#aiResultText').fill(JSON.stringify(draft));await page.getByRole('button',{name:'Preview Result',exact:true}).click();
 const preview=page.locator('#aiPreviewBox');
 for(const text of ['DEMONSTRATION PLAN','Synthetic ITI','Synthetic Preview Instructor',details.title,...draft.objective,...draft.tools,...Object.values(draft.steps[0]),...draft.questions,draft.nextDemo,'GROUP INSTRUCTOR'])await expect(preview).toContainText(text);
 expect(await page.evaluate(()=>JSON.stringify(DATA))).toBe(details.before);
 expect(await page.locator('#aiResultText').evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.getBoundingClientRect().width-2)).toBeTruthy();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await preview.screenshot({path:'.tmp/full-ai-plan-'+test.info().project.name+'.png'});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Approve & Keep'}).click();
 await expect(page.locator('#aiModal')).toBeHidden();await expect(page.locator('#planModal .plan-document-wrap')).toContainText(draft.steps[0].procedure);
 await expect(page.locator('#planModal .plan-document-wrap')).toContainText('Synthetic ITI');
 expect(await page.evaluate(no=>DATA.practicals.find(x=>String(x.no)===String(no)).planMeta.status,details.no)).toBe('approved');
 await login(page,'instructor');await page.evaluate(no=>{V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',no);},details.no);await expect(page.locator('#planModal .plan-document-wrap')).toContainText(draft.steps[0].procedure);const stored=await page.evaluate(async no=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('practicals'));return z.docs.find(d=>String(d.data().data.no)===String(no)).data().data.plan.steps;},details.no);expect(stored[0].procedure).toBe(draft.steps[0].procedure);await page.evaluate(async original=>{const V=V15Sync,M=V.fb.M;await M.updateDoc(V.ws(),{instructor:original.hasInstructor?original.instructor:M.deleteField(),institute:original.hasInstitute?original.institute:M.deleteField()});},details.originalIdentity);
});

test('split-up complete plan persists to cloud and a fresh Student calendar with safe print output',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.switchWorkspace('planning-demo'));
 const fresh=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block',timezoneId:'Asia/Kolkata'});
 try{
  await page.evaluate(()=>V15Sync.finalOpenTab('syllabus-ai'));
  await page.locator('#uStart').fill('2026-10-30');await page.locator('#uEnd').fill('2026-11-06');await page.locator('#uHours').fill('5');await page.locator('#uTheoryHours').fill('3');await page.locator('#uAltSat').uncheck();await page.locator('#uUseExistingHolidays').uncheck();await page.locator('#uHolidays').fill('2026-10-31 | Synthetic holiday');
  await page.evaluate(()=>{UniversalSyllabus.state.trade=DATA.meta.trade;UniversalSyllabus.state.sourceName='Browser planning regression';UniversalSyllabus.state.items=[{seq:1,type:'theory',title:'Synthetic safe circuits',hours:1},{seq:2,type:'practical',title:'Synthetic circuit <img src=x onerror="window.splitInjected=1">',hours:6},{seq:3,type:'theory',title:'Synthetic testing theory',hours:1},{seq:4,type:'practical',title:'Synthetic testing practical',hours:6}];UniversalSyllabus.renderPreview();});
  await page.getByRole('button',{name:'Generate Working Calendar',exact:false}).click();await expect(page.locator('#uCapacitySummary')).toContainText('12 hours required');await expect(page.locator('#uCapacitySummary')).toContainText('Saved plans, completion dates');
  page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Save / Revise Year Plan',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('revision');await expect(page.locator('#uStatus')).toContainText('saved');
  const counts=await page.evaluate(async()=>{const V=V15Sync,M=V.fb.M,w=await M.getDocFromServer(V.ws()),h=await M.getDocs(M.collection(V.ws(),'planningRevisions'));return {revision:w.data().trainingPlanRevision,history:h.size};});
  await page.getByRole('button',{name:'Generate Working Calendar',exact:false}).click();await page.getByRole('button',{name:'Save / Revise Year Plan',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('already saved');expect(await page.evaluate(async()=>({history:(await V15Sync.fb.M.getDocs(V15Sync.fb.M.collection(V15Sync.ws(),'planningRevisions'))).size,revision:DATA.meta.trainingPlanRevision}))).toEqual(counts);
  await login(page,'instructor');await page.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('splitup');});
  const body=page.locator('#splitupTableBody');await expect(body).toContainText('2026-11-02');await expect(body).toContainText('Synthetic testing practical');await expect(body).toContainText('<img src=x');await expect(body.locator('img,script,[onerror]')).toHaveCount(0);await expect(page.locator('#splitupOfficial')).toBeHidden();
  expect(await page.evaluate(()=>DATA.practicals.filter(p=>p.title.startsWith('Synthetic circuit')||p.title==='Synthetic testing practical').sort((a,b)=>a.sequence-b.sequence).map(p=>p.plannedDate))).toEqual(['2026-10-30','2026-11-02']);
  expect(await page.evaluate(()=>{const p=DATA.practicals.find(p=>p.no==='seed-001');return {date:p.doneDate,status:p.status,objective:p.plan.objective[0],version:p.planMeta.version};})).toEqual({date:'2026-10-20',status:'completed',objective:'Preserved original objective',version:2});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.getByLabel('Year plan view',{exact:true}).selectOption('month');await expect(body).toContainText('5h');await page.getByLabel('Year plan month',{exact:true}).fill('2026-10');await page.getByLabel('Year plan month',{exact:true}).dispatchEvent('change');await expect(body).not.toContainText('2026-11');
  await page.evaluate(()=>{window.print=()=>{};});await page.getByRole('button',{name:'Print Split-up Syllabus',exact:true}).click();await expect(page.locator('#printArea')).toContainText('month-wise');await expect(page.locator('#printArea')).toContainText('2026-10');await expect(page.locator('#printArea img[src=x],#printArea script')).toHaveCount(0);
  const pdf=await page.pdf({path:'.tmp/splitup-'+test.info().project.name+'.pdf',preferCSSPageSize:true});expect(pdf.length).toBeGreaterThan(1000);const box=/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf.toString('latin1'));expect(box).not.toBeNull();expect(Number(box[1])).toBeGreaterThan(Number(box[2]));
  const student=await fresh.newPage();await login(student,'student');await student.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('splitup');});await expect(student.locator('#splitupTableBody')).toContainText('Synthetic testing practical');await expect(student.getByRole('button',{name:'Generate Alternate Schedule',exact:true})).toBeHidden();
  const before=await student.evaluate(()=>JSON.stringify(DATA.meta));await student.evaluate(()=>{Schedule.generate();Schedule.useRealCalendar();});expect(await student.evaluate(()=>JSON.stringify(DATA.meta))).toBe(before);
 }finally{await fresh.close();}
});

test('dashboard next topics follow training order after lexical cloud loading',async({page})=>{
 await login(page,'instructor');
 await page.evaluate(()=>{
  DATA.practicals=[{no:1,sequence:1,title:'Synthetic first'},{no:10,sequence:10,title:'Synthetic tenth'},{no:100,sequence:100,title:'Synthetic hundredth'},{no:2,sequence:2,title:'Synthetic second'}];
  DATA.theory=[{no:10,sequence:10,title:'Synthetic tenth lesson'},{no:1,sequence:1,title:'Synthetic first lesson'},{no:2,sequence:2,title:'Synthetic second lesson'}];
  V15Sync.finalOpenTab('dashboard');
 });
 const items=page.locator('#dashRoadmap li');
 await expect(items).toHaveText([/Demo 1:/,/Demo 2:/,/Demo 10:/,/Lesson 1:/,/Lesson 2:/,/Lesson 10:/]);
 await expect(page.locator('#syllabusBarWrap')).toContainText('Next practical: Demo 1');
 await expect(page.locator('#heroSub')).not.toContainText('undefined');
 await expect(page.locator('#brandSub')).toContainText('Synthetic ITI');
 await expect(page.locator('.instructor-profile-dashboard h3')).toContainText('Synthetic instructor');
});

test('Instructor Gmail approval activates a new Google Student with the issued code and isolated trainee',async({page,browser})=>{
 await login(page,'instructor');
 const suffix=test.info().project.name+'-'+Date.now(),email='activation-'+suffix+'@example.test',traineeId='activation-'+suffix;
 // The fixture is synthetic and created through the authenticated Instructor's emulator rules.
 await page.evaluate(async ({traineeId})=>{const V=V15Sync,t={id:traineeId,roll:'99',name:'Synthetic Activation Student',gender:'Male'};await V.fb.M.setDoc(V.fb.M.doc(V.col('trainees'),traineeId),{data:t,updatedAt:V.now(),updatedBy:V.fb.user.uid});if(!DATA.trainees.some(x=>x.id===t.id))DATA.trainees.push(t);await V.finalOpenTab('trainees');Trainees.render();},{traineeId});
 const dialogs=[];page.on('dialog',async d=>{if(d.type()==='prompt')await d.accept(email);else{dialogs.push(d.message());await d.dismiss();}});
 const row=page.locator('#traineeTableBody tr').filter({hasText:'Synthetic Activation Student'});
 await row.getByRole('button',{name:/Set Gmail|Change Gmail/}).click();
 await expect.poll(()=>dialogs.join('\n')).toContain('Student Google account approved.');
 const code=dialogs.join('\n').match(/Activation code: (\d{6})/)?.[1];expect(code).toMatch(/^\d{6}$/);
 expect(dialogs.join('\n')).toContain('Student login website: http://127.0.0.1:4173/v15/');
 const context=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});
 try{
  const student=await context.newPage();await student.route(/https:\/\/.*/,r=>r.abort());await student.goto('/v15/index.html');await student.waitForFunction(()=>window.V15Sync?.startRoleLogin);await student.addScriptTag({url:'/.tmp/test-sdk.js'});
  await student.evaluate(async ({email})=>{
   const V=V15Sync,base=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};
   const M={...base,signInWithPopup:async auth=>base.signInWithCredential(auth,base.GoogleAuthProvider.credential(JSON.stringify({sub:email,email,email_verified:true})))};
   V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});M.connectFirestoreEmulator(db,'127.0.0.1',8080);
   window.ITI_RUNTIME={apiUrl:'http://127.0.0.1:8787/api'};
  },{email});
  // Use the production activation function with a real Google-provider emulator token.
  // Mobile normally redirects to Google's website; the emulator popup adapter keeps this test local.
  await student.locator('#loginRole').selectOption('student');await student.locator('#v15ExpectedEmail').fill(email);
  student.on('dialog',async d=>{if(d.type()==='prompt')await d.accept(code);else await d.dismiss();});
  await student.evaluate(async()=>{const V=V15Sync,M=await V.modules(),auth=M.getAuth(M.getApps().find(x=>x.name==='iti-v15'));await M.signInWithPopup(auth,new M.GoogleAuthProvider());await V.startRoleLogin();});
  await expect.poll(()=>student.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole()}))).toEqual({ready:true,role:'student'});
  const actual=await student.evaluate(async()=>{const V=V15Sync,M=V.fb.M,m=(await M.getDocFromServer(V.memberRef())).data(),token=await V.fb.user.getIdTokenResult();return {email:m.email,owner:m.owner,traineeId:m.traineeId,ids:m.workspaceIds,provider:token.claims.firebase.sign_in_provider,trainees:DATA.trainees.map(t=>t.id),secretReadable:await M.getDocFromServer(V.secret(m.email)).then(()=>true,()=>false)};});
  expect(actual).toEqual({email,owner:false,traineeId,ids:['w1'],provider:'google.com',trainees:[traineeId],secretReadable:false});
  await expect(student.locator('#appShell')).toBeVisible();await student.evaluate(()=>V15Sync.finalOpenTab('skills'));await expect(student.locator('#tab-skills')).toHaveClass(/active/);
 }finally{
  await context.close();await page.evaluate(async ({traineeId,email})=>{const V=V15Sync,M=V.fb.M;await M.deleteDoc(M.doc(V.col('trainees'),traineeId));await M.deleteDoc(V.secret(email));await M.deleteDoc(V.access(email));},{traineeId,email});
 }
});

test('Instructor progress, evaluation ordering and selected-month holidays use saved context',async({page})=>{
 await login(page,'instructor');
 await page.evaluate(()=>{
  const V=V15Sync;V.suppressLocalSync=true;clearTimeout(V.pendingTimer);
  DATA.practicals=[{no:'10',sequence:10,title:'Later topic',hours:2,status:'completed'},{no:'02',sequence:2,title:'Two-day practical',hours:7,plannedDate:'2026-10-27'},{no:'01',sequence:1,title:'First topic',hours:5,plannedDate:'2026-10-26'}];
  DATA.theory=[];DATA.meta.scheduleMode='training-plan';DATA.meta.trainingPlan={dayPlan:[{date:'2026-10-26',practicalItems:[{seq:'01',hours:5}]},{date:'2026-10-27',practicalItems:[{seq:'02',hours:5}]},{date:'2026-10-30',practicalItems:[{seq:'02',hours:2}]}]};Dashboard.trainingToday=()=> '2026-10-30';
  DATA.trainees=[{id:'synthetic-10',roll:'10',name:'Ten'},{id:'synthetic-2',roll:'02',name:'Two'},{id:'synthetic-1',roll:'1',name:'One'}];DATA.marks={};DATA.submissions={};DATA.holidays=[{date:'2026-10-02',label:'October holiday'},{date:'2026-11-01',label:'November holiday'}];
 });
 await page.evaluate(()=>V15Sync.finalOpenTab('dashboard'));const progress=page.locator('#trainingProgress');await expect(progress).toContainText('Behind plan');await expect(progress).toContainText('1 overdue incomplete');await expect(progress).toContainText('01. First topic');
 await page.evaluate(()=>V15Sync.finalOpenTab('practicals'));const rows=page.locator('#practicalTableBody tr');await expect(rows.nth(0)).toHaveClass(/training-overdue/);await expect(rows.nth(1)).toContainText('Due today');await expect(rows.nth(2)).toHaveClass(/training-complete/);await expect(rows.nth(0).getByRole('button',{name:'Edit',exact:true})).not.toBeVisible();await rows.nth(0).locator('summary').click();await expect(rows.nth(0).getByRole('button',{name:'Edit',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 if(test.info().project.name==='mobile')await page.locator('#tab-practicals').screenshot({path:'.tmp/instructor-practical-cards-mobile.png'});
 await page.evaluate(()=>V15Sync.finalOpenTab('evaluation'));await expect(page.locator('#evalPracticalSelect option')).toHaveText(['01. First topic','02. Two-day practical','10. Later topic']);await expect(page.locator('#evalTableBody tr td:nth-child(2)')).toHaveText(['1','02','10']);
 const mark=page.locator('#ev-synthetic-2-prep');await mark.fill('4');await page.evaluate(()=>{Evaluation.populateSelects();Evaluation.render();});await expect(mark).toHaveValue('4');page.once('dialog',d=>d.dismiss());await page.getByLabel('Practical for evaluation',{exact:true}).selectOption('02');await expect(page.getByLabel('Practical for evaluation',{exact:true})).toHaveValue('01');await expect(mark).toHaveValue('4');
 await page.evaluate(()=>V15Sync.finalOpenTab('attendance'));await page.locator('#attDate').fill('2026-10-30');await page.locator('#attDate').dispatchEvent('change');await expect(page.locator('#holidayTableBody')).toContainText('October holiday');await expect(page.locator('#holidayTableBody')).not.toContainText('November holiday');await expect(page.locator('#v15AttMonth')).toHaveValue('2026-10');await page.locator('#v15AttMonth').fill('2026-11');await page.locator('#v15AttMonth').dispatchEvent('change');await expect(page.locator('#holidayTableBody')).toContainText('November holiday');await expect(page.locator('#attDate')).toHaveValue('2026-11-01');
});

test('Instructor corrects a completed practical and theory date and retains it after cloud reload',async({page})=>{
 await login(page,'instructor');const titles={};
 for(const kind of ['practical','theory']){
  await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);
  const title=`Synthetic completion correction ${kind} ${test.info().project.name} ${Date.now()}`;titles[kind]=title;
  await page.getByRole('button',{name:kind==='practical'?'+ Add Custom Practical':'+ Add Theory Topic',exact:true}).click();const modal=page.locator('#'+kind+'EditModal');await modal.locator('textarea').fill(title);if(kind==='practical'){await page.locator('#pracEditUnit').fill('Synthetic unit');await page.locator('#pracEditHours').fill('2');}await modal.getByRole('button',{name:'Save',exact:true}).click();
  const row=page.locator('#'+kind+'TableBody tr').filter({hasText:title});await row.getByRole('button',{name:'Mark Complete',exact:true}).click();await page.getByLabel('Date actually taught',{exact:true}).fill('2026-10-20');await page.locator('#markCompleteModal').getByRole('button',{name:'Confirm',exact:true}).click();
  await row.locator('summary').click();await row.getByRole('button',{name:'Edit completion date',exact:true}).click();await expect(page.getByLabel('Date actually taught',{exact:true})).toHaveValue('2026-10-20');await page.getByLabel('Date actually taught',{exact:true}).fill('2026-10-22');await page.locator('#markCompleteModal').getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toContainText('Done 2026-10-22');
  await expect.poll(()=>page.evaluate(async({kind,title})=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col(kind==='practical'?'practicals':'theory'));return z.docs.some(d=>{const x=d.data().data;return x.title===title&&x.status==='completed'&&x.doneDate==='2026-10-22';});},{kind,title})).toBe(true);
 }
 await login(page,'instructor');for(const kind of ['practical','theory']){await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);await expect(page.locator('#'+kind+'TableBody tr').filter({hasText:titles[kind]})).toContainText('Done 2026-10-22');}
});

test('Instructor grouped menus retain legacy forms and move impact evidence under records',async({page})=>{
 await login(page,'instructor');const nav=page.locator('#tabs');for(const key of ['modules','syllabus-ai','splitup','skill-applications','pilot-impact','record-formats','inspection','cloud','reports'])await expect(nav.locator(`[data-tab="${key}"]`)).toHaveCount(0);
 for(const [route,parent] of [['modules','planning'],['syllabus-ai','planning'],['splitup','planning'],['reports','records'],['record-formats','records'],['inspection','records'],['cloud','records'],['pilot-impact','records'],['skill-applications','skill-review']]){
  await page.evaluate(route=>V15Sync.finalOpenTab(route),route);await expect(page.locator('#tab-'+parent)).toHaveClass(/active/);await expect(page.locator('#tab-'+route)).toBeVisible();await expect(page.locator('#tab-'+parent)).not.toContainText('Page could not load');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 }
 await page.getByRole('button',{name:'Student assessment',exact:true}).click();await expect(page.locator('#v15SkillReviewStudent')).toBeVisible();if(test.info().project.name==='mobile')await page.locator('#tab-skill-review').screenshot({path:'.tmp/instructor-skills-hub-mobile.png'});
});

test('Instructor checks authenticated AI availability and retains invalid pasted JSON for manual correction',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('ai-assistant'));await expect(page.locator('#aiConnectionBadge')).toContainText('not checked');await expect(page.locator('#aiApiKey')).toHaveCount(0);await page.getByRole('button',{name:'Check AI availability',exact:true}).click();await expect(page.locator('#aiConnectionHelp')).toContainText('generative AI is disabled');
 await page.evaluate(()=>{const p=DATA.practicals[0];InstructorAI.openPlanDraft('practical',p.no);});await expect(page.locator('#aiGenerateBtn')).toBeHidden();await page.getByText('ⓘ How to copy a prompt and paste JSON',{exact:true}).click();await expect(page.locator('#aiModal')).toContainText('including the opening { and closing }');const invalid='{ "objective": [';await page.locator('#aiResultText').fill(invalid);await page.getByRole('button',{name:'Preview Result',exact:true}).click();await expect(page.locator('#aiResultText')).toHaveValue(invalid);await expect(page.locator('#aiModalStatus')).toContainText('JSON error');await expect(page.locator('#aiPreviewBox')).toBeHidden();
});

test('Instructor imports the real Excel template with explicit numbers, reviews 5+3 allocation and rejects stale previews',async({page})=>{
 await login(page,'instructor');await page.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('syllabus-ai');});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download Excel Template',exact:true}).click();const saved=await download;expect(saved.suggestedFilename()).toBe('syllabus-template.xlsx');expect(require('node:fs').readFileSync(await saved.path()).length).toBeGreaterThan(1000);
 await page.locator('#uFile').setInputFiles('assets/templates/syllabus-template.xlsx');await page.getByRole('button',{name:'Read / Import Syllabus',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('No topics found');
 await page.locator('#uFile').setInputFiles('tests/fixtures/syllabus-upload.xlsx');await page.getByRole('button',{name:'Read / Import Syllabus',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('Loaded 3 topics');await expect(page.getByLabel('Row 2 no',{exact:true})).toHaveValue('001');await expect(page.getByLabel('Row 2 type',{exact:true})).toHaveValue('theory');await expect(page.getByLabel('Row 1 hours',{exact:true})).toHaveValue('7.5');
 await page.locator('#uStart').fill('2026-10-30');await page.locator('#uEnd').fill('2026-11-02');await page.locator('#uHours').fill('5');await page.locator('#uTheoryHours').fill('3');await page.locator('#uAltSat').uncheck();await page.locator('#uHolidays').fill('2026-10-31 | Synthetic holiday');await page.getByRole('button',{name:'Generate Working Calendar',exact:false}).click();await expect(page.locator('#uCapacitySummary')).toContainText('7.5 hours required');
 let saves=0;page.on('request',r=>{if(r.url().endsWith('/api'))try{if(r.postDataJSON()?.action==='saveTrainingPlan')saves++;}catch(e){}});await page.locator('#uTheoryHours').fill('2');await page.getByRole('button',{name:'Save / Revise Year Plan',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('Preview the current syllabus');expect(saves).toBe(0);
 await page.locator('#uTheoryHours').fill('3');await page.getByRole('button',{name:'Generate Working Calendar',exact:false}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Save / Revise Year Plan',exact:true}).click();await expect(page.locator('#uStatus')).toContainText('revision');expect(saves).toBe(1);
 await login(page,'instructor');await page.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('practicals');});expect(await page.evaluate(()=>{const p=DATA.practicals.find(x=>x.no==='excel-001');return {title:p.title,hours:p.hours,start:p.plannedDate,finish:p.plannedEndDate};})).toEqual({title:'Synthetic Excel layout',hours:7.5,start:'2026-10-30',finish:'2026-11-02'});
 await page.evaluate(()=>V15Sync.finalOpenTab('syllabus-ai'));await page.getByRole('button',{name:'Load Current Syllabus',exact:true}).click();await expect(page.locator('#uPreviewBody')).toContainText('Remove');expect(await page.evaluate(()=>UniversalSyllabus.state.items.some(x=>x.no==='seed-001'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();if(test.info().project.name==='mobile')await page.locator('#uCapacitySummary').screenshot({path:'.tmp/year-planning-import-mobile.png'});
});

test('Instructor CSV trainee import previews safely, syncs without logins and survives reload',async({page})=>{
 await login(page,'instructor');
 await page.evaluate(()=>V15Sync.finalOpenTab('trainees'));
 const roll='BULK-'+test.info().project.name.toUpperCase(),name='Synthetic Bulk Student '+test.info().project.name;
 const before=await page.evaluate(()=>JSON.parse(JSON.stringify(DATA.trainees)));
 const csv='Roll No.,Name,PRN / Application ID,Category,Mobile\n'+roll+','+name+',BULK-'+test.info().project.name+',OPEN,0123456789\n';
 try{
  await page.locator('#traineeBulkFile').setInputFiles({name:'roster.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('#traineeBulkPreview')).toContainText('1 valid, 0 require correction');
  await expect(page.locator('#traineeBulkPreview')).toContainText(name);
  page.on('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Import 1 trainees',exact:true}).click();
  await expect(page.locator('#traineeTableBody')).toContainText(name);
  const newRecord=await page.evaluate(roll=>DATA.trainees.find(t=>t.roll===roll),roll);
  expect(newRecord).toMatchObject({name,roll,accountStatus:'not-linked'});
  expect(newRecord).not.toHaveProperty('pin');
  await expect.poll(()=>page.evaluate(async roll=>{
    const V=V15Sync;await V.diff();await V.flushQueue();
    const s=await V.fb.M.getDocs(V.col('trainees'));
    return s.docs.some(d=>d.data()?.data?.roll===roll);
  },roll),{timeout:30000}).toBe(true);
  await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('trainees'));
  await expect(page.locator('#traineeTableBody')).toContainText(name);
 }finally{
  await page.evaluate(async original=>{
   const V=V15Sync;DATA.trainees=original;saveData();await V.diff();await V.flushQueue();
  },before);
 }
});

test('today teaching opens the imported alphanumeric exercise through the actual plan button',async({page})=>{
 await login(page,'instructor');await page.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('ai-assistant');InstructorAI.getKey=()=>false;todayISO=()=> '2026-10-30';InstructorAI.renderToday();});
 await expect(page.locator('#aiToday')).toContainText('excel-001');await expect(page.locator('#aiToday img,#aiToday [onclick]')).toHaveCount(0);await page.locator('#aiToday').getByRole('button',{name:'Prepare Demonstration Plan',exact:true}).click();await expect(page.locator('#aiModalTitle')).toContainText('excel-001');await expect(page.locator('#aiPromptText')).toHaveValue(/Synthetic Excel layout/);await expect(page.locator('#aiPromptText')).toHaveValue(/7\.5 practical hours/);await expect(page.locator('#aiPreviewBox')).toBeHidden();
});

test('Instructor saves a sanitised real landscape report PDF through mocked Drive and rejects stale workspace capture',async({page})=>{
 await login(page,'instructor');await page.addScriptTag({path:'.tmp/html2pdf.bundle.min.js'});
 await page.evaluate(()=>{const proto=html2pdf.Worker.prototype,output=proto.outputPdf;proto.outputPdf=function(...args){const chain=this;return this.get('canvas').then(canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>0&&(pixels[i]<220||pixels[i+1]<220||pixels[i+2]<220))ink++;window.drivePdfInkPixels=ink;}).then(()=>output.apply(chain,args));};});
 const uploads=[];await page.route('https://www.googleapis.com/**',async route=>{const r=route.request();if(r.url().includes('/upload/')){uploads.push(r.postDataBuffer());await route.fulfill({json:{id:'synthetic-report',name:'Synthetic report.pdf'}});}else await route.fulfill({json:{id:'synthetic-folder',name:'Synthetic archive'}});});
 await page.evaluate(async()=>{const C=CloudCenter;C.loadGoogleIdentity=async()=>{window.google={accounts:{oauth2:{initTokenClient:opts=>({requestAccessToken:()=>setTimeout(()=>opts.callback({access_token:'synthetic-drive-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'}),0)})}}};};await V15Sync.finalOpenTab('cloud');});
 await page.locator('#driveClientId').fill('synthetic.apps.googleusercontent.com');await page.getByRole('button',{name:'Connect Google Drive',exact:true}).click();await expect(page.locator('#driveStatusBadge')).toContainText('Drive connected');
 await page.evaluate(()=>{window.print=()=>{};V15Sync.finalOpenTab('reports');DATA.meta.institute='Synthetic ITI';DATA.meta.instructor='Synthetic Instructor';document.getElementById('reportAttMonth').value='2026-10';Reports.printAttendance();});await expect(page.locator('#printArea')).toContainText('Synthetic ITI');await expect(page.locator('#printArea')).toContainText('Attendance Register');await page.evaluate(()=>V15Sync.finalOpenTab('cloud'));page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Save Last Generated Report PDF',exact:false}).click();await expect(page.locator('#cloudStatusMessage')).toContainText('Report PDF saved to Drive',{timeout:30000});expect(uploads.length).toBe(1);expect(await page.evaluate(()=>window.drivePdfInkPixels)).toBeGreaterThan(500);
 const multipart=uploads[0],start=multipart.indexOf(Buffer.from('%PDF-')),end=multipart.lastIndexOf(Buffer.from('%%EOF'));expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start+1000);const pdf=multipart.subarray(start,end+5),box=/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf.toString('latin1'));expect(box).not.toBeNull();expect(Number(box[1])).toBeGreaterThan(Number(box[2]));require('node:fs').writeFileSync('.tmp/drive-report-'+test.info().project.name+'.pdf',pdf);expect(await page.locator('.drive-pdf-stage').count()).toBe(0);
 await page.evaluate(async()=>{await V15Sync.switchWorkspace('planning-demo');await V15Sync.finalOpenTab('cloud');await CloudCenter.saveLastReportToDrive();});await expect(page.locator('#cloudStatusMessage')).toContainText('Generate a report in this workspace first');expect(uploads.length).toBe(1);await expect(page.locator('#driveFolderId')).toHaveValue('');
});


test('Instructor dashboard renders local charts with all external requests blocked',async({page})=>{
 await login(page,'instructor');
 await page.evaluate(()=>{V15Sync.finalOpenTab('dashboard');Dashboard.render();});
 await expect.poll(()=>page.evaluate(()=>['chartSyllabus','chartAttendance'].every(id=>{const chart=Chart.getChart(id);return chart&&chart.width>0&&chart.height>0;}))).toBeTruthy();
 const values=await page.evaluate(()=>({version:Chart.version,syllabus:Chart.getChart('chartSyllabus').data.datasets[0].data,expected:[DATA.practicals.filter(x=>x.status==='completed').length,DATA.practicals.filter(x=>x.status!=='completed').length,DATA.theory.filter(x=>x.status==='completed').length,DATA.theory.filter(x=>x.status!=='completed').length]}));
 expect(values.version).toBe('4.4.4');expect(values.syllabus).toEqual(values.expected);
 await expect.poll(()=>page.evaluate(()=>{const c=document.getElementById('chartSyllabus'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)count++;return count;})).toBeGreaterThan(200);
 await page.evaluate(()=>Dashboard.render());
 expect(await page.evaluate(()=>Object.values(Chart.instances).filter(c=>['chartSyllabus','chartAttendance'].includes(c.canvas.id)).length)).toBe(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test('source-based workplace draft stays keyless and becomes Student guidance only after explicit Instructor publication',async({page,browser})=>{
 await login(page,'instructor');page.on('dialog',d=>d.accept());const aiRequests=[];page.on('request',r=>{if(r.method()==='POST'){try{if(r.postDataJSON()?.action==='ai')aiRequests.push(r.url());}catch{}}});
 await page.evaluate(()=>V15Sync.finalOpenTab('skill-applications'));const publish=page.getByRole('button',{name:'Publish reviewed application',exact:true});await expect(publish).toBeEnabled();
 const pid=await page.locator('#v15AppPractical').inputValue(),source='https://example.org/synthetic-workflow-'+test.info().project.name;
 const before=await page.evaluate(async pid=>{const V=V15Sync,M=V.fb.M,ref=M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'skillApplications',pid),s=await M.getDoc(ref);return {application:s.exists()?s.data():null,skills:await V.getStudentSkillProfile('student')};},pid);
 await page.getByText('ⓘ Prepare a source-based workplace draft (manual or optional AI)',{exact:true}).click();await page.locator('#v15AppSource').fill(source);await page.locator('#v15AppExcerpt').fill('Synthetic demonstration document: page layout operations are used to arrange text and images before a reviewed print proof.');await page.locator('#v15AppLanguage').selectOption('mr');await page.getByRole('button',{name:'Prepare prompt',exact:true}).click();await expect(page.locator('#v15AppPrompt')).toHaveValue(/Marathi/);
 await page.getByRole('button',{name:'Check optional AI availability',exact:true}).click();await expect(page.locator('#v15AppDraftStatus')).toContainText('Generative AI is disabled');await expect(page.getByRole('button',{name:'Request optional AI draft',exact:true})).toBeDisabled();
 const industry='सिंथेटिक मुद्रण कार्यशाळा',description='सिंथेटिक स्रोतामधील मांडणी प्रक्रियेत मजकूर व चित्रांची रचना करून प्रिंट प्रूफ तपासला जातो.';
 await page.locator('#v15AppDraftJson').fill(JSON.stringify({supported:true,practicalId:pid,sourceUrl:source,industry,applicationText:description}));await page.getByRole('button',{name:'Preview workplace JSON',exact:true}).click();await expect(page.locator('#v15AppDraftPreview')).toContainText(industry);await page.getByRole('button',{name:'Use reviewed draft in form',exact:true}).click();
 const unchanged=await page.evaluate(async pid=>{const V=V15Sync,M=V.fb.M,s=await M.getDoc(M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'skillApplications',pid));return s.exists()?s.data():null;},pid);expect(unchanged).toEqual(before.application);expect(aiRequests).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('#tab-skill-review').screenshot({path:'.tmp/workplace-guidance-'+test.info().project.name+'.png'});
 await publish.click();await expect(page.locator('#tab-skill-applications')).toContainText('Source-backed workplace example saved.');expect(await page.evaluate(()=>V15Sync.getStudentSkillProfile('student'))).toEqual(before.skills);
 const student=await browser.newPage();try{await login(student,'student');await student.evaluate(()=>V15Sync.finalOpenTab('career-lens'));await student.locator('#v15LensPractical').selectOption(pid);await student.getByRole('button',{name:'Show verified skills and career examples',exact:true}).click();await expect(student.locator('#v15LensResults')).toContainText(industry);await expect(student.locator('#v15LensResults')).toContainText(description);await expect(student.locator('#v15LensResults a').filter({hasText:'Read original supporting source'})).toHaveAttribute('href',source);
 const denied=await student.evaluate(async pid=>{const V=V15Sync,M=V.fb.M,ref=M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'skillApplications',pid),s=await M.getDoc(ref);try{await M.setDoc(ref,{...s.data(),industry:'Student forged review',reviewedBy:V.fb.user.uid,reviewedAt:M.serverTimestamp()});return 'unexpected-write';}catch(e){return e.code;}},pid);expect(denied).toBe('permission-denied');}finally{await student.close();}
});

test('two Instructor sessions cannot silently overwrite a reviewed workplace example',async({page,browser})=>{
 await login(page,'instructor');page.on('dialog',d=>d.accept());await page.evaluate(()=>V15Sync.finalOpenTab('skill-applications'));await expect(page.getByRole('button',{name:'Publish reviewed application',exact:true})).toBeEnabled();const pid=await page.locator('#v15AppPractical').inputValue();
 const second=await browser.newPage();try{await login(second,'instructor');second.on('dialog',d=>d.accept());await second.evaluate(()=>V15Sync.finalOpenTab('skill-applications'));await second.locator('#v15AppPractical').selectOption(pid);await expect(second.getByRole('button',{name:'Publish reviewed application',exact:true})).toBeEnabled();
 await page.locator('#v15AppIndustry').fill('Unsaved first-session draft');await page.locator('#v15AppExplanation').fill('First session draft must survive a conflict with another source review.');await page.locator('#v15AppSource').fill('https://example.org/synthetic-first-review');
 await second.locator('#v15AppIndustry').fill('Latest concurrent Instructor review');await second.locator('#v15AppExplanation').fill('A different Instructor session reviewed this synthetic operation and original source.');await second.locator('#v15AppSource').fill('https://example.org/synthetic-second-review');await second.getByRole('button',{name:'Publish reviewed application',exact:true}).click();await expect(second.locator('#tab-skill-applications')).toContainText('Source-backed workplace example saved.');
 await page.getByRole('button',{name:'Publish reviewed application',exact:true}).click();await expect(page.locator('#tab-skill-applications')).toContainText('changed in another session');await expect(page.locator('#v15AppIndustry')).toHaveValue('Unsaved first-session draft');await expect(page.getByRole('button',{name:'Publish reviewed application',exact:true})).toBeDisabled();
 const saved=await second.evaluate(async pid=>{const V=V15Sync,M=V.fb.M,s=await M.getDoc(M.doc(V.fb.db,'institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId,'skillApplications',pid));return s.data().industry;},pid);expect(saved).toBe('Latest concurrent Instructor review');await page.getByRole('button',{name:'Reload saved example',exact:true}).click();await expect(page.locator('#v15AppIndustry')).toHaveValue('Latest concurrent Instructor review');}finally{await second.close();}
});

test('Instructor teaching revision archives the previous plan and survives reload; Student cannot forge or read history',async({page,browser})=>{
 await login(page,'instructor');const info=await page.evaluate(async()=>{const V=V15Sync,M=V.fb.M,rows=await M.getDocs(V.col('practicals')),doc=rows.docs.find(x=>String(x.data().data.no)==='1');return {id:doc.id,record:doc.data().data};});
 await page.evaluate(()=>{V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',1);PlanViewer.editPlan();});const objective='Synthetic history objective '+test.info().project.name+' '+Date.now();await page.locator('#planField_objective').fill(objective);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Save & View Full Plan',exact:true}).click();await expect(page.locator('#planModal .plan-document-wrap')).toContainText(objective);
 const saved=await page.evaluate(async id=>{const V=V15Sync,M=V.fb.M,ref=M.doc(V.col('practicals'),id),s=(await M.getDocFromServer(ref)).data().data,r=(await M.getDocFromServer(M.doc(M.collection(ref,'teachingPlanRevisions'),'r'+String(s.teachingPlanRevision).padStart(6,'0')))).data();return {record:s,history:r};},info.id);expect(saved.record.teachingPlanRevision).toBe((info.record.teachingPlanRevision||0)+1);expect(saved.history.previous.plan).toEqual(info.record.plan);expect(saved.record.materials).toEqual(info.record.materials);expect(saved.record.doneDate).toEqual(info.record.doneDate);expect(saved.history.createdBy).toBe('instructor');
 await page.getByRole('button',{name:'Version history',exact:true}).click();await expect(page.locator('#teachingHistory')).toContainText(objective);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('#teachingHistory details summary').first().click();await expect(page.locator('#teachingHistory details pre').first()).toBeVisible();await page.locator('#planModal .modal-card').screenshot({path:'.tmp/teaching-history-'+test.info().project.name+'.png'});
 const attacks=await page.evaluate(async id=>{const V=V15Sync,M=V.fb.M,ref=M.doc(V.col('practicals'),id),result=[];for(const write of [()=>M.updateDoc(ref,{'data.plan':{objective:['Forged plan']}}),()=>M.deleteDoc(ref),()=>M.setDoc(M.doc(M.collection(ref,'teachingPlanRevisions'),'forged'),{createdBy:V.fb.user.uid})]){try{await write();result.push('unexpected-write');}catch(e){result.push(e.code);}}return result;},info.id);expect(attacks).toEqual(['permission-denied','permission-denied','permission-denied']);
 await login(page,'instructor');await page.evaluate(()=>{V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',1);});await expect(page.locator('#planModal .plan-document-wrap')).toContainText(objective);
 const student=await browser.newPage();try{await login(student,'student');const denied=await student.evaluate(async id=>{const V=V15Sync,M=V.fb.M;try{await M.getDocs(M.collection(M.doc(V.col('practicals'),id),'teachingPlanRevisions'));return 'unexpected-read';}catch(e){return e.code;}},info.id);expect(denied).toBe('permission-denied');}finally{await student.close();}
});

test('a stale teaching editor retains its draft while a newer Instructor plan revision stays authoritative',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>{V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',1);PlanViewer.editPlan();V15Sync.unsubscribers.forEach(f=>f());V15Sync.unsubscribers=[];});await page.locator('#planField_objective').fill('Unsaved first-session teaching draft');
 const second=await browser.newPage();try{await login(second,'instructor');await second.evaluate(()=>{V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',1);PlanViewer.editPlan();});const latest='Latest second-session teaching revision '+test.info().project.name+' '+Date.now();await second.locator('#planField_objective').fill(latest);second.once('dialog',d=>d.accept());await second.getByRole('button',{name:'Save & View Full Plan',exact:true}).click();await expect(second.locator('#planModal .plan-document-wrap')).toContainText(latest);
 await page.getByRole('button',{name:'Save & View Full Plan',exact:true}).click();await expect(page.locator('#teachingSaveStatus')).toContainText('changed after you opened');await expect(page.locator('#planField_objective')).toHaveValue('Unsaved first-session teaching draft');
 const cloud=await second.evaluate(async()=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('practicals'));return z.docs.find(d=>String(d.data().data.no)==='1').data().data.plan.objective;});expect(cloud).toEqual([latest]);}finally{await second.close();}
});

test('an older queued plan can be reviewed and recovered without losing other queued field edits',async({page})=>{
 await login(page,'instructor');page.on('dialog',d=>d.accept());const objective='Recovered synthetic queued plan '+test.info().project.name+' '+Date.now();const recovery=await page.evaluate(async objective=>{const V=V15Sync,M=V.fb.M,z=await M.getDocs(V.col('practicals')),doc=z.docs.find(d=>String(d.data().data.no)==='1'),before=V.clone(doc.data().data),correctionDate=before.doneDate==='2026-10-21'?'2026-10-20':'2026-10-21',value={...before,doneDate:correctionDate,plan:{...(before.plan||{}),objective:[objective]}};V.queueWrite([{id:'synthetic-recovery',actorUid:V.fb.user.uid,workspaceId:V.workspaceId,kind:'array',section:'practicals',action:'set',docId:doc.id,before,value,data:{data:value,updatedBy:V.fb.user.uid,updatedAt:V.now()}}]);DATA.practicals=DATA.practicals.map(x=>String(x.no)==='1'?value:x);V15Sync.finalOpenTab('practicals');PlanViewer.open('practical',1);return {previousRevision:before.teachingPlanRevision||0,correctionDate};},objective);
 await page.getByRole('button',{name:'Review pending plan draft',exact:true}).click();await expect(page.getByLabel('Pending teaching plan JSON',{exact:true})).toHaveValue(new RegExp(objective));await page.getByRole('button',{name:'Save reviewed recovery as revision',exact:true}).click();await expect.poll(()=>page.evaluate(()=>DATA.practicals.find(x=>String(x.no)==='1').teachingPlanRevision)).toBe(recovery.previousRevision+1);await expect(page.locator('#pendingTeachingDraft')).toHaveCount(0);await expect(page.locator('#planModal .plan-document-wrap')).toContainText(objective);
 const remaining=await page.evaluate(()=>V15Sync.queueRead().filter(o=>o.id==='synthetic-recovery'));expect(remaining).toHaveLength(1);expect(remaining[0].value.doneDate).toBe(recovery.correctionDate);expect(remaining[0].value.plan.objective).toEqual([objective]);expect(remaining[0].before.teachingPlanRevision).toBe(remaining[0].value.teachingPlanRevision);
 await page.evaluate(async()=>{await V15Sync.flushQueue();});await expect.poll(()=>page.evaluate(()=>V15Sync.queueRead().length)).toBe(0);const persisted=await page.evaluate(async()=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('practicals'));return z.docs.find(d=>String(d.data().data.no)==='1').data().data;});expect(persisted.plan.objective).toEqual([objective]);expect(persisted.doneDate).toBe(recovery.correctionDate);
});

test('Instructor imports a reviewed MCQ file and Student receives a private-key server result',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('exams'));
 const host=page.locator('#exam-import');
 await expect(host).toBeVisible();
 await expect(host).toHaveJSProperty('open',true);
 const advancedFirst=await page.evaluate(()=>{const holder=document.getElementById('tab-exams'),advanced=holder.querySelector('#exam-import'),manual=holder.querySelector('#exam-publisher');return !!advanced&&!!manual&&(advanced.compareDocumentPosition(manual)&Node.DOCUMENT_POSITION_FOLLOWING)!==0;});
 expect(advancedFirst).toBe(true);
 await expect(host.getByRole('button',{name:'Download example question file',exact:true})).toBeVisible();
 const downloaded=page.waitForEvent('download');await host.getByRole('button',{name:'Download example question file',exact:true}).click();const download=await downloaded;
 const example=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));expect(download.suggestedFilename()).toBe('ITI-MCQ-example.json');expect(example.questions[0].correctIndex).toBe(1);
 const title='Synthetic imported MCQ '+test.info().project.name+' '+Date.now(),text='<img src=x onerror="window.mcqImportExecuted=true"> Which format preserves layout?';
 const payload={...example,title,opensAt:Date.now()-60000,closesAt:Date.now()+3600000,questions:[{text,options:['TXT','PDF','CSV','LOG'],correctIndex:1}]},raw=JSON.stringify(payload,null,2),input=host.getByLabel('Exam JSON',{exact:true}),publish=host.getByRole('button',{name:'Publish JSON question set',exact:true}),preview=host.getByRole('button',{name:'Preview JSON question set',exact:true}),review=host.getByLabel('I reviewed this imported question set and its schedule.',{exact:true});
 let publications=0;page.on('request',r=>{if(r.url().endsWith('/api')&&r.method()==='POST'&&r.postDataJSON()?.action==='publishExam')publications++;});
 await input.fill('retained draft');await host.getByLabel('Question JSON file (up to 150 KB)',{exact:true}).setInputFiles({name:'not-a-question-file.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic')});await expect(input).toHaveValue('retained draft');await expect(page.locator('#tab-exams [role=status]')).toContainText('Select a .json');
 await host.getByLabel('Question JSON file (up to 150 KB)',{exact:true}).setInputFiles({name:'synthetic-mcq.json',mimeType:'application/json',buffer:Buffer.from(raw)});await expect(input).toHaveValue(raw);await expect(publish).toBeDisabled();
 await preview.click();await expect(host.locator('#exam-import-preview')).toContainText(text);await expect(host.locator('#exam-import-preview')).toContainText('Correct answer: 2. PDF');await expect(host.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.mcqImportExecuted)).toBeUndefined();expect(publications).toBe(0);
 await review.check();await expect(publish).toBeEnabled();await input.fill('{bad');await expect(publish).toBeDisabled();await preview.click();await expect(input).toHaveValue('{bad');await expect(host.locator('#exam-import-preview')).toBeEmpty();
 await input.fill(raw);await preview.click();await review.check();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await host.screenshot({path:'.tmp/mcq-import-'+test.info().project.name+'.png'});
 const endpoint='http://127.0.0.1:8787/api';await page.route(endpoint,r=>r.abort());await publish.click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Your JSON is retained');await expect(input).toHaveValue(raw);await expect(review).toBeChecked();await page.unroute(endpoint);
 await publish.click();await expect(page.locator('#tab-exams [role=status]')).toContainText('Exam published with private answer key. Students can now open it');await expect(publish).toBeDisabled();
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('exams'));await expect(page.locator('#tab-exams h3').filter({hasText:title})).toHaveCount(1);
 const studentContext=await browser.newContext({viewport:page.viewportSize(),serviceWorkers:'block'});
 try{const student=await studentContext.newPage();await login(student,'student');await student.evaluate(()=>V15Sync.finalOpenTab('exams'));await expect(student.locator('#exam-import')).toHaveCount(0);
  const privacy=await student.evaluate(async examId=>{const V=V15Sync,M=V.fb.M,base=['institutes',V.INSTITUTE_ID,'workspaces',V.workspaceId];const exam=(await M.getDoc(M.doc(V.fb.db,...base,'secureExams',examId))).data();let privateKeyDenied=false;try{await M.getDoc(M.doc(V.fb.db,...base,'examKeys',examId));}catch(e){privateKeyDenied=e.code==='permission-denied';}return {containsCorrectIndex:JSON.stringify(exam).includes('correctIndex'),privateKeyDenied};},payload.id);expect(privacy).toEqual({containsCorrectIndex:false,privateKeyDenied:true});
  const card=student.locator('#tab-exams section').filter({has:student.getByRole('heading',{name:title,exact:true})});await card.getByRole('button',{name:'Start / resume test',exact:true}).click();await card.getByLabel('PDF',{exact:true}).check();await card.getByRole('button',{name:'Submit answers for server grading',exact:true}).click();await expect(card).toContainText('Result: 1 / 1');await expect(card.locator('img')).toHaveCount(0);expect(await student.evaluate(()=>window.mcqImportExecuted)).toBeUndefined();
 }finally{await studentContext.close();}
});

test('Instructor free Starter Plan works without AI generation and cannot approve unfinished placeholders',async({page})=>{
 await login(page,'instructor');
 await page.evaluate(()=>V15Sync.finalOpenTab('ai-assistant'));
 await expect(page.getByRole('heading',{name:'Instructor Teaching Assistant'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Create Free Starter Plan',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>JSON.stringify({practicals:DATA.practicals,theory:DATA.theory}));
 const options=await page.locator('#aiTopicSelect option').count();expect(options).toBeGreaterThan(1);
 await page.locator('#aiTopicSelect').selectOption({index:1});
 let aiRequests=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api')&&r.postDataJSON()?.action==='ai')aiRequests++;});
 await page.getByRole('button',{name:'Create Free Starter Plan',exact:true}).click();
 await expect(page.locator('#aiModal')).toBeVisible();
 await expect(page.locator('#aiResultText')).toHaveValue(/\[FILL BEFORE SAVE\]/);
 await expect(page.locator('#aiPreviewBox')).toBeVisible();
 await expect(page.locator('#aiModalStatus')).toContainText('created locally');
 await page.getByRole('button',{name:'✅ Approve & Keep',exact:true}).click();
 await expect(page.locator('#aiModalStatus')).toContainText('Complete every');
 expect(await page.evaluate(()=>JSON.stringify({practicals:DATA.practicals,theory:DATA.theory}))).toBe(before);
 expect(aiRequests).toBe(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 expect(overflow).toBe(false);
});

test('Student Career Mentor holds a synthetic multi-turn AI chat without persisting or exposing old workspace replies',async({page})=>{
 await login(page,'student');
 await page.evaluate(async()=>{
  window.__careerChatCalls=[];
  const real=V15Sync.backendRequest.bind(V15Sync);
  V15Sync.backendRequest=async body=>{
   if(body.action==='capabilities')return {aiConfigured:true};
   if(body.action==='careerChat'){
    window.__careerChatCalls.push(body);
    return {mode:'ai-chat',text:'Synthetic mentor answer: ask your instructor to verify the skill and check official postings.'};
   }
   return real(body);
  };
  await V15Sync.finalOpenTab('career-coach');
 });
 await expect(page.getByRole('heading',{name:'Career Mentor — AI Chat'})).toBeVisible();
 const send=page.getByRole('button',{name:'Send to AI Career Mentor',exact:true});
 await expect(send).toBeEnabled();
 await page.locator('#coach-chat-input').fill('I learned DTP; what should I learn next?');
 await send.click();
 await expect(page.locator('#coach-chat-status')).toContainText('Consent is required');
 await page.locator('#coach-chat-card input[type=checkbox]').check();
 await send.click();
 await expect(page.locator('#coach-chat-messages .career-chat-line')).toHaveCount(2);
 await page.locator('#coach-chat-input').fill('How can I prepare for an interview?');
 await send.click();
 await expect(page.locator('#coach-chat-messages .career-chat-line')).toHaveCount(4);
 const result=await page.evaluate(()=>({
  history:window.__careerChatCalls.map(c=>c.history.length),
  localChatKeys:Object.keys(localStorage).filter(k=>k.includes('career-chat')||k.includes('mentor')),
  chatScriptCount:document.querySelectorAll('#coach-chat-messages script,#coach-chat-messages [onclick]').length,
  overflow:document.documentElement.scrollWidth>innerWidth+1,
 }));
 expect(result).toEqual({history:[0,2],localChatKeys:[],chatScriptCount:0,overflow:false});
 await page.getByRole('button',{name:'New chat / Clear'}).click();
 await expect(page.locator('#coach-chat-messages .career-chat-line')).toHaveCount(0);
});
