'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const car=fs.readFileSync(require.resolve('../car-notes.js'),'utf8');
const dash=fs.readFileSync(require.resolve('../modules/shared/modules-render.js'),'utf8');
const servisB=fs.readFileSync(require.resolve('../modules/vehicle/sparepart-servis-b.js'),'utf8');

test('Sesi 3D: kartu Pengingat utama memakai canonical reset filter untuk lastKm',()=>{
  assert.match(car,/const resetFilter=\(typeof resolveResetActionTypeFilter==='function'\)\?resolveResetActionTypeFilter\(cat\):null;/);
  assert.match(car,/Servis\.getLastServiceKmForCat\(curVehicleId,cat,resetFilter,true\)/);
  // v21: sisa km sekarang dihitung lewat effectiveIntervalKm/effectiveLastKm
  // (dukungan interval hari & proyeksi kondisi), bukan ternary sebaris lama.
  // Lihat komentar "Maintenance Rule v2" & "v21" di car-notes.js.
  assert.match(car,/const sisa=u&&u\.sisaKm!=null\?u\.sisaKm:/);
});

test('Sesi 3D: interval bulan yang membatasi tidak dilabeli sebagai lewat KM',()=>{
  assert.match(car,/const monthLimited=!!\(u&&u\.intervalBulan&&u\.limitingAxis==='bulan'/);
  assert.match(car,/monthLimited\?`⚠️ Lewat \$\{Math\.abs\(Math\.round\(u\.sisaBulan\)\)\} bln`/);
  assert.match(car,/const estDateISO=monthLimited\?null:/);
});

test('Sesi 3D: Dashboard tidak lagi menghitung reminder pure-KM sendiri',()=>{
  assert.match(dash,/getLastServiceKmForCat\(veh\.id,cat,resetFilter,true\)/);
  assert.match(dash,/computeServiceUrgency\(\{vehicleId:veh\.id,cat,curKm,kmPerDay\}\)/);
  assert.match(dash,/const status=u\?u\.status:/);
  assert.match(dash,/monthLimited\?`⚠️ Lewat/);
});

test('Sesi 3D: predictService mengekspos lastKm dari baseline reset yang sama',()=>{
  assert.match(servisB,/const resetFilter=\(typeof resolveResetActionTypeFilter==='function'\)\?resolveResetActionTypeFilter\(cat\):null;/);
  assert.match(servisB,/getLastServiceKmForCat\(vehicleId,cat,resetFilter,true\)/);
  assert.match(servisB,/const u=computeServiceUrgency\(\{vehicleId,cat,curKm,kmPerDay\}\)/);
});
