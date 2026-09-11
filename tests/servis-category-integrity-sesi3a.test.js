const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const src = fs.readFileSync(require.resolve('../car-notes.js'), 'utf8');

test('Sesi 3A: edit servis tidak mempertahankan categoryId lama saat item berubah ke item tanpa kategori', () => {
  assert.match(src, /if\(Servis\.editId!==null&&!matched\)/);
  assert.match(src, /const sameItem=existing&&String\(existing\.item\|\|''\)\.trim\(\)\.toLowerCase\(\)===item\.toLowerCase\(\)/);
  assert.match(src, /if\(oldCat&&sameItem\)catIdForLog=oldCat\.id/);
});

test('Sesi 3A: categoryId baru tetap berasal dari kategori yang resolve untuk kendaraan aktif', () => {
  assert.match(src, /resolveServisCatForVehicle\(item,curVehicleId\)/);
  assert.match(src, /let catIdForLog=matched\?matched\.id:null/);
});

test('Sesi 3A: interval valid tetap dapat membuat kategori baru dan memasang categoryId baru', () => {
  assert.match(src, /D\.sparepartCats\.push\(newCat\)/);
  assert.match(src, /catIdForLog=newCat\.id/);
});

test('Sesi 3A: log Pengingat tetap menulis categoryId canonical', () => {
  assert.match(src, /item:cat\.name,categoryId:cat\.id/);
});
