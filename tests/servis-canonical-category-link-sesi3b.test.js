const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const servis=fs.readFileSync(require.resolve('../modules/vehicle/sparepart-servis.js'),'utf8');
const car=fs.readFileSync(require.resolve('../car-notes.js'),'utf8');
const chat=fs.readFileSync(require.resolve('../chat-action-handlers.js'),'utf8');
const tx=fs.readFileSync(require.resolve('../modules/finance/tx-servis.js'),'utf8');
const backup=fs.readFileSync(require.resolve('../modules/shared/backup-restore.js'),'utf8');

test('Sesi 3B: canonical helper menjadi SoT linkage nama+kendaraan',()=>{
 assert.match(servis,/function canonicalServisCategoryId\(item,vehicleId,preferredId\)/);
 assert.match(servis,/preferred&&\(!preferred\.vehicleId\|\|preferred\.vehicleId===vehicleId\)/);
 assert.match(servis,/const matched=resolveServisCatForVehicle\(item,vehicleId\)/);
});

test('Sesi 3B: log berkategori tidak boleh match kategori privat kendaraan lain',()=>{
 assert.match(servis,/if\(linked\.vehicleId&&linked\.vehicleId!==s\.vehicleId\)return false/);
});

test('Sesi 3B: jalur chat memakai canonical category link',()=>{
 assert.match(chat,/canonicalServisCategoryId\(servisItem,veh\.id,null\)/);
 assert.match(chat,/categoryId:canonicalCatId/);
});

test('Sesi 3B: jalur transaksi-servis memakai canonical category link',()=>{
 assert.match(tx,/canonicalServisCategoryId\(item,vehicleId,null\)/);
 assert.match(tx,/canonicalServisCategoryId\(item,vehicleId,part\.catId\)/);
});

test('Sesi 3B: restore JSON mempertahankan hanya categoryId canonical untuk kendaraan',()=>{
 assert.match(backup,/canonicalServisCategoryId\(restoredItem,restoredVehicleId,s\.categoryId\|\|null\)/);
 assert.match(backup,/categoryId:restoredCatId/);
});

test('Sesi 3B: import CSV servis memakai canonical category link',()=>{
 assert.match(backup,/canonicalServisCategoryId\(importServisItem,rowVehId,null\)/);
 assert.match(backup,/categoryId:importCatId/);
});
