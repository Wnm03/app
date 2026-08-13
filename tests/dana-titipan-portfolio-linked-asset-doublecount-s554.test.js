'use strict';
// tests/dana-titipan-portfolio-linked-asset-doublecount-s554.test.js — Sesi
// 554 (audit user, Agustus 2026 — laporan owner "renov"/instrumen "Schorder"
// tercatat 2x di tab Dana Titipan). Cakupan fix `_assetSplits()` di
// modules/finance/dana-titipan-portfolio-presenter.js: aset yang `a.investmentId`
// terisi (sudah ditautkan ke Holding Investasi lewat dropdown "🔗 Hubungkan ke
// Holding Investasi") sekarang DIKECUALIKAN dari domain Aset di
// `build()`/`allocatedExcluding()` — logic exclude SAMA PERSIS
// `Aset.totalValue()` (aset.js, `.filter(a=>!a.investmentId)`).
//
// Pola test SAMA PERSIS tests/s484-dana-titipan-portfolio-presenter.test.js
// (harness loadSource, D minimal).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

test('build(): aset TERTAUT (investmentId ke holding yg sama) TIDAK dobel-hitung -- kasus persis laporan user "Schorder"/"renov"', () => {
  const D = {
    investments: [
      { id: 'h1', name: 'Schorder', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }] },
    ],
    assets: [
      { id: 'a1', name: 'Schorder', nilai: 1000000, investmentId: 'h1', owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const o = p.owners[0];
  assert.equal(o.ownerId, 'renov');
  // SEBELUM fix: 2.000.000 (dobel-hitung, 1x dari holding + 1x dari aset tertaut).
  assert.equal(o.allocatedPrincipal, 1000000);
  assert.equal(o.currentValue, 1000000);
  assert.equal(o.holdings.length, 1);
});

test('build(): aset TIDAK tertaut (investmentId kosong) dgn nama sama tapi instrumen BEDA tetap dihitung terpisah (0 regresi kasus normal)', () => {
  const D = {
    investments: [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
    ],
    assets: [
      { id: 'a1', name: 'Tanah Kavling', nilai: 500000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const o = p.owners[0];
  // 100*(9000-8000) cost basis dari holding (800000) + 500000 dari aset lepas.
  assert.equal(o.allocatedPrincipal, 800000 + 500000);
  assert.equal(o.holdings.length, 2);
});

test('build(): aset tertaut ke holding ORPHAN (investmentId menunjuk holding yg sudah dihapus) tetap dikecualikan (konsisten dgn Aset.totalValue(), unconditional pada investmentId terisi)', () => {
  const D = {
    investments: [],
    assets: [
      { id: 'a1', name: 'Schorder', nilai: 1000000, investmentId: 'holding-yang-sudah-dihapus', owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 0);
});

test('allocatedExcluding(): aset tertaut juga dikecualikan (fix di _assetSplits() otomatis ikut ke caller ke-2 ini, 0 logic ganda)', () => {
  const D = {
    investments: [],
    assets: [
      { id: 'a1', name: 'Schorder', nilai: 1000000, investmentId: 'h1', owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const total = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('renov', null);
  assert.equal(total, 0);
});
