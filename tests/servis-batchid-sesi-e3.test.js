'use strict';
/**
 * tests/servis-batchid-sesi-e3.test.js
 *
 * Sesi E3 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 3 dari
 * 6): field `batchId` di `D.servisLogs`, diisi dari `opts.batchId`
 * (placeholder yang disiapkan di Sesi E1). `Servis.markServicedBatch(items)`
 * sekarang generate 1 `batchId` (uid()) yang DIBAGI ke seluruh item dari 1x
 * pemanggilan, dan `Servis.renderList()` menandai "🔗 batch" di riwayat
 * untuk entry yang punya `batchId`.
 *
 * 0 regresi: markServiced() dipanggil langsung (bukan lewat
 * markServicedBatch()) tanpa opts.batchId -> entry.batchId tetap null,
 * sama seperti sebelum Sesi E3.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, promptValue = '0', confirmValue = true, extra }) {
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
    toast() {},
    askConfirm: async () => confirmValue,
    showPromptModal: async () => promptValue,
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

test('markServiced(catId) TANPA opts — entry.batchId=null (0 regresi)', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });
  const entry = await ctx.Servis.markServiced('c1');
  assert.equal(entry.batchId, null);
});

test('markServiced(catId, actionType, {batchId}) — dipanggil manual dgn batchId eksplisit -> tersimpan apa adanya', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });
  const entry = await ctx.Servis.markServiced('c1', 'ganti', { skipConfirm: true, batchId: 'batch-manual-1' });
  assert.equal(entry.batchId, 'batch-manual-1');
});

test('markServicedBatch(items) — seluruh item dari 1x panggilan berbagi batchId yang SAMA', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });

  const results = await ctx.Servis.markServicedBatch([
    { catId: 'c1', actionType: 'ganti', cost: 0 },
    { catId: 'c2', actionType: 'periksa', cost: 0 },
  ]);

  assert.equal(results.length, 2);
  assert.ok(results[0].batchId, 'batchId harus terisi (bukan null/undefined)');
  assert.equal(results[0].batchId, results[1].batchId, 'kedua item harus berbagi batchId yang sama');
});

test('markServicedBatch() dipanggil 2x terpisah -> batchId BEDA antar panggilan (bukan reuse id lama)', async () => {
  const D = makeD();
  const ctx = makeCtx({ D });

  const batch1 = await ctx.Servis.markServicedBatch([{ catId: 'c1', actionType: 'ganti', cost: 0 }]);
  const batch2 = await ctx.Servis.markServicedBatch([{ catId: 'c2', actionType: 'periksa', cost: 0 }]);

  assert.notEqual(batch1[0].batchId, batch2[0].batchId);
});

test('Servis.renderList() — entry dgn batchId ditandai "🔗 batch" di tx-meta, entry tanpa batchId tidak', () => {
  const D = makeD();
  D.servisLogs = [
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', categoryId: 'c1', km: 15000, cost: 0, note: '', batchId: 'batch-x' },
    { id: 's2', vehicleId: 'v1', date: '2026-09-11', item: 'Cek Rem', categoryId: 'c2', km: 15000, cost: 0, note: '', batchId: null },
  ];
  let htmlOut = '';
  const el = {
    innerHTML: '',
    set: undefined,
  };
  // stub document.getElementById supaya renderList() bisa nulis ke elemen
  // palsu & kita baca balik innerHTML-nya (0 DOM sungguhan, cukup baca
  // hasil string HTML -- pola sama seperti dijelaskan di loadSource.js
  // catatan "hanya utk fungsi murni non-DOM", tapi renderList() PERLU
  // beberapa elemen -- disediakan stub minimal seperlunya).
  const elements = {
    servisList: { innerHTML: '', insertAdjacentElement() {} },
    servisCount: { textContent: '' },
    servisTotalCost: { textContent: '' },
    servisLastKm: { textContent: '' },
    servisListLoadMoreWrap: null,
  };
  const documentStub = {
    getElementById: (id) => elements[id] !== undefined ? elements[id] : null,
    createElement: () => ({ style: {}, querySelector: () => ({}) }),
  };
  const ctx = makeCtx({
    D,
    extra: {
      document: documentStub,
      getCnRange: () => ({ from: new Date('2000-01-01'), to: new Date('2100-01-01') }),
      TX_PAGE_SIZE: 50,
      fmt: (n) => String(n),
    },
  });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();

  assert.ok(elements.servisList.innerHTML.includes('🔗 batch'), 'entry dgn batchId harus muncul tanda batch');
  const s1Block = elements.servisList.innerHTML.split('Cek Rem')[0];
  assert.ok(s1Block.includes('🔗 batch'), 'tanda batch harus di blok entry s1 (Ganti Oli)');
  const s2Block = elements.servisList.innerHTML.split('Cek Rem')[1];
  assert.ok(!s2Block.includes('🔗 batch'), 'entry s2 (Cek Rem, batchId null) TIDAK boleh ada tanda batch');
});
