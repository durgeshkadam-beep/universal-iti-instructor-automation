'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup({v15=true,role='instructor'}={}){
 const w=new JSDOM('<table><tbody id="traineeTableBody"></tbody></table>',{runScripts:'outside-only'}).window;
 w.__ITI_V15=v15;w.DATA={trainees:[{id:'roll-1',roll:'00<img src=x>',name:'<img src=x onerror="window.injected=true">',prn:'<script>evil()</script>',category:'<svg onload=evil()>',accountStatus:'not-linked',pin:'super-secret'}],attendance:{},marks:{}};
 w.SESSION={role};w.isHoliday=()=>false;w.confirm=()=>false;w.alert=()=>{};w.saveData=()=>{};w.generatePin=()=>'0000';
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
test('existing approved trainee id is retained when the instructor clicks remove but cancels',()=>{
 const w=setup();try{w.T.render();const b=w.document.querySelector('#traineeTableBody button');assert.equal(b.textContent,'Remove');b.click();assert.equal(w.DATA.trainees[0].id,'roll-1');}finally{w.close();}
});
