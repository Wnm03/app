'use strict';
// tests/sparepart-recommend-categories.test.js — cakupan fitur baru
// Sparepart.recommendCategories()/openRecommendBox()/commitRecommend()
// (modules/vehicle/sparepart-servis.js), tombol "💡 Rekomendasi Kategori
// Sesuai Kendaraan" di 🔧 Kelola Kategori Sparepart & Interval Servis
// (permintaan eksplisit user: rekomendasi kategori part rutin servis sesuai
// kendaraan aktif, bisa ditambahkan/disembunyikan di Pengingat Servis).
//
// recommendCategories() murni PEMBACAAN (read-only, tidak panggil save()):
//  - tier 'manual': nama part dari TORSI_DB kendaraan ybs (findTorsiDb() by
//    nama kendaraan, SUDAH ADA) — utk kendaraan yg match (mis. Vario 125).
//  - tier 'generic': fallback GENERIC_RECOMMEND_NAMES per v.jenis, interval
//    lewat suggestServiceIntervalKm() (reuse, fallback FALLBACK_KEYWORDS) —
//    utk kendaraan yg TIDAK match TORSI_DB manapun.
// Kategori yg namanya sudah ada (dlm cakupan kendaraan ybs) dikecualikan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, curVehicleId, calls }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js'],
    {
      D,
      curVehicleId,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      save: () => calls.push('save'),
      toast: (m) => calls.push('toast:' + m),
      escapeHtml: (s) => String(s == null ? '' : s),
      document: { getElementById: () => null, querySelectorAll: () => [] },
      renderServisList: () => calls.push('renderServisList'),
      renderDashboardServisReminder: () => calls.push('renderDashboardServisReminder'),
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [{ id: 'veh1', name: 'Vario 125', jenis: 'motor' }, { id: 'veh2', name: 'Xpander', jenis: 'mobil' }],
      sparepartCats: [],
      partsStock: [],
      servisLogs: [],
    },
    overrides || {}
  );
}

test('recommendCategories() — kendaraan yang match TORSI_DB (Vario 125) menghasilkan rekomendasi tier "manual"', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  assert.equal(reko.ok, true);
  assert.equal(reko.vehicleName, 'Vario 125');
  assert.ok(reko.tier1.length > 0, 'harus ada rekomendasi tier manual dari TORSI_DB Vario 125');
  reko.tier1.forEach((r) => {
    assert.equal(r.tier, 'manual');
    assert.ok(r.intervalKm > 0);
    assert.match(r.source, /Buku Pedoman Reparasi/);
  });
});

test('recommendCategories() — kendaraan yang TIDAK match TORSI_DB manapun (mis. Xpander) hanya menghasilkan tier "generic"', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh2', calls });

  const reko = ctx.Sparepart.recommendCategories('veh2');

  assert.equal(reko.ok, true);
  assert.equal(reko.tier1.length, 0);
  assert.ok(reko.tier2.length > 0);
  reko.tier2.forEach((r) => {
    assert.equal(r.tier, 'generic');
    assert.ok(r.intervalKm > 0);
  });
});

test('recommendCategories() — kategori yang namanya sudah ada (dalam cakupan kendaraan ybs) dikecualikan dari rekomendasi', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'c1', name: 'Oli Mesin', code: 'OLI', intervalKm: 2000, showInReminder: true, vehicleId: 'veh1' },
    ],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  const names = reko.all.map((r) => r.name.toLowerCase());
  assert.ok(!names.includes('oli mesin'), 'Oli Mesin yang sudah ada tidak boleh direkomendasikan lagi');
});

test('recommendCategories() — kategori privat milik kendaraan LAIN tidak ikut mengecualikan rekomendasi kendaraan aktif', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'c1', name: 'Oli Mesin', code: 'OLI', intervalKm: 2000, showInReminder: true, vehicleId: 'veh2' },
    ],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  const names = reko.all.map((r) => r.name.toLowerCase());
  assert.ok(names.includes('oli mesin'), 'kategori privat kendaraan lain tidak boleh menyembunyikan rekomendasi kendaraan aktif');
});

test('recommendCategories() — {ok:false} kalau tidak ada kendaraan aktif/valid', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: null, calls });

  const reko = ctx.Sparepart.recommendCategories(null);

  assert.equal(reko.ok, false);
});

test('recommendCategories() — PURE, tidak pernah memanggil save()', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  ctx.Sparepart.recommendCategories('veh1');

  assert.ok(!calls.includes('save'));
  assert.equal(D.sparepartCats.length, 0);
});

