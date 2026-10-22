'use strict';
const {readdirSync}=require('node:fs');const {spawnSync}=require('node:child_process');
let failures=0;
for(const file of readdirSync('tests').filter(x=>x.endsWith('-test.js')&&!/emulator/.test(x))){const r=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});if(r.status!==0)failures++;}
const r=spawnSync(process.execPath,['--test','tests/service.test.js'],{stdio:'inherit'});if(r.status!==0)failures++;
process.exitCode=failures?1:0;
