const {test,expect}=require('@playwright/test');
async function login(page,role){
 // No production request is permitted in tests. Use real Auth/Firestore emulators and local SDK.
 await page.route(/https:\/\/.*/,r=>r.abort());
 await page.goto('/v15/index.html');
 await page.waitForFunction(()=>window.V15Sync?.renderSecureExams);
 await page.addScriptTag({url:'/.tmp/test-sdk.js'});
 const result=await page.evaluate(async role=>{
  const V=V15Sync,M=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};
  V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;
  const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);
  M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});M.connectFirestoreEmulator(db,'127.0.0.1',8080);
  await M.signInWithEmailAndPassword(auth,role+'@example.test','Synthetic-Test-Password-49!');
  localStorage.setItem('iti-v15-role-v2',role);localStorage.setItem('iti-v15-email-v2',role+'@example.test');
  window.ITI_RUNTIME={apiUrl:'http://127.0.0.1:8787/api'};
  await V.login({interactive:false});
  return {ready:V.ready,role:V.currentRole(),message:document.querySelector('#v15LoginStatus')?.textContent};
 },role);
 expect(result,JSON.stringify(result)).toMatchObject({ready:true,role});
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
 await page.getByLabel('I consent').check();await page.getByRole('button',{name:'Request optional AI draft'}).click();await expect(page.locator('#coach-output')).toContainText('Guided mode');
 await page.evaluate(()=>V15Sync.finalOpenTab('exams'));
 await page.getByRole('button',{name:'Start / resume test'}).click();
 const radio=page.getByLabel('Four',{exact:true});
 await expect.poll(async()=> (await radio.count()) || ((await page.locator('#tab-exams').textContent()).includes('Result:')?1:0)).toBe(1);
 if(await radio.count()){await radio.check();await page.getByRole('button',{name:'Submit answers for server grading'}).click();}
 await expect(page.locator('#tab-exams')).toContainText('Result: 1 / 1');
 expect(await page.evaluate(()=>localStorage.getItem('dtpoAppData_v1'))).toBeNull();
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
 await page.locator('#stagingPassword').fill('incorrect-test-password');await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('Staging sign-in failed');
 expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 await page.locator('#loginRole').selectOption('admin');await page.locator('#stagingPassword').fill('Synthetic-Test-Password-49!');await page.locator('#stagingSignIn').click();
 await expect(page.locator('#v15LoginStatus')).toContainText('registered as Student');expect(await page.evaluate(()=>V15Sync.ready)).toBeFalsy();
 await page.locator('#loginRole').selectOption('student');
 await page.locator('#stagingPassword').fill('Synthetic-Test-Password-49!');await page.locator('#stagingSignIn').click();
 await expect(page.locator('#appShell')).toBeVisible();expect(await page.evaluate(()=>V15Sync.currentRole())).toBe('student');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('a newly created module survives cloud sync and a fresh login',async({page})=>{
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('modules'));
 const name='Synthetic persisted module '+test.info().project.name;
 await page.locator('#moduleName').fill(name);await page.locator('#moduleCode').fill('SYNC-'+test.info().project.name);
 await page.getByRole('button',{name:'Create Module'}).click();
 await expect(page.locator('#moduleManagerBody')).toContainText(name);
 await expect.poll(()=>page.evaluate(async name=>{const V=V15Sync,M=V.fb.M;const records=await M.getDocs(V.col('modules'));return records.docs.some(d=>d.data().data?.name===name);},name)).toBeTruthy();
 await login(page,'instructor');await page.evaluate(()=>V15Sync.finalOpenTab('modules'));
 await expect(page.locator('#moduleManagerBody')).toContainText(name);
});
