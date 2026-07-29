'use strict';
// tests/investment-ownership-sync-s261.test.js — cakupan Sesi 261 (Investment
// Ownership Sync). Audit modul Investasi menemukan 2 titik yang BELUM
// mengikuti OwnershipEngine.resolve() secara konsisten (beda dari
// Investment.portfolioSummary()/assetAllocation() di investasi.js yang
// SUDAH SELF-only sejak S193 — lihat tests/ownership-sync-investasi.test.js):
//
//   1. Aset.investmentPerformance() (modules/asset/aset.js) — SEBELUM sesi
//      ini membaca D.assets MENTAH tanpa filter ownership, padahal fungsi
//      ini adalah SATU-SATUNYA sumber data InvestmentPlannerAPI
//      (modules/finance/investment-planner-api.js, Sesi 161) — jadi
//      portfolioOverview()/assetAllocation()/investmentRecommendation()
//      Investment Planner ikut menghitung aset ber-ownership
//      INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY sebagai milik sendiri.
//   2. InvestAI._investmentAssets()/_checkPortofolio() (modules/asset/
//      invest-ai-widget.js, widget "🤖 Rekomendasi AI" di kartu Alokasi
//      Aset) — _investmentAssets() membaca D.assets.filter(zakatable) tanpa
//      filter ownership (dipakai _checkDiversifikasi()/_checkVsPreset()),
//      dan _checkPortofolio() memakai Investment.getHoldings().length
//      MENTAH sbg gate (bukan holdingsCount yang sudah difilter).
//
// Fix di kedua titik: TAMBAH 1 filter isAssetOwnershipSelf()/pakai
// summary.holdingsCount yang SUDAH difilter — 0 rumus baru, pola SAMA
// PERSIS Aset.totalValue()/AssetInsight.compute() (S193) &
// Investment.portfolioSummary() (S193).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeAsetCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    {
      D,
      todayStr: () => '2026-07-26',
      fmtFull: (n) => 'Rp' + Math.round(n || 0),
      fmtFullSigned: (n) => (n >= 0 ? '+' : '') + 'Rp' + Math.round(n || 0),
      escapeHtml: (s) => s,
      uid: () => Math.random(),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      parsePzNum: (s) => Number(s),
      parseDecStr: (s) => Number(s),
      toast: () => {},
    },
    ['Aset', 'OwnershipEngine', 'isAssetOwnershipSelf'],
  );
}

function assetsMix() {
  return [
    // SELF (default, tanpa field ownership): modal 1jt, nilai 1.5jt
    { id: 'a1', name: 'Emas Sendiri', jenis: 'Emas', nilai: 1500000, modalInvestasi: 1000000, tanggal: '2025-07-26', zakatable: true },
    // SELF eksplisit: modal 900rb (10000x90), nilai 900rb (hargaBeli x jumlahUnit)
    { id: 'a2', name: 'Reksadana Sendiri', jenis: 'Reksadana', nilai: 1000000, hargaBeli: 9000, jumlahUnit: 100, tanggal: '2025-07-26', ownership: 'SELF', zakatable: true },
    // INVESTOR — harus dikecualikan
    { id: 'a3', name: 'Saham Modal Investor', jenis: 'Saham', nilai: 8000000, modalInvestasi: 5000000, tanggal: '2025-07-26', ownership: 'INVESTOR', zakatable: true },
    // CUSTOMER (lowercase) — harus dikecualikan
    { id: 'a4', name: 'Emas Titipan Customer', jenis: 'Emas', nilai: 2000000, modalInvestasi: 1800000, tanggal: '2025-07-26', ownership: 'customer', zakatable: true },
  ];
}

// --- (1) Aset.investmentPerformance() -------------------------------------

test('S261: Aset.investmentPerformance() — HANYA aset SELF (default/eksplisit) yang dihitung ke totalModal/totalNilai/holdingsCount', () => {
  const D = { assets: assetsMix() };
  const { Aset } = makeAsetCtx(D);
  const perf = Aset.investmentPerformance();
  // a1: modal 1jt, nilai 1.5jt | a2: modal 900rb, nilai 1jt
  // a3/a4 (non-SELF) dikecualikan.
  assert.equal(perf.holdingsCount, 2);
  assert.equal(perf.totalModal, 1900000);
  assert.equal(perf.totalNilai, 2500000);
  assert.equal(perf.gain, 600000);
});

