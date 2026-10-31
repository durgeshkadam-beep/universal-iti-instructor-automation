'use strict';
// Firebase CLI/Superstatic still call require('minimatch') as a function.
// All matching and limits remain in the unmodified, patched upstream engine.
const api=require('minimatch-engine');
module.exports=Object.assign(api.minimatch,api);
