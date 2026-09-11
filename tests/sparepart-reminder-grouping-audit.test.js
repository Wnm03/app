'use strict';
// tests/sparepart-reminder-grouping-audit.test.js — cakupan fitur baru
// resolveCatGroup() (modules/vehicle/sparepart-servis.js) & efeknya ke
// recommendCategories()/commitRecommend(), hasil AUDIT (permintaan user:
// kartu "🔔 Pengingat Servis per Part" & rekomendasi kategori masih FLAT
// walau data pabrikan TORSI_DB sudah terkategori per grup komponen).
//
// resolveCatGroup(cat,vehicleId) prioritas: (1) cat.group tersimpan
// langsung, (2) match nama ke item TORSI_DB kendaraan aktif, (3)
// GENERIC_GROUP_BY_NAME (estimasi), (4) 'Lainnya'. Murni PEMBACAAN.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, curVehicleId, calls }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
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
    ['Sparepart', 'resolveCatGroup', 'GENERIC_GROUP_BY_NAME']
  );
}

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [
        { id: 'veh1', name: 'Vario 125', jenis: 'motor' },
        { id: 'veh2', name: 'Xpander', jenis: 'mobil' },
      ],
      sparepartCats: [],
      partsStock: [],
      servisLogs: [],
    },
    overrides || {}
  );
}

test('resolveCatGroup() — cat.group tersimpan langsung dipakai apa adanya (prioritas #1)', () => {
  const ctx = makeCtx({ D: baseD(), curVehicleId: 'veh1', calls: [] });
  const g = ctx.resolveCatGroup({ name: 'Apapun', group: 'Grup Manual', groupIcon: '🧩' }, 'veh1');
  assert.equal(g.group, 'Grup Manual');
  assert.equal(g.icon, '🧩');
});

test('resolveCatGroup() — nama match item TORSI_DB kendaraan aktif (Vario 125 -> Busi ada di Perawatan Berkala)', () => {
  const ctx = makeCtx({ D: baseD(), curVehicleId: 'veh1', calls: [] });
  const g = ctx.resolveCatGroup({ name: 'Busi' }, 'veh1');
  assert.equal(g.group, 'Perawatan Berkala');
  assert.equal(g.icon, '🛠️');
});

test('resolveCatGroup() — kendaraan tanpa TORSI_DB match -> fallback GENERIC_GROUP_BY_NAME', () => {
  const ctx = makeCtx({ D: baseD(), curVehicleId: 'veh2', calls: [] });
  const g = ctx.resolveCatGroup({ name: 'Aki' }, 'veh2');
  assert.equal(g.group, 'Kelistrikan & Panel');
});

test('resolveCatGroup() — nama tidak dikenal sama sekali -> "Lainnya" (fallback terakhir, tidak pernah error)', () => {
  const ctx = makeCtx({ D: baseD(), curVehicleId: 'veh2', calls: [] });
  const g = ctx.resolveCatGroup({ name: 'Part Aneh Bin Ajaib' }, 'veh2');
  assert.equal(g.group, 'Lainnya');
  assert.equal(g.icon, '📦');
});

test('resolveCatGroup() — cat null/undefined tidak throw, balik "Lainnya"', () => {
  const ctx = makeCtx({ D: baseD(), curVehicleId: 'veh1', calls: [] });
  const g = ctx.resolveCatGroup(null, 'veh1');
  assert.equal(g.group, 'Lainnya');
  assert.equal(g.icon, '📦');
});

test('recommendCategories() — tier "manual" (dari TORSI_DB) bawa group/groupIcon sesuai cat asalnya di TORSI_DB', () => {
  const D = baseD();
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls: [] });
  const reko = ctx.Sparepart.recommendCategories('veh1');
  const busi = reko.all.find((r) => r.name === 'Busi');
  assert.ok(busi, 'Busi harus ada di rekomendasi Vario 125');
  assert.equal(busi.tier, 'manual');
  assert.equal(busi.group, 'Perawatan Berkala');
  assert.equal(busi.groupIcon, '🛠️');
});

test('recommendCategories() — tier "generic" (kendaraan tanpa TORSI_DB) bawa group dari GENERIC_GROUP_BY_NAME', () => {
  const D = baseD();
  const ctx = makeCtx({ D, curVehicleId: 'veh2', calls: [] });
  const reko = ctx.Sparepart.recommendCategories('veh2');
  const aki = reko.all.find((r) => r.name === 'Aki');
  assert.ok(aki, 'Aki harus ada di rekomendasi Xpander');
  assert.equal(aki.group, 'Kelistrikan & Panel');
});

test('commitRecommend() — group/groupIcon dari kandidat ikut tersimpan ke D.sparepartCats (bukan cuma dipakai di UI rekomendasi)', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCtx({ D, curVehicleId: 'veh1', calls });
  ctx.Sparepart._recoCache = [
    { name: 'Busi', intervalKm: 8000, tier: 'manual', source: 'x', group: 'Perawatan Berkala', groupIcon: '🛠️' },
  ];
  ctx.document.querySelectorAll = () => [{ checked: true, dataset: { idx: '0' } }];
  ctx.Sparepart.commitRecommend();
  const cat = D.sparepartCats.find((c) => c.name === 'Busi');
  assert.ok(cat, 'kategori Busi harus tersimpan');
  assert.equal(cat.group, 'Perawatan Berkala');
  assert.equal(cat.groupIcon, '🛠️');
  assert.ok(calls.includes('save'));
});
