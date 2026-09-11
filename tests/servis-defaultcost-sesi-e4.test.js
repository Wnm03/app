'use strict';
/**
 * tests/servis-defaultcost-sesi-e4.test.js
 *
 * Sesi E4 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 4 dari
 * 6): default cost per `actionType`. Kalau `opts.presetCost` TIDAK diisi
 * DAN `actionType` eksplisit 'periksa' atau 'bersih', `markServiced()`
 * langsung set cost=0 TANPA memanggil `showPromptModal()`. `actionType`
 * 'ganti' atau kosong/undefined (tombol "✅ Sudah Servis" lama) TETAP
 * prompt seperti biasa -- 0 regresi. `opts.presetCost` (dipakai
 * `markServicedBatch()`) tetap prioritas paling tinggi, tidak berubah.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, promptValue = '50000', confirmValue = true, extra }) {
  let promptCalls = 0;
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
    askConfirm: async () => confirmValue,
    showPromptModal: async () => { promptCalls++; return promptValue; },
    getVehicleKm: () => 15000,
    estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit() {} },
    ...extra,
  }, ['Servis']);
  return { ctx, getPromptCalls: () => promptCalls };
}

function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Ganti Oli', intervalKm: 2000 },
      { id: 'c2', name: 'Cek Rem', intervalKm: 4000 },
    ],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

test("markServiced(catId,'periksa') tanpa opts.presetCost -- cost=0, showPromptModal TIDAK dipanggil", async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D });
  const entry = await ctx.Servis.markServiced('c1', 'periksa', { skipConfirm: true });
  assert.equal(entry.cost, 0);
  assert.equal(entry.txLinkId, null, 'cost=0 -> tidak ada transaksi terkait');
  assert.equal(getPromptCalls(), 0);
});

test("markServiced(catId,'bersih') tanpa opts.presetCost -- cost=0, showPromptModal TIDAK dipanggil", async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D });
  const entry = await ctx.Servis.markServiced('c2', 'bersih', { skipConfirm: true });
  assert.equal(entry.cost, 0);
  assert.equal(getPromptCalls(), 0);
});

test("markServiced(catId,'ganti') tanpa opts.presetCost -- TETAP prompt (0 regresi)", async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D, promptValue: '75000' });
  const entry = await ctx.Servis.markServiced('c1', 'ganti', { skipConfirm: true });
  assert.equal(entry.cost, 75000);
  assert.equal(getPromptCalls(), 1);
});

test('markServiced(catId) tanpa actionType (tombol lama kartu Pengingat) -- TETAP prompt (0 regresi)', async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D, promptValue: '30000' });
  const entry = await ctx.Servis.markServiced('c1', undefined, { skipConfirm: true });
  assert.equal(entry.cost, 30000);
  assert.equal(getPromptCalls(), 1);
});

test("opts.presetCost tetap prioritas tertinggi di atas default actionType='periksa'", async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D });
  const entry = await ctx.Servis.markServiced('c1', 'periksa', { skipConfirm: true, presetCost: 12000 });
  assert.equal(entry.cost, 12000);
  assert.equal(getPromptCalls(), 0);
});

test("markServicedBatch() dgn item actionType='periksa' tanpa cost eksplisit -- tetap pakai presetCost (0) dari batch, bukan jalur default baru (0 dobel-logic)", async () => {
  const D = makeD();
  const { ctx, getPromptCalls } = makeCtx({ D });
  const [entry] = await ctx.Servis.markServicedBatch([{ catId: 'c1', actionType: 'periksa' }]);
  assert.equal(entry.cost, 0);
  assert.equal(getPromptCalls(), 0);
});
