/* Universal ITI Instructor Automation — V12 Free AI + Calendar Agent
 * Free-first design:
 * 1) Optional Gemini Developer API key, entered at runtime and stored in sessionStorage only.
 * 2) Manual AI fallback: copy structured prompt to any free chatbot, paste returned JSON here.
 * Instructor approval is required before an AI plan becomes the kept record.
 */
const InstructorAI = {
  keyName:'itiGeminiKeySessionV12',
  modelName:'gemini-3.6-flash',
  state:{pending:null,lastPrompt:'',lastResult:null},
  init(){
    const model=document.getElementById('aiModel'); if(model && !model.value) model.value=this.modelName;
    this.refreshStatus(); this.refreshTopicPicker(); this.renderToday();
  },
  esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));},
  getKey(){try{return sessionStorage.getItem(this.keyName)||'';}catch(e){return'';}},
  setKey(){
    const input=document.getElementById('aiApiKey'); if(!input)return;
    const key=input.value.trim(); if(!key){alert('Paste your Gemini API key first.');return;}
    try{sessionStorage.setItem(this.keyName,key);}catch(e){}
    input.value=''; this.refreshStatus(); alert('Gemini connected for this browser session only. The key is not saved in the app database.');
  },
  disconnect(){try{sessionStorage.removeItem(this.keyName);}catch(e){} this.refreshStatus();},
  refreshStatus(){
    const connected=!!this.getKey();
    const badge=document.getElementById('aiConnectionBadge');
    if(badge){badge.textContent=connected?'● Gemini connected':'○ Manual / no-key mode';badge.className='badge '+(connected?'success':'');}
    const help=document.getElementById('aiConnectionHelp');
    if(help)help.textContent=connected?'One-click AI generation is enabled for this session.':'No key is required: generate a prompt, use any free AI, then paste its JSON result back into this app.';
  },
  currentModel(){return (document.getElementById('aiModel')?.value||this.modelName).trim()||this.modelName;},
  async geminiJSON(prompt,schema){
    const key=this.getKey(); if(!key) throw new Error('NO_API_KEY');
    const endpoint='https://generativelanguage.googleapis.com/v1beta/interactions';
    const body={model:this.currentModel(),input:prompt,response_format:{type:'text',mime_type:'application/json',schema}};
    const resp=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
    if(!resp.ok){let detail='';try{detail=await resp.text();}catch(e){}throw new Error(`Gemini request failed (${resp.status}). ${detail.slice(0,500)}`);}
    const data=await resp.json();
    const text=(data.steps||[]).flatMap(s=>s.content||[]).filter(c=>c.type==='text').map(c=>c.text||'').join('')||data.output_text||'';
    if(!text)throw new Error('Gemini returned no text output.');
    try{return JSON.parse(text);}catch(e){throw new Error('Gemini returned invalid JSON.');}
  },
  syllabusSchema(){return {type:'object',properties:{trade:{type:'string'},items:{type:'array',items:{type:'object',properties:{type:{type:'string',enum:['theory','practical']},module:{type:'string'},title:{type:'string'},hours:{type:'number',minimum:0.5},confidence:{type:'number',minimum:0,maximum:1}},required:['type','module','title','hours','confidence']}}},required:['trade','items']};},
  planSchema(type){
    if(type==='practical')return {type:'object',properties:{objective:{type:'array',items:{type:'string'}},tools:{type:'array',items:{type:'string'}},steps:{type:'array',items:{type:'object',properties:{procedure:{type:'string'},keyPoint:{type:'string'},spotHint:{type:'string'}},required:['procedure','keyPoint','spotHint']}},questions:{type:'array',items:{type:'string'}},nextDemo:{type:'string'}},required:['objective','tools','steps','questions','nextDemo']};
    return {type:'object',properties:{objective:{type:'array',items:{type:'string'}},materials:{type:'array',items:{type:'string'}},review:{type:'string'},motivation:{type:'string'},steps:{type:'array',items:{type:'object',properties:{topic:{type:'string'},information:{type:'string'},spotHint:{type:'string'}},required:['topic','information','spotHint']}},questions:{type:'array',items:{type:'string'}},summary:{type:'string'},assignment:{type:'string'},nextLesson:{type:'string'}},required:['objective','materials','review','motivation','steps','questions','summary','assignment','nextLesson']};
  },
  buildSyllabusPrompt(text,trade){return `You are an expert ITI Craft Instructor syllabus analyst for Maharashtra/India vocational training.\n\nTASK: Convert the supplied syllabus into a clean structured list of THEORY and PRACTICAL teaching items. Preserve syllabus meaning and sequence. Do not invent topics. Detect module/unit and hours when present. If hours are not explicit, use 1 hour for theory and 7 hours for practical only as a reviewable estimate and lower confidence.\n\nRULES:\n- type must be exactly theory or practical.\n- Practical = job/operation/exercise/demonstration/creation/installation/repair/configuration/testing/hands-on activity.\n- Theory = concept/definition/explanation/knowledge/principle/identification/discussion.\n- Remove headers, page numbers and table noise.\n- module is nearest real module/unit/section heading; otherwise General.\n- confidence is 0 to 1.\n- Output only JSON matching the supplied schema.\n\nTRADE HINT: ${trade||'Detect from syllabus'}\n\nSYLLABUS TEXT:\n${String(text||'').slice(0,90000)}`;},
  buildPlanPrompt(type,item){
    const list=type==='practical'?(DATA.practicals||[]):(DATA.theory||[]),idx=list.findIndex(x=>Number(x.no)===Number(item.no));
    const prev=idx>0?list[idx-1]:null,next=idx>=0&&idx<list.length-1?list[idx+1]:null;
    const profile=typeof RecordFormats!=='undefined'?RecordFormats.profile():{};
    const format=type==='practical'?'Create a DEMONSTRATION PLAN with purpose/objectives; tools/equipment/supplies/training aids; detailed procedure sequence with key points/safety precautions and spot hints; questions; next demonstration.':'Create a LESSON PLAN with purpose/objectives; materials/equipment/training aids; review; motivation; detailed teaching steps/topics with information points and chalkboard summary/spot hints; questions; summary; assignment; next lesson.';
    return `You are the personal AI assistant of an ITI Craft Instructor. Prepare an accurate, teachable plan for instructor review.\n\nRULES:\n- Use only supplied topic/context; do not invent syllabus requirements.\n- Keep language professional, concise and usable in an ITI classroom/workshop.\n- Practical plans must include realistic safety precautions.\n- Do not invent software/tool versions.\n- Do not include trainee personal data.\n- This is an AI DRAFT; instructor approval is required.\n- Output only JSON matching the supplied schema.\n\nINSTITUTE: ${profile.institute||DATA.meta?.institute||''}\nTRADE: ${DATA.meta?.trade||profile.trade||''}\nBATCH/SESSION: ${DATA.meta?.batch||''} / ${DATA.meta?.session||''}\nTYPE: ${type==='practical'?'Practical / Demonstration':'Theory / Lesson'}\nPLAN NO: ${item.no}\nMODULE/UNIT: ${item.unit||item.module||'General'}\nTOPIC: ${item.title}\nPLANNED START: ${item.plannedDate||'Not assigned'}\nDURATION: ${type==='practical'?(item.hours||7)+' practical hours':(item.hours||1)+' theory hours'}\nPREVIOUS TOPIC: ${prev?.title||'None / first topic'}\nNEXT TOPIC: ${next?.title||'None / last topic'}\n\n${format}`;
  },
  async analyzeSyllabusFile(){
    const file=document.getElementById('uFile')?.files?.[0]; if(!file){UniversalSyllabus.status('Please select a syllabus file first.','error');return;}
    UniversalSyllabus.status('Reading syllabus…'); let text;
    try{text=await UniversalSyllabus.extractText(file);}catch(e){UniversalSyllabus.status('Could not read this file: '+(e.message||e),'error');return;}
    const trade=(document.getElementById('uTrade').value||UniversalSyllabus.detectTrade(text)||file.name.replace(/\.[^.]+$/,'')).trim();document.getElementById('uTrade').value=trade;
    if(this.getKey()){
      UniversalSyllabus.status('Gemini is analyzing modules, theory, practical and hours…');
      try{
        const result=await this.geminiJSON(this.buildSyllabusPrompt(text,trade),this.syllabusSchema());
        const items=(result.items||[]).map((x,i)=>({id:'ai_'+Date.now()+'_'+i,seq:i+1,type:x.type,module:x.module||'General',title:String(x.title||'').trim(),hours:Number(x.hours)||1,confidence:Number(x.confidence)||0.7})).filter(x=>x.title);
        UniversalSyllabus.state={...UniversalSyllabus.state,trade:result.trade||trade,sourceName:file.name,analyzedAt:new Date().toISOString(),items};document.getElementById('uTrade').value=UniversalSyllabus.state.trade;UniversalSyllabus.renderPreview();UniversalSyllabus.status(`AI analysis complete: ${items.length} items. Edit/review before creating the training plan.`,'ok');
      }catch(e){console.error(e);UniversalSyllabus.status('AI analysis failed; using the built-in basic analyzer. '+(e.message||e),'error');this.localSyllabusAnalysis(text,trade,file.name);}
    }else{
      this.openManual('syllabus',this.buildSyllabusPrompt(text,trade),this.syllabusSchema(),{trade,fileName:file.name});UniversalSyllabus.status('Manual AI prompt prepared. Or use Basic Analyze for offline keyword analysis.');
    }
  },
  localSyllabusAnalysis(text,trade,fileName){UniversalSyllabus.state.trade=trade;UniversalSyllabus.state.sourceName=fileName;UniversalSyllabus.state.analyzedAt=new Date().toISOString();UniversalSyllabus.state.items=UniversalSyllabus.classifyLines(text);UniversalSyllabus.renderPreview();UniversalSyllabus.status(`Basic local analysis complete: ${UniversalSyllabus.state.items.length} items. Review carefully.`,'ok');},
  openPlanDraft(type,no){
    if(SESSION?.role!=='instructor'){alert('Only the instructor can create/approve AI plans.');return;}
    const list=type==='practical'?DATA.practicals:DATA.theory,item=list.find(x=>Number(x.no)===Number(no));if(!item)return;
    const prompt=this.buildPlanPrompt(type,item);this.state.pending={kind:'plan',type,no:Number(no),item};this.state.lastPrompt=prompt;this.state.lastResult=null;this.openModal(type==='practical'?`AI Demonstration Plan — ${no}`:`AI Lesson Plan — ${no}`,prompt,'');if(this.getKey())this.generatePending();
  },
  openQuickPlan(){const sel=document.getElementById('aiTopicSelect');if(!sel||!sel.value){alert('Select a theory/practical topic.');return;}const [type,no]=sel.value.split(':');this.openPlanDraft(type,Number(no));},
  refreshTopicPicker(){const el=document.getElementById('aiTopicSelect');if(!el||typeof DATA==='undefined')return;const t=(DATA.theory||[]).map(x=>`<option value="theory:${x.no}">Theory ${x.no}: ${this.esc(x.title)}</option>`),p=(DATA.practicals||[]).map(x=>`<option value="practical:${x.no}">Practical ${x.no}: ${this.esc(x.title)}</option>`);el.innerHTML='<option value="">Select a topic…</option><optgroup label="Theory">'+t.join('')+'</optgroup><optgroup label="Practical">'+p.join('')+'</optgroup>';},
  renderToday(){
    const el=document.getElementById('aiToday');if(!el||typeof DATA==='undefined')return;const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    const day=(DATA.meta?.trainingPlan?.dayPlan||[]).find(r=>r.date===today&&!r.holiday); let cards=[];
    if(day){
      (day.theoryItems||[]).forEach(seg=>{const x=(DATA.theory||[]).find(t=>Number(t.sequence||t.no)===Number(seg.seq));if(x)cards.push({type:'theory',x,segmentHours:seg.hours});});
      (day.practicalItems||[]).forEach(seg=>{const x=(DATA.practicals||[]).find(p=>Number(p.sequence||p.no)===Number(seg.seq));if(x)cards.push({type:'practical',x,segmentHours:seg.hours});});
    }
    if(!cards.length)cards=[...(DATA.theory||[]).filter(x=>x.plannedDate===today).map(x=>({type:'theory',x,segmentHours:x.hours||1})),...(DATA.practicals||[]).filter(x=>x.plannedDate===today).map(x=>({type:'practical',x,segmentHours:x.hours||7}))];
    const seen=new Set();cards=cards.filter(c=>{const k=c.type+':'+c.x.no;if(seen.has(k))return false;seen.add(k);return true;});
    el.innerHTML=cards.length?cards.map(({type,x,segmentHours})=>`<div class="callout"><b>${type==='theory'?'📘 Theory':'🖥️ Practical'} ${x.no}: ${this.esc(x.title)}</b><div class="muted">${segmentHours||''}${segmentHours?' hrs · ':''}Planned today${x.status==='completed'?' · Completed':''}</div><div class="field-row" style="margin-top:8px"><button class="btn primary small" onclick="InstructorAI.openPlanDraft('${type}',${x.no})">✨ Prepare ${type==='practical'?'Demonstration':'Lesson'} Plan</button>${x.status!=='completed'?`<button class="btn ghost small" onclick="MarkComplete.open('${type}',${x.no},'${type==='practical'?'Demo':'Lesson'} ${x.no}')">✓ Mark Conducted</button>`:''}</div></div>`).join(''):`<p class="muted">No topic is specifically planned for ${today}. Use the topic picker below.</p>`;
  },
  openManual(kind,prompt,schema,extra={}){this.state.pending={kind,schema,...extra};this.state.lastPrompt=prompt;this.state.lastResult=null;this.openModal(kind==='syllabus'?'Manual AI — Syllabus Analysis':'AI Assistant',prompt,'');},
  openModal(title,prompt,result){document.getElementById('aiModalTitle').textContent=title;document.getElementById('aiPromptText').value=prompt||'';document.getElementById('aiResultText').value=result||'';document.getElementById('aiPreviewBox').style.display='none';document.getElementById('aiModal').style.display='flex';const gen=document.getElementById('aiGenerateBtn');if(gen)gen.style.display=this.getKey()?'':'none';this.setAIStatus(this.getKey()?'Connected: generate with Gemini or edit the prompt first.':'Manual mode: copy prompt → use any free AI → paste returned JSON → Preview/Save.');},
  closeModal(){document.getElementById('aiModal').style.display='none';},
  copyPrompt(){const el=document.getElementById('aiPromptText');el.select();if(navigator.clipboard)navigator.clipboard.writeText(el.value).then(()=>this.setAIStatus('Prompt copied.')).catch(()=>document.execCommand('copy'));else document.execCommand('copy');},
  setAIStatus(msg,type='info'){const el=document.getElementById('aiModalStatus');if(!el)return;el.textContent=msg;el.style.borderLeft=`4px solid ${type==='error'?'#b42318':'#1769aa'}`;},
  async generatePending(){const p=this.state.pending;if(!p)return;const prompt=document.getElementById('aiPromptText').value,schema=p.kind==='plan'?this.planSchema(p.type):p.schema||this.syllabusSchema();const btn=document.getElementById('aiGenerateBtn');if(btn)btn.disabled=true;this.setAIStatus('Generating with Gemini…');try{const result=await this.geminiJSON(prompt,schema);this.state.lastResult=result;document.getElementById('aiResultText').value=JSON.stringify(result,null,2);this.setAIStatus('AI draft ready. Review it before saving.');this.previewResult();}catch(e){this.setAIStatus(e.message||String(e),'error');}finally{if(btn)btn.disabled=false;}},
  parseResult(){const raw=document.getElementById('aiResultText').value.trim();if(!raw)throw new Error('Paste or generate AI JSON first.');return JSON.parse(raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));},
  normalizePlan(type,r){if(type==='practical')return {objective:(r.objective||[]).map(String),tools:(r.tools||[]).map(String),steps:(r.steps||[]).map(s=>[String(s.procedure||s[0]||''),String(s.keyPoint||s.key_point||s[1]||''),String(s.spotHint||s.spot_hint||s[2]||'')]),questions:(r.questions||[]).map(String),nextDemo:String(r.nextDemo||r.next_demo||'')};return {objective:(r.objective||[]).map(String),materials:(r.materials||[]).map(String),review:String(r.review||''),motivation:String(r.motivation||''),steps:(r.steps||[]).map(s=>[String(s.topic||s[0]||''),String(s.information||s.informationPoint||s[1]||''),String(s.spotHint||s.spot_hint||s[2]||'')]),questions:(r.questions||[]).map(String),summary:String(r.summary||''),assignment:String(r.assignment||''),nextLesson:String(r.nextLesson||r.next_lesson||'')};},
  previewResult(){try{const r=this.parseResult(),p=this.state.pending;if(!p)return;const box=document.getElementById('aiPreviewBox');box.style.display='block';if(p.kind==='plan'){const norm=this.normalizePlan(p.type,r);this.state.lastResult=norm;box.innerHTML=`<h4>Draft preview</h4><p><b>${this.esc(p.item.title)}</b></p><p>${norm.objective?.length||0} objectives · ${norm.steps?.length||0} teaching/procedure rows · ${norm.questions?.length||0} questions</p><p class="muted">Nothing is saved until you choose Save Draft or Approve & Keep.</p>`;}else box.innerHTML=`<h4>Syllabus preview</h4><p>${(r.items||[]).length} items returned for ${this.esc(r.trade||p.trade||'trade')}.</p>`;}catch(e){this.setAIStatus('JSON error: '+e.message,'error');}},
  saveResult(approve=false){let r;try{r=this.parseResult();}catch(e){this.setAIStatus('JSON error: '+e.message,'error');return;}const p=this.state.pending;if(!p)return;if(p.kind==='syllabus'){const items=(r.items||[]).map((x,i)=>({id:'ai_'+Date.now()+'_'+i,seq:i+1,type:x.type==='practical'?'practical':'theory',module:x.module||'General',title:String(x.title||'').trim(),hours:Number(x.hours)||1,confidence:Number(x.confidence)||0.7})).filter(x=>x.title);UniversalSyllabus.state={...UniversalSyllabus.state,trade:r.trade||p.trade||'',sourceName:p.fileName||'AI import',analyzedAt:new Date().toISOString(),items};document.getElementById('uTrade').value=UniversalSyllabus.state.trade;UniversalSyllabus.renderPreview();UniversalSyllabus.status(`AI result loaded: ${items.length} items. Review/edit before applying.`,'ok');this.closeModal();return;}const list=p.type==='practical'?DATA.practicals:DATA.theory,item=list.find(x=>Number(x.no)===Number(p.no));if(!item)return;item.plan=this.normalizePlan(p.type,r);item.planMeta={status:approve?'approved':'ai-draft',generatedAt:new Date().toISOString(),approvedAt:approve?new Date().toISOString():null,approvedBy:approve?(SESSION?.name||'Instructor'):null,provider:this.getKey()?'Gemini API':'Manual AI',model:this.getKey()?this.currentModel():'external/manual',version:Number(item.planMeta?.version||0)+1};saveData();this.closeModal();if(typeof PlanViewer!=='undefined')PlanViewer.open(p.type,p.no);alert(approve?'AI plan approved and kept as the instructor record.':'AI draft saved. Review it before approval.');}
};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>InstructorAI.init());
if(typeof module!=='undefined'&&module.exports)module.exports={InstructorAI};
