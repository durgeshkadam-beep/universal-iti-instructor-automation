/* Non-destructive Instructor planning preflight. No Firestore writes or implicit data migrations. */
(function(root){
  'use strict';
  function label(value){return String(value??'').trim().replace(/\s+/g,' ').toLowerCase();}
  function number(value){return String(value??'').trim();}
  function assess(data,items,trade){
    const original={practical:Array.isArray(data?.practicals)?data.practicals:[],theory:Array.isArray(data?.theory)?data.theory:[]};
    const modules=Array.isArray(data?.modules)?data.modules:[];
    const deny=reason=>({ok:false,mode:'blocked',reason});
    if(!Array.isArray(items)||!items.length)return deny('The syllabus preview is empty.');
    const savedTrade=String(data?.meta?.trade||'').trim();
    if(savedTrade&&trade&&label(savedTrade)!==label(trade))
      return deny('Trade differs from the active workspace. Switch to the correct trade before changing the plan.');
    const used=new Set();
    for(const x of items){
      if(!x||!['practical','theory'].includes(x.type))return deny('A syllabus topic has an invalid type.');
      const key=x.type+'|'+number(x.sourceNo||x.seq).toLowerCase();
      if(used.has(key))return deny('Duplicate exercise identifier in the preview: '+key+'.');
      used.add(key);
      if(!label(x.title)||!(Number(x.hours)>0))return deny('A syllabus item needs a name and positive hours.');
    }
    const existing=original.practical.length+original.theory.length;
    if(!existing){
      if(modules.length||data?.meta?.trainingPlan)return deny('Existing modules or training plan need a reviewed migration before replacement.');
      return {ok:true,mode:'create',practicals:[],theory:[]};
    }
    const pairs={practical:[],theory:[]};
    for(const kind of ['practical','theory']){
      const records=original[kind],proposed=items.filter(x=>x.type===kind);
      if(records.length!==proposed.length)return deny('Existing '+kind+' count differs from the imported syllabus. No records were changed.');
      const matched=new Set();
      for(const item of proposed){
        const candidates=records.filter(r=>{
          if(number(r.sourceNo)&&number(item.sourceNo))return label(r.sourceNo)===label(item.sourceNo);
          return label(r.title)===label(item.title);
        });
        if(candidates.length!==1)return deny('Cannot safely match '+kind+' topic '+number(item.sourceNo||item.seq)+'. Review existing records manually.');
        const found=candidates[0];
        if(matched.has(found)||label(found.title)!==label(item.title)||Number(found.hours)!==Number(item.hours))
          return deny('A '+kind+' number, name or duration changed. Preserve existing teaching records and request a controlled migration.');
        matched.add(found);pairs[kind].push(found);
      }
    }
    return {ok:true,mode:'revise',practicals:pairs.practical,theory:pairs.theory};
  }
  root.InstructorPlanSafety={assess};
})(window);
