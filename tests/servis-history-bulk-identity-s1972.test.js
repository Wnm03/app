'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const servis=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const bulk=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');
const src=servis+'\n'+bulk;

test('S1972: bulk editor hanya tersedia dari Riwayat dan memakai selector SOT canonical',()=>{
  assert.match(bulk,/openBulkHistoryIdentityEditor\(\)/);
  assert.match(bulk,/commitBulkHistoryIdentityEdit\(\)/);
  assert.match(bulk,/serviceHistoryBulkCategory/);
  assert.match(bulk,/serviceHistoryBulkComponent/);
  assert.match(bulk,/Servis\.resolveCanonicalServiceSelection\(log\)/);
  assert.match(servis,/data-action="Servis\.openBulkHistoryIdentityEditor"/);
});

test('S1972: bulk edit tidak mengubah KM/tanggal/checklist/finance fields',()=>{
  const start=bulk.indexOf('async commitBulkHistoryIdentityEdit(){');
  const end=bulk.indexOf('\n}\n};',start);
  assert.ok(start>=0&&end>start);
  const fn=bulk.slice(start,end);
  assert.match(fn,/masterCategoryId/);
  assert.match(fn,/serviceComponentId/);
  assert.doesNotMatch(fn,/\.km\s*=/);
  assert.doesNotMatch(fn,/\.date\s*=/);
  assert.doesNotMatch(fn,/\.checklist\s*=/);
  assert.doesNotMatch(fn,/\.cost\s*=/);
  assert.doesNotMatch(fn,/\.accountId\s*=/);
  assert.doesNotMatch(fn,/\.foto\s*=/);
  assert.match(fn,/save\(\{domain:'servis',financeMutation:false\}\)/);
});

test('S1972: perubahan dicatat per riwayat sebagai audit field',()=>{
  const start=bulk.indexOf('async commitBulkHistoryIdentityEdit(){');
  const end=bulk.indexOf('\n}\n};',start);
  assert.ok(start>=0&&end>start);
  const fn=bulk.slice(start,end);
  assert.match(fn,/x\.log\.editHistory\.push\(/);
  assert.match(fn,/source:'bulk-history-identity-editor-s1972'/);
  assert.match(fn,/fields:x\.fields/);
  assert.match(fn,/length>50/);
});

test('S1972: validasi target komponen harus berasal dari kategori yang dipilih dan gagal sebelum mutasi',()=>{
  const start=bulk.indexOf('async commitBulkHistoryIdentityEdit(){');
  const end=bulk.indexOf('\n}\n};',start);
  assert.ok(start>=0&&end>start);
  const fn=bulk.slice(start,end);
  const validatePos=fn.indexOf("if(component&&!items.some(x=>String(x.id)===component))");
  const mutatePos=fn.indexOf('changes.forEach(x=>');
  assert.ok(validatePos>=0&&mutatePos>validatePos);
  assert.match(fn,/Validasi kendaraan\/riwayat gagal/);
  assert.match(fn,/const rollback=/);
});

test('S1972: checklist tetap read-only di Riwayat, bulk editor bukan editor checklist',()=>{
  const historyStart=servis.indexOf('renderEditHistoryTab(){');
  const historyEnd=servis.indexOf('\ncreateHistoryAuditPackage(){',historyStart);
  const history=servis.slice(historyStart,historyEnd);
  assert.match(history,/checklistInfo\(log\)/);
  assert.doesNotMatch(history,/toggleServiceChecklistItem/);
  assert.doesNotMatch(history,/setServiceChecklistAction/);
  assert.match(servis,/Edit Kategori\/Komponen SOT/);
  assert.doesNotMatch(bulk,/\.checklist\s*=/);
});

console.log('S1972 bulk history identity: PASS');
