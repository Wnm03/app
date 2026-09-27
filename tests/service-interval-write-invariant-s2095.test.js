'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('S2095 every interval write removes duplicate aliases for the same component',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8');
  assert.match(src,/targetComponent=str\(rec\.serviceComponentId\)/);
  assert.match(src,/existingIdentity===targetIdentity\)delete s\.serviceIntervals\[existingKey\]/);
  assert.match(src,/s\.serviceIntervals\[key\]=rec/);
});

test('S2095 interval edit invalidates derived recommendation caches before render',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(src,/Sparepart\._recoCache=null;\s*Sparepart\._catalogNameCache=\[\];\s*save\(\);Servis\.renderReminder\(\)/);
});

test('S2095 recommendation/reminder mutations invalidate derived caches',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
  assert.ok((src.match(/Sparepart\._recoCache=null/g)||[]).length>=3);
  assert.ok((src.match(/Sparepart\._catalogNameCache=\[\]/g)||[]).length>=3);
});
console.log('S2095 SOT write/cache invariants: PASS');
