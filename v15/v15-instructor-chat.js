/* EduSkill 360 — private Instructor conversation, no stored transcript. */
(function(V){
'use strict';
if(!V||!window.App)return;
const S={scope:null,history:[],serial:0,busy:false,mode:'guide'},get=id=>document.getElementById(id);
const role=()=>V.currentRole?.()||V.sessionRole||'';
const scope=()=>V.ready&&role()==='instructor'&&V.fb?.user?.uid&&V.workspaceId
 ?JSON.stringify([V.INSTITUTE_ID,V.workspaceId,V.fb.user.uid,window.ITI_RUNTIME?.apiUrl||'']):null;
const current=()=>!!S.scope&&S.scope===scope()&&!!get('tab-ai-assistant')?.classList.contains('active');
const guides={
 en:'Free teaching guide — not AI-generated\n1. Identify a clear objective for the topic.\n2. Check the approved syllabus, necessary tools and safety.\n3. Explain and demonstrate each step.\n4. Give supervised practice and check understanding.\n5. Record verified activity only in authorised training records.\nUse the separate reviewed Plan workflow for official lesson and demonstration records.',
 mr:'मोफत अध्यापन मार्गदर्शक — AI-निर्मित नाही\n१. विषयासाठी स्पष्ट अध्ययन उद्दिष्ट ठरवा.\n२. अधिकृत अभ्यासक्रम, साधने व सुरक्षितता तपासा.\n३. कृतीचे टप्पे समजावून प्रात्यक्षिक दाखवा.\n४. देखरेखीखाली सराव द्या व प्रश्नांद्वारे समज तपासा.\n५. प्रत्यक्ष प्रगती अधिकृत नोंदीमध्येच नोंदवा.\nअधिकृत Plan साठी वेगळी पुनरावलोकन प्रक्रिया वापरा.',
 hi:'निःशुल्क शिक्षण मार्गदर्शिका — AI द्वारा निर्मित नहीं\n१. स्पष्ट शिक्षण उद्देश्य तय करें।\n२. मान्य पाठ्यक्रम, उपकरण और सुरक्षा निर्देश जाँचें।\n३. प्रत्येक चरण समझाएँ और प्रदर्शन करें।\n४. देखरेख में अभ्यास कराएँ और समझ जाँचें।\n५. वास्तविक प्रगति अधिकृत रिकॉर्ड में ही दर्ज करें।\nआधिकारिक Plan के लिए अलग समीक्षा प्रक्रिया अपनाएँ।'
};
function message(who,body){
 const container=get('instructorChatMessages');if(!container)return;
 container.querySelector('.instructor-chat-empty')?.remove();
 const bubble=document.createElement('div');bubble.className='instructor-chat-bubble '+(who==='user'?'from-instructor':'from-assistant');
 const title=document.createElement('strong');title.textContent=who==='user'?'You':who==='guide'?'Free teaching guide (not AI)':'Teaching AI Assistant';
 const p=document.createElement('p');p.textContent=body;bubble.append(title,p);container.append(bubble);container.scrollTop=container.scrollHeight;
}
function status(text){
 const s=get('instructorChatStatus');if(s)s.textContent=text;
 const b=get('instructorChatSend');if(b){b.textContent=S.mode==='ai'?'Ask AI':'Get free guidance';b.disabled=S.busy;}
 const consent=get('instructorChatConsentWrap');if(consent)consent.hidden=S.mode!=='ai';
 const badge=get('instructorChatMode');if(badge)badge.textContent=S.mode==='ai'?'AI configured · Quota checked on send':'Free guidance · No AI generation';
}
function reset(){
 ++S.serial;S.busy=false;S.history=[];
 get('instructorChatMessages')?.replaceChildren();
 if(get('instructorChatQuestion'))get('instructorChatQuestion').value='';
 if(get('instructorChatConsent'))get('instructorChatConsent').checked=false;
 status('New private conversation. The chat is not saved.');
}
async function check(){
 if(!current())return;
 const ticket=++S.serial;S.mode='guide';
 if(!window.ITI_RUNTIME?.apiUrl){status('No secure AI API URL on this release. Free guided teaching help is ready.');return;}
 status('Checking the secure AI service for the current Instructor workspace…');
 try{
  const cap=await V.backendRequest({action:'capabilities'});
  if(!current()||S.serial!==ticket)return;
  S.mode=cap?.aiConfigured===true?'ai':'guide';
  status(S.mode==='ai'?'AI provider configured; consent is required. Provider quota is checked on send.':'AI is not configured on the backend. Free guided teaching help is ready.');
 }catch(e){
  if(!current()||S.serial!==ticket)return;
  S.mode='guide';
  status('AI availability check failed: '+String(e?.message||'Unavailable').slice(0,160)+'. Free teaching help is available.');
 }
}
async function send(){
 if(!current()||S.busy)return;
 const input=get('instructorChatQuestion'),question=input?.value.trim()||'',language=get('instructorChatLanguage')?.value||'mr';
 if(!question){status('Enter a teaching question first.');return;}
 if(question.length>1200){status('Keep your teaching question within 1200 characters.');return;}
 if(S.mode==='guide'){
  message('user',question);message('guide',guides[language]||guides.en);input.value='';
  status('The free guide is a fixed teaching checklist, not a language-model reply.');
  return;
 }
 if(!get('instructorChatConsent')?.checked){status('Consent is required before sending a question to the optional AI provider.');return;}
 while(S.history.length&&(S.history.length>6||S.history.reduce((n,x)=>n+x.text.length,0)+question.length>5500))S.history.splice(0,2);
 const ticket=++S.serial;S.busy=true;status('Preparing a private teaching reply from the secured AI provider…');
 try{
  const out=await V.backendRequest({action:'instructorChat',language,input:question,history:S.history.map(x=>({...x})),consent:true});
  if(!current()||S.serial!==ticket)return;
  if(out?.mode!=='ai-chat'||typeof out.text!=='string'||!out.text.trim())throw Error('Instructor AI Chat is not enabled on this backend.');
  message('user',question);message('assistant',out.text);
  S.history.push({role:'user',text:question},{role:'assistant',text:out.text});
  input.value='';status('AI reply is unverified guidance. Review the official Trade syllabus before use.');
 }catch(e){
  if(!current()||S.serial!==ticket)return;
  const detail=String(e?.message||'Unavailable').slice(0,180);
  if(/Unknown action|404|not enabled/i.test(detail))S.mode='guide';
  status('AI chat unavailable: '+detail+'. Your question is retained; free teaching guidance is available.');
 }finally{if(current()&&S.serial===ticket){S.busy=false;const button=get('instructorChatSend');if(button)button.disabled=false;}}
}
function render(){
 const id=scope(),host=get('tab-ai-assistant');
 if(!id||!host?.classList.contains('active'))return;
 if(S.scope!==id){S.scope=id;S.history=[];++S.serial;S.busy=false;get('instructorChatCard')?.remove();}
 if(get('instructorChatCard'))return;
 const card=document.createElement('section');card.id='instructorChatCard';card.className='card instructor-conversation';
 // Entire markup is literal. Any user/model response is rendered with textContent.
 card.innerHTML='<div class="instructor-chat-head"><div><span class="instructor-chat-eyebrow">TEACHING SUPPORT</span><h3>Ask your Teaching Assistant</h3><p>Chat about Theory, Practicals and classroom delivery. This is not an official saved lesson plan.</p></div><span id="instructorChatMode" class="instructor-chat-mode">Checking service…</span></div>'+
 '<div class="instructor-chat-suggestions"><button type="button" data-example="Explain the basics of page layout to beginners.">Explain a topic</button><button type="button" data-example="Suggest a safe step-by-step print layout demonstration.">Demonstration ideas</button><button type="button" data-example="How can I check student understanding of a theory topic?">Check understanding</button></div>'+
 '<div id="instructorChatMessages" class="instructor-chat-messages" role="log" aria-label="Teaching conversation" aria-live="polite"><p class="instructor-chat-empty">Your private conversation appears here. Do not share student names, Aadhaar, phone numbers, email addresses or private records.</p></div>'+
 '<label for="instructorChatLanguage">Response language</label><select id="instructorChatLanguage"><option value="mr">मराठी</option><option value="hi">हिन्दी</option><option value="en">English</option></select>'+
 '<label for="instructorChatQuestion">Your teaching question</label><textarea id="instructorChatQuestion" rows="3" maxlength="1200" placeholder="Ask about a topic, teaching activity or practical demonstration…"></textarea>'+
 '<label id="instructorChatConsentWrap" class="instructor-chat-consent" hidden><input type="checkbox" id="instructorChatConsent"/> I consent to sending my question and recent turns to the configured AI provider. I have removed personal data.</label>'+
 '<div class="instructor-chat-actions"><button type="button" id="instructorChatSend" class="btn primary">Get free guidance</button><button type="button" id="instructorChatClear" class="btn ghost">New chat / Clear</button><button type="button" id="instructorChatRetry" class="btn secondary">Retry AI connection</button></div>'+
 '<p id="instructorChatStatus" class="instructor-chat-status" role="status" aria-live="polite"></p><p class="instructor-chat-disclaimer">AI drafts require Instructor review; no chat transcripts are stored. Use the existing reviewed Plan tools below to save approved teaching records.</p>';
 const existing=host.querySelector('.instructor-ai-grid');if(existing)host.insertBefore(card,existing);else host.prepend(card);
 card.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>{const q=get('instructorChatQuestion');q.value=btn.dataset.example;q.focus();}));
 get('instructorChatSend').addEventListener('click',send);
 get('instructorChatClear').addEventListener('click',reset);
 get('instructorChatRetry').addEventListener('click',()=>{if(!S.busy)check();});
 get('instructorChatLanguage').addEventListener('change',reset);
 get('instructorChatQuestion').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();get('instructorChatSend').click();}});
 status('Free teaching guidance is ready; checking the optional AI provider…');check();
}
const base=V.finalOpenTab?.bind(V);
if(base)V.finalOpenTab=async function(name){
 if(name!=='ai-assistant'&&S.busy){++S.serial;S.busy=false;}
 const result=await base(name);
 if(name==='ai-assistant'&&role()==='instructor')render();
 return result;
};
V.renderInstructorChat=render;
})(window.V15Sync);
