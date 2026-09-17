'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {SERVICE_CHECKLIST_GROUPS,ServisChecklist}=require('../modules/vehicle/servis-checklist.js');

test('S1810: sistem pengereman memiliki SoT komponen lengkap tanpa nama generik duplikat',()=>{
  const g=SERVICE_CHECKLIST_GROUPS.find(x=>x.masterCategoryId==='sistem-pengereman');
  assert.ok(g);
  const names=g.items.map(x=>x.name);
  for(const n of ['Kampas Rem Depan','Kampas Rem Belakang','Cakram Rem Depan','Kaliper Rem Depan','Master Rem & Reservoir','Tromol Rem Belakang','Minyak Rem','Selang Rem']) assert.ok(names.includes(n),n);
  assert.equal(names.filter(n=>n==='Kampas Rem').length,0);
  assert.equal(new Set(g.items.map(x=>x.id)).size,g.items.length);
});

test('S1810: komponen yang punya inspeksi + penggantian dapat di-override manual',()=>{
  const v=SERVICE_CHECKLIST_GROUPS.flatMap(g=>g.items);
  for(const id of ['v-belt-cvt','roller-cvt','oli-mesin','per-cvt']) {
    const it=v.find(x=>x.id===id); assert.ok(it);
    const valid=ServisChecklist._validActionTypesFor(it);
    assert.ok(valid.includes('periksa'),id+' missing periksa');
    assert.ok(valid.includes('ganti'),id+' missing ganti');
  }
});

test('S1810: komponen rem kondisional default ke periksa namun menyediakan ganti manual',()=>{
  const v=SERVICE_CHECKLIST_GROUPS.flatMap(g=>g.items);
  for(const id of ['kampas-rem-depan','kampas-rem-belakang','cakram-rem-depan','kaliper-rem-depan','master-rem-reservoir','tromol-rem-belakang']) {
    const it=v.find(x=>x.id===id); assert.ok(it);
    assert.deepEqual(ServisChecklist._validActionTypesFor(it),['periksa','ganti']);
  }
});

test('S1810: rekomendasi generik tidak lagi membuat komponen Kampas Rem generik',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const a=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
  const b=fs.readFileSync(path.join(__dirname,'..','modules/engine/database-api.js'),'utf8');
  assert.ok(a.includes("'Kampas Rem Depan'"));
  assert.ok(a.includes("'Kampas Rem Belakang'"));
  assert.ok(b.includes("'Kampas Rem Depan'"));
  assert.ok(b.includes("'Kampas Rem Belakang'"));
  assert.ok(!a.match(/motor:\[[^\]]*'Kampas Rem'[^\]]*\]/));
  assert.ok(!b.match(/motor:\s*\[[^\]]*'Kampas Rem'[^\]]*\]/));
});

test('S1810: modal servis menyediakan tindakan yang terlihat untuk item standar maupun free-text',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/modals.js'),'utf8');
  assert.ok(src.includes('id=\\"servisActionTypeWrap\\"'));
  assert.ok(src.includes('id=\\"servisActionType\\"'));
  assert.ok(src.includes('Tindakan Servis'));
  assert.ok(src.includes('id=\\"servisItem\\"'));
});