test('S261: Aset.investmentPerformance() — tracked[] & best/worst hanya dari aset SELF, aset non-SELF tidak nyasar', () => {
  const D = { assets: assetsMix() };
  const { Aset } = makeAsetCtx(D);
  const perf = Aset.investmentPerformance();
  const names = perf.tracked.map((x) => x.a.name).sort();
  assert.deepEqual(names, ['Emas Sendiri', 'Reksadana Sendiri']);
  assert.notEqual(perf.best && perf.best.name, 'Saham Modal Investor');
  assert.notEqual(perf.worst && perf.worst.name, 'Emas Titipan Customer');
});

test('S261: Aset.investmentPerformance() — kalau semua aset ber-modal non-SELF, holdingsCount 0 (bukan salah hitung)', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Saham Investor', jenis: 'Saham', nilai: 8000000, modalInvestasi: 5000000, ownership: 'INVESTOR' },
    ],
  };
  const { Aset } = makeAsetCtx(D);
  const perf = Aset.investmentPerformance();
  assert.equal(perf.holdingsCount, 0);
  assert.equal(perf.totalModal, 0);
  assert.equal(perf.tracked.length, 0);
});

test('S261: Aset.investmentPerformance() — OwnershipEngine tidak dimuat -> fallback hitung semua (regresi lama tetap jalan)', () => {
  const D = { assets: assetsMix() };
  const ctx = loadSource(['modules/asset/aset.js'], {
    D,
    todayStr: () => '2026-07-26',
    fmtFull: (n) => 'Rp' + Math.round(n || 0),
    fmtFullSigned: (n) => (n >= 0 ? '+' : '') + 'Rp' + Math.round(n || 0),
    escapeHtml: (s) => s,
    uid: () => Math.random(),
    save: () => {},
    sameId: (a, b) => String(a) === String(b),
    parsePzNum: (s) => Number(s),
    parseDecStr: (s) => Number(s),
    toast: () => {},
  }, ['Aset']);
  const perf = ctx.Aset.investmentPerformance();
  assert.equal(perf.holdingsCount, 4, 'tanpa OwnershipEngine, semua 4 aset ber-modal tetap dihitung (fallback SELF)');
});

// --- (2) InvestmentPlannerAPI cascade (bukti fix di atas benar-benar naik) -

function makePlannerCtx(D) {
  const asetCtx = makeAsetCtx(D);
  const plannerCtx = loadSource(['modules/finance/investment-planner-api.js'], { Aset: asetCtx.Aset }, ['InvestmentPlannerAPI']);
  return plannerCtx.InvestmentPlannerAPI;
}

test('S261: InvestmentPlannerAPI.portfolioOverview() — cascade, aset non-SELF (INVESTOR/CUSTOMER) TIDAK ikut ke totalValue/totalCost', () => {
  const D = { assets: assetsMix() };
  const api = makePlannerCtx(D);
  const p = api.portfolioOverview();
  assert.equal(p.ok, true);
  assert.equal(p.holdingsCount, 2);
  assert.equal(p.totalValue, 2500000);
  assert.equal(p.totalCost, 1900000);
});

test('S261: InvestmentPlannerAPI.assetAllocation() — cascade, breakdown per jenis hanya dari aset SELF', () => {
  const D = { assets: assetsMix() };
  const api = makePlannerCtx(D);
  const a = api.assetAllocation();
  assert.equal(a.ok, true);
  const types = a.allocation.map((r) => r.type).sort();
  assert.deepEqual(types, ['Emas', 'Reksadana']);
  const emas = a.allocation.find((r) => r.type === 'Emas');
  assert.equal(emas.value, 1500000, 'Emas SELF cuma a1 (1.5jt), a4 (CUSTOMER, 2jt) dikecualikan');
});

// --- (3) InvestAI (widget Rekomendasi AI di kartu Alokasi Aset) -----------

