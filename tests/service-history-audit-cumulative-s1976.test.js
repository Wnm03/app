'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const servis=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const servisB=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis-b.js'),'utf8');
const bulk=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');

test('S1976: Riwayat -> Audit mempertahankan selection dan membuka workflow Audit',()=>{
  assert.match(servisB,/openHistoryAudit\(logs\)/);
  assert.match(servisB,/Servis\.openModal\(selected\[0\]\.id\)/);
  assert.match(servisB,/Servis\.setEditTab\('audit'\)/);
  assert.match(servisB,/Pilihan riwayat tetap aman/);
  assert.match(servisB,/_ensureHistorySelectionScope/);
  assert.match(servisB,/getHistoryAuditSelectionIds/);
});

test('S1976: Audit bukan hanya checklist; operasi lanjutan tetap tersedia',()=>{
  assert.match(bulk,/Edit Kategori\/Komponen SOT/);
  assert.match(bulk,/Jenis Pekerjaan/);
  assert.match(bulk,/Jadikan Paket Pekerjaan/);
  assert.match(bulk,/Checklist tetap menjadi bukti pekerjaan/);
});

test('S1976: DOM checkbox hanya view; operasi bulk membaca shared selection SoT',()=>{
  assert.match(bulk,/Servis\.getHistoryAuditSelectionIds\(curVehicleId\)/);
  assert.match(bulk,/Servis\._selectedHistoryAuditIds\(\)/);
  assert.match(servis,/getHistoryAuditSelectionIds\(curVehicleId\)/);
  assert.match(servis,/createHistoryAuditPackage\(\).*getHistoryAuditSelectionIds/s);
});

test('S1976: selection dibatasi 100 secara global, bukan hanya per render',()=>{
  assert.match(servisB,/100-Servis\._selectedHistoryIds\.size/);
  assert.match(servisB,/Maksimal 100 riwayat/);
  assert.match(servisB,/slice\(0,100\)/);
});

test('S1976: package creation menolak selection lintas kendaraan dan menangkap exception',()=>{
  assert.match(servis,/vehicles=new Set\(logs\.map/);
  assert.match(servis,/Semua riwayat harus berasal dari kendaraan yang sama/);
  assert.match(servis,/\[S1976\] createHistoryAuditPackage failed/);
});

test('S1976: SOT/job-type editor gagal dengan aman tanpa menghapus selection',()=>{
  assert.match(bulk,/\[S1976\] openBulkHistoryIdentityEditor failed/);
  assert.match(bulk,/Editor SOT tidak dapat dibuka\. Pilihan riwayat tetap aman/);
  assert.match(bulk,/\[S1976\] openHistoryJobTypeEditor failed/);
  assert.match(bulk,/Editor jenis pekerjaan tidak dapat dibuka\. Pilihan riwayat tetap aman/);
});

test('S1976: modal lifecycle tetap dinormalisasi setelah global openModal dan frame berikutnya',()=>{
  assert.match(servis,/global openModal\(\) resets overlay geometry/);
  assert.match(servis,/requestAnimationFrame/);
  assert.match(servis,/_normalizeEditModalGeometry\(\)/);
});

console.log('S1976 cumulative service-audit hardening: PASS');
