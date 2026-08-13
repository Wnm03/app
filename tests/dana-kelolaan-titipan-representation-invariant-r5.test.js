'use strict';
// tests/dana-kelolaan-titipan-representation-invariant-r5.test.js — S583
// sesi-3 (Rekomendasi #5 dari audit AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md):
// test INVARIAN lintas modul, bukan per-modul -- porsi titipan yang SAMA
// (nilai & porsi owner identik) harus menghasilkan DanaKelolaan.summary().total
// yang SAMA PERSIS, TIDAK PEDULI aset SELF pembawa porsi itu direpresentasikan
// lewat jalur mana: aset biasa (tanpa tautan), aset tertaut Holding Investasi
// (`a.investmentId`), atau aset tertaut Akun (`a.accountId`).
//
// Kenapa ini bisa drift: sumAssets()/sumAccounts() punya filter exclude utk
// jalur tertaut (B12/S449, cegah dobel-hitung whole-entity non-SELF), tapi
// sumTitipanAset() (titipan PARSIAL di dalam aset SELF, lihat dana-kelolaan.js)
// SENGAJA tidak & tidak boleh ikut exclude itu -- porsi titipan dihitung murni
// dari `a.owners`, independen dari a.investmentId/a.accountId. Test ini
// memastikan invarian itu (0 exclusion yang salah tempat bocor ke jalur
// titipan) tetap benar seiring modul lain berubah, bukan diverifikasi manual
// tiap sesi seperti direkomendasikan.
//
// PURE (0 mutasi) -- reuse 100% harness loadSource() yang sudah ada, 0 rumus
// baru, pola sama persis dana-kelolaan-investment-link-doublecount-b12.test.js
// & dana-kelolaan-linked-account-exclude-s449.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/akun.js',
      'modules/finance/dana-kelolaan.js',
    ],
    { D },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Investment', 'recalcAccBalance', 'linkedAssetAccountIds', 'DanaKelolaan'],
  );
}

// Owner non-SELF porsi 30% dari nilai 10.000.000 -> titipan porsi = 3.000.000,
// SELF porsi 70% (0 rumus baru, sama pola getOwners()/selfPorsi() modul asli).
const OWNERS = [
  { ownerId: 'SELF', porsi: 70, isSelf: true, ownerName: 'Milik Sendiri' },
  { ownerId: 'o-budi', porsi: 30, isSelf: false, ownerName: 'Budi' },
];
const NILAI = 10000000;
const EXPECTED_TITIPAN = 3000000; // 10jt * 30%

test('DanaKelolaan.summary().total — jalur A: aset biasa (tanpa tautan apa pun)', () => {
  const D = {
    assets: [{ id: 'a-biasa', name: 'Tanah', nilai: NILAI, owners: OWNERS }],
    accounts: [], investments: [], transactions: [], debts: [],
  };
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, EXPECTED_TITIPAN);
  assert.equal(s.total, EXPECTED_TITIPAN);
});

test('DanaKelolaan.summary().total — jalur B: aset tertaut Holding Investasi (a.investmentId), nilai identik jalur A', () => {
  const D = {
    assets: [{ id: 'a-inv', name: 'RDPU via Investasi', nilai: NILAI, owners: OWNERS, investmentId: 'inv-1' }],
    investments: [{ id: 'inv-1', name: 'RDPU X', ownership: 'SELF', unit: 1, currentPrice: NILAI }],
    accounts: [], transactions: [], debts: [],
  };
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  // sumTitipanAset() TIDAK boleh ikut ke-exclude oleh filter investmentId
  // (filter itu punya sumAssets(type), murni utk whole-entity non-SELF).
  assert.equal(s.titipanAset, EXPECTED_TITIPAN, 'porsi titipan tidak boleh hilang/berubah gara2 aset tertaut investasi');
  assert.equal(s.total, EXPECTED_TITIPAN, 'total harus SAMA PERSIS dgn jalur A (aset biasa)');
});

test('DanaKelolaan.summary().total — jalur C: aset tertaut Akun (a.accountId), nilai identik jalur A', () => {
  const D = {
    assets: [{ id: 'a-acc', name: 'Deposito via Akun', nilai: NILAI, owners: OWNERS, accountId: 'acc-1' }],
    accounts: [{ id: 'acc-1', name: 'Rek Deposito', balance: NILAI, ownership: 'SELF' }],
    investments: [], transactions: [], debts: [],
  };
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, EXPECTED_TITIPAN, 'porsi titipan tidak boleh hilang/berubah gara2 aset tertaut akun');
  assert.equal(s.total, EXPECTED_TITIPAN, 'total harus SAMA PERSIS dgn jalur A (aset biasa)');
});

test('DanaKelolaan.summary().total — gabungan ketiga jalur sekaligus: total = 3x porsi titipan, 0 dobel-hitung & 0 hilang silang-jalur', () => {
  const D = {
    assets: [
      { id: 'a-biasa', name: 'Tanah', nilai: NILAI, owners: OWNERS },
      { id: 'a-inv', name: 'RDPU via Investasi', nilai: NILAI, owners: OWNERS, investmentId: 'inv-1' },
      { id: 'a-acc', name: 'Deposito via Akun', nilai: NILAI, owners: OWNERS, accountId: 'acc-1' },
    ],
    investments: [{ id: 'inv-1', name: 'RDPU X', ownership: 'SELF', unit: 1, currentPrice: NILAI }],
    accounts: [{ id: 'acc-1', name: 'Rek Deposito', balance: NILAI, ownership: 'SELF' }],
    transactions: [], debts: [],
  };
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, EXPECTED_TITIPAN * 3);
  assert.equal(s.total, EXPECTED_TITIPAN * 3);
});