test('commitRecommend() — membuat kategori baru dari item yang dicentang, scoped ke curVehicleId, showInReminder true', () => {
  const D = baseD();
  const calls = [];
  const fakeChecks = [
    { checked: true, dataset: { idx: '0' } },
    { checked: false, dataset: { idx: '1' } },
  ];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });
  ctx.document.querySelectorAll = () => fakeChecks;

  ctx.Sparepart._recoCache = [
    { name: 'Busi', intervalKm: 8000, tier: 'manual', source: 'Buku Pedoman Reparasi' },
    { name: 'Ban Depan', intervalKm: 20000, tier: 'generic', source: 'estimasi umum' },
  ];
  ctx.Sparepart.commitRecommend();

  assert.equal(D.sparepartCats.length, 1);
  assert.equal(D.sparepartCats[0].name, 'Busi');
  assert.equal(D.sparepartCats[0].intervalKm, 8000);
  assert.equal(D.sparepartCats[0].showInReminder, true);
  assert.equal(D.sparepartCats[0].vehicleId, 'veh1');
  assert.ok(calls.includes('save'));
});

test('recommendCategories() — kandidat tier manual/generic yang sudah pernah dicatat di riwayat servis ditandai `history` dan diprioritaskan', () => {
  const D = baseD({
    servisLogs: [
      { vehicleId: 'veh1', item: 'Busi', km: 8000, date: '2026-01-01' },
      { vehicleId: 'veh1', item: 'Busi', km: 16000, date: '2026-06-01' },
    ],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  const busi = reko.tier1.find((r) => r.name === 'Busi');
  assert.ok(busi, 'Busi harus tetap ada di tier manual (dari TORSI_DB)');
  assert.equal(busi.history.count, 2);
  assert.equal(busi.history.avgKm, 8000);
  // Diprioritaskan: item dgn history.count>0 harus muncul sebelum yg 0 dalam tier yang sama
  const firstZeroIdx = reko.tier1.findIndex((r) => r.history.count === 0);
  const busiIdx = reko.tier1.indexOf(busi);
  if (firstZeroIdx !== -1) assert.ok(busiIdx < firstZeroIdx, 'kandidat dgn riwayat harus didahulukan');
});

test('recommendCategories() — tier "history" baru: part yang sering dicatat manual tapi TIDAK ada di TORSI_DB/generic tetap direkomendasikan, interval dari pola KM asli', () => {
  const D = baseD({
    vehicles: [{ id: 'veh1', name: 'Vario 125', jenis: 'motor' }],
    servisLogs: [
      { vehicleId: 'veh1', item: 'Selang Radiator Custom', km: 5000, date: '2026-01-01' },
      { vehicleId: 'veh1', item: 'Selang Radiator Custom', km: 10000, date: '2026-06-01' },
      { vehicleId: 'veh1', item: 'Selang Radiator Custom', km: 15000, date: '2026-11-01' },
    ],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  const hist = reko.tier3.find((r) => r.name === 'Selang Radiator Custom');
  assert.ok(hist, 'part yg sering dicatat manual (bukan dari TORSI_DB/generic) harus muncul di tier3');
  assert.equal(hist.tier, 'history');
  assert.equal(hist.intervalKm, 5000);
  assert.ok(reko.all.some((r) => r.name === 'Selang Radiator Custom'));
});

test('recommendCategories() — riwayat servis dgn < 2 catatan TIDAK memicu tier "history" (data belum cukup)', () => {
  const D = baseD({
    vehicles: [{ id: 'veh1', name: 'Vario 125', jenis: 'motor' }],
    servisLogs: [{ vehicleId: 'veh1', item: 'Part Langka Sekali', km: 5000, date: '2026-01-01' }],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  const reko = ctx.Sparepart.recommendCategories('veh1');

  assert.ok(!reko.tier3.some((r) => r.name === 'Part Langka Sekali'));
});

test('recommendCategories() — PURE: cross-check riwayat servis tidak pernah memanggil save() atau menulis D.servisLogs/D.sparepartCats', () => {
  const D = baseD({
    servisLogs: [
      { vehicleId: 'veh1', item: 'Busi', km: 8000, date: '2026-01-01' },
      { vehicleId: 'veh1', item: 'Busi', km: 16000, date: '2026-06-01' },
    ],
  });
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });

  ctx.Sparepart.recommendCategories('veh1');

  assert.ok(!calls.includes('save'));
  assert.equal(D.sparepartCats.length, 0);
  assert.equal(D.servisLogs.length, 2);
});

test('commitRecommend() — tidak menduplikasi kategori yang sudah ada (race antara buka rekomendasi & tambah manual)', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Busi', code: 'BUS', intervalKm: 8000, showInReminder: true, vehicleId: 'veh1' }],
  });
  const calls = [];
  const fakeChecks = [{ checked: true, dataset: { idx: '0' } }];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });
  ctx.document.querySelectorAll = () => fakeChecks;
  ctx.Sparepart._recoCache = [{ name: 'Busi', intervalKm: 8000, tier: 'manual', source: 'x' }];

  ctx.Sparepart.commitRecommend();

  assert.equal(D.sparepartCats.length, 1, 'tidak boleh ada duplikat kategori "Busi"');
});
