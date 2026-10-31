/* UI authority is derived from the same server-managed record used by rules/API. */
(function(V){
'use strict';
if(!V)return;
V.resolveAdminMembership=async function(m,info){
 if(!m||m.active!==true)return m;
 const user=this.fb?.user;if(!user?.uid)return {...m,owner:false};
 if(info?.ownerUid===user.uid)return {...m,owner:true};
 if(m.owner!==true)return m;
 const M=this.fb.M,inst=this.INSTITUTE_ID,uid=user.uid;
 try{
  const [z,t]=await Promise.all([M.getDoc(M.doc(this.fb.db,'institutes',inst,'systemAdmins',uid)),user.getIdTokenResult()]);
  if(this.fb.user?.uid!==uid||this.INSTITUTE_ID!==inst)throw Error('Account changed');
  return {...m,owner:window.ITIAdminAuthority?.allowed(z.exists()?z.data():null,m,{...t.claims,uid})===true};
 }catch{return {...m,owner:false};}
};
})(window.V15Sync);
