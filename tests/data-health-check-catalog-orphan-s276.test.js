'use strict';
// tests/data-health-check-catalog-orphan-s276.test.js — cakupan untuk cek
// baru "catalogId orphan" di runDataHealthCheck() (data-health-check.js),
// ditambah Sesi 276 sbg lanjutan audit sinkronisasi lintas-fitur (temuan
// baru: catalogId di D.partsStock bisa menunjuk ke part Katalog Suku
// Cadang yang sudah dihapus, badge terkait di VehicleCatalogUI jadi
// "hilang" diam-diam tanpa pemberitahuan). Pola test identik
// tests/data-health-check-catalog-dup-s268.test.js (harness loadSource
// biasa, VehicleCatalog di-mock minimal, bukan smoke-test/DOM).

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

function run(partsStock, VehicleCatalog) {
  const D = makeD(partsStock);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, VehicleCatalog }
  );
  return ctx.runDataHealthCheck();
}

const ORPHAN_TITLE = 'Stok sparepart tertaut ke part katalog yang sudah dihapus';

test('runDataHealthCheck: TIDAK cek orphan catalogId kalau VehicleCatalog belum dimuat (isLoaded() false)', () => {
  const issues = run(
    [{ id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_gone' }],
    { isLoaded: () => false, getStore: () => ({ items: [] }) },
  );
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: TIDAK cek orphan catalogId kalau VehicleCatalog tidak tersedia sama sekali', () => {
  const issues = run(
    [{ id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_gone' }],
    undefined,
  );
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau catalogId menunjuk part katalog yang sudah dihapus', () => {
  const issues = run(
    [{ id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_gone' }],
    { isLoaded: () => true, getStore: () => ({ items: [{ id: 'cat_other' }] }) },
  );
  const orphan = issues.filter((i) => i.title === ORPHAN_TITLE);
  assert.equal(orphan.length, 1);
  assert.equal(orphan[0].level, 'warn');
  assert.match(orphan[0].detail, /Kampas Rem/);
});

test('runDataHealthCheck: TIDAK warn kalau catalogId masih cocok dengan part katalog yang ada', () => {
  const issues = run(
    [{ id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_a' }],
    { isLoaded: () => true, getStore: () => ({ items: [{ id: 'cat_a' }] }) },
  );
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: baris stok tanpa catalogId diabaikan (tidak pernah dicek orphan)', () => {
  const issues = run(
    [{ id: 'st_1', name: 'Busi', qty: 1 }],
    { isLoaded: () => true, getStore: () => ({ items: [] }) },
  );
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: cek qty minus & dup catalogId lama tetap jalan (regresi, 0 perubahan perilaku lama)', () => {
  const issues = run(
    [
      { id: 'st_1', name: 'Oli', qty: -1, catalogId: 'cat_a' },
      { id: 'st_2', name: 'Oli (dobel)', qty: 3, catalogId: 'cat_a' },
    ],
    { isLoaded: () => true, getStore: () => ({ items: [{ id: 'cat_a' }] }) },
  );
  assert.equal(issues.filter((i) => i.title === 'Stok sparepart minus').length, 1);
  assert.equal(issues.filter((i) => i.title === 'Part katalog terhubung ke lebih dari 1 baris stok').length, 1);
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});
