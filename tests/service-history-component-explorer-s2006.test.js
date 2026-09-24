'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('../modules/vehicle/service-history-component-explorer-s2006.js');
const ROOT=path.join(__dirname,'..');

test('S2006 canonical component derives from checklist when top-level identity is stale',()=>{
  const rows=S.derive([
    {id:'old',vehicleId:'v1',date:'2026-02-14',km:11644,serviceComponentId:'throttle-body'},
    {id:'new',vehicleId:'v1',date:'2026-09-24',km:20237,serviceComponentId:'legacy',checklist:[{itemId:'throttle-body',serviceComponentId:'throttle-body',actionType:'bersih'}]}
  ],{vehicleId:'v1',componentId:'throttle-body'});
  assert.deepEqual(rows.map(x=>x.id),['new','old']);
});

test('S2006 grouping is per canonical component and counts work types',()=>{
  const groups=S.group([
    {id:'1',vehicleId:'v1',item:'Busi',serviceComponentId:'busi',actionType:'periksa'},
    {id:'2',vehicleId:'v1',item:'Busi',serviceComponentId:'busi',actionType:'ganti'},
    {id:'3',vehicleId:'v1',item:'Throttle Body',checklist:[{itemId:'throttle-body',serviceComponentId:'throttle-body',actionType:'bersih'}]}
  ]);
  assert.equal(groups.length,2);
  const busi=groups.find(x=>x.id==='busi');
  assert.equal(busi.counts.periksa,1); assert.equal(busi.counts.ganti,1);
  assert.equal(groups.find(x=>x.id==='throttle-body').counts.bersih,1);
});

test('S2006 work-type filter is independent and preserves vehicle isolation',()=>{
  const rows=S.derive([
    {id:'a',vehicleId:'v1',actionType:'bersih'},
    {id:'b',vehicleId:'v1',actionType:'ganti'},
    {id:'c',vehicleId:'v2',actionType:'bersih'}
  ],{vehicleId:'v1',workType:'bersih'});
  assert.deepEqual(rows.map(x=>x.id),['a']);
});

test('S2006 build manifest registers explorer after Servis public API',()=>{
  const src=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  const i=src.indexOf("'modules/vehicle/servis-b.js'");
  const j=src.indexOf("'modules/vehicle/service-history-component-explorer-s2006.js'");
  assert(i>=0&&j>i);
});
