'use strict';
/**
 * tests/servis-markservicedbatch-sesi-e1.test.js
 *
 * Sesi E1 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 1 dari
 * 6 saran tambahan checklist actionType): Servis.markServiced(catId,
 * actionType, opts) sekarang terima parameter `opts` opsional
 * (skipConfirm/presetCost) + Servis.markServicedBatch(items) BARU yang
 * me-reuse markServiced() apa adanya per item (0 logic simpan duplikat).
 * Fondasi ini disiapkan utk checklist multi-item (rencana Sesi 1C/2A,
 * BELUM ada kodenya sama sekali -- lihat catatan di ROADMAP §2c) supaya
 * nanti tinggal dipakai, bukan dites lewat UI checklist yang belum ada.
 *
 * 0 regresi: markServiced(catId) & markServiced(catId, actionType) tanpa
 * opts sama sekali harus tetap persis perilaku lama (dites terpisah di
 * tests/servis-markserviced-aibus-emit.test.js, tests/servis-actiontype-
 * resettype-sesi1.test.js -- keduanya tetap dijalankan di sesi ini, 0 ubah).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, promptValue = '0', confirmValue = true, aibusEvents, toasts }) {
  return loadSource(['car-notes.js'], {
    D,
    curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => s,
    save() {},
    closeModal() {},
    renderCnTab() {},
    renderDashboard() {},
    renderKeuangan() {},
    toast: (msg) => { if (toasts) toasts.push(msg); },
    askConfirm: async () => confirmValue,
    showPromptModal: async () => promptValue,
    getVehicleKm: () => 15000,
    estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    computeServiceUrgency: undefined,
    VehicleActionRecommendation: undefined,
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit(name, payload) { if (aibusEvents) aibusEvents.push({ name, payload }); } },
  }, ['Servis']);
}

function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Ganti Oli', intervalKm: 2000 },
      { id: 'c2', name: 'Cek Rem', intervalKm: 4000 },
      { id: 'c3', name: 'Bersih Filter', intervalKm: 6000 },
    ],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
  };
}

test('opts.skipConfirm=true melewati askConfirm() (0 dialog konfirmasi)', async () => {
  const D = makeD();
  let confirmCalled = false;
  const ctx = loadSource(['car-notes.js'], {
    D, curVehicleId: 'v1', uid: () => 'idX', escapeHtml: (s) => s,
    save() {}, closeModal() {}, renderCnTab() {}, renderDashboard() {}, renderKeuangan() {}, toast() {},
    askConfirm: async () => { confirmCalled = true; return true; },
    showPromptModal: async () => '0',
    getVehicleKm: () => 15000, estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false, catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm, hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null, fmtDateID: () => '',
    AIBus: { emit() {} },
  }, ['Servis']);

  const entry = await ctx.Servis.markServiced('c1', null, { skipConfirm: true });

  assert.equal(confirmCalled, false, 'askConfirm() tidak boleh terpanggil saat skipConfirm:true');
  assert.ok(entry, 'entry servis tetap dikembalikan');
  assert.equal(D.servisLogs.length, 1);
});

test('opts.presetCost melewati showPromptModal() & dipakai sbg cost', async () => {
  const D = makeD();
  let promptCalled = false;
  const ctx = loadSource(['car-notes.js'], {
    D, curVehicleId: 'v1', uid: () => 'idX', escapeHtml: (s) => s,
    save() {}, closeModal() {}, renderCnTab() {}, renderDashboard() {}, renderKeuangan() {}, toast() {},
    askConfirm: async () => true,
    showPromptModal: async () => { promptCalled = true; return '999'; },
    getVehicleKm: () => 15000, estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false, catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm, hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null, fmtDateID: () => '',
    AIBus: { emit() {} },
  }, ['Servis']);

  const entry = await ctx.Servis.markServiced('c1', null, { presetCost: 75000 });

  assert.equal(promptCalled, false, 'showPromptModal() tidak boleh terpanggil saat presetCost diisi');
  assert.equal(entry.cost, 75000);
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].amount, 75000);
});

test('markServiced(catId) TANPA opts (0 param ke-3) — 0 regresi, perilaku identik sebelum Sesi E1', async () => {
  const D = makeD();
  const aibusEvents = [];
  const ctx = makeCtx({ D, promptValue: '0', aibusEvents });

  await ctx.Servis.markServiced('c1');

  assert.equal(D.servisLogs.length, 1);
  assert.ok(aibusEvents.find((e) => e.name === 'vehicle.updated'));
});

test('markServicedBatch([]) — array kosong: 0 efek, kembalikan array kosong', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });

  const results = await ctx.Servis.markServicedBatch([]);

  assert.equal(results.length, 0, 'array kosong (dari realm vm, dicek via .length bukan deepEqual lintas-realm)');
  assert.equal(D.servisLogs.length, 0);
});

test('markServicedBatch(items) — proses N item via 1x konfirmasi di pemanggil (bukan per-item)', async () => {
  const D = makeD();
  let confirmCount = 0;
  const toasts = [];
  const ctx = loadSource(['car-notes.js'], {
    D, curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => s,
    save() {}, closeModal() {}, renderCnTab() {}, renderDashboard() {}, renderKeuangan() {},
    toast: (msg) => toasts.push(msg),
    askConfirm: async () => { confirmCount++; return true; },
    showPromptModal: async () => { throw new Error('showPromptModal TIDAK boleh terpanggil saat batch pakai presetCost'); },
    getVehicleKm: () => 15000, estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false, catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm, hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null, fmtDateID: () => '',
    AIBus: { emit() {} },
  }, ['Servis']);

  const results = await ctx.Servis.markServicedBatch([
    { catId: 'c1', actionType: 'ganti', cost: 50000 },
    { catId: 'c2', actionType: 'periksa', cost: 0 },
    { catId: 'c3', actionType: 'bersih', cost: 0 },
  ]);

  assert.equal(confirmCount, 0, 'markServicedBatch() sendiri tidak manggil askConfirm() per-item (skipConfirm otomatis)');
  assert.equal(results.length, 3);
  assert.equal(D.servisLogs.length, 3, 'ketiga item tersimpan sbg log terpisah (reuse markServiced() per item)');
  assert.equal(D.transactions.length, 1, 'hanya item dgn cost>0 yang bikin transaksi (0 logic simpan duplikat, ikut aturan markServiced() apa adanya)');
  assert.ok(toasts.some((t) => t.includes('3 item')), 'toast ringkasan batch harus menyebut jumlah item');
});

test('markServicedBatch(items) — item dgn catId invalid dilewati (0 crash, hasil lain tetap tersimpan)', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });

  const results = await ctx.Servis.markServicedBatch([
    { catId: 'c1', actionType: 'ganti', cost: 0 },
    { catId: 'catid-tidak-ada', actionType: 'ganti', cost: 0 },
  ]);

  assert.equal(results.length, 1, 'item invalid tidak masuk hasil (markServiced() return undefined utk cat tidak ditemukan)');
  assert.equal(D.servisLogs.length, 1);
});
