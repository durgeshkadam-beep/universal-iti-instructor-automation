(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ITITeachingPlan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const protectedKeys=['plan','planMeta','teachingPlanRevision','planReviewRequired'];
function clean(x){
 if(x===null||typeof x!=='object')return x;
 if(Number.isInteger(x.seconds)&&Number.isInteger(x.nanoseconds)&&(typeof x.toDate==='function'||Object.keys(x).every(k=>['seconds','nanoseconds','type'].includes(k))))return {$timestamp:[x.seconds,x.nanoseconds]};
 if(x instanceof Date)return {$date:x.toISOString()};
 if(Array.isArray(x))return x.map(clean);
 return Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,clean(x[k])]));
}
const canonical=x=>JSON.stringify(clean(x));
const protectedState=x=>Object.fromEntries(protectedKeys.filter(k=>x&&Object.hasOwn(x,k)).map(k=>[k,x[k]]));
function copyProtected(target,source){const next={...target};for(const key of protectedKeys){if(Object.hasOwn(source,key))next[key]=source[key];else delete next[key];}return next;}
function mutableChanged(before,after){return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].some(k=>!protectedKeys.includes(k)&&canonical(before?.[k])!==canonical(after?.[k]));}
function advanceFollower(op,saved,next){
 const before={...next.before},value={...next.value};
 const put=(target,key)=>{if(Object.hasOwn(saved,key))target[key]=saved[key];else delete target[key];};
 for(const key of new Set([...Object.keys(op.before||{}),...Object.keys(op.value||{})])){
  if(protectedKeys.includes(key)||canonical(op.before?.[key])===canonical(op.value?.[key])||canonical(before[key])!==canonical(op.before?.[key]))continue;
  const carried=canonical(value[key])===canonical(before[key]);put(before,key);if(carried)put(value,key);
 }
 return {...next,before,value,data:{...next.data,data:value}};
}
const topicContext=x=>clean(Object.fromEntries(['no','sourceNo','title','unit','hours'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]])));
function validatePlan(type,plan,patch=false){
 if(!['practicals','theory'].includes(type)||!plan||typeof plan!=='object'||Array.isArray(plan))throw Error('Choose a valid lesson or demonstration plan.');
 const lists=type==='practicals'?['objective','tools','questions']:['objective','materials','questions'];
 const texts=type==='practicals'?['nextDemo']:['review','motivation','summary','assignment','nextLesson'];
 const allowed=[...lists,...texts,...(patch?[]:['steps'])];
 if(Object.keys(plan).some(k=>!allowed.includes(k))||!Object.keys(plan).length)throw Error('Unsupported plan fields. Use the plan editor or reviewed JSON format.');
 const text=x=>typeof x==='string'&&x.length<=4000;
 for(const [k,v]of Object.entries(plan)){
  if(lists.includes(k)){if(!Array.isArray(v)||v.length>200||!Array.from(v).every(text))throw Error('Plan lists require at most 200 text entries, each up to 4000 characters.');}
  else if(k==='steps'){const keys=type==='practicals'?['procedure','keyPoint','spotHint']:['topic','information','spotHint'];if(!Array.isArray(v)||v.length>200||!Array.from(v).every(row=>Array.isArray(row)?row.length===3&&Array.from(row).every(text):row&&typeof row==='object'&&Object.keys(row).length===3&&keys.every(key=>Object.hasOwn(row,key)&&text(row[key]))))throw Error('Use at most 200 procedure rows, with three text cells each.');}
  else if(!text(v))throw Error('Plan text must be at most 4000 characters per field.');
 }
 if(canonical(plan).length>80000)throw Error('Plan draft exceeds 80,000 characters. Shorten it before saving.');
 const result=clean(plan);if(result.steps){const keys=type==='practicals'?['procedure','keyPoint','spotHint']:['topic','information','spotHint'];result.steps=result.steps.map(row=>Array.isArray(row)?Object.fromEntries(keys.map((key,i)=>[key,row[i]])):row);}return result;
}
function rebase(before,value,current){
 if(!current){if(before)throw Error('The syllabus record was removed. Original queued edit retained.');if(value?.teachingPlanRevision)throw Error('Managed plan recovery requires its revision history.');return value;}
 if(!before){if(canonical(value)===canonical(current))return current;throw Error('This topic was already created by another session. Original queued edit retained.');}
 if(canonical(before.no)!==canonical(current.no)||canonical(before.id)!==canonical(current.id))throw Error('The saved topic identity changed. Original queued edit retained.');
 if(canonical(protectedState(before))!==canonical(protectedState(value)))throw Error('A pending plan edit needs review in the plan editor. It was not discarded or replayed over history.');
 const result={...current};
 for(const k of new Set([...Object.keys(before),...Object.keys(value)])){
  if(protectedKeys.includes(k)||canonical(before[k])===canonical(value[k]))continue;
  if(canonical(current[k])!==canonical(before[k])&&canonical(current[k])!==canonical(value[k]))throw Error('The same syllabus field changed in another session. Original queued edit retained.');
  if(Object.hasOwn(value,k))result[k]=value[k];else delete result[k];
 }
 return result;
}
return {canonical,clean,protectedKeys,protectedState,copyProtected,mutableChanged,advanceFollower,topicContext,validatePlan,rebase};
});
