// Node smoke test for files and obvious syntax. Run: node tests/smoke-test.js
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
for (const f of ['index.html','style.css','app.js','sw.js','manifest.json']) {
  if (!fs.existsSync(path.join(root,f))) throw new Error('Missing '+f);
}
for (const f of ['app.js','sw.js']) cp.execFileSync(process.execPath, ['--check', path.join(root,f)]);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const text of ['Syllabus AI','Module Manager','Instructor Accounts','mobileNav','mobileMoreSheet']) {
  if (!html.includes(text)) throw new Error('Missing marker: '+text);
}
console.log('PASS: Universal ITI full-plan-fix smoke test');
