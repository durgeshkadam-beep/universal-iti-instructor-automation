/* V15 trainee roll-number sorting.
 * Firestore does not guarantee collection order, so trainee rows are sorted
 * naturally by Roll No. before rendering: 01, 02, 03 ... 09, 10, 11 ...
 * Existing trainee records are not renumbered or modified in Firestore.
 */
(function(V){
'use strict';
const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
function rollValue(t){return String(t?.roll??'').trim();}
function sortTrainees(){
  if(!Array.isArray(window.DATA?.trainees)) return;
  DATA.trainees.sort((a,b)=>{
    const ar=rollValue(a), br=rollValue(b);
    if(!ar&&!br) return collator.compare(String(a?.name||''),String(b?.name||''));
    if(!ar) return 1;
    if(!br) return -1;
    const c=collator.compare(ar,br);
    return c || collator.compare(String(a?.name||''),String(b?.name||''));
  });
}
function install(){
  if(typeof Trainees==='undefined'||Trainees.__v15RollSort) return;
  Trainees.__v15RollSort=true;
  const original=Trainees.render?.bind(Trainees);
  if(original){
    Trainees.render=function(){sortTrainees();return original();};
  }
  sortTrainees();
  try{Trainees.render?.();}catch(e){}
}
window.V15SortTrainees=sortTrainees;
install();
console.info('V15 trainee roll sorting active.');
})(window.V15Sync);
