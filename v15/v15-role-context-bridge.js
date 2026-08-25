/* Universal ITI FINAL — role context compatibility bridge
 * Some consolidated portal renderers were originally written against window.SESSION.
 * The production auth layer can hold the authoritative session in V.currentSession()/__V15_SESSION.
 * Publish that context immediately before portal rendering so valid Principal/Staff/Student pages
 * never return early and appear blank.
 */
(function(V){
'use strict';
if(!V)return;
function publish(){
  const s=V.currentSession?.()||window.__V15_SESSION||V.session||window.SESSION||null;
  if(s&&s.role)window.SESSION=s;
  return s;
}
const names=['renderAdminPanel','renderPrincipalDashboard','renderPrincipalStaff','renderPrincipalNotices','renderPrincipalReports','renderPrincipalInspection','renderStaffDashboard','renderStudentDashboard','injectInstituteNotices','injectAttendanceGovernance','injectGalleryCloud','sanitizeStudent'];
for(const name of names){
  const base=V[name];
  if(typeof base!=='function')continue;
  V[name]=function(...args){publish();return base.apply(this,args);};
}
V.publishFinalRoleContext=publish;
publish();
console.info('Universal ITI FINAL role-context bridge active.');
})(window.V15Sync);
