'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const inst=rules.match(/match \/institutes\/\{inst\} \{([\s\S]*?)match \/access\/\{email\}/)?.[1]||'';
assert.match(inst,/request\.resource\.data\.ownerUid == resource\.data\.ownerUid/,'institute owner cannot change through client writes');
const lock=rules.match(/match \/attendanceLocks\/\{month\} \{([\s\S]*?)\n\s*\}/)?.[1]||'';
assert.match(lock,/resource\.data\.status == 'reopened'/,'instructor may only resubmit reopened attendance');
assert.match(lock,/request\.resource\.data\.status == 'submitted'/,'instructor cannot self-approve attendance');
assert.match(lock,/request\.resource\.data\.submittedBy == request\.auth\.uid/,'instructor cannot impersonate submitter');
console.log('Phase 1 security rule invariants: PASS (static checks only).');

const data=fs.readFileSync(path.join(root,'v15/v15-data.js'),'utf8');
const controller=fs.readFileSync(path.join(root,'v15/v15-final-controller.js'),'utf8');
const skill=fs.readFileSync(path.join(root,'v15/v15-skill-passport.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'v15/index.html'),'utf8');
const gov=fs.readFileSync(path.join(root,'v15/v15-governance-v2.js'),'utf8');
const attend=rules.match(/match \/attendance\/\{docId\} \{([\s\S]*?)\n\s*\}/)?.[1]||'';
const exam=rules.match(/match \/examAttempts\/\{docId\} \{([\s\S]*?)\n\s*\}/)?.[1]||'';
assert.match(attend,/attendanceUnlocked\(inst, wid, request\.resource\.data\)/,'attendance creates require open month');
assert.match(attend,/attendanceUnlocked\(inst, wid, resource\.data\)/,'attendance updates and deletes require open month');
assert.match(exam,/allow create, update, delete: if workspaceAllowed\(inst, wid\) && isStaff\(inst\)/,'student cannot submit self-scored official exam attempts');
assert.match(rules,/section != 'exams'/,'student cannot read legacy exam answer-key collections');
assert.doesNotMatch(data,/\['theory','practicals','notices','holidays','exams'/,'student public loader must not fetch exam keys');
assert.match(data,/Clear every previously loaded section/,'loader clears previous account records for every role');
assert.match(controller,/\['skills','🧩 My Skills'\]/,'student tab registered');
assert.match(controller,/name==='skills'/,'student skills route registered');
assert.match(skill,/self-assessment, not an official certificate/,'skill self-report cannot be mistaken as verified');
assert.match(loader,/v15\/v15-skill-passport\.js/,'skill module included in loader');
assert.doesNotMatch(gov,/a\.slice\(-3000\)/,'offline queue must not drop oldest unsynced operations');
console.log('Phase 1 exam, attendance, privacy and skills static checks: PASS.');


const v15rules=fs.readFileSync(path.join(root,'v15/firestore.rules'),'utf8');
assert.equal(v15rules,rules,'V15 rules snapshot must match active rules byte-for-byte');
assert.equal((rules.match(/rules_version\s*=/g)||[]).length,1,'exactly one ruleset header permitted');
assert.equal((rules.match(/service cloud\.firestore/g)||[]).length,1,'exactly one Firestore service permitted');
assert.equal((rules.match(/match \/databases\/\{database\}\/documents/g)||[]).length,1,'duplicate ruleset must never be concatenated');
assert.equal((rules.match(/function attendanceUnlocked/g)||[]).length,1,'attendance month helper must be unique');
assert.ok(rules.trim().endsWith('}\n  }\n}'),'ruleset must close normally');
const helperNames=[...rules.matchAll(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(m=>m[1]);
assert.equal(new Set(helperNames).size,helperNames.length,'rules helper declarations must be unique (no duplicated append)');
console.log('Phase 1 Firestore rules integrity invariants: PASS (static checks only).');


const skillRules=rules.match(/match \/skillVerifications\/\{studentUid\} \{([\s\S]*?)\n\s*\}/)?.[1]||'';
const verifyModule=fs.readFileSync(path.join(root,'v15/v15-skill-verification.js'),'utf8');
assert.match(skillRules,/request\.auth\.uid == studentUid/,'student may read only own verified profile');
assert.match(skillRules,/request\.resource\.data\.traineeId == get\(memberPath/,'instructor may write only linked trainee');
assert.match(skillRules,/request\.resource\.data\.updatedAt == request\.time/,'instructor verification timestamp must be server time');
assert.match(skillRules,/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly/,'student identity cannot be changed');
assert.match(rules,/section != 'skillVerifications'/,'generic workspace writes cannot bypass verification rules');
assert.match(verifyModule,/runTransaction/,'skill verification update is transactional');
assert.match(loader,/v15\/v15-skill-verification\.js/,'new skill verification module loaded');
assert.match(controller,/\['skill-review','✅ Skills & Workplace Use'\]/,'instructor skill verification navigation registered');
console.log('PASS Firebase verified skills static access invariants.');


const roleApplicationRules=rules.match(/match \/skillApplications\/\{practicalId\} \{([\s\S]*?)\n\s*\}/)?.[1]||'';
assert.equal((rules.match(/match \/skillApplications\/\{practicalId\}/g)||[]).length,1,'exactly one sourced skill-application ruleset');
assert.ok(rules.includes("practicalId.matches('^practical-[A-Za-z0-9_.-]{1,40}$')"),'practical key validation must remain syntactically complete');
assert.ok(rules.split('\n').length<460,'unexpected Firestore rules growth suggests truncated expression/duplicate appendix');
assert.match(roleApplicationRules,/request\.resource\.data\.reviewedBy == request\.auth\.uid/,'instructor must be attributed');
assert.match(roleApplicationRules,/request\.resource\.data\.sourceUrl\.matches/,'workplace examples must contain HTTPS source');
assert.match(rules,/section != 'skillApplications'/,'generic workspace writes cannot bypass sourced example restrictions');
assert.match(loader,/v15\/v15-career-lens\.js/,'career lens loaded');
assert.match(loader,/v15\/v15-pilot-evidence\.js/,'pilot evidence loaded');
console.log('PASS EduSkill sourced skill application integrity and navigation contract.');
