/* Shared server-managed Admin delegation checks. This is not an email allowlist. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ITIAdminAuthority=api;})(typeof window==='object'?window:this,function(){
'use strict';
const keys=['uid','email','active','googleOnly','schemaVersion','createdAt','createdBy','updatedAt','updatedBy'];
function validGrant(g){
 return !!g&&typeof g==='object'&&!Array.isArray(g)&&Object.keys(g).length===keys.length&&Object.keys(g).every(k=>keys.includes(k))
  &&typeof g.uid==='string'&&g.uid.length>0&&g.uid.length<=128&&!g.uid.includes('/')
  &&typeof g.email==='string'&&g.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)&&g.email===g.email.toLowerCase()
  &&g.active===true&&g.googleOnly===true&&g.schemaVersion===1
  &&['createdAt','updatedAt'].every(k=>typeof g[k]==='string'&&g[k].length<=40&&Number.isFinite(Date.parse(g[k])))
  &&['createdBy','updatedBy'].every(k=>typeof g[k]==='string'&&g[k].length>0&&g[k].length<=128);
}
function allowed(g,m,u){
 return validGrant(g)&&!!m&&m.active===true&&m.owner===true&&m.uid===u?.uid&&m.email===u?.email
  &&g.uid===u?.uid&&g.email===u?.email&&u?.email_verified===true&&u?.firebase?.sign_in_provider==='google.com';
}
return {validGrant,allowed};
});
