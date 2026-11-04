'use strict';
/*
 * Jury recording on the ACTUAL EduSkill 360 frontend in the local Firebase
 * Auth/Firestore emulator. No staging/prod account, student data, or real AI
 * provider is contacted. The AI replies in this recording are simulated and
 * are labelled as such ON SCREEN. Nothing here claims live AI acceptance.
 *
 * Run through: ITI_RECORD_JURY_DEMO=1 ITI_E2E_GREP="Jury product recording" npm run test:e2e
 */
const {test,expect}=require('@playwright/test');
const testPassword=process.env.ITI_EMULATOR_TEST_PASSWORD;
test.use({video:'on',viewport:{width:1440,height:900}});

async function enterRole(page,role){
 if(!testPassword)throw Error('Recording requires the Auth/Firestore emulator runner.');
 await page.route(/https:\/\/.*/,route=>route.abort());
 await page.goto('/v15/index.html');
 await page.waitForFunction(()=>window.V15Sync?.renderSecureExams);
 await page.addScriptTag({url:'/.tmp/test-sdk.js'});
 await page.evaluate(async ({role,password})=>{
  const V=V15Sync,M=ITITestFirebase,cfg={apiKey:'test-api-key',projectId:'demo-universal-iti',authDomain:'localhost',appId:'test-app'};
  V.modules=async()=>M;V.config=()=>cfg;V.fb.M=M;
  const app=M.initializeApp(cfg,'iti-v15'),auth=M.getAuth(app),db=M.getFirestore(app);
  M.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  M.connectFirestoreEmulator(db,'127.0.0.1',8080);
  await M.signInWithEmailAndPassword(auth,role+'@example.test',password);
  localStorage.setItem('iti-v15-role-v2',role);
  localStorage.setItem('iti-v15-email-v2',role+'@example.test');
  window.ITI_RUNTIME={apiUrl:'http://127.0.0.1:8787/api'};
  await V.login({interactive:false});
 },{role,password:testPassword});
 await expect.poll(()=>page.evaluate(()=>({ready:V15Sync.ready,role:V15Sync.currentRole()})),{timeout:30000}).toEqual({ready:true,role});
 await expect(page.locator('#appShell')).toBeVisible();
}
async function scene(page,title,detail,ai=false,milliseconds=3600){
 await page.evaluate(({title,detail,ai})=>{
  let bar=document.getElementById('jury-recording-caption');
  if(!bar){
   bar=document.createElement('section');bar.id='jury-recording-caption';
   bar.setAttribute('aria-label','Recording transparency caption');
   bar.style.cssText='position:fixed;z-index:2147483600;left:22px;right:22px;bottom:14px;max-width:1370px;margin:auto;box-sizing:border-box;border:1px solid #476583;border-radius:13px;padding:10px 17px;color:white;background:rgba(8,24,46,.94);font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;gap:20px;pointer-events:none;box-shadow:0 6px 25px rgba(0,0,0,.27)';
   document.body.appendChild(bar);
  }
  bar.replaceChildren();
  const lead=document.createElement('strong');lead.textContent=title;lead.style.cssText='font-size:17px;white-space:nowrap;letter-spacing:.2px';
  const text=document.createElement('span');text.textContent=detail;text.style.cssText='font-size:13px;line-height:1.3;flex:1';
  const mark=document.createElement('small');
  mark.textContent=ai?'SIMULATED AI • LOCAL TEST':'ACTUAL PRODUCT UI • SYNTHETIC TEST DATA';
  mark.style.cssText='color:#a8dbff;font-size:10px;font-weight:700;letter-spacing:.6px;white-space:nowrap';
  bar.append(lead,text,mark);
 },{title,detail,ai});
 await page.waitForTimeout(milliseconds);
}

