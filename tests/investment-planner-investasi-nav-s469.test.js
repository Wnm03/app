'use strict';
// tests/investment-planner-investasi-nav-s469.test.js — Sesi 469: menutup
// celah navigasi yang dicatat REKOMENDASI-SESI-467-FASE2-TRANSAKSI.md §3
// ("kartu Investment Planner lama perlu entry navigasi baru terpisah dari
// InvestmentListUI"). Investment Planner (`InvestmentPlannerPresenter`,
// baca D.assets via `Aset.investmentPerformance()`) & tab "💹 Investasi"
// (`InvestmentListUI`, D.investments via `Investment.*`, Sesi 466-468/
// BUG-INV-001) adalah 2 fitur beda sumber data — sebelumnya tidak ada
// jalur navigasi dari yang pertama ke yang kedua sama sekali.
//
// Perubahan (0 kartu baru, 0 perubahan behavior kartu lain — lihat
// PATCH-README.md Sesi 469):
//   1. `ASET_TAB_IDX` (dashboard-hub.js) — ditambah `investasi:4` (sudah
//      JALAN sebelumnya lewat fallback setAsetTab(), test ini memverifikasi
//      map-nya sekarang eksplisit lengkap, bukan cuma fallback).
//   2. `InvestmentPlannerPresenter._overviewCard()` — KHUSUS saat
//      `holdingsCount===0`, onClick sekarang mengarah ke
//      `INVESTPLANNER_NAV_TARGETS.investasiTab` (bukan lagi `self`), sub
//      text diarahkan ke tab yang bisa dipakai mencatat holding beneran.
//      Saat `holdingsCount>0`, TETAP `self` (0 regresi — lihat
//      tests/finance-nav-consistency-s254b.test.js baris 95-111 yang
//      pakai holdingsCount:2, tetap pass tanpa modifikasi).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(
    ['modules/finance/investment-planner-presenter.js'],
    { escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0) },
    ['InvestmentPlannerPresenter', 'INVESTPLANNER_NAV_TARGETS'],
  );
}

test('INVESTPLANNER_NAV_TARGETS.investasiTab — target baru terpisah dari .self, arah ke #asetTab-investasi', () => {
  const ctx = makeCtx();
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.INVESTPLANNER_NAV_TARGETS.investasiTab)),
    { page: 'aset', tab: 'investasi', goTo: 'asetTab-investasi' },
  );
  // .self TIDAK berubah (0 regresi S254B).
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.INVESTPLANNER_NAV_TARGETS.self)),
    { page: 'keuangan', tab: 'laporan', goTo: 'investPlannerWrap' },
  );
});

test('_overviewCard() — holdingsCount:0 -> onClick ke investasiTab (BUKAN self), sub text arahkan ke tab Investasi', () => {
  const ctx = makeCtx();
  const c = ctx.InvestmentPlannerPresenter._overviewCard({ ok: true, holdingsCount: 0 });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'aset');
  assert.equal(c.onClick.args[0].tab, 'investasi');
  assert.equal(c.onClick.args[0].goTo, 'asetTab-investasi');
  assert.match(c.sub, /💹 Investasi/);
});

test('_overviewCard() — holdingsCount>0 -> onClick TETAP ke self (0 regresi perilaku lama)', () => {
  const ctx = makeCtx();
  const c = ctx.InvestmentPlannerPresenter._overviewCard({ ok: true, holdingsCount: 2, totalValue: 1000, roiPct: 5, totalGainLoss: 50 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(c.onClick.args[0])),
    { page: 'keuangan', tab: 'laporan', goTo: 'investPlannerWrap' },
  );
});

test('_overviewCard() — !p.ok -> onClick TETAP ke self (0 regresi jalur error)', () => {
  const ctx = makeCtx();
  const c = ctx.InvestmentPlannerPresenter._overviewCard({ ok: false, reason: 'Aset belum dimuat' });
  assert.deepEqual(
    JSON.parse(JSON.stringify(c.onClick.args[0])),
    { page: 'keuangan', tab: 'laporan', goTo: 'investPlannerWrap' },
  );
});

test('ASET_TAB_IDX (dashboard-hub.js) — punya entry investasi:4 (eksplisit, tidak cuma fallback)', () => {
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub.js'], {}, ['ASET_TAB_IDX']);
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.ASET_TAB_IDX)),
    { ringkasan: 0, buku: 1, analisis: 2, manajemen: 3, investasi: 4 },
  );
});
