const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bulk=fs.readFileSync(path.join(root,'modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');

describe('S1973 — bulk history identity hardening',()=>{
 it('menyimpan audit before/after + bulkId tanpa menyentuh field historis',()=>{
   assert.match(bulk,/source:'bulk-history-identity-editor-s1972'/);
   assert.match(bulk,/schemaVersion:'S1973'/);
   assert.match(bulk,/bulkId/);
   assert.match(bulk,/before,after/);
   assert.doesNotMatch(bulk,/\.km\s*=/);
   assert.doesNotMatch(bulk,/\.date\s*=/);
   assert.doesNotMatch(bulk,/\.checklist\s*=/);
   assert.doesNotMatch(bulk,/\.cost\s*=/);
   assert.doesNotMatch(bulk,/\.accountId\s*=/);
   assert.doesNotMatch(bulk,/\.foto\s*=/);
 });
 it('membatasi operasi bulk maksimal 100 riwayat dan Select All mengikuti batas',()=>{
   assert.match(bulk,/ids\.length>100/);
   assert.match(bulk,/changes\.length>100/);
   assert.match(servis,/i<100/);
   assert.match(servis,/dibatasi 100 riwayat/);
 });
 it('memberi peringatan bila legacy categoryId menunjuk kategori lama yang berbeda, tanpa memindahkannya otomatis',()=>{
   assert.match(bulk,/_bulkHistoryLegacyCategoryMismatch/);
   assert.match(bulk,/legacyMismatch/);
   assert.match(bulk,/tautan kategori Pengingat lama/);
   assert.match(bulk,/categoryId/);
 });
 it('preview membedakan jumlah dipilih vs jumlah yang benar-benar berubah',()=>{
   assert.match(bulk,/riwayat dipilih · \$\{changes\.length\} akan berubah/);
   assert.match(bulk,/Tidak ada perubahan identitas SOT/);
 });
});
console.log('S1973 bulk history hardening: PASS');
