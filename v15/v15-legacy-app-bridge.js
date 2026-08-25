/* Universal ITI FINAL — legacy shell bridge
 * Root app.js declares `const App`, so it is a global lexical binding and is not
 * automatically exposed as window.App. The clean V15 controller intentionally
 * checks window.App before taking ownership of navigation. Export the already
 * loaded legacy App object once, without changing any data or authentication.
 */
(function(){
'use strict';
try{
  if(typeof App!=='undefined' && App && !window.App){
    window.App=App;
  }
  window.__V15_LEGACY_APP_BRIDGED=!!window.App;
  if(!window.__V15_LEGACY_APP_BRIDGED){
    console.error('Universal ITI FINAL: legacy App bridge could not find App.');
  }
}catch(e){
  window.__V15_LEGACY_APP_BRIDGED=false;
  console.error('Universal ITI FINAL: legacy App bridge failed.',e);
}
})();
