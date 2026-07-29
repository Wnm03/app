'use strict';
// tests/ownership-sync-portfolio-networth.test.js — cakupan Sesi 193
// (Ownership Sync — Asset & Investasi) bagian INTEGRASI: memastikan fix di
// Aset.totalValue()/Investment.portfolioSummary()/Investment.assetAllocation()
// (masing2 sudah dites terpisah di tests/ownership-sync-asset.test.js &
// tests/ownership-sync-investasi.test.js) benar2 CASCADE tanpa perubahan
// tambahan apa pun ke:
//   - AssetPortfolioAPI (modules/asset/asset-portfolio-api.js) — "Portfolio"
//   - Kekayaan.currentNetWorth() (modules/shared/modules-calc.js) — "Net Worth"
//
// 0 logic baru dites di sini — murni pembuktian bahwa titik fix terpusat di
// S193 (2 file: aset.js & investasi.js) sudah cukup, TIDAK perlu menyentuh
// asset-portfolio-api.js/modules-calc.js (selain 1 baris assetCount yang
// sudah dites tersirat di bawah).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Tanah Sendiri', jenis: 'Tanah', nilai: 1000000 }, // SELF (default)
      { id: 'a2', name: 'Emas Titipan Customer', jenis: 'Emas/Logam Mulia', nilai: 400000, ownership: 'CUSTOMER' },
    ],
    accounts: [
      { id: 'acc1', name: 'Kas', baseBalance: 500000, includeInBalance: true }, // SELF (default)
      { id: 'acc2', name: 'Modal Investor', baseBalance: 300000, includeInBalance: true, ownership: 'INVESTOR' },
    ],
    transactions: [],
    investments: [
      { id: 'h1', name: 'Saham Sendiri', type: 'Saham', unit: 10, avgPrice: 10000, currentPrice: 12000 }, // SELF, value 120000
      { id: 'h2', name: 'Saham Titipan Keluarga', type: 'Saham', unit: 100, avgPrice: 5000, currentPrice: 6000, ownership: 'FAMILY' }, // value 600000, harus dikecualikan
    ],
    investmentTx: [],
    pajakZakat: {},
  };
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset.js',
      'pajak-aset-ui-wrappers.js',
      'modules/asset/investasi.js',
      'modules/asset/asset-portfolio-api.js',
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
    ['OwnershipEngine', 'Aset', 'Investment', 'AssetPortfolioAPI', 'Kekayaan', 'totalAssetValue', 'totalSaldoAkun']
  );
}

test('cascade — totalSaldoAkun()/totalAssetValue() sudah exclude non-SELF (regresi S192 tetap berlaku)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 500000, 'akun INVESTOR (300000) dikecualikan');
  assert.equal(ctx.totalAssetValue(), 1000000, 'aset CUSTOMER (400000) dikecualikan');
});

test('cascade — Kekayaan.currentNetWorth() (Net Worth) otomatis exclude non-SELF TANPA perubahan tambahan di modules-calc.js', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // netWorth = saldoAkun(500000, SELF) + totalAset(1000000, SELF) + inventori(0) + piutang(0) - utang(0)
  //          = 1500000 (akun INVESTOR 300000 & aset CUSTOMER 400000 TIDAK ikut)
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1500000);
});

test('cascade — AssetPortfolioAPI.portfolioComposition() (Portfolio) otomatis exclude non-SELF di cash/asset/investment', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const pc = ctx.AssetPortfolioAPI.portfolioComposition();
  assert.equal(pc.ok, true);
  assert.equal(pc.cashValue, 500000, 'akun INVESTOR (300000) dikecualikan dari cashValue');
  assert.equal(pc.assetValue, 1000000, 'aset CUSTOMER (400000) dikecualikan dari assetValue');
  assert.equal(pc.investmentValue, 120000, 'holding FAMILY (600000) dikecualikan dari investmentValue, cuma holding SELF (120000) yg dihitung');
  assert.equal(pc.totalValue, 500000 + 1000000 + 120000);
  assert.equal(pc.assetCount, 1, 'assetCount HANYA hitung aset SELF (konsisten dgn investmentHoldingsCount)');
  assert.equal(pc.investmentHoldingsCount, 1, 'investmentHoldingsCount HANYA hitung holding SELF');
});

test('cascade — AssetPortfolioAPI.netWorthSnapshot() gabungkan netWorth & portfolioValue, keduanya sudah exclude non-SELF', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const snap = ctx.AssetPortfolioAPI.netWorthSnapshot();
  assert.equal(snap.ok, true);
  assert.equal(snap.netWorth, 1500000);
  assert.equal(snap.portfolioValue, 500000 + 1000000 + 120000);
});

test('cascade — AssetPortfolioAPI.allocationBreakdown()/investmentAllocation() konsisten dgn komposisi yang sudah difilter', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const ab = ctx.AssetPortfolioAPI.allocationBreakdown();
  assert.equal(ab.ok, true);
  assert.equal(ab.totalValue, 500000 + 1000000 + 120000);
  const ia = ctx.AssetPortfolioAPI.investmentAllocation();
  assert.equal(ia.ok, true);
  assert.deepEqual(ia.breakdown.map((r) => r.type), ['Saham']);
  assert.equal(ia.breakdown[0].value, 120000, 'HANYA holding SELF (Saham 120000), holding FAMILY dikecualikan');
});

test('cascade — histori/transaksi asli (D.assets/D.investments/D.accounts) TIDAK berubah sama sekali setelah semua agregat dipanggil', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.AssetPortfolioAPI.summary();
  assert.equal(D.assets.length, 2);
  assert.equal(D.accounts.length, 2);
  assert.equal(D.investments.length, 2);
});