test('Jury product recording — actual Instructor → Student skill journey',async({page})=>{
 test.setTimeout(180000); // intentional multi-scene video, not a 45s functional test
 test.skip(!process.env.ITI_RECORD_JURY_DEMO||test.info().project.name!=='desktop','Opt-in isolated Jury recording only.');
 await page.route(/https:\/\/.*/,route=>route.abort());
 await page.goto('/v15/index.html');
 await expect(page.locator('#loginScreen .login-title')).toContainText('Universal EduSkill 360');
 await scene(page,'UNIVERSAL EDUSKILL 360','Real software prototype • DTP trade • fictional learner • offline emulator',false,3600);

 await enterRole(page,'instructor');
 await page.evaluate(()=>V15Sync.finalOpenTab('dashboard'));
 await scene(page,'1  INSTRUCTOR DASHBOARD','Trade planning, teaching records and practical progress',false,5200);

 await page.evaluate(()=>{
  window.confirm=()=>true;
  const original=V15Sync.backendRequest.bind(V15Sync);
  V15Sync.backendRequest=async payload=>{
   if(payload.action==='capabilities')return {aiConfigured:true};
   if(payload.action==='ai')return {mode:'ai-draft',text:JSON.stringify({
    objective:['Create a clear page layout using margins and readable typography'],
    tools:['DTP application','Computer and projector','Sample brochure artwork'],
    steps:[{procedure:'Set A4 page size and margins, align headings and export a PDF proof.',
      keyPoint:'Consistent spacing and legible type hierarchy.',
      spotHint:'Check print preview and the exported PDF.'}],
    questions:['Which margin settings were used?','How do you check the final PDF proof?'],
    nextDemo:'Typography and text alignment'
   })};
   return original(payload);
  };
 });
 await page.evaluate(()=>V15Sync.finalOpenTab('ai-assistant'));
 await expect(page.locator('#aiTopicTypeFilter')).toBeVisible();
 await page.locator('#aiTopicTypeFilter').selectOption('practical');
 await expect.poll(()=>page.locator('#aiTopicSelect option').count()).toBeGreaterThan(1);
 await page.locator('#aiTopicSelect').selectOption({index:1});
 await scene(page,'2  INSTRUCTOR AI PLAN','Choose practical → request draft → review before official approval',true,3500);
 await page.getByRole('button',{name:'Generate AI Plan',exact:true}).click();
 await expect(page.locator('#aiModal')).toBeVisible();
 await expect(page.locator('#aiResultText')).toHaveValue(/Create a clear page layout/);
 await scene(page,'3  DEMONSTRATION PLAN','Example objectives, tools, procedure and assessment generated in test mode',true,7600);
 await page.locator('#aiModal').getByRole('button',{name:/Close/}).click();

 page.on('dialog',dialog=>dialog.accept());
 await page.evaluate(()=>V15Sync.finalOpenTab('skill-review'));
 await expect(page.locator('#v15SkillReviewStudent')).toBeVisible();
 await page.locator('#v15SkillReviewStudent').selectOption('student');
 await scene(page,'4  INSTRUCTOR SKILL VERIFICATION','Select synthetic trainee and assess practical evidence',false,4400);
 await page.getByLabel('Evidence for practical 1').fill('Synthetic supervised layout assessment for demonstration only');
 await page.getByLabel('Evidence for practical 1').locator('..').getByRole('button').click();
 await expect(page.locator('#tab-skill-review')).toContainText('Saved to Firebase');
 await scene(page,'5  VERIFIED SKILL SAVED','Real app data flow persisted in isolated Firebase emulator',false,3900);

 await enterRole(page,'student');
 await page.evaluate(()=>V15Sync.finalOpenTab('skills'));
 await expect(page.locator('#v15VerifiedSkills')).toContainText('Synthetic supervised layout assessment');
 await scene(page,'6  STUDENT SKILL PASSPORT','The same instructor verification appears in the trainee account',false,6200);

 await page.evaluate(()=>V15Sync.finalOpenTab('skill-gap'));
 await expect(page.locator('.skill-gap-howto')).toBeVisible();
 await page.getByRole('button',{name:'Select full Trade syllabus',exact:true}).click();
 await scene(page,'7  SKILL GAP','Compare selected trade practicals against instructor-verified work',false,5400);
 await page.locator('#v15CareerRole').fill('Junior Graphic Designer — example learning goal');
 await page.getByRole('button',{name:'Save personal learning plan'}).click();
 await expect(page.locator('#tab-skill-gap')).toContainText('Private learning plan synced');
 await scene(page,'8  PERSONAL LEARNING PLAN','Student chooses a goal and saves a private improvement plan',false,5500);

 await page.evaluate(async()=>{
  const original=V15Sync.backendRequest.bind(V15Sync);
  V15Sync.backendRequest=async payload=>{
   if(payload.action==='capabilities')return {aiConfigured:true};
   if(payload.action==='careerChat')return {mode:'ai-chat',
    text:'Sample guidance (not a live AI service): Practise typography hierarchy, export a print-ready PDF and ask your instructor to review a portfolio exercise. Use official sources to verify current job opportunities.'};
   return original(payload);
  };
  await V15Sync.finalOpenTab('career-coach');
 });
 await expect(page.getByRole('heading',{name:'Career Mentor — AI Chat'})).toBeVisible();
 await scene(page,'9  STUDENT CAREER MENTOR','The application supports conversational career guidance when AI is configured',true,3500);
 await page.locator('#coach-chat-input').fill('I study DTP. Which skills should I practise for graphic design?');
 await page.locator('#coach-chat-card input[type=checkbox]').check();
 await page.getByRole('button',{name:'Send to AI Career Mentor',exact:true}).click();
 await expect(page.locator('#coach-chat-messages .career-chat-line')).toHaveCount(2);
 await scene(page,'10  CAREER CHAT EXAMPLE','Sample AI-provider response in test mode; live provider is not verified',true,7000);

 await page.evaluate(()=>V15Sync.finalOpenTab('dashboard'));
 await scene(page,'FROM TRAINING TO EMPLOYMENT','Instructor verification → Skill Passport → Skill Gap → Learning Plan',false,5000);
});
