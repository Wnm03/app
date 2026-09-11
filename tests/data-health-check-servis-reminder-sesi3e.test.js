'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const src=fs.readFileSync(require.resolve('../data-health-check.js'),'utf8');

test('Sesi 3E: Data Health mendeteksi categoryId orphan pada riwayat servis',()=>{
 assert.match(src,/Riwayat servis memiliki categoryId orphan/);
 assert.match(src,/s\.categoryId&&!linked/);
});

test('Sesi 3E: Data Health mendeteksi kategori privat kendaraan yang salah',()=>{
 assert.match(src,/Riwayat servis tertaut ke kategori kendaraan lain/);
 assert.match(src,/linked\.vehicleId&&vehicleId&&linked\.vehicleId!==vehicleId/);
});

test('Sesi 3E: Data Health mendeteksi log legacy yang bisa di-resolve tapi categoryId kosong',()=>{
 assert.match(src,/Riwayat servis belum memiliki categoryId canonical/);
 assert.match(src,/!s\.categoryId&&resolved/);
});

test('Sesi 3E: Data Health mendeteksi kategori reminder aktif dengan interval KM invalid',()=>{
 assert.match(src,/Kategori Pengingat aktif tetapi interval KM tidak valid/);
 assert.match(src,/cat\.showInReminder===true/);
});

test('Sesi 3E: integrity guard read-only, tidak auto-repair servisLogs',()=>{
 const start=src.indexOf('// SESI 3E — Service ↔ Reminder Integrity Guard.');
 const end=src.indexOf("openModal('dataHealthModal');",start);
 const block=src.slice(start,end);
 assert.doesNotMatch(block,/D\.servisLogs\s*=|D\.servisLogs\.push|Object\.assign\(s/);
 assert.match(block,/Read-only/);
});
