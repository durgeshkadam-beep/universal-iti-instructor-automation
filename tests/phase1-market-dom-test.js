'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const delay=()=>new Promise(done=>setTimeout(done,30));
(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><section id="tab-local-market"></section><section id="tab-market-editor"></section></body></html>',{
    url:'https://example.test/final/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window;w.alert=()=>{};w.confirm=()=>true;
  let currentRole='student',seq=2;
  const records=[
    {id:'j1',title:'DTP Junior',employer:'Sample Press',city:'Mumbai',cityKey:'mumbai',skills:['photoshop','coreldraw'],sourceUrl:'https://example.org/j1',expiresAt:'2026-12-30',status:'active'},
    {id:'j2',title:'Print assistant',employer:'Sample Press',city:'Pune',cityKey:'pune',skills:['photoshop'],sourceUrl:'https://example.org/j2',expiresAt:'2026-12-30',status:'active'}
  ];
  const firestore={
    collection:(_db,...args)=>({collection:args.at(-1)}),
    doc:(_collection,id)=>({id}),
    where:(field,operator,value)=>({field,operator,value}),
    query:(collection,where)=>({...collection,where}),
    async getDocs(q){
      const filtered=q.where?records.filter(x=>x[q.where.field]===q.where.value):records;
      return {forEach(fn){for(const p of filtered)fn({id:p.id,data:()=>({...p})});}};
    },
    serverTimestamp:()=>new Date('2026-10-22T10:00:00Z'),
    async addDoc(_col,data){const id='j'+(++seq);records.push({id,...data});return {id};},
    async updateDoc(ref,data){let record=records.find(x=>x.id===ref.id);if(!record)throw Error('No record');Object.assign(record,data);}
  };
  const V={currentRole:()=>currentRole,ready:true,INSTITUTE_ID:'demo-iti',workspaceId:'w1',
    fb:{M:firestore,db:{},user:{uid:'i1'}}
  };
  w.V15Sync=V;
  w.eval(fs.readFileSync(path.join(__dirname,'../v15/v15-local-market.js'),'utf8'));
  await V.renderStudentLocalMarket();
  let text=w.document.querySelector('#v15MarketResults').textContent;
  assert.match(text,/1 recorded employers · 2 active reviewed listings/);
  const city=w.document.querySelector('#v15MarketCity');
  const skill=w.document.querySelector('#v15MarketSkill');
  city.value='Mumbai';skill.value='Photoshop';
  w.document.querySelector('#tab-local-market button').click();await delay();
  text=w.document.querySelector('#v15MarketResults').textContent;
  assert.match(text,/1 recorded employers · 1 active reviewed listings/);
  assert.match(text,/photoshop.*1 of 1 tracked listings/);
  assert.equal(w.document.querySelectorAll('#v15MarketResults a[href^="https://example.org"]').length,1);
  city.value='Ratnagiri';
  w.document.querySelector('#tab-local-market button').click();await delay();
  text=w.document.querySelector('#v15MarketResults').textContent;
  assert.match(text,/does not mean that no companies or jobs exist here/i);
  assert.doesNotMatch(text,/Photoshop.*valuable everywhere/);
  currentRole='instructor';
  await V.renderInstructorMarketEditor();
  const get=id=>w.document.getElementById('market-'+id);
  get('title').value='Graphic Operator';get('employer').value='New Press';
  get('city').value='Ratnagiri';get('skills').value='CorelDRAW, Photoshop';
  get('sourceUrl').value='https://example.org/jobs/new';
  get('expiresAt').value='2026-12-25';
  w.document.querySelector('#tab-market-editor button').click();await delay();
  assert.equal(records.length,3,'instructor can create reviewed source without an AI key');
  const added=records[2];assert.equal(added.reviewedBy,'i1');assert.equal(added.status,'active');
  const withdraw=[...w.document.querySelectorAll('#tab-market-editor button')].find(b=>b.textContent==='Withdraw listing');
  assert.ok(withdraw,'instructor can withdraw incorrect postings');
  withdraw.click();await delay();
  assert.equal(records.find(x=>x.id==='j1').status,'withdrawn');
  currentRole='student';await V.renderStudentLocalMarket();
  const freshCity=w.document.querySelector('#v15MarketCity');
  freshCity.value='Mumbai';w.document.querySelector('#tab-local-market button').click();await delay();
  text=w.document.querySelector('#v15MarketResults').textContent;
  assert.match(text,/0 recorded employers · 0 active reviewed listings/,'withdrawn posting not visible to students');
  w.close();
  console.log('PASS Local Market DOM: city filter, source links, student empty state, instructor submission and withdrawal.');
})().catch(e=>{console.error(e);process.exitCode=1;});