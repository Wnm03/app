'use strict';
// tests/fi-investment-asset-value-doublecount-fix-b9.test.js — Sesi B9:
// fix gap yang dicatat di release notes B8 ("Tidak diubah" section).
// FI.investmentAssetValue() (modules-calc.js) scope default 'zakatable'
// punya filter INLINE sendiri (duplikat dari Zakat.hitungMaal(), bukan reuse
// totalAssetValue()) -- jadi tidak otomatis kebagian fix B8. Pola fix SAMA
// PERSIS: tambah `!a.investmentId` di samping `!a._migratedToInvestmentId`.
// Scope 'semua' TIDAK perlu disentuh (return totalAssetValue()==
// Aset.totalValue(), sudah otomatis kebagian fix B8).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return Object.assign(
    {
      assets: [], accounts: [], transactions: [], investments: [], investmentTx: [],
      pajakZakat: {}, finansialFreedom: {},
    },
    overrides,
  );
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js',
      'pajak-aset-ui-wrappers.js',
      'modules/asset/investasi.js',
      'modules/shared/modules-calc.js',
    ],
    {
      D,
      Etalase: { totalModalStok: () => 0 },
      Piutang: { totalValue: () => 0 },
      Debt: { totalValue: () => 0 },
      uid: () => 'x',
      save: () => {},
      todayStr: () => '2026-01-01',
      escapeHtml: (s) => String(s),
    },
    ['FI', 'Aset', 'Investment', 'totalAssetValue'],
  );
}

test('FI.investmentAssetValue() scope "zakatable" — aset zakatable TANPA investmentId tetap ikut (0 regresi)', () => {
  const D = makeD({ assets: [{ id: 'a1', name: 'Emas', nilai: 5000000, zakatable: true }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.FI.investmentAssetValue(), 5000000);
});

test('FI.investmentAssetValue() scope "zakatable" — aset zakatable YANG ditautkan (investmentId, B1) ke holding masih ada DIKECUALIKAN (0 dobel-hitung)', () => {
  const D = makeD({
    assets: [
      { id: 'a1', name: 'RDPU X', nilai: 10000000, zakatable: true, investmentId: 'h1' },
      { id: 'a2', name: 'Emas', nilai: 5000000, zakatable: true },
    ],
    investments: [{ id: 'h1', name: 'RDPU X' }],
  });
  const ctx = makeCtx(D);
  // hanya a2 -- a1 sudah "milik" sisi Investment.zakatableValue() (di sini
  // holding h1 tidak ditandai zakatable, jadi Investment.zakatableValue()=0,
  // yang penting a1 TIDAK ikut dihitung 2x di sisi aset)
  assert.equal(ctx.FI.investmentAssetValue(), 5000000);
});

test('FI.investmentAssetValue() scope "zakatable" — aset dgn _migratedToInvestmentId (s476a) tetap dikecualikan (0 regresi fix lama)', () => {
  const D = makeD({ assets: [{ id: 'a1', name: 'BTC', nilai: 15000000, zakatable: true, _migratedToInvestmentId: 'h1' }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.FI.investmentAssetValue(), 0);
});

test('FI.investmentAssetValue() scope "semua" — otomatis kebagian fix B8 lewat totalAssetValue()==Aset.totalValue()', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'RDPU X', nilai: 10000000, zakatable: true, investmentId: 'h1' }],
    investments: [{ id: 'h1', name: 'RDPU X' }],
    finansialFreedom: { assetScope: 'semua' },
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.FI.investmentAssetValue(), 0);
});
