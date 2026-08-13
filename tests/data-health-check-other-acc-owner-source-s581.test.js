'use strict';
// tests/data-health-check-other-acc-owner-source-s581.test.js — Sesi S581
// (DL-Next-8, lihat DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-CHECK-OTHER-ACC-
// SOURCE.md & AUDIT-13-OWNER-RESOLVER-POST-DL-NEXT-7.md). Cakupan HANYA:
// cabang `existsOnOtherAcc` di runDataHealthCheck() (data-health-check.js)
// sekarang ikut mengecek owner via aset multi-owner tertaut di AKUN LAIN
// (bukan cuma `a.owners[]` mentah), supaya kategorisasi A ("tidak
// ditemukan sama sekali") vs C ("ada, tapi di akun lain") akurat.
//
// Cabang UTAMA (dOwnerAcc sendiri, DL-Next-7) & cabang `!dOwnerAcc` (akun
// invalid) TIDAK disentuh sesi ini -- sudah dicover
// tests/data-health-check-deduction-owner-asset-source-s580.test.js &
// tests/s574-e-history-badge-datahealth-regression.test.js [15].

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [],
    products: [], servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [],
    investments: [], targets: [], eduFunds: [], renovProjects: [], sewaKios: [],
  }, overrides);
}

// Harness LENGKAP -- muat multi-owner-engine.js + transaksi.js (source asli
// resolveOwnerDefaultForAccount()/findLinkedAssetForAccount()) +
// data-health-check.js, pola sama persis test S580.
function runWithResolver(overrides) {
  const D = makeD(overrides);
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/finance/transaksi.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
  );
  return ctx.runDataHealthCheck();
}

function runFallbackOnly(overrides) {
  const D = makeD(overrides);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) },
  );
  return ctx.runDataHealthCheck();
}

const TITLE_NOT_FOUND = 'Pemilik Sumber Potongan tidak ditemukan';
const TITLE_OTHER_ACC = 'Pemilik Sumber Potongan bukan pemilik akun transaksi ini';

// ===========================================================================
// 1. Kasus utama dari AUDIT-13: owner valid HANYA lewat aset tertaut di
// AKUN LAIN (akun itu sendiri tanpa owners[] manual) -> harus dikategorikan
// C ("bukan pemilik akun ini"), BUKAN A ("tidak ditemukan sama sekali").
// ===========================================================================
test('S581 [1]: owner valid via aset tertaut di AKUN LAIN -> kategori C (bukan pemilik akun ini), BUKAN A', () => {
  const issues = runWithResolver({
    accounts: [
      { id: 'acc-target', name: 'Akun Target' },
      { id: 'acc-other', name: 'Akun Lain' },
    ],
    assets: [{ id: 'as1', name: 'Aset Lain', accountId: 'acc-other', owners: [
      { ownerId: 'oX', ownerName: 'Xavi', porsi: 100 },
    ] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-target', deductionOwnerId: 'oX', note: 'Tx cross-acc-asset' }],
  });
  const foundC = issues.filter((i) => i.title === TITLE_OTHER_ACC);
  const foundA = issues.filter((i) => i.title === TITLE_NOT_FOUND);
  assert.equal(foundC.length, 1);
  assert.equal(foundA.length, 0);
  assert.match(foundC[0].detail, /Tx cross-acc-asset/);
});

// ===========================================================================
// 2. Regresi: owner valid di akun lain lewat acc.owners[] MANUAL (kasus
// lama, sudah dicover sebelumnya) -> tetap kategori C, 0 perubahan.
// ===========================================================================
test('S581 [2]: owner valid di akun lain via acc.owners[] manual (kasus lama) -> tetap kategori C', () => {
  const issues = runWithResolver({
    accounts: [
      { id: 'acc-multi', name: 'Rekening Bersama', owners: [{ ownerId: 'o1', ownerName: 'Budi' }] },
      { id: 'acc-other', name: 'Akun Lain', owners: [{ ownerId: 'o9', ownerName: 'Citra' }] },
    ],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o9', note: 'Tx salah akun' }],
  });
  const foundC = issues.filter((i) => i.title === TITLE_OTHER_ACC);
  assert.equal(foundC.length, 1);
  assert.equal(issues.filter((i) => i.title === TITLE_NOT_FOUND).length, 0);
});

// ===========================================================================
// 3. Owner benar-benar tidak ada di manapun (bukan di akun manapun, baik
// manual maupun via aset) -> tetap kategori A, 0 regresi.
// ===========================================================================
test('S581 [3]: owner benar-benar tidak ada di manapun -> tetap kategori A', () => {
  const issues = runWithResolver({
    accounts: [
      { id: 'acc-target', name: 'Akun Target' },
      { id: 'acc-other', name: 'Akun Lain' },
    ],
    assets: [{ id: 'as1', name: 'Aset Lain', accountId: 'acc-other', owners: [
      { ownerId: 'oX', ownerName: 'Xavi', porsi: 100 },
    ] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-target', deductionOwnerId: 'o-ghost', note: 'Tx ghost total' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE_NOT_FOUND).length, 1);
  assert.equal(issues.filter((i) => i.title === TITLE_OTHER_ACC).length, 0);
});

// ===========================================================================
// 4. Guard fallback: tanpa resolveOwnerDefaultForAccount termuat, jalur
// lama (a.owners[] mentah) tetap jalan, 0 crash.
// ===========================================================================
test('S581 [4]: tanpa resolveOwnerDefaultForAccount termuat (fallback) -> logic lama tetap jalan, 0 crash', () => {
  const issues = runFallbackOnly({
    accounts: [
      { id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }] },
      { id: 'acc-other', owners: [{ ownerId: 'o9', ownerName: 'Citra' }] },
    ],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o9', note: 'Tx fallback' }],
  });
  const foundC = issues.filter((i) => i.title === TITLE_OTHER_ACC);
  assert.equal(foundC.length, 1);
});
