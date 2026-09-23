'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const bulkSrc=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');
const reminderStart=src.indexOf('renderEditReminderTab(){');
const historyStart=src.indexOf('renderEditHistoryTab(){');
const reminderEnd=src.indexOf('\nrenderEditHistoryTab(){',reminderStart);
const historyEnd=src.indexOf('\ncreateHistoryAuditPackage(){',historyStart);
const reminder=src.slice(reminderStart,reminderEnd);
const history=src.slice(historyStart,historyEnd);


test('S1971: checklist tidak lagi diduplikasi sebagai surface Pengingat',()=>{
  assert.ok(reminderStart>=0&&reminderEnd>reminderStart);
  assert.doesNotMatch(reminder,/checklistRows/);
  assert.doesNotMatch(reminder,/Komponen Checklist/);
  assert.match(reminder,/Tab ini hanya membaca SoT kategori\/komponen/);
});

test('S1971: checklist tetap tersedia sebagai bukti read-only di tab Riwayat',()=>{
  assert.ok(historyStart>=0&&historyEnd>historyStart);
  assert.match(history,/const checklistInfo=\(log\)=>/);
  assert.match(history,/summaryFromLog/);
  assert.match(history,/Checklist di tab ini hanya bukti riwayat \(read-only\)/);
  assert.match(history,/checklistInfo\(log\)/);
  assert.doesNotMatch(history,/data-action="Servis\.toggleServiceChecklistItem"/);
  assert.doesNotMatch(history,/data-action="Servis\.setServiceChecklistAction"/);
});

test('S1971: data checklist lama tidak dihapus dari SOT servis',()=>{
  assert.match(src,/checklist:checklistPayload/);
  assert.match(src,/ServisChecklist\.loadFromLog\(s\)/);
});

test('S1971/S1972: bulk editor extension dimuat setelah Servis dan tidak menjadi checklist SOT kedua',()=>{
  assert.match(bulkSrc,/Object\.assign\(Servis,BulkHistoryIdentityEditor\)/);
  assert.match(bulkSrc,/commitBulkHistoryIdentityEdit/);
  assert.doesNotMatch(bulkSrc,/\.checklist\s*=/);
});

console.log('S1971 checklist SOT: PASS');
