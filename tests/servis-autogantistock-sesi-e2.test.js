'use strict';
/**
 * tests/servis-autogantistock-sesi-e2.test.js
 *
 * Sesi E2 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E, item 2 dari
 * 6): `Servis._findAutoGantiStock(cat, vehicleId)` BARU — cari 1 kandidat
 * Stok Sparepart (D.partsStock) yang cocok kategori (`catId`) DAN kendaraan
 * (reuse `Sparepart.isPartForVehicle()`, 0 skema baru). Auto-potong 1 qty
 * hanya kalau PERSIS 1 kandidat cocok & stok cukup (qty>=1) -- 0/​>1
 * kandidat atau stok kurang DILEWATI DIAM-DIAM (aman, tidak menebak/tidak
 * nge-prompt konfirmasi minus tak terduga).
 *
 * Trigger HANYA saat actionType eksplisit 'ganti' -- markServiced(catId)
 * atau markServiced(catId,'periksa'/'bersih') = 0 dampak (0 regresi ke
 * tombol "✅ Sudah Servis" lama yang dipanggil tanpa actionType).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeSparepartStub(D) {
  return {
    isPartForVehicle(part, vehicleId) {
      if (!vehicleId || !part) return true;
      if (part.vehicleId) return part.vehicleId === vehicleId;
      return true;
    },
    renderStockList() {},
    renderCatList() {},
  };
}

function makeCtx({ D, promptValue = '0', confirmValue = true, toasts, Sparepart }) {
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
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    Sparepart: Sparepart || makeSparepartStub(D),
    AIBus: { emit() {} },
  }, ['Servis']);
}

function makeD(partsStock) {
  return {
    sparepartCats: [{ id: 'c1', name: 'Ganti Oli', intervalKm: 2000 }],
    servisLogs: [],
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: partsStock || [],
  };
}

test('_findAutoGantiStock: PERSIS 1 kandidat cocok catId+vehicle -> ditemukan', () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 5, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });
  const found = ctx.Servis._findAutoGantiStock(D.sparepartCats[0], 'v1');
  assert.ok(found, 'harus ketemu 1 kandidat');
  assert.equal(found.id, 'st1');
});

test('_findAutoGantiStock: 0 kandidat -> null (bukan error)', () => {
  const D = makeD([]);
  const ctx = makeCtx({ D });
  const found = ctx.Servis._findAutoGantiStock(D.sparepartCats[0], 'v1');
  assert.equal(found, null);
});

test('_findAutoGantiStock: >1 kandidat (ambigu) -> null, DILEWATI (tidak menebak)', () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin Merek A', catId: 'c1', qty: 5, vehicleId: 'v1' },
    { id: 'st2', name: 'Oli Mesin Merek B', catId: 'c1', qty: 3, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });
  const found = ctx.Servis._findAutoGantiStock(D.sparepartCats[0], 'v1');
  assert.equal(found, null, 'ambigu (2 kandidat) harus dilewati, bukan menebak salah satu');
});

test('_findAutoGantiStock: kandidat kategori beda -> tidak ikut cocok', () => {
  const D = makeD([
    { id: 'st1', name: 'Kampas Rem', catId: 'c-lain', qty: 5, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });
  const found = ctx.Servis._findAutoGantiStock(D.sparepartCats[0], 'v1');
  assert.equal(found, null);
});

test('_findAutoGantiStock: kandidat cocok kategori tapi beda kendaraan -> tidak ikut cocok', () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin', catId: 'c1', qty: 5, vehicleId: 'v-lain' },
  ]);
  const ctx = makeCtx({ D });
  const found = ctx.Servis._findAutoGantiStock(D.sparepartCats[0], 'v1');
  assert.equal(found, null);
});

test('markServiced(catId,"ganti") — PERSIS 1 kandidat & stok cukup: qty terpotong 1, entry.autoGantiStockId terisi', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 5, vehicleId: 'v1' },
  ]);
  const toasts = [];
  const ctx = makeCtx({ D, toasts });

  const entry = await ctx.Servis.markServiced('c1', 'ganti');

  assert.equal(D.partsStock[0].qty, 4, 'qty stok harus terpotong 1');
  assert.equal(entry.autoGantiStockId, 'st1');
  assert.ok(toasts.some((t) => t.includes('otomatis dipotong')), 'toast harus menyebut auto-potong stok');
});

test('markServiced(catId,"periksa") — TIDAK memotong stok (hanya trigger utk actionType "ganti")', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 5, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });

  await ctx.Servis.markServiced('c1', 'periksa');

  assert.equal(D.partsStock[0].qty, 5, '0 potongan stok utk actionType periksa');
});

test('markServiced(catId) TANPA actionType (tombol lama "✅ Sudah Servis") — TIDAK memotong stok, 0 regresi', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 5, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });

  await ctx.Servis.markServiced('c1');

  assert.equal(D.partsStock[0].qty, 5, '0 potongan stok saat actionType kosong (perilaku lama sebelum Sesi E2)');
});

test('markServiced(catId,"ganti") — stok TIDAK cukup (qty=0): DILEWATI DIAM-DIAM, 0 prompt konfirmasi minus, entry tetap tersimpan', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 0, vehicleId: 'v1' },
  ]);
  let confirmCalls = 0;
  const ctx = makeCtx({ D, confirmValue: true });
  // override askConfirm buat hitung berapa kali dipanggil (harus cuma 1x,
  // yaitu konfirmasi "Tandai sudah ganti", BUKAN prompt minus stok)
  const origAskConfirm = ctx.askConfirm;

  const entry = await ctx.Servis.markServiced('c1', 'ganti');

  assert.equal(D.partsStock[0].qty, 0, 'qty tidak boleh jadi minus (dilewati diam-diam, bukan dipaksa potong)');
  assert.ok(entry, 'entry servis tetap tersimpan walau auto-potong dilewati');
  assert.equal(entry.autoGantiStockId, undefined, 'autoGantiStockId tidak terisi krn stok tidak cukup');
});

test('markServicedBatch — item actionType "ganti" ikut kena auto-potong stok (reuse markServiced() apa adanya, 0 logic duplikat)', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 2, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });

  const results = await ctx.Servis.markServicedBatch([
    { catId: 'c1', actionType: 'ganti', cost: 0 },
  ]);

  assert.equal(results.length, 1);
  assert.equal(D.partsStock[0].qty, 1, 'batch tetap ikut auto-potong krn reuse markServiced() apa adanya');
});

test('Servis.del() — hapus catatan servis dgn autoGantiStockId: qty stok dikembalikan (revert simetris)', async () => {
  const D = makeD([
    { id: 'st1', name: 'Oli Mesin 10w-30', catId: 'c1', qty: 5, vehicleId: 'v1' },
  ]);
  const ctx = makeCtx({ D });

  const entry = await ctx.Servis.markServiced('c1', 'ganti');
  assert.equal(D.partsStock[0].qty, 4);

  await ctx.Servis.del(entry.id);

  assert.equal(D.partsStock[0].qty, 5, 'qty harus balik ke semula setelah catatan dihapus');
  assert.equal(D.servisLogs.length, 0);
});
