const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

test('S1840 service-SOT gate recognizes the real reminder picker method declaration',()=>{
  const gate=fs.readFileSync('scripts/service-sot-integrity-gate.js','utf8');
  const servis=fs.readFileSync('modules/vehicle/servis.js','utf8');
  assert.match(servis,/async\s+chooseReminderAction\s*\(/);
  assert.match(gate,/chooseReminderAction/);
});

test('S1840 production version contract has no stale v1817 runtime references',()=>{
  for(const file of ['index.html','app_production.html','sw.js']){
    const s=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(s,/1817/);
  }
  for(const file of ['app-bundle-a.min.js','app-bundle-b.min.js']){
    const s=fs.readFileSync(file,'utf8');
    assert.match(s,/__BUNDLE_SRC_HASH__:/);
  }
  assert.match(fs.readFileSync('app-bundle-b.min.js','utf8'),/itemsOfGroup/);
});
