const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const R=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(R,f),'utf8');
test('atomic build wrapper snapshots runtime-owned files before build',()=>{const s=read('scripts/build-atomic.js');assert.match(s,/spawnSync\(process\.execPath/);assert.match(s,/function restore\(\)/);assert.match(s,/ATOMIC BUILD ROLLBACK/);});
test('patch integrity gate validates apply/delete manifest',()=>{const s=read('scripts/verify-patch-integrity.js');assert.match(s,/BEGIN_APPLY_FILES/);assert.match(s,/BEGIN_DELETE_FILES/);assert.match(s,/sha256/);});
test('runtime audits cover storage, JSON, render and save hotspots',()=>{const s=read('scripts/audit-runtime-io.js');for(const x of ['localStorage','JSON','renderServisList','renderDashboardServisReminder','save'])assert.match(s,new RegExp(x));});
test('event listener and duplicate-code audits are advisory',()=>{assert.match(read('scripts/audit-event-listeners.js'),/addEventListener/);assert.match(read('scripts/audit-duplicate-dead-code.js'),/DUPLICATE CODE AUDIT/);});
test('scalability and contamination gates exist',()=>{assert.match(read('scripts/verify-carnotes-scalability.js'),/Scalability audit/);assert.match(read('scripts/verify-patch-contamination.js'),/PATCH CONTAMINATION PASS/);});
