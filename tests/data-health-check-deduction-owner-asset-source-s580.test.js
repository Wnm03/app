'use strict';
// tests/data-health-check-deduction-owner-asset-source-s580.test.js — Sesi
// S580 (DL-Next-7, lihat DESIGN-LOCK-DL-NEXT-7-DATA-HEALTH-CHECK-OWNER-
// SOURCE.md & AUDIT-12-OWNER-RESOLVER-POST-DL-NEXT-6.md). Cakupan HANYA:
// cek `t.deductionOwnerId` di runDataHealthCheck() (data-health-check.js)
// sekarang ikut mengecek owner dari ASET MULTI-OWNER TERTAUT lewat
// resolveOwnerDefaultForAccount() (transaksi.js), bukan cuma
// `acc.owners[]` -- gap sama persis pola DL-Next-1/DL-Next-6, di consumer
// ke-2 yang belum pernah diaudit.
//
// Regresi jalur lama (owner dari acc.owners[], owner di akun lain, owner
// tidak ada sama sekali, akun invalid) SUDAH dicover
// tests/s574-e-history-badge-datahealth-regression.test.js [13-15] --
// SENGAJA tidak diulang di sini kecuali 1 smoke-check fallback (lihat
// test terakhir), sesuai disiplin "0 duplikasi test antar file".

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

// Harness LENGKAP -- muat multi-owner-engine.js (getOwners() asli) +
// transaksi.js (resolveOwnerDefaultForAccount()/findLinkedAssetForAccount()
// asli) + data-health-check.js, supaya jalur source:'asset' benar-benar
// dites lewat kode produksi, bukan re-mock logic-nya.
function runWithResolver(overrides) {
  const D = makeD(overrides);
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/finance/transaksi.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
  );
  return ctx.runDataHealthCheck();
}

// Harness FALLBACK -- HANYA data-health-check.js (tanpa transaksi.js),
// utk membuktikan guard `typeof resolveOwnerDefaultForAccount==='function'`
// bekerja & jalur lama (acc.owners[]) tetap dipakai kalau fungsi itu belum
// termuat (pola sama persis DL-Next-6 di tx-list-cashflow.js).
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
// 1. Kasus utama dari AUDIT-12: akun TANPA acc.owners[] sendiri + tertaut
// aset multi-owner valid -- deductionOwnerId dari aset TIDAK BOLEH lagi
// memicu warning palsu (regresi utama yang diperbaiki DL-Next-7).
// ===========================================================================
test('S580 [1]: deductionOwnerId valid dari SUMBER ASET tertaut (akun sendiri tanpa owners[]) -> TIDAK warn', () => {
  const issues = runWithResolver({
    accounts: [{ id: 'acc-nomanual', name: 'Rekening Kios' }],
    assets: [{ id: 'as1', name: 'Kios Bersama', accountId: 'acc-nomanual', owners: [
      { ownerId: 'o1', ownerName: 'Budi', porsi: 20 },
      { ownerId: 'o2', ownerName: 'Ani', porsi: 80 },
    ] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-nomanual', deductionOwnerId: 'o2', note: 'Tx dari aset' }],
  });
  assert.equal(issues.filter((i) => i.title.startsWith('Pemilik Sumber Potongan')).length, 0);
});

// ===========================================================================
// 2. Owner yang BENAR-BENAR tidak ada (bukan di acc.owners[], bukan di aset
// tertaut manapun) TETAP terdeteksi warn -- fix ini tidak boleh menutupi
// kasus asli yang valid untuk di-warn.
// ===========================================================================
test('S580 [2]: deductionOwnerId benar-benar tidak ada di aset tertaut maupun akun -> TETAP warn', () => {
  const issues = runWithResolver({
    accounts: [{ id: 'acc-nomanual', name: 'Rekening Kios' }],
    assets: [{ id: 'as1', name: 'Kios Bersama', accountId: 'acc-nomanual', owners: [
      { ownerId: 'o1', ownerName: 'Budi', porsi: 20 },
      { ownerId: 'o2', ownerName: 'Ani', porsi: 80 },
    ] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-nomanual', deductionOwnerId: 'o-ghost', note: 'Tx ghost aset' }],
  });
  const found = issues.filter((i) => i.title === TITLE_NOT_FOUND);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Tx ghost aset/);
  // Pesan sesi ini menyebut ASET tertaut (bukan "akun"), sesuai Design Lock §2.
  assert.match(found[0].detail, /aset multi-owner tertaut "Kios Bersama"/);
});

// ===========================================================================
// 3. Akun PUNYA acc.owners[] manual sendiri (source:'account', bukan
// 'asset') -- pesan lama verbatim, 0 perubahan wording (regresi wording).
// ===========================================================================
test('S580 [3]: owner tidak ditemukan via acc.owners[] manual (source account) -> pesan LAMA verbatim', () => {
  const issues = runWithResolver({
    accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', owners: [
      { ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' },
    ] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o-ghost', note: 'Tx ghost akun' }],
  });
  const found = issues.filter((i) => i.title === TITLE_NOT_FOUND);
  assert.equal(found.length, 1);
  assert.match(found[0].detail, /dihapus dari akun "Rekening Bersama"/);
});

// ===========================================================================
// 4. Owner valid di akun LAIN (kasus C) tidak terganggu oleh perubahan
// sesi ini -- jalur ini di-cek SEBELUM cabang source:'asset'.
// ===========================================================================
test('S580 [4]: owner valid global tapi bukan pemilik akun ini (kasus C) -> pesan tidak berubah', () => {
  const issues = runWithResolver({
    accounts: [
      { id: 'acc-multi', name: 'Rekening Bersama', owners: [{ ownerId: 'o1', ownerName: 'Budi' }] },
      { id: 'acc-other', name: 'Akun Lain', owners: [{ ownerId: 'o9', ownerName: 'Citra' }] },
    ],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o9', note: 'Tx salah akun' }],
  });
  const found = issues.filter((i) => i.title === TITLE_OTHER_ACC);
  assert.equal(found.length, 1);
  assert.equal(issues.filter((i) => i.title === TITLE_NOT_FOUND).length, 0);
});

// ===========================================================================
// 5. Guard fallback: kalau resolveOwnerDefaultForAccount BELUM termuat,
// perilaku LAMA (acc.owners[] saja) tetap jalan -- 0 crash, 0 regresi ke
// test lama yang cuma load data-health-check.js sendirian.
// ===========================================================================
test('S580 [5]: tanpa resolveOwnerDefaultForAccount termuat (fallback) -> logic lama tetap jalan, 0 crash', () => {
  const issues = runFallbackOnly({
    accounts: [{ id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o1' }],
  });
  assert.equal(issues.filter((i) => i.title.startsWith('Pemilik Sumber Potongan')).length, 0);
});
