'use strict';
// tests/servis-save-finance-updated-emit-v1644.test.js
//
// Backlog dari sesi v1644 (fix markServiced() tidak emit AIBus event):
// alur servis modal BIASA (submit form "Catat Servis", Servis._saveInner()
// dipanggil lewat Servis.save() / wrapper global saveServis() di
// modules/vehicle/sparepart-servis-b.js) juga TIDAK PERNAH emit AIBus
// "finance.updated" walau D.transactions.push()/Object.assign(tx,...)
// benar terjadi di jalur ini -- gap yang SAMA sifatnya dengan
// markServiced() yang sudah diperbaiki sesi lalu, tapi di jalur BERBEDA
// (modal biasa, bukan tombol cepat "✅ Sudah Servis").
//
// FIX: Servis._saveInner() sekarang emit AIBus "finance.updated" di jalur
// BUAT BARU (waktu itu: transaksi selalu dibuat di jalur ini apa pun nilai
// cost), dan HANYA kalau tx terkait ketemu di jalur EDIT (s.txLinkId).
// "vehicle.updated" TIDAK disentuh sama sekali sesi ini -- itu sudah beres
// lewat wrapper saveServis() (di luar cakupan Servis._saveInner() itu
// sendiri).
//
// SUPERSEDED sebagian oleh v13: sesi v13 mengubah aturan itu -- servis
// cost=0 valid sbg Service Event tapi TIDAK LAGI membuat transaksi Finance
// (Rp0 bukan arus uang nyata), jadi utk cost=0 sekarang TIDAK ADA tx & TIDAK
// ADA emit "finance.updated". Test cost=0 di bawah sudah diupdate mengikuti
// v13; test cost>0 (jalur BUAT BARU & EDIT) tidak berubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeOption(value, oem, name) {
  return { value: String(value), dataset: { oem: oem || '', name: name || '' } };
}

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    if (v && typeof v === 'object' && v.__select) {
      els[id] = { value: v.value, selectedOptions: v.value ? [makeOption(v.value, v.oem, v.name)] : [] };
    } else if (typeof v === 'boolean') {
      els[id] = { checked: v };
    } else {
      els[id] = { value: v };
    }
  });
  return { doc: { getElementById: (id) => els[id] || null } };
}

function selectField(value, oem, name) {
  return { __select: true, value, oem, name };
}

function makeCtx({ document, D, curVehicleId, aibusEvents }) {
  return loadSource(
    ['car-notes.js'],
    {
      document, D, curVehicleId,
      uid: (() => { let n = 9000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).toLowerCase(),
      getVehicleKm: () => 0,
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => {},
      closeModal: () => {},
      toast: () => {},
      renderCnTab: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      askConfirm: async () => true,
      withSaveGuardAsync: (key, modalId, fn) => fn(),
      Sparepart: { renderStockList: () => {}, renderCatList: () => {} },
      VehicleCatalogServisLink: undefined,
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    },
    ['Servis'],
  );
}

function baseD(overrides = {}) {
  return Object.assign({
    vehicles: [{ id: 'v1', name: 'Vario' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
    sparepartCats: [],
    partsStock: [],
    servisLogs: [],
    transactions: [],
  }, overrides);
}

function baseFields(overrides = {}) {
  return Object.assign({
    servisItem: 'Ganti Oli',
    servisCost: '50000',
    servisDate: '2026-07-27',
    servisNote: '',
    servisAcc: 'a1',
    servisKm: '10000',
    servisInterval: '',
    servisPartId: '',
    servisPartQty: '1',
    servisCatalogPartId: selectField('', '', ''),
    servisCatalogPartQty: '1',
  }, overrides);
}

test('BUGFIX: Servis._saveInner() jalur BUAT BARU emit AIBus "finance.updated"', async () => {
  const D = baseD();
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields({ servisCost: '75000' }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', aibusEvents });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  assert.equal(D.transactions.length, 1, 'transaksi baru harus tetap tercatat (0 regresi)');
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(financeUpdated, 'AIBus.emit("finance.updated", ...) harus terpanggil di jalur buat baru');
  assert.equal(financeUpdated.payload.txId, D.transactions[0].id);
  assert.equal(financeUpdated.payload.amount, 75000);
  assert.equal(financeUpdated.payload.kind, 'servis');
});

test('v13: Servis._saveInner() jalur BUAT BARU dgn cost=0 TIDAK membuat transaksi Finance & TIDAK emit "finance.updated" (Rp0 = servis valid, bukan transaksi Finance)', async () => {
  const D = baseD();
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields({ servisCost: '0' }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', aibusEvents });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  assert.equal(D.transactions.length, 0, 'v13: cost=0 tidak boleh membuat transaksi Finance Rp0 palsu');
  assert.equal(D.servisLogs.length, 1, 'servis tetap tercatat sbg Service Event/riwayat sah walau cost=0');
  assert.equal(D.servisLogs[0].txLinkId, null, 'txLinkId servis harus null krn tidak ada tx yg dibuat');
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.equal(financeUpdated, undefined, 'v13: finance.updated hanya emit utk transaksi Finance yg benar2 dibuat (cost>0)');
});

test('BUGFIX: Servis._saveInner() jalur EDIT (ada txLinkId) emit AIBus "finance.updated"', async () => {
  const D = baseD({
    servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', categoryId: null, km: 9000, cost: 50000, note: '', accountId: 'a1', txLinkId: 'tx1' }],
    transactions: [{ id: 'tx1', type: 'expense', amount: 50000, category: 'Transportasi', subcategory: 'Servis & Oli', accountId: 'a1', payMethod: 'tunai', note: 'Ganti Oli', date: '2026-07-01', servisLinkId: 's1' }],
  });
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields({ servisCost: '90000' }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', aibusEvents });
  ctx.Servis.editId = 's1';
  await ctx.Servis._saveInner();

  assert.equal(D.transactions[0].amount, 90000, 'tx terkait harus tetap ter-update (0 regresi)');
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(financeUpdated, 'AIBus.emit("finance.updated", ...) harus terpanggil di jalur edit');
  assert.equal(financeUpdated.payload.txId, 'tx1');
  assert.equal(financeUpdated.payload.amount, 90000);
  assert.equal(financeUpdated.payload.kind, 'servis');
});

test('Servis._saveInner() jalur EDIT tanpa txLinkId (belum pernah ada transaksi) TIDAK emit "finance.updated" (0 regresi, tidak ada tx utk diupdate)', async () => {
  const D = baseD({
    servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', categoryId: null, km: 9000, cost: 0, note: '', accountId: 'a1', txLinkId: null }],
    transactions: [],
  });
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields({ servisCost: '0' }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', aibusEvents });
  ctx.Servis.editId = 's1';
  await ctx.Servis._saveInner();

  assert.equal(D.transactions.length, 0);
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.equal(financeUpdated, undefined, 'tidak boleh emit finance.updated kalau tidak ada tx terkait utk diupdate');
});
