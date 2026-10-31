'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup({v15=true,role='instructor'}={}){
 const w=new JSDOM('<table><tbody id="traineeTableBody"></tbody></table>',{runScripts:'outside-only'}).window;
 w.__ITI_V15=v15;w.DATA={trainees:[{id:'roll-1',roll:'00<img src=x>',name:'<img src=x onerror="window.injected=true">',prn:'<script>evil()</script>',category:'<svg onload=evil()>',accountStatus:'not-linked',pin:'super-secret'}],attendance:{},marks:{}};
 w.uid=()=> 'synthetic-new-trainee';w.SESSION={role};w.isHoliday=()=>false;w.confirm=()=>false;w.alert=()=>{};w.saveData=()=>{};w.generatePin=()=>'0000';
 const source=fs.readFileSync('app.js','utf8'),start=source.indexOf('/* ===================== TRAINEES ===================== */'),end=source.indexOf('/* ===================== ATTENDANCE ===================== */',start);
 assert(start>=0&&end>start);
 w.eval("const AVATAR_COLORS=['#123a5e','#a9761d'];\n"+source.slice(start,end)+"\nwindow.T=Trainees;");
 return w;
}
test('malicious uploaded trainee values remain inert text in the roster',()=>{
 const w=setup();try{
 w.T.render();
 const tbody=w.document.getElementById('traineeTableBody');
 assert.equal(tbody.querySelectorAll('img,svg,script,[onerror],[onload]').length,0);
 assert.match(tbody.textContent,/<img src=x/);
 assert.match(tbody.textContent,/<script>evil/);
 assert.equal(w.injected,undefined);
 }finally{w.close();}
});
test('V15 does not show or generate legacy PIN credentials for imported trainees',()=>{
 const w=setup();try{
 w.T.render();const tbody=w.document.getElementById('traineeTableBody');
 assert.match(tbody.textContent,/Not linked/);
 assert.equal(tbody.textContent.includes('super-secret'),false);
 assert.equal(tbody.textContent.includes('Reset'),false);
 }finally{w.close();}
});
test('read only role sees no remove or account controls',()=>{
 const w=setup({role:'student'});try{w.T.render();const tbody=w.document.getElementById('traineeTableBody');assert.equal(tbody.querySelectorAll('button').length,0);}finally{w.close();}
});
test('V15 permanent deletion is hidden and blocked, preserving attendance-linked trainee identity',()=>{
 const w=setup();try{
  w.T.render();
  const body=w.document.querySelector('#traineeTableBody');
  assert.equal(body.querySelectorAll('button').length,0);
  let message='';w.alert=x=>message=x;
  const original=JSON.stringify(w.DATA);
  w.T.remove('roll-1');
  assert.match(message,/Permanent trainee deletion is disabled/);
  assert.equal(JSON.stringify(w.DATA),original);
 }finally{w.close();}
});
test('legacy V14 remove action can still be cancelled',()=>{
 const w=setup({v15:false});try{
  w.T.render();const b=w.document.querySelector('#traineeTableBody button');
  assert.equal(b.textContent,'Remove');b.click();
  assert.equal(w.DATA.trainees[0].id,'roll-1');
 }finally{w.close();}
});

test('manual trainee add on V15 creates no login PIN and announces separate account activation',()=>{
 const w=setup();try{
 const d=w.document;const form=d.createElement('div');form.id='traineeModal';form.style.display='flex';d.body.appendChild(form);
 const fields={mRoll:'002',mName:'New student',mPrn:'PRN002',mCategory:'OPEN',mPhone:'',mGuardian:'',mGuardianPhone:''};
 for(const [id,value] of Object.entries(fields)){const el=d.createElement('input');el.id=id;el.value=value;d.body.appendChild(el);}
 let count=0,message='';w.saveData=()=>++count;w.alert=x=>message=x;
 w.Evaluation={populateSelects(){}};w.Reports={populateSelects(){}};w.Leave={populateSelects(){}};
 w.T.submitForm();assert.equal(count,1);
 const t=w.DATA.trainees.find(x=>x.roll==='002');
 assert.equal(t.accountStatus,'not-linked');assert.equal(Object.hasOwn(t,'pin'),false);
 assert.match(message,/not created automatically/);
 }finally{w.close();}
});
test('V15 legacy PIN reset is not permitted',()=>{
 const w=setup();try{
 let message='';w.alert=x=>message=x;
 const before=JSON.stringify(w.DATA.trainees);
 w.T.resetPin('roll-1');
 assert.match(message,/disabled/);assert.equal(JSON.stringify(w.DATA.trainees),before);
 }finally{w.close();}
});

test('manual admission rejects duplicate roll numbers and PRN before changing records',()=>{
 const w=setup();try{
  const d=w.document;const form=d.createElement('div');form.id='traineeModal';d.body.appendChild(form);
  const fields={mRoll:' 00<img src=x> ',mName:'Another name',mPrn:'PRN999',mCategory:'OPEN',mPhone:'',mGuardian:'',mGuardianPhone:''};
  for(const [id,value] of Object.entries(fields)){const el=d.createElement('input');el.id=id;el.value=value;d.body.appendChild(el);}
  let saves=0,message='';w.saveData=()=>saves++;w.alert=x=>message=x;
  w.T.submitForm();assert.match(message,/Roll No/);assert.equal(saves,0);
  d.getElementById('mRoll').value='999';d.getElementById('mPrn').value='super-secret';
  w.DATA.trainees[0].prn='SUPER-SECRET';w.T.submitForm();
  assert.match(message,/PRN/);assert.equal(saves,0);
 }finally{w.close();}
});
