'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');

test('S2094 legacy interval consumers delegate to the single active interval SOT',()=>{
  const spare=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(spare,/ServiceIntervalSOT\.active/);
  assert.match(spare,/ServiceIntervalSOT\.setManual/);
  assert.match(spare,/ServiceIntervalSOT\.setGuideline/);
  assert.doesNotMatch(spare,/VehicleServiceSOT\.setServiceInterval/);
  const ui=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-ui.js'),'utf8');
  assert.match(ui,/ServiceIntervalSOT\.setManual/);
  assert.match(ui,/ServiceIntervalSOT\.setGuideline/);
});

test('S2094 vehicle UI has no legacy vehicle-level interval authority fallback',()=>{
  const core=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-core.js'),'utf8');
  assert.doesNotMatch(core,/v\.serviceIntervalKm/);
  assert.doesNotMatch(core,/v\.oliTransmisiIntervalKm/);
});
