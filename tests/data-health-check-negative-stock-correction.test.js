'use strict';
// tests/data-health-check-negative-stock-correction.test.js — cakupan untuk
// aksi baru DataHealth.correctNegativeStock(idx) (data-health-check.js),
// ditambah sesi audit AUDIT-DATA-HEALTH-BACKUP-2026-08-16.md temuan
// prioritas #1 "Stok sparepart minus". Sebelum sesi ini, cek "Stok
// sparepart minus" cuma MELAPORKAN qty<0, tidak ada cara memperbaikinya
// langsung dari kartu Hasil Pemindaian Data. Pola test sama persis
// tests/data-health-check-catalog-orphan-s276.test.js (harness loadSource
// biasa) untuk cek issue-nya, plus test terpisah utk DataHealth object
// (pola sama tests/... yang menguji DataHealth.unlinkStockCatalog, tapi
// file itu belum ada secara eksplisit -- jadi harness DataHealth di sini
// dibangun langsung mengikuti definisi correctNegativeStock/
// unlinkStockCatalog di data-health-check.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(partsStock) {
  return {
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock, debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [],
  };
}

const NEG_TITLE = 'Stok sparepart minus';

test('runDataHealthCheck: issue "Stok sparepart minus" sekarang menyertakan actions[] (Buka Stok + Koreksi ke 0)', () => {
  const D = makeD([{ id: 'st_1', name: 'Ban depan 80/90', qty: -1 }]);
  const ctx = loadSource(['modules/shared/helper-teks.js', 'data-health-check.js'], { D, openModal: () => {} });
  const issues = ctx.runDataHealthCheck();
  const found = issues.filter((i) => i.title === NEG_TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'error');
  const actions = found[0].actions || [];
  assert.equal(actions.length, 2);
  assert.equal(actions[0].action, 'openStockModal');
  assert.equal(JSON.stringify(actions[0].args), JSON.stringify([0]));
  assert.equal(actions[1].action, 'DataHealth.correctNegativeStock');
  assert.equal(JSON.stringify(actions[1].args), JSON.stringify([0]));
});

test('runDataHealthCheck: idx di actions[] mengacu ke index ARRAY ASLI D.partsStock, bukan index hasil filter', () => {
  const D = makeD([
    { id: 'st_ok', name: 'Oli (stok aman)', qty: 3 },
    { id: 'st_neg', name: 'ban belakang 90/90', qty: -1 },
  ]);
  const ctx = loadSource(['modules/shared/helper-teks.js', 'data-health-check.js'], { D, openModal: () => {} });
  const issues = ctx.runDataHealthCheck();
  const found = issues.find((i) => i.title === NEG_TITLE);
  assert.ok(found);
  // item minus ada di index 1 pada D.partsStock asli
  assert.equal(JSON.stringify(found.actions[1].args), JSON.stringify([1]));
});

test('runDataHealthCheck: TIDAK ada actions[] kalau qty tidak minus (regresi, 0 perubahan perilaku lama)', () => {
  const D = makeD([{ id: 'st_1', name: 'Kampas Rem', qty: 2 }]);
  const ctx = loadSource(['modules/shared/helper-teks.js', 'data-health-check.js'], { D, openModal: () => {} });
  const issues = ctx.runDataHealthCheck();
  assert.equal(issues.filter((i) => i.title === NEG_TITLE).length, 0);
});

test('DataHealth.correctNegativeStock(idx): set qty jadi 0, panggil save() & runDataHealthCheck(), TIDAK menyentuh priceHistory/txRefs', async () => {
  const priceHistory = [{ date: '2026-08-10', qty: 1, price: 225000, txId: 111 }];
  const D = makeD([{ id: 'st_1', name: 'Ban depan 80/90', qty: -1, priceHistory, txRefs: [111], lastTxId: 111 }]);
  let saved = false;
  let rechecked = false;
  let rerendered = false;
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    {
      D,
      openModal: () => {},
      toast: () => {},
      askConfirm: async () => true,
      save: () => { saved = true; },
      renderStockList: () => { rerendered = true; },
    },
    ['DataHealth'],
  );
  // runDataHealthCheck sudah otomatis jadi properti context (function
  // top-level) -- bungkus supaya kita bisa deteksi kapan dipanggil ulang
  // tanpa mengubah perilakunya.
  const originalCheck = ctx.runDataHealthCheck;
  ctx.runDataHealthCheck = (...args) => { rechecked = true; return originalCheck(...args); };

  await ctx.DataHealth.correctNegativeStock(0);

  assert.equal(D.partsStock[0].qty, 0);
  assert.deepEqual(D.partsStock[0].priceHistory, priceHistory);
  assert.deepEqual(D.partsStock[0].txRefs, [111]);
  assert.equal(saved, true);
  assert.equal(rechecked, true);
  assert.equal(rerendered, true);
});

test('DataHealth.correctNegativeStock(idx): batal kalau askConfirm() ditolak user, qty tidak berubah', async () => {
  const D = makeD([{ id: 'st_1', name: 'Ban depan 80/90', qty: -1 }]);
  let saved = false;
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, toast: () => {}, askConfirm: async () => false, save: () => { saved = true; } },
    ['DataHealth'],
  );
  await ctx.DataHealth.correctNegativeStock(0);
  assert.equal(D.partsStock[0].qty, -1);
  assert.equal(saved, false);
});

test('DataHealth.correctNegativeStock(idx): idx tidak ditemukan -> no-op (toast peringatan, tidak throw)', async () => {
  const D = makeD([{ id: 'st_1', name: 'Ban depan 80/90', qty: -1 }]);
  let toasted = '';
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, toast: (msg) => { toasted = msg; }, save: () => {} },
    ['DataHealth'],
  );
  await ctx.DataHealth.correctNegativeStock(99);
  assert.match(toasted, /tidak ditemukan/);
  assert.equal(D.partsStock[0].qty, -1);
});
