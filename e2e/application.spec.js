const {test,expect}=require('@playwright/test');
const testPassword=process.env.ITI_EMULATOR_TEST_PASSWORD;
if(!testPassword)throw Error('Run browser tests through the emulator test runner.');
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
  window.ITI_RUNTIME={staging:true,firebaseConfig:{projectId:'demo-iti-staging'},apiUrl:''};
 });
 await page.addScriptTag({url:'/v15/v15-staging-login.js'});
 await expect(page.locator('#stagingNotice')).toContainText('Synthetic test data');
 await page.locator('#loginRole').selectOption('student');await page.locator('#v15ExpectedEmail').fill('student@example.test');
 await page.locator('#stagingPassword').fill(testPassword+'invalid');await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('Staging sign-in failed');
 expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 await page.locator('#loginRole').selectOption('admin');await page.locator('#stagingPassword').fill(testPassword);await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('registered as Student');expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 await page.locator('#loginRole').selectOption('student');
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
  await body.getByRole('button',{name:'Edit',exact:true}).click();await expect(modal.locator('textarea')).toHaveValue('<img src=x onerror="window.syllabusInjection=true">');await modal.getByRole('button',{name:'Cancel',exact:true}).click();
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
 for(const kind of ['practical','theory'])await expect.poll(()=>page.evaluate(async ({kind,title})=>{const V=V15Sync,M=V.fb.M,z=await M.getDocs(V.col(kind==='practical'?'practicals':'theory'));return z.docs.some(d=>{const x=d.data().data;return x?.title===title&&x.status==='completed'&&x.doneDate==='2026-10-23'&&x.plannedDate==='2026-10-22';});},{kind,title:titles[kind]})).toBe(true);
 await login(page,'instructor');for(const kind of ['practical','theory']){await page.evaluate(kind=>V15Sync.finalOpenTab(kind==='practical'?'practicals':'theory'),kind);const row=page.locator('#'+kind+'TableBody tr').filter({hasText:titles[kind]});await expect(row).toHaveCount(1);await expect(row).toContainText('Done 2026-10-23');await expect(row.getByRole('button',{name:'Mark Complete'})).toHaveCount(0);}
});

test('reviewed plan text and HTTPS materials persist and Student can open the correct notes',async({page,browser})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('practicals'));
 const row=page.locator('#practicalTableBody tr').filter({has:page.locator('td:first-child').filter({hasText:/^1$/})});await row.getByRole('button',{name:'View Plan',exact:true}).click();const modal=page.locator('#planModal');
 await modal.getByLabel('Notes PDF link',{exact:true}).fill('javascript:alert(1)');await modal.getByRole('button',{name:'Save Materials',exact:true}).click();await expect(modal.locator('#planMaterialsStatus')).toContainText('valid absolute HTTPS');
 const notes='https://example.test/synthetic-notes.pdf',video='https://youtu.be/synthetic';await modal.getByLabel('Notes PDF link',{exact:true}).fill(notes);await modal.getByLabel('YouTube video link',{exact:true}).fill(video);page.once('dialog',d=>d.accept());await modal.getByRole('button',{name:'Save Materials',exact:true}).click();
 await modal.getByRole('button',{name:'Edit Text Sections',exact:true}).click();const objective='Synthetic reviewed objective '+test.info().project.name+' '+Date.now();await modal.locator('#planField_objective').fill(objective);page.once('dialog',d=>d.accept());await modal.getByRole('button',{name:'Save & View Full Plan',exact:true}).click();await expect(modal.locator('.plan-document-wrap')).toContainText(objective);
 try{ await expect.poll(()=>page.evaluate(async ({notes,objective})=>{const V=V15Sync,z=await V.fb.M.getDocs(V.col('practicals'));return z.docs.some(d=>{const x=d.data().data;return x?.no===1&&x.materials?.pdfLink===notes&&x.plan?.objective?.includes(objective);});},{notes,objective})).toBe(true);}catch(e){await test.info().attach('plan-sync-state',{contentType:'application/json',body:JSON.stringify(await page.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole(),local:DATA.practicals.filter(x=>String(x.no)==='1'),shadow:V15Sync.shadow?.practicals?.filter(x=>String(x.no)==='1'),pending:V15Sync.queueRead().filter(o=>o.section==='practicals')})))});throw e;}
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

test('Student cannot forge an already approved leave or another trainee identity',async({page})=>{
 await login(page,'student');const denied=await page.evaluate(async()=>{const V=V15Sync,M=V.fb.M;const make=(id,traineeId,status)=>({data:{id,traineeId,type:'Medical',fromDate:'2041-01-01',toDate:'2041-01-01',reason:'Synthetic attack',certNote:'',status,appliedDate:'2041-01-01'},updatedAt:V.now(),updatedBy:V.fb.user.uid});const results=[];for(const [suffix,tid,status] of [['status',V.member.traineeId,'approved'],['owner','other-trainee','pending']]){const id=crypto.randomUUID();try{await M.setDoc(M.doc(V.col('leaves'),id),make(id,tid,status));results.push('unexpected-write');}catch(e){results.push(e.code);}}return results;});expect(denied).toEqual(['permission-denied','permission-denied']);
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
