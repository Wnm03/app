'use strict';
/**
 * tests/servis-markserviced-aibus-emit.test.js
 *
 * Bug (audit "✅ Sudah Servis" tidak emit AIBus event): tombol "✅ Sudah
 * Servis" di kartu 🔔 Pengingat Servis (data-action="markSparepartServiced")
 * memanggil Servis.markServiced(catId) langsung -- fungsi ini menulis
 * sendiri ke D.servisLogs & (kalau cost>0) D.transactions, TANPA lewat
 * saveServis() (wrapper global di modules/vehicle/sparepart-servis-b.js
 * yang emit AIBus 'vehicle.updated' setelah Servis.save() dari alur submit
 * modal servis biasa). Akibatnya listener AI (mis. audit servis
 * overdue/reminder, atau apa pun yang subscribe 'vehicle.updated' /
 * 'finance.updated') tidak pernah tahu ada servis baru kalau user cuma tap
 * tombol cepat ini -- beda perlakuan dari alur submit modal biasa.
 *
 * FIX: Servis.markServiced() sekarang juga emit AIBus 'vehicle.updated'
 * (selalu, sama seperti wrapper saveServis()) dan 'finance.updated' (hanya
 * kalau benar ada transaksi baru tercatat, yaitu saat cost>0/txLinkId
 * terisi -- pola sama dengan emit BBM yang sudah ada di car-notes.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, promptValue = '0', confirmValue = true, aibusEvents }) {
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
    computeServiceUrgency: undefined,
    VehicleActionRecommendation: undefined,
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
  }, ['Servis']);
}

test('BUGFIX: Servis.markServiced() emit AIBus "vehicle.updated" (selalu)', async () => {
  const D = {
    sparepartCats: [{ id: 'c1', name: 'Ganti Oli', intervalKm: 2000 }],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
  };
  const aibusEvents = [];
  const ctx = makeCtx({ D, promptValue: '0', aibusEvents });

  await ctx.Servis.markServiced('c1');

  assert.equal(D.servisLogs.length, 1, 'entry servis harus tetap tersimpan (0 regresi perilaku lama)');
  const vehicleUpdated = aibusEvents.find((e) => e.name === 'vehicle.updated');
  assert.ok(vehicleUpdated, 'AIBus.emit("vehicle.updated", ...) harus terpanggil');
  assert.equal(vehicleUpdated.payload.kind, 'servis');
});

test('BUGFIX: Servis.markServiced() emit AIBus "finance.updated" HANYA kalau cost>0 (transaksi benar dibuat)', async () => {
  const D = {
    sparepartCats: [{ id: 'c1', name: 'Ganti Oli', intervalKm: 2000 }],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
  };
  const aibusEvents = [];
  const ctx = makeCtx({ D, promptValue: '50000', aibusEvents });

  await ctx.Servis.markServiced('c1');

  assert.equal(D.transactions.length, 1, 'transaksi baru harus tetap tercatat saat cost>0 (0 regresi)');
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(financeUpdated, 'AIBus.emit("finance.updated", ...) harus terpanggil saat ada transaksi baru');
  assert.equal(financeUpdated.payload.txId, D.transactions[0].id);
  assert.equal(financeUpdated.payload.amount, 50000);
  assert.equal(financeUpdated.payload.kind, 'servis');
});

test('Servis.markServiced() TIDAK emit "finance.updated" saat cost=0 (tidak ada transaksi dibuat, 0 regresi)', async () => {
  const D = {
    sparepartCats: [{ id: 'c1', name: 'Ganti Oli', intervalKm: 2000 }],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
  };
  const aibusEvents = [];
  const ctx = makeCtx({ D, promptValue: '0', aibusEvents });

  await ctx.Servis.markServiced('c1');

  assert.equal(D.transactions.length, 0);
  const financeUpdated = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.equal(financeUpdated, undefined, 'tidak boleh emit finance.updated kalau tidak ada transaksi baru');
});
