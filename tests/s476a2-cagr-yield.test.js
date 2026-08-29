'use strict';
// tests/s476a2-cagr-yield.test.js — Regression test sesi s476a2
// (docs/s476-PLAN-migrate-investasi-to-holdings.md, bagian "AUDIT ROI/CAGR
// lama vs baru"): sebelum sesi ini, migrasi D.assets -> D.investments
// TIDAK membawa a.tanggal sama sekali, jadi CAGR/Yield holding hasil
// migrasi selalu null (fitur hilang, bukan cuma beda formula). Sesi ini
// menambah h.purchaseDate (aditif) + Investment.holdingYieldPct()/
// portfolioSummary().yieldPct, replikasi PERSIS formula lama
// (Aset.investmentPerformance() di aset.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    assets: [
      // ETH: modalInvestasi (lot tunggal), beli 2025-01-01, nilai naik dari 8jt -> 10jt
      { id: 'a-eth', name: 'ETH', jenis: 'Kripto', modalInvestasi: 8000000, nilai: 10000000, tanggal: '2025-01-01', zakatable: false },
      // Majoris: modalInvestasi, beli 2025-06-01, tidak dites CAGR (dipakai utk cek non-tracked digabung)
      { id: 'a-majoris', name: 'Majoris', jenis: 'Deposito/Investasi', modalInvestasi: 20000000, nilai: 22000000, tanggal: '2025-06-01', zakatable: true },
    ],
    investments: [],
    investmentTx: [],
    debts: [],
    transactions: [],
    accounts: [],
    piutang: [],
    inventoriBisnis: [],
    finansialFreedom: {},
    pajakZakat: { hargaEmasPerGram: 1200000, utangJT: 0 },
  };
}

function todayStrImpl() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}

function makeCtx(D, extra = {}) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, uid: () => 'uid_' + Math.random().toString(36).slice(2), save: () => {}, todayStr: todayStrImpl, ...extra },
    ['Aset', 'Investment', 'migrateAssetInvestmentsToHoldings', 'MultiOwnerEngine']
  );
}

test('migrateAssetInvestmentsToHoldings() membawa a.tanggal sbg h.purchaseDate', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.migrateAssetInvestmentsToHoldings();
  const ethId = D.assets.find((a) => a.id === 'a-eth')._migratedToInvestmentId;
  const h = D.investments.find((x) => x.id === ethId);
  assert.equal(h.purchaseDate, '2025-01-01');
});

test('Investment.holdingYieldPct() null kalau purchaseDate belum diisi (holding manual baru)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 100, avgPrice: 9000, currentPrice: 9500 });
  assert.equal(ctx.Investment.holdingYieldPct(h), null);
});

test('Investment.holdingYieldPct() pasca-migrasi REPLIKASI PERSIS formula lama Aset.investmentPerformance()', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-01').getTime() });
  const D1 = makeD();
  const ctx1 = makeCtx(D1);
  const oldPerf = ctx1.Aset.investmentPerformance();
  const oldEth = oldPerf.tracked.find((x) => x.a.id === 'a-eth');
  // formula lama: ((nilai/buku)^(365/hari)-1)*100
  const days = (new Date('2026-01-01').getTime() - new Date('2025-01-01').getTime()) / 86400000;
  const expectedCagr = (Math.pow(oldEth.a.nilai / oldEth.buku, 365 / days) - 1) * 100;

  const D2 = makeD();
  const ctx2 = makeCtx(D2);
  ctx2.migrateAssetInvestmentsToHoldings();
  const ethId = D2.assets.find((a) => a.id === 'a-eth')._migratedToInvestmentId;
  const h = D2.investments.find((x) => x.id === ethId);
  const newCagr = ctx2.Investment.holdingYieldPct(h);

  assert.ok(Math.abs(newCagr - expectedCagr) < 1e-9, `expected ~${expectedCagr}, got ${newCagr}`);
});

test('Investment.portfolioSummary().yieldPct — rata-rata tertimbang cost, null kalau tidak ada holding dgn purchaseDate valid', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // holding tanpa purchaseDate -> yieldPct portofolio null (belum ada data valid)
  ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 100, avgPrice: 9000, currentPrice: 9500 });
  const s1 = ctx.Investment.portfolioSummary();
  assert.equal(s1.yieldPct, null);

  // setelah migrasi (ETH & Majoris punya purchaseDate), yieldPct terisi & finite
  ctx.migrateAssetInvestmentsToHoldings();
  const s2 = ctx.Investment.portfolioSummary();
  assert.ok(typeof s2.yieldPct === 'number' && isFinite(s2.yieldPct));
});
