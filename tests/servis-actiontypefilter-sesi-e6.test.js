'use strict';
/**
 * tests/servis-actiontypefilter-sesi-e6.test.js
 *
 * Sesi E6 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 6
 * dari 6, ITEM TERAKHIR): filter riwayat by `actionType`. Chip row baru
 * (`#servisActionTypeChipRow`) DISISIPKAN lewat JS sebelum `#servisList`
 * (bukan markup statis) tiap `Servis.renderList()` dipanggil -- 1x buat,
 * tidak dobel-insert di render berikutnya. `Servis.setActionTypeFilter(type)`
 * mengubah `Servis.activeActionTypeFilter` + reset `listPage` + render
 * ulang. `null` ("Semua") = 0 filter, sama persis perilaku sebelum E6.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeDocumentStub() {
  const elements = {
    servisList: { innerHTML: '', insertAdjacentElement(pos, node) {
      if (pos === 'beforebegin') elements.servisActionTypeChipRow = node;
      if (pos === 'afterend') elements.servisListLoadMoreWrap = node;
    } },
    servisCount: { textContent: '' },
    servisTotalCost: { textContent: '' },
    servisLastKm: { textContent: '' },
    servisListLoadMoreWrap: null,
  };
  let createElementCalls = 0;
  const documentStub = {
    elements,
    getElementById: (id) => elements[id] !== undefined ? elements[id] : null,
    createElement: () => { createElementCalls++; return { style: {}, innerHTML: '', querySelector: () => ({}) }; },
    getCreateElementCalls: () => createElementCalls,
  };
  return documentStub;
}

function makeCtx({ D, documentStub, extra }) {
  return loadSource(['car-notes.js'], {
    D,
    curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => s,
    save() {},
    closeModal() {},
    renderDashboard() {},
    renderKeuangan() {},
    toast() {},
    askConfirm: async () => true,
    showPromptModal: async () => '0',
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
    document: documentStub,
    getCnRange: () => ({ from: new Date('2000-01-01'), to: new Date('2100-01-01') }),
    TX_PAGE_SIZE: 50,
    fmt: (n) => String(n),
    ...extra,
  }, ['Servis']);
}

function makeD() {
  return {
    sparepartCats: [
      { id: 'c1', name: 'Ganti Oli', intervalKm: 3000 },
      { id: 'c2', name: 'Cek Rem', intervalKm: 4000 },
    ],
    servisLogs: [
      { id: 's1', vehicleId: 'v1', date: '2026-09-01', item: 'Ganti Oli', categoryId: 'c1', km: 15000, cost: 0, note: '', actionType: null },
      { id: 's2', vehicleId: 'v1', date: '2026-09-02', item: 'Cek Rem', categoryId: 'c2', km: 15000, cost: 0, note: '', actionType: 'periksa' },
      { id: 's3', vehicleId: 'v1', date: '2026-09-03', item: 'Bersih Karbu', categoryId: 'c1', km: 15000, cost: 0, note: '', actionType: 'bersih' },
      { id: 's4', vehicleId: 'v1', date: '2026-09-04', item: 'Ganti Kampas', categoryId: 'c2', km: 15000, cost: 0, note: '', actionType: 'ganti' },
    ],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

test('renderList() default (activeActionTypeFilter=null) -- 0 filter, semua 4 entry tampil (0 regresi)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 4);
});

test("renderList() dgn activeActionTypeFilter='periksa' -- hanya entry actionType==='periksa' tampil", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeActionTypeFilter = 'periksa';
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 1);
  assert.ok(documentStub.elements.servisList.innerHTML.includes('Cek Rem'));
  assert.ok(!documentStub.elements.servisList.innerHTML.includes('Ganti Oli'));
});

test("renderList() dgn activeActionTypeFilter='ganti' -- cocok utk actionType null MAUPUN 'ganti' eksplisit (effType fallback)", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.activeActionTypeFilter = 'ganti';
  ctx.Servis.renderList();
  assert.equal(documentStub.elements.servisCount.textContent, 2, "s1 (null) + s4 ('ganti') = 2");
  assert.ok(documentStub.elements.servisList.innerHTML.includes('Ganti Oli'));
  assert.ok(documentStub.elements.servisList.innerHTML.includes('Ganti Kampas'));
});

test('renderList() -- chip row disisipkan sebelum #servisList (beforebegin), 1x dibuat (tidak dobel-insert di render ke-2)', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  assert.ok(documentStub.elements.servisActionTypeChipRow, 'chip row harus ada setelah render pertama');
  assert.equal(documentStub.getCreateElementCalls(), 2, 'render 1: 1x createElement utk chip row + 1x utk load-more wrap');
  ctx.Servis.renderList();
  assert.equal(documentStub.getCreateElementCalls(), 2, 'render ke-2: getElementById sudah menemukan elemen lama, 0 createElement tambahan');
});

test('renderList() -- chip "Semua" bertanda active saat filter null, chip lain tidak', () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  const chipHtml = documentStub.elements.servisActionTypeChipRow.innerHTML;
  assert.match(chipHtml, /Semua[^<]*<\/div>/); // sanity: label ada
  const semuaBlock = chipHtml.split('data-args')[0];
  assert.ok(semuaBlock.includes('active'));
});

test("setActionTypeFilter('periksa') -- mengubah activeActionTypeFilter, reset listPage, render ulang dgn filter aktif", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.listPage = 3;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.setActionTypeFilter('periksa');
  assert.equal(ctx.Servis.activeActionTypeFilter, 'periksa');
  assert.equal(ctx.Servis.listPage, 1);
  assert.equal(documentStub.elements.servisCount.textContent, 1);
});

test("setActionTypeFilter(null) -- kembali ke 'Semua', semua entry tampil lagi", () => {
  const D = makeD();
  const documentStub = makeDocumentStub();
  const ctx = makeCtx({ D, documentStub });
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.setActionTypeFilter('bersih');
  assert.equal(documentStub.elements.servisCount.textContent, 1);
  ctx.Servis.setActionTypeFilter(null);
  assert.equal(documentStub.elements.servisCount.textContent, 4);
});
