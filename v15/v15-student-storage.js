/* Browser drafts use the same project/institute/student/workspace boundary as cloud plans.
 * Legacy unscoped drafts are preserved, never guessed into a tenant or auto-uploaded.
 */
(function(V){
'use strict';if(!V)return;
V.studentStorageKeys=function(){
 const project=V.fb?.app?.options?.projectId,institute=V.INSTITUTE_ID,uid=V.fb?.user?.uid,wid=V.workspaceId,trainee=V.member?.traineeId;
 if(![project,institute,uid,wid,trainee].every(x=>typeof x==='string'&&x.length))return null;
 const scope=JSON.stringify([project,institute,uid,wid,trainee]);
 return {uid,wid,trainee,institute,project,selfKey:'iti-v15-student-skill-self-v2-'+scope,goalKey:'iti-v15-career-plan-v2-'+scope,
 legacySelf:'iti-v15-student-skill-self-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(wid),
 legacyGoal:'iti-v15-career-plan-v1-'+encodeURIComponent(uid)+'-'+encodeURIComponent(wid)+'-'+encodeURIComponent(trainee)};
};
V.studentStorageNotice=function(){
 const k=this.studentStorageKeys();if(!k)return '';
 try{if(localStorage.getItem(k.legacySelf)!==null||localStorage.getItem(k.legacyGoal)!==null||localStorage.getItem(k.legacyGoal+'-pending')!==null)return 'An older browser draft is retained on this device but is not automatically imported because its institute is unknown. Current institute cloud plans load when online. Do not clear browser data if you need the older draft reviewed.';}catch(e){}
 return '';
};
})(window.V15Sync);