function makeInvestAiCtx(D, extra = {}) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js', 'modules/asset/investasi.js', 'modules/asset/invest-ai-widget.js'],
    {
      D,
      fmt: (n) => 'Rp' + Math.round(n || 0),
      escapeHtml: (s) => s,
      todayStr: () => '2026-07-26',
      fmtFull: (n) => 'Rp' + Math.round(n || 0),
      fmtFullSigned: (n) => (n >= 0 ? '+' : '') + 'Rp' + Math.round(n || 0),
      uid: () => Math.random(),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      parsePzNum: (s) => Number(s),
      parseDecStr: (s) => Number(s),
      toast: () => {},
      ...extra,
    },
    ['InvestAI', 'Investment'],
  );
}

test('S261: InvestAI._investmentAssets() — HANYA aset zakatable & SELF yang dihitung (non-SELF dikecualikan)', () => {
  const D = { assets: assetsMix(), targets: [] };
  const { InvestAI } = makeInvestAiCtx(D);
  const list = InvestAI._investmentAssets().map((a) => a.id).sort();
  assert.deepEqual(list, ['a1', 'a2']);
});

test('S261: InvestAI.generateRecommendations() — diversifikasi TIDAK terpengaruh aset ber-ownership non-SELF yang mendominasi', () => {
  // Aset SELF sengaja dibuat SEIMBANG (50/50 Emas vs Reksadana, tidak ada
  // yang dominan >=60%). Aset non-SELF (INVESTOR) sengaja dibuat BESAR
  // (8jt) di jenis "Saham" — kalau filter ownership TIDAK jalan, "Saham"
  // akan mendominasi >=60% dari total gabungan & memicu rekomendasi
  // diversifikasi yang SALAH (bukan punya user). Dengan filter S261, aset
  // INVESTOR itu dikecualikan -> tidak ada jenis yang dominan >=60%.
  const D = {
    assets: [
      { id: 'a1', name: 'Emas Sendiri', jenis: 'Emas', nilai: 1000000, zakatable: true },
      { id: 'a2', name: 'Reksadana Sendiri', jenis: 'Reksadana', nilai: 1000000, zakatable: true },
      { id: 'a3', name: 'Saham Modal Investor', jenis: 'Saham', nilai: 8000000, ownership: 'INVESTOR', zakatable: true },
    ],
    targets: [{ isDanaDarurat: true, amount: 0, saved: 0 }],
  };
  const { InvestAI } = makeInvestAiCtx(D);
  const recs = InvestAI.generateRecommendations();
  const diversifikasi = recs.find((r) => r.icon === '⚖️');
  assert.equal(diversifikasi, undefined, 'tidak boleh ada flag diversifikasi krn dominasi datang dari aset INVESTOR (a3), bukan milik sendiri');
});

test('S261: InvestAI._checkPortofolio() — holding SEMUA non-SELF -> TIDAK ada rekomendasi ROI palsu (gate pakai holdingsCount terfilter)', () => {
  const D = {
    assets: [],
    targets: [],
    investments: [
      { id: 'h1', name: 'Saham Investor', type: 'Saham', unit: 100, avgPrice: 10000, currentPrice: 5000, ownership: 'INVESTOR' },
    ],
    investmentTx: [],
  };
  const { InvestAI } = makeInvestAiCtx(D);
  const recs = InvestAI.generateRecommendations();
  const roiWarning = recs.find((r) => r.icon === '📉');
  assert.equal(roiWarning, undefined, 'holding INVESTOR rugi tidak boleh nongol sbg rekomendasi ROI milik sendiri');
});

test('S261: InvestAI._checkPortofolio() — holding SELF rugi TETAP memicu rekomendasi ROI (regresi tidak rusak)', () => {
  const D = {
    assets: [],
    targets: [],
    investments: [
      { id: 'h1', name: 'Saham Sendiri', type: 'Saham', unit: 100, avgPrice: 10000, currentPrice: 5000 },
    ],
    investmentTx: [],
  };
  const { InvestAI } = makeInvestAiCtx(D);
  const recs = InvestAI.generateRecommendations();
  const roiWarning = recs.find((r) => r.icon === '📉');
  assert.notEqual(roiWarning, undefined, 'holding SELF rugi tetap harus memicu rekomendasi ROI seperti sebelumnya');
});
