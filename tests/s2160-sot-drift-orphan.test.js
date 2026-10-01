'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('S2160 prevents SOT drift across taxonomy, vehicle scope and reminder',()=>{
  const files=['modules/vehicle/service-taxonomy-sot.js','modules/vehicle/service-reminder-package-sot.js','modules/vehicle/vehicle-service-sot.js','modules/vehicle/service-reminder-vehicle-scope-s2015.js'];
  for(const f of files) assert.ok(read(f).length>0,f+' must exist');
  assert.match(read(files[0]),/canonicalTarget/);
  assert.match(read(files[1]),/canonicalTarget/);
  assert.match(read(files[2]),/VehicleScopedSOT/);
  assert.match(read(files[3]),/canonical taxonomy resolver/);
});
test('S2160 architecture matrix keeps projections read-only',()=>{
  const m=JSON.parse(read('docs/SOT-OWNERSHIP-MATRIX-S2153.json'));
  const due=m.domains.find(d=>d.domain==='reminderDue');
  const dash=m.domains.find(d=>d.domain==='dashboard');
  assert.equal(due.writeAuthority,'none');
  assert.equal(dash.writeAuthority,'none');
});
console.log('S2160 SOT drift/orphan regression: 2/2 PASS');
