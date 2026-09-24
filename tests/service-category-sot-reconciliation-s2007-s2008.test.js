'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');

test('S2007: canonical explicit component is CANONICAL and does not require name inference',()=>{
  const S=require('../modules/vehicle/service-category-sot-reconciliation-s2007.js');
  global.ServiceInputCatalog={groups:()=>[{masterCategoryId:'m',items:[{id:'coolant',name:'Coolant',masterCategoryId:'m',intervalKm:4000,intervalTimeMonths:24}]}]};
  const r=S.classifyCategory({id:'c',name:'Cairan pendingin radiator (coolant)',serviceComponentId:'coolant',masterCategoryId:'m',intervalKm:4000});
  assert.equal(r.status,S.STATUS.CANONICAL); assert.equal(r.componentId,'coolant');
  delete global.ServiceInputCatalog;
});

test('S2007: exact legacy name with interval conflict is REVIEW, not auto-mapped',()=>{
  const S=require('../modules/vehicle/service-category-sot-reconciliation-s2007.js');
  global.ServiceInputCatalog={groups:()=>[{masterCategoryId:'servis-mesin',items:[{id:'oli-mesin',name:'Oli Mesin',masterCategoryId:'servis-mesin',intervalKm:4000,intervalTimeMonths:null}]}]};
  const r=S.classifyCategory({id:'legacy',name:'Oli Mesin',intervalKm:1500});
  assert.equal(r.status,S.STATUS.REVIEW_INTERVAL_CONFLICT); assert.equal(r.componentId,'oli-mesin');
  delete global.ServiceInputCatalog;
});

test('S2007: duplicate canonical component chooses exact canonical name deterministically',()=>{
  const S=require('../modules/vehicle/service-category-sot-reconciliation-s2007.js');
  global.ServiceInputCatalog={groups:()=>[{masterCategoryId:'m',items:[{id:'coolant',name:'Coolant',masterCategoryId:'m',intervalKm:4000,intervalTimeMonths:24}]}]};
  const cats=[
    {id:'legacy-name',name:'Cairan pendingin radiator (coolant)',serviceComponentId:'coolant',masterCategoryId:'m',intervalKm:4000,vehicleId:'v1'},
    {id:'canonical',name:'Coolant',serviceComponentId:'coolant',masterCategoryId:'m',intervalKm:4000,intervalBulan:24,vehicleId:'v1'}
  ];
  const chosen=S.chooseCanonicalCategory(cats,'v1','coolant');
  assert.equal(chosen.id,'canonical');
  const a=S.auditCategories(cats,'v1');
  assert.equal(a.duplicates.length,1);
  assert.ok(a.rows.some(x=>x.category.id==='legacy-name'&&x.status===S.STATUS.DUPLICATE));
  delete global.ServiceInputCatalog;
});

test('S2008: reminder projection collapses duplicate component but keeps unresolved legacy rows reviewable',()=>{
  const S=require('../modules/vehicle/service-category-sot-reconciliation-s2007.js');
  global.ServiceInputCatalog={groups:()=>[{masterCategoryId:'m',items:[{id:'coolant',name:'Coolant',masterCategoryId:'m',intervalKm:4000,intervalTimeMonths:24}]}]};
  const cats=[
    {id:'a',name:'Coolant',serviceComponentId:'coolant',masterCategoryId:'m',intervalKm:4000,vehicleId:'v1',showInReminder:true},
    {id:'b',name:'Coolant lama',serviceComponentId:'coolant',masterCategoryId:'m',intervalKm:4000,vehicleId:'v1',showInReminder:true},
    {id:'legacy',name:'Slidepiece cvt',intervalKm:2800,vehicleId:'v1',showInReminder:true}
  ];
  const out=S.canonicalReminderProjection(cats,'v1');
  assert.equal(out.length,2);
  assert.equal(out[0].id,'a');
  assert.equal(out[1].id,'legacy');
  delete global.ServiceInputCatalog;
});

test('S2008 source wiring: build loads category reconciliation before reminder consumer',()=>{
  const src=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  const a=src.indexOf("'modules/vehicle/service-category-sot-reconciliation-s2007.js'");
  const b=src.indexOf("'modules/vehicle/sparepart-servis.js'");
  assert.ok(a>=0&&b>a);
});

test('S2008 source wiring: reminder distinguishes history count from reset baseline',()=>{
  const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/servis-b.js'),'utf8');
  assert.match(src,/Belum ada riwayat yang mereset interval/);
  assert.match(src,/historyBaselineLabel/);
});
