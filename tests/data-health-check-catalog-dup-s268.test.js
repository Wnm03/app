'use strict';
// tests/data-health-check-catalog-dup-s268.test.js — cakupan untuk cek baru
// "catalogId duplikat" di runDataHealthCheck() (data-health-check.js),
// ditambah S268 sbg bagian audit ringan pra-migrasi bridge scan Keuangan->
// Stok (lihat NEXT_SESSION.md "Kandidat migrasi penuh" & komentar di
// data-health-check.js). Cek ini murni baca D.partsStock, jadi dites lewat
// harness loadSource biasa (bukan smoke-test/DOM).

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

function run(partsStock) {
  const D = makeD(partsStock);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {} }
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: TIDAK warn kalau tiap catalogId cuma dipakai 1 baris stok', () => {
  const issues = run([
    { id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_a' },
    { id: 'st_2', name: 'Oli Mesin', qty: 3, catalogId: 'cat_b' },
    { id: 'st_3', name: 'Busi', qty: 1 }, // tanpa catalogId, harus diabaikan
  ]);
  const dup = issues.filter((i) => i.title === 'Part katalog terhubung ke lebih dari 1 baris stok');
  assert.equal(dup.length, 0);
});

test('runDataHealthCheck: warn kalau 2+ baris stok menunjuk catalogId yang sama', () => {
  const issues = run([
    { id: 'st_1', name: 'Kampas Rem', qty: 2, catalogId: 'cat_a' },
    { id: 'st_2', name: 'Kampas Rem (dobel)', qty: 5, catalogId: 'cat_a' },
  ]);
  const dup = issues.filter((i) => i.title === 'Part katalog terhubung ke lebih dari 1 baris stok');
  assert.equal(dup.length, 1);
  assert.equal(dup[0].level, 'warn');
  assert.match(dup[0].detail, /Kampas Rem/);
});

test('runDataHealthCheck: cek qty minus lama tetap jalan (regresi)', () => {
  const issues = run([{ id: 'st_1', name: 'Oli', qty: -1, catalogId: 'cat_a' }]);
  const minus = issues.filter((i) => i.title === 'Stok sparepart minus');
  assert.equal(minus.length, 1);
});
