'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const bridge=fs.readFileSync(path.join(root,'v15/v15-legacy-app-bridge.js'),'utf8');
let failed=0;
function ok(cond,msg){if(cond)console.log('PASS',msg);else{console.error('FAIL',msg);failed++;}}
const context={console:{log(){},info(){},warn(){},error(){}},setTimeout,clearTimeout};
context.window=context;
vm.createContext(context);
// This mirrors the real root app.js: classic script global lexical binding.
vm.runInContext("const App={switchTab(){return 'legacy';},buildMobileNav(){return 'mobile';}};",context);
ok(context.App===undefined,'global lexical const App is not a window property before bridge');
vm.runInContext(bridge,context);
ok(!!context.App,'bridge exports lexical App onto window/global object');
ok(context.__V15_LEGACY_APP_BRIDGED===true,'bridge reports success');
ok(typeof context.App.switchTab==='function','bridged App retains legacy methods');
if(failed){console.error(`\n${failed} lexical App bridge regression test(s) failed.`);process.exit(1);}console.log('\nLexical App bridge regression test passed.');