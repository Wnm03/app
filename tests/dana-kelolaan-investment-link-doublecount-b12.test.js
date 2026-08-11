'use strict';
// tests/dana-kelolaan-investment-link-doublecount-b12.test.js — SESI B12
// (follow-up B7-B9, gap sama persis ditemukan di modul Dana Kelolaan): sejak
// aset bisa ditautkan ke Holding Investasi lewat dropdown B1 (`a.investmentId`),
// kalau ASET-nya dan HOLDING tertautnya sama-sama ber-ownership non-SELF (mis.
// INVESTOR), DanaKelolaan.byType() bisa dobel-hitung: sekali dari sumAssets()
// (a.nilai), sekali lagi dari sumInvestasi() (Investment.holdingValue(h)) --
// pola SAMA PERSIS bug S449 (akun tertaut), bedanya sisi Investasi bukan Akun.
//
// Fix: sumAssets() exclude aset yang `a.investmentId` terisi (pola sama persis
// Opsi A Aset.totalValue(), B8). Harness sama persis
// tests/dana-kelolaan-linked-account-exclude-s449.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-kelolaan.js'],
    { D },
    ['OwnershipEngine', 'Investment', 'DanaKelolaan'],
  );
}

test('DanaKelolaan.sumAssets() — aset tertaut ke Holding Investasi (ownership INVESTOR sama) dikecualikan, tidak dobel-hitung dgn sumInvestasi()', () => {
  const D = {
    assets: [
      { id: 'as-majoris', name: 'Majoris', nilai: 11100000, ownership: 'INVESTOR', investmentId: 'inv-majoris' },
      { id: 'as-lain', name: 'Tanah Investor', nilai: 5000000, ownership: 'INVESTOR' },
    ],
    investments: [
      { id: 'inv-majoris', name: 'Majoris', ownership: 'INVESTOR', unit: 1000, currentPrice: 11100 },
    ],
  };
  const ctx = makeCtx(D);
  // as-majoris tertaut ke inv-majoris -> dikecualikan dari sumAssets()
  // (sudah kehitung via sumInvestasi('INVESTOR') = 11.100.000).
  assert.equal(ctx.DanaKelolaan.sumAssets('INVESTOR'), 5000000);
  assert.equal(ctx.DanaKelolaan.sumInvestasi('INVESTOR'), 11100000);
  assert.equal(ctx.DanaKelolaan.byType('INVESTOR'), 16100000, 'total tidak boleh dobel-hitung nilai Majoris');
});

test('DanaKelolaan.sumAssets() — aset TIDAK tertaut investasi apa pun tetap kehitung normal (0 regresi)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Tanah Investor', nilai: 5000000, ownership: 'INVESTOR' }],
    investments: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAssets('INVESTOR'), 5000000);
});

test('DanaKelolaan.sumAssets() — aset tertaut investmentId ORPHAN (holding sudah dihapus) tetap dikecualikan (pola sama Opsi A / B8)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'RDPU X', nilai: 3000000, ownership: 'FAMILY', investmentId: 'inv_ghost' }],
    investments: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAssets('FAMILY'), 0);
});
