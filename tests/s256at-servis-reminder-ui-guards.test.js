'use strict';
// S256AT: penjaga statis untuk perubahan tampilan reminder Servis di modules/vehicle/servis-b.js yang masuk lewat rantai S256AB..AD
// tetapi belum punya tes: (1) chip filter severity dengan hitungan 0 disembunyikan, (2) baris riwayat placeholder disembunyikan,
// (3) tombol aksi baris reminder punya tinggi sentuh 44px. Statis (gaya repo); perilaku runtime dicek lewat full suite + census.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = rd('modules/vehicle/servis-b.js');

test('S256AT: chip filter severity menyembunyikan opsi berhitungan 0 kecuali "Semua" dan pilihan aktif', () => {
  assert.ok(/opts\.filter\(o=>o\.v===null\|\|o\.v===cur\|\|counts\[o\.v\]>0\)\.map\(/.test(src),
    'filter chip severity harus mempertahankan: Semua (v===null), pilihan aktif (v===cur), dan hitungan > 0');
  assert.ok(/Servis\.setReminderSeverityFilter/.test(src), 'aksi filter severity harus tetap ada');
});

test('S256AT: ringkasan riwayat placeholder tidak dirender, dan sumber placeholder masih dihasilkan modul lain', () => {
  assert.ok(/r\.historySummary&&r\.historySummary!=='Belum ada riwayat tercatat'\?/.test(src), 'baris riwayat kosong harus disembunyikan');
  const producers = ['modules/vehicle/servis.js', 'modules/vehicle/vehicle-service-reminder-sot.js', 'modules/vehicle/vehicle-service-sot.js']
    .filter((f) => fs.existsSync(path.join(root, f))).filter((f) => rd(f).includes('Belum ada riwayat tercatat'));
  assert.ok(producers.length >= 1, 'string placeholder tidak lagi dihasilkan siapa pun -> guard jadi tidak relevan, periksa ulang');
});

test('S256AT: tombol aksi baris reminder (Riwayat/Pilih aksi) min-height 44px dan data-action tidak berubah', () => {
  ['Servis.openHistoryFromReminder', 'Servis.chooseReminderAction'].forEach((a) => {
    const re = new RegExp('<button class="btn btn-ghost btn-sm u-fs12" style="padding:0 12px;min-height:44px" data-stop="1" data-action="' + a.replace('.', '\\.') + '"');
    assert.ok(re.test(src), 'tombol ' + a + ' kehilangan min-height:44px atau data-action berubah');
  });
  assert.ok(/editSparepartFromReminder/.test(src) && /u-pointer sv-tap" data-action="editSparepartFromReminder"/.test(src), 'header baris reminder harus tetap sv-tap + data-action');
});
