'use strict';
/**
 * tests/servis-tooearlyguard-sesi-e5.test.js
 *
 * Sesi E5 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 5 dari
 * 6): guard "ganti terlalu dini". `Servis._checkTooEarlyGanti(cat,
 * vehicleId, curKm)` (finder murni) dipakai `markServiced()` HANYA saat
 * `actionType==='ganti'` DAN `opts.skipEarlyGuard` tidak di-set -- kalau
 * jarak tempuh sejak "ganti" terakhir < 20% dari intervalKm kategori,
 * tampilkan dialog konfirmasi tambahan (terpisah dari konfirmasi utama).
 * Batal di dialog ini -> markServiced() berhenti (return undefined).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, promptValue = '0', confirmValue = true, extra }) {
  let confirmCalls = 0;
  const ctx = loadSource(['car-notes.js'], {
    D,
    curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => s,
    save() {},
    closeModal() {},
    renderCnTab() {},
    renderDashboard() {},
    renderKeuangan() {},
    toast() {},
    askConfirm: async () => { confirmCalls++; return confirmValue; },
    showPromptModal: async () => promptValue,
    getVehicleKm: () => 15000,
    estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: (s, cat) => s.categoryId === cat.id,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit() {} },
    ...extra,
  }, ['Servis']);
  return { ctx, getConfirmCalls: () => confirmCalls };
}

function makeD(extraLogs) {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Ganti Oli', intervalKm: 3000 },
      { id: 'c2', name: 'Cek Rem', intervalKm: 4000 },
    ],
    servisLogs: extraLogs || [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

test('_checkTooEarlyGanti — belum pernah ganti (lastKm null) -> null (tidak dianggap dini)', () => {
  const D = makeD();
  const { ctx } = makeCtx({ D });
  const result = ctx.Servis._checkTooEarlyGanti(D.sparepartCats[0], 'v1', 15000);
  assert.equal(result, null);
});

test('_checkTooEarlyGanti — jarak tempuh < 20% interval -> return detail (dianggap dini)', () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx } = makeCtx({ D });
  // interval 3000, threshold 600; curKm 15000 - lastKm 14800 = 200 < 600
  const result = ctx.Servis._checkTooEarlyGanti(D.sparepartCats[0], 'v1', 15000);
  assert.ok(result);
  assert.equal(result.lastKm, 14800);
  assert.equal(result.traveled, 200);
});

test('_checkTooEarlyGanti — jarak tempuh >= 20% interval -> null (wajar, bukan dini)', () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 12000, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx } = makeCtx({ D });
  // 15000-12000=3000 >= threshold 600
  const result = ctx.Servis._checkTooEarlyGanti(D.sparepartCats[0], 'v1', 15000);
  assert.equal(result, null);
});

test("markServiced(catId,'ganti') dgn riwayat baru -- guard tampil, user BATAL -> return undefined, 0 entry tersimpan", async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D, confirmValue: false });
  const entry = await ctx.Servis.markServiced('c1', 'ganti', { skipConfirm: true });
  assert.equal(entry, undefined);
  assert.equal(D.servisLogs.length, 1, 'tidak ada entry baru ditambahkan');
  assert.equal(getConfirmCalls(), 1, 'hanya dialog guard yg tampil (konfirmasi utama sudah di-skip)');
});

test("markServiced(catId,'ganti') dgn riwayat baru -- guard tampil, user SETUJU -> entry tetap tersimpan", async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D, confirmValue: true });
  const entry = await ctx.Servis.markServiced('c1', 'ganti', { skipConfirm: true, presetCost: 0 });
  assert.ok(entry);
  assert.equal(D.servisLogs.length, 2);
  assert.equal(getConfirmCalls(), 1);
});

test("markServiced(catId,'ganti',{skipEarlyGuard:true}) -- guard DILEWATI walau baru diganti", async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D, confirmValue: true });
  const entry = await ctx.Servis.markServiced('c1', 'ganti', { skipConfirm: true, skipEarlyGuard: true, presetCost: 0 });
  assert.ok(entry);
  assert.equal(getConfirmCalls(), 0, '0 dialog konfirmasi sama sekali (skipConfirm & skipEarlyGuard keduanya aktif)');
});

test("markServiced(catId,'periksa') dgn riwayat 'ganti' baru -- guard TIDAK dicek (bukan actionType 'ganti')", async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D, confirmValue: true });
  const entry = await ctx.Servis.markServiced('c1', 'periksa', { skipConfirm: true });
  assert.ok(entry);
  assert.equal(getConfirmCalls(), 0);
});

test('markServiced(catId) tanpa actionType (tombol lama) -- guard TIDAK dicek, 0 regresi', async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D, confirmValue: true, promptValue: '5000' });
  const entry = await ctx.Servis.markServiced('c1', undefined);
  assert.ok(entry);
  // hanya 1 dialog: konfirmasi utama (bukan guard, actionType kosong)
  assert.equal(getConfirmCalls(), 1);
});

test("markServicedBatch() -- item actionType='ganti' baru diganti TIDAK memicu dialog guard (skipEarlyGuard otomatis di-set)", async () => {
  const D = makeD([{ id: 's0', vehicleId: 'v1', categoryId: 'c1', km: 14800, date: '2026-09-01', actionType: 'ganti' }]);
  const { ctx, getConfirmCalls } = makeCtx({ D });
  const results = await ctx.Servis.markServicedBatch([{ catId: 'c1', actionType: 'ganti', cost: 0 }]);
  assert.equal(results.length, 1);
  assert.equal(getConfirmCalls(), 0, 'batch tetap 0 dialog per-item (skipConfirm & skipEarlyGuard keduanya aktif)');
});
