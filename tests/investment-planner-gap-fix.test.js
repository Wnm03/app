'use strict';
// tests/investment-planner-gap-fix.test.js — awalnya Sesi 161 (gap fix:
// InvestmentPlannerAPI direwire dari `Investment`/`D.investments` yang
// waktu itu SELALU kosong, ke `Aset.investmentPerformance()`/D.assets,
// sumber data yang waktu itu benar-benar terisi lewat UI Buku Aset).
//
// SESI s476b — REWIRE KEMBALI (docs/s476-PLAN-migrate-investasi-to-
// holdings.md, bagian "s476b — Investment Planner"): premis Sesi 161
// ("Investment.addHolding() tidak pernah dipanggil dari UI mana pun")
// SUDAH TIDAK BERLAKU sejak s476a — `D.investments` sekarang jadi SSOT
// (migrasi 1x-jalan dari D.assets + tab "💹 Investasi" adalah UI penulis
// data yang nyata). File test ini di-update MENGIKUTI rewire itu — SEKARANG
// menguji bahwa InvestmentPlannerAPI membaca `Investment.*`
// (modules/asset/investasi.js), BUKAN lagi `Aset.investmentPerformance()`.
//
// Cakupan test:
//   1. InvestmentPlannerAPI.portfolioOverview()/assetAllocation()/
//      watchlistAlerts()/investmentRecommendation()/summary() membaca dari
//      `Investment` (via stub/instance asli), BUKAN dari `Aset` lagi.
//   2. watchlistAlerts() sekarang benar-benar meneruskan
//      `Investment.watchlistAlerts()` (bukan lagi selalu count:0).
//   3. Guard: `Investment` belum dimuat -> ok:false (tidak diam-diam
//      pura-pura kosong).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeInvestment(D, extra = {}) {
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'uid_' + Math.random().toString(36).slice(2), save: () => {}, ...extra },
    ['Investment'],
  );
  return ctx.Investment;
}

function makePlannerAPI(Investment, extra = {}) {
  const ctx = loadSource(['modules/finance/investment-planner-api.js'], {
    Investment,
    ...extra,
  }, ['InvestmentPlannerAPI']);
  return ctx.InvestmentPlannerAPI;
}

test('InvestmentPlannerAPI.portfolioOverview() membaca Investment.portfolioSummary(), bukan Aset lagi', () => {
  const D = { investments: [] };
  const Investment = makeInvestment(D);
  Investment.addHolding({ name: 'Emas ANTAM', type: 'Emas', unit: 1, avgPrice: 1000000, currentPrice: 1200000 });
  // `Aset` SENGAJA TIDAK di-inject sama sekali -- kalau API ini masih
  // mencoba membaca `Aset` di suatu tempat, ini akan meledak /
  // mengembalikan hasil kosong (membuktikan rewire s476b sudah tuntas).
  const api = makePlannerAPI(Investment);
  const p = api.portfolioOverview();
  assert.equal(p.ok, true);
  assert.equal(p.holdingsCount, 1);
  assert.equal(p.totalValue, 1200000);
  assert.equal(p.totalCost, 1000000);
  assert.equal(p.totalGainLoss, 200000);
});

test('InvestmentPlannerAPI.assetAllocation() mengelompokkan by h.type (Investment.assetAllocation() apa adanya)', () => {
  const D = { investments: [] };
  const Investment = makeInvestment(D);
  Investment.addHolding({ name: 'Emas ANTAM', type: 'Emas', unit: 1, avgPrice: 1000000, currentPrice: 1200000 });
  Investment.addHolding({ name: 'Reksadana X', type: 'Reksa Dana', unit: 1, avgPrice: 1000000, currentPrice: 900000 });
  const api = makePlannerAPI(Investment);
  const a = api.assetAllocation();
  assert.equal(a.ok, true);
  assert.equal(a.allocation.length, 2);
  assert.equal(a.topAllocation.type, 'Emas');
});

test('InvestmentPlannerAPI.watchlistAlerts() sekarang meneruskan Investment.watchlistAlerts() apa adanya (bukan lagi selalu count:0)', () => {
  const D = { investments: [], investmentWatchlist: [] };
  const Investment = makeInvestment(D);
  Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4500, targetPrice: 5000 });
  Investment.addWatch({ name: 'TLKM', type: 'Saham', lastPrice: 3800, targetPrice: 3500 }); // belum nyentuh target
  const api = makePlannerAPI(Investment);
  const w = api.watchlistAlerts();
  assert.equal(w.ok, true);
  assert.equal(w.count, 1);
  assert.equal(w.alerts[0].name, 'BBRI');
});

test('InvestmentPlannerAPI.watchlistAlerts() ok:true count:0 kalau watchlist kosong', () => {
  const Investment = makeInvestment({ investments: [], investmentWatchlist: [] });
  const api = makePlannerAPI(Investment);
  const w = api.watchlistAlerts();
  assert.equal(w.ok, true);
  assert.equal(w.count, 0);
  assert.equal(w.alerts.length, 0);
});

test('InvestmentPlannerAPI.portfolioOverview() ok:false kalau Investment belum dimuat (tidak diam-diam pura-pura kosong)', () => {
  const api = makePlannerAPI(undefined);
  const p = api.portfolioOverview();
  assert.equal(p.ok, false);
});

test('InvestmentPlannerAPI.summary() end-to-end: holding yang ditambah lewat Investment.addHolding() (tab Investasi) benar-benar muncul', () => {
  const D = { investments: [] };
  const Investment = makeInvestment(D);
  Investment.addHolding({ name: 'Emas ANTAM', type: 'Emas', unit: 1, avgPrice: 1000000, currentPrice: 1200000 });
  Investment.addHolding({ name: 'Reksadana X', type: 'Reksa Dana', unit: 100, avgPrice: 10000, currentPrice: 9000 });
  const api = makePlannerAPI(Investment);
  const s = api.summary();
  assert.equal(s.ok, true);
  assert.equal(s.portfolioOverview.holdingsCount, 2);
  assert.equal(s.assetAllocation.allocation.length, 2);
});

test('InvestmentPlannerAPI.investmentRecommendation() holdingsCount:0 mengarahkan ke tab 💹 Investasi (bukan lagi Buku Aset)', () => {
  const Investment = makeInvestment({ investments: [] });
  const api = makePlannerAPI(Investment);
  const rec = api.investmentRecommendation();
  const r = rec.find((x) => x.code === 'invest_no_holdings');
  assert.ok(r, 'harus ada rekomendasi invest_no_holdings');
  assert.match(r.message, /💹 Investasi/);
});
