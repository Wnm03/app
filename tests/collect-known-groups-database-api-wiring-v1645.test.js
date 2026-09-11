'use strict';
// tests/collect-known-groups-database-api-wiring-v1645.test.js — lanjutan
// backlog Database API Fase 1 (sesi v1643/v1644/v1645, "Sengaja TIDAK
// dikerjakan": migrasi collectKnownGroups() di sparepart-servis.js).
//
// Target sesi ini: collectKnownGroups() (modules/vehicle/sparepart-servis.js)
// -- sumber entri TORSI_DB sekarang lewat _allTorsiEntries()
// (modules/vehicle/sparepart-servis-b.js, sudah ada sejak sesi
// suggestServiceIntervalKm() v1645), BUKAN baca TORSI_DB literal langsung
// lagi. _allTorsiEntries() sendiri sudah baca DatabaseAPI.vehicle.getAll()
// kalau DatabaseAPI termuat, fallback literal TORSI_DB kalau belum -- 0
// duplikasi logic guard, murni reuse fungsi yang sudah ada.
//
// RULE yang dites di sini:
//   - sparepart-servis-b.js (pemilik _allTorsiEntries()) TIDAK termuat sama
//     sekali (test terisolasi lama) -> collectKnownGroups() fallback ke
//     TORSI_DB literal langsung (kalau ada) -- IDENTIK perilaku sebelum
//     migrasi ini, 0 regresi.
//   - sparepart-servis-b.js termuat TANPA DatabaseAPI -> collectKnownGroups()
//     lewat _allTorsiEntries() yang fallback ke TORSI_DB literal -- hasil
//     sama seperti sebelumnya.
//   - DatabaseAPI JUGA termuat -> collectKnownGroups() ikut baca dari
//     DatabaseAPI.vehicle.getAll() (via _allTorsiEntries()), bukan lagi
//     TORSI_DB literal langsung.
//   - Bukti loop benar2 lewat DatabaseAPI: DatabaseAPI.vehicle.getAll()
//     dipatch supaya balikin grup custom yang TIDAK ada di TORSI_DB asli
//     manapun -- collectKnownGroups() harus ikut memunculkan grup itu.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return Object.assign({ vehicles: [], sparepartCats: [] }, overrides);
}

test('sparepart-servis-b.js TIDAK termuat -- collectKnownGroups() fallback ke TORSI_DB literal langsung (jalur lama, 0 regresi)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/vehicle/sparepart-servis.js'],
    { D },
    ['collectKnownGroups'],
  );
  // _allTorsiEntries tidak ada sama sekali di sandbox ini (file pemiliknya
  // tidak di-load) -- guard typeof di collectKnownGroups() harus jatuh ke
  // cabang "TORSI_DB tidak terdefinisi juga" -> hasil array kosong (cuma
  // GENERIC_GROUP_BY_NAME), TIDAK throw.
  const groups = ctx.collectKnownGroups();
  assert.ok(Array.isArray(groups));
  const names = groups.map((g) => g.group);
  assert.ok(names.includes('Sistem Rem'), 'GENERIC_GROUP_BY_NAME tetap masuk walau TORSI_DB tidak ada');
});

test('sparepart-servis-b.js termuat, DatabaseAPI TIDAK termuat -- collectKnownGroups() via _allTorsiEntries() fallback literal, hasil sama seperti sebelum migrasi', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    { D, MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    ['collectKnownGroups', 'TORSI_DB'],
  );
  const groups = ctx.collectKnownGroups();
  const names = groups.map((g) => g.group);
  assert.ok(names.includes('Sistem Rem'));
  assert.ok(names.includes('Perawatan Berkala'));
  assert.equal(names.filter((n) => n === 'Perawatan Berkala').length, 1, 'tidak boleh duplikat walau muncul di >1 entri TORSI_DB + GENERIC_GROUP_BY_NAME');
});

test('DatabaseAPI termuat -- collectKnownGroups() ikut baca dari DatabaseAPI.vehicle.getAll(), bukan TORSI_DB literal langsung', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/engine/database-api.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    { D, MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    ['collectKnownGroups', 'DatabaseAPI'],
  );
  const groupsViaApi = ctx.collectKnownGroups();
  const namesViaApi = groupsViaApi.map((g) => g.group);

  // Bandingkan dengan hasil TANPA DatabaseAPI (sandbox terpisah) -- harus
  // identik, karena DatabaseAPI.vehicle.getAll() sumber datanya SAMA persis
  // dengan TORSI_DB literal (cuma beda jalur baca).
  const ctxNoApi = loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    { D: makeD(), MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    ['collectKnownGroups'],
  );
  const namesNoApi = ctxNoApi.collectKnownGroups().map((g) => g.group).sort();

  assert.deepEqual(namesViaApi.slice().sort(), namesNoApi);
});

test('Bukti loop collectKnownGroups() benar2 lewat DatabaseAPI: grup custom via getAll() ikut muncul di hasil', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/engine/database-api.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    { D, MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    ['collectKnownGroups', 'DatabaseAPI'],
  );

  // Ganti implementasi getAll() supaya balikin 1 record custom dengan grup
  // komponen yang TIDAK ada di TORSI_DB asli manapun -- kalau
  // collectKnownGroups() masih memunculkan grup ini, berarti sumber
  // datanya sungguh2 DatabaseAPI.vehicle.getAll(), bukan diam2 tetap pakai
  // TORSI_DB literal yang di-load duluan ke sandbox.
  ctx.DatabaseAPI.vehicle.getAll = () => [{
    torsi: {
      matchNames: ['kendaraan custom xyz'],
      sourceNote: 'Sumber Custom Test',
      cats: [{ cat: 'Grup Custom Unik Sekali', icon: '🧪', items: [] }],
    },
  }];

  const groups = ctx.collectKnownGroups();
  const custom = groups.find((g) => g.group === 'Grup Custom Unik Sekali');
  assert.ok(custom, 'grup custom dari DatabaseAPI.vehicle.getAll() harus ikut muncul');
  assert.equal(custom.icon, '🧪');
});
