'use strict';
// tests/investment-planner-gap-fix.test.js — Sesi 161, gap fix Investment
// Planner. Sebelum sesi ini, InvestmentPlannerAPI membaca `Investment`/
// `D.investments` (modules/asset/investasi.js) yang TIDAK PERNAH punya UI
// penulis data (Investment.addHolding() tidak pernah dipanggil dari mana
// pun) -- jadi Investment Planner selalu kosong berapa pun data yang user
// isi di 📋 Buku Aset. Sesi ini merewire InvestmentPlannerAPI supaya baca
// `Aset.investmentPerformance()` (modules/asset/aset.js, diekstrak dari
// Aset.renderInvestasi() -- 0 rumus baru) -- sumber data yang benar-benar
// terisi lewat UI Buku Aset yang sudah ada.
//
// Cakupan test:
//   1. Aset.investmentPerformance() -- ekstraksi murni dari renderInvestasi(),
//      hasil harus identik dgn formula lama (ROI/gain/yield/best/worst).
//   2. InvestmentPlannerAPI -- portfolioOverview()/assetAllocation()/
//      watchlistAlerts()/investmentRecommendation()/summary() membaca dari
//      Aset (via stub), BUKAN dari Investment/D.investments lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeAset(D) {
  const ctx = loadSource(['modules/asset/aset.js'], {
    D,
    todayStr: () => '2026-07-23',
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
  return ctx.Aset;
}

function makePlannerAPI(Aset, extra = {}) {
  const ctx = loadSource(['modules/finance/investment-planner-api.js'], {
    Aset,
    ...extra,
  }, ['InvestmentPlannerAPI']);
  return ctx.InvestmentPlannerAPI;
}

test('Aset.investmentPerformance() kosong kalau tidak ada aset dengan data modal', () => {
  const Aset = makeAset({ assets: [{ id: 1, name: 'Tanah', jenis: 'Tanah', nilai: 5000000 }] });
  const p = Aset.investmentPerformance();
  assert.equal(p.holdingsCount, 0);
  assert.equal(p.totalModal, 0);
  assert.equal(p.tracked.length, 0);
});

test('Aset.investmentPerformance() menghitung ROI/gain dari modalInvestasi & hargaBeli×jumlahUnit', () => {
  const D = {
    assets: [
      { id: 1, name: 'Emas ANTAM', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000, tanggal: '2025-07-23' },
      { id: 2, name: 'Reksadana X', jenis: 'Reksadana', nilai: 900000, hargaBeli: 10000, jumlahUnit: 100, tanggal: '2026-01-01' },
      { id: 3, name: 'Tanah tanpa modal', jenis: 'Tanah', nilai: 5000000 },
    ],
  };
  const Aset = makeAset(D);
  const p = Aset.investmentPerformance();
  assert.equal(p.holdingsCount, 2);
  assert.equal(p.totalModal, 2000000);
  assert.equal(p.totalNilai, 2100000);
  assert.equal(p.gain, 100000);
  assert.equal(p.roiPct, 5);
  assert.equal(p.best.name, 'Emas ANTAM');
  assert.equal(p.worst.name, 'Reksadana X');
});

test('InvestmentPlannerAPI.portfolioOverview() sekarang membaca Aset.investmentPerformance(), bukan Investment', () => {
  const D = {
    assets: [
      { id: 1, name: 'Emas ANTAM', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000, tanggal: '2025-07-23' },
    ],
  };
  const Aset = makeAset(D);
  // `Investment` SENGAJA TIDAK di-inject sama sekali -- kalau API ini masih
  // mencoba membaca `Investment` di suatu tempat, ini akan meledak /
  // mengembalikan hasil kosong (membuktikan gap sudah tertutup).
  const api = makePlannerAPI(Aset);
  const p = api.portfolioOverview();
  assert.equal(p.ok, true);
  assert.equal(p.holdingsCount, 1);
  assert.equal(p.totalValue, 1200000);
  assert.equal(p.totalCost, 1000000);
  assert.equal(p.totalGainLoss, 200000);
});

test('InvestmentPlannerAPI.assetAllocation() mengelompokkan by jenis aset (field Buku Aset)', () => {
  const D = {
    assets: [
      { id: 1, name: 'Emas ANTAM', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 2, name: 'Reksadana X', jenis: 'Reksadana', nilai: 900000, modalInvestasi: 1000000 },
    ],
  };
  const Aset = makeAset(D);
  const api = makePlannerAPI(Aset);
  const a = api.assetAllocation();
  assert.equal(a.ok, true);
  assert.equal(a.allocation.length, 2);
  assert.equal(a.topAllocation.type, 'Emas/Logam Mulia');
});

test('InvestmentPlannerAPI.watchlistAlerts() selalu ok:true count:0 (Buku Aset tidak punya watchlist)', () => {
  const Aset = makeAset({ assets: [] });
  const api = makePlannerAPI(Aset);
  const w = api.watchlistAlerts();
  assert.equal(w.ok, true);
  assert.equal(w.count, 0);
  assert.equal(w.alerts.length, 0);
});

test('InvestmentPlannerAPI.portfolioOverview() ok:false kalau Aset belum dimuat (tidak diam-diam pura-pura kosong)', () => {
  const api = makePlannerAPI(undefined);
  const p = api.portfolioOverview();
  assert.equal(p.ok, false);
});

test('InvestmentPlannerAPI.summary() end-to-end: data yang diisi di Buku Aset sekarang benar-benar muncul', () => {
  const D = {
    assets: [
      { id: 1, name: 'Emas ANTAM', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000, tanggal: '2025-07-23' },
      { id: 2, name: 'Reksadana X', jenis: 'Reksadana', nilai: 900000, hargaBeli: 10000, jumlahUnit: 100, tanggal: '2026-01-01' },
    ],
  };
  const Aset = makeAset(D);
  const api = makePlannerAPI(Aset);
  const s = api.summary();
  assert.equal(s.ok, true);
  assert.equal(s.portfolioOverview.holdingsCount, 2);
  assert.equal(s.assetAllocation.allocation.length, 2);
});
