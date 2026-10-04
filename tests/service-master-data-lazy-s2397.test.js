'use strict';
const {test}=require('node:test');
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');

test('S2397 generated master data preserves exact legacy shape lazily',()=>{
  const src=require('../data/database-kategori-komponen-servis.json');
  const gen=require('../modules/vehicle/service-master-data.generated.js');
  assert.deepStrictEqual(gen.SERVICE_MASTER_DATA,src);
  assert.equal(gen.SERVICE_CHECKLIST_GROUPS.length,13);
  assert.equal(gen.SERVICE_MASTER_CHECKSUM,'da46cc6842bba3fe638ae8e6052f289b79afcedc33401e5680e43999fb6821c3');
});

test('S2397 generated artifact exposes checklist groups eagerly but master payload lazily',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-master-data.generated.js'),'utf8');
  const ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
  assert.ok(Array.isArray(ctx.__SERVICE_CHECKLIST_GROUPS__));
  const desc=Object.getOwnPropertyDescriptor(ctx,'__SERVICE_MASTER_DATA__');
  assert.equal(typeof desc.get,'function');
  const before=desc.get();
  assert.equal(before.componentCount,102);
  assert.equal(before.components.length,102);
});
