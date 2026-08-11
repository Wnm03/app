'use strict';
// tests/investment-dead-read-verification-s468.test.js — Fase 4 dari
// BUG-INV-001 Opsi 3 (lihat docs/BUG_REGISTRY.md §BUG-INV-001, "Update Sesi
// 468"). Fase 1-3 (Sesi 466-467) sudah membuka jalur tulis nyata ke
// D.investments/D.investmentTx/D.investmentWatchlist lewat
// InvestmentListUI/InvestmentTxUI/InvestmentWatchUI. Fase 4 memverifikasi 4
// dead-read call site yang dicatat di BUG_REGISTRY.md (§Impact.3) SEKARANG
// benar-benar membaca data holding, bukan lagi selalu array kosong.
//
// Pola: dijalankan lewat source ASLI (loadSource(), bukan reimplementasi
// logic) — holding diisi lewat Investment.addHolding()/addTransaction()
// (jalur tulis nyata yang sama dipakai InvestmentListUI/InvestmentTxUI),
// BUKAN ditulis manual ke D.investments, supaya test ini benar-benar
// menyusuri jalur "UI -> Investment.* -> 4 call site" end-to-end.
//
// Tiap grup di bawah punya 2 test: (a) BEFORE — D.investments kosong ->
// call site tetap aman & kosong/nol (baseline dead-read lama, regresi
// guard), (b) AFTER — holding terisi via Investment.* -> call site
// sekarang membaca data itu (bukti fix Fase 4).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// norm() — objek/array hasil sandbox vm punya prototype beda dari realm host
// Node ini (cross-realm), jadi deepEqual harus dibandingkan lewat JSON
// round-trip, bukan langsung — pola sama tests/asset-owners-flow-e2e-392a-
// to-392e.test.js (norm()) & tests/backup-restore-regression-s266.test.js.
function norm(x) { return JSON.parse(JSON.stringify(x)); }

function makeD(extra = {}) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], assets: [], debts: [], accounts: [], vehicles: [], ...extra };
}

const investExtraGlobals = {
  uid: (() => { let n = 0; return () => 'inv_' + (n += 1); })(),
  save: () => {},
};

// ---------- Grup A: DanaKelolaan.sumInvestasi()/listTitipan() ----------
test('DanaKelolaan.sumInvestasi() — kosong sebelum ada holding (baseline dead-read)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/finance/dana-kelolaan.js'], { D, ...investExtraGlobals }, ['Investment', 'DanaKelolaan']);
  assert.equal(ctx.DanaKelolaan.sumInvestasi('SELF'), 0);
  assert.deepEqual(norm(ctx.DanaKelolaan.listTitipan()), []);
});

test('DanaKelolaan.sumInvestasi()/listTitipan() — membaca holding nyata setelah diisi via Investment.addHolding()', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/finance/dana-kelolaan.js'], { D, ...investExtraGlobals }, ['Investment', 'DanaKelolaan']);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 100, avgPrice: 5000, currentPrice: 6000 });
  assert.equal(ctx.DanaKelolaan.sumInvestasi('SELF'), ctx.Investment.holdingValue(h));
  assert.ok(ctx.DanaKelolaan.sumInvestasi('SELF') > 0);

  const titipan = ctx.Investment.addHolding({
    name: 'Reksa Dana Titipan', type: 'Reksa Dana', unit: 10, avgPrice: 10000, currentPrice: 11000,
    fundSource: 'titipan', titipanOwner: 'Budi',
  });
  const list = ctx.DanaKelolaan.listTitipan();
  assert.equal(list.length, 1);
  assert.equal(list[0].owner, 'Budi');
  assert.equal(list[0].source, 'investasi');
  assert.equal(list[0].nominal, ctx.Investment.holdingCost(titipan));
});

// ---------- Grup B: SelfRewardAI._analyzeInvestasi() ----------
test('SelfRewardAI._analyzeInvestasi() — kosong sebelum ada holding (baseline dead-read)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/self-reward/self-reward-ai-widget.js'], { D, ...investExtraGlobals }, ['Investment', 'SelfRewardAI']);
  assert.deepEqual(norm(ctx.SelfRewardAI._analyzeInvestasi()), []);
});

test('SelfRewardAI._analyzeInvestasi() — membaca ROI/alokasi holding nyata setelah diisi', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/self-reward/self-reward-ai-widget.js'], { D, ...investExtraGlobals }, ['Investment', 'SelfRewardAI']);
  // avgPrice > currentPrice -> ROI negatif, harus memicu rekomendasi "minus".
  ctx.Investment.addHolding({ name: 'GOTO', type: 'Saham', unit: 1000, avgPrice: 100, currentPrice: 50 });
  const out = ctx.SelfRewardAI._analyzeInvestasi();
  assert.ok(out.length > 0, 'harus menghasilkan minimal 1 rekomendasi saat holding minus');
  assert.ok(out.some((r) => /minus/i.test(r.text)));
});

// ---------- Grup C: InvestAI._checkPortofolio() ----------
test('InvestAI._checkPortofolio() — kosong sebelum ada holding (baseline dead-read, gate holdingsCount)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/asset/invest-ai-widget.js'], { D, ...investExtraGlobals }, ['Investment', 'InvestAI']);
  assert.deepEqual(norm(ctx.InvestAI._checkPortofolio()), []);
});

test('InvestAI._checkPortofolio() — membaca portfolioSummary() nyata setelah holding diisi', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js', 'modules/asset/invest-ai-widget.js'], { D, ...investExtraGlobals }, ['Investment', 'InvestAI']);
  ctx.Investment.addHolding({ name: 'ANTM', type: 'Saham', unit: 500, avgPrice: 2000, currentPrice: 1500 });
  const summary = ctx.Investment.portfolioSummary();
  assert.ok(summary.holdingsCount > 0);
  const out = ctx.InvestAI._checkPortofolio();
  assert.ok(out.length > 0, 'harus menghasilkan minimal 1 rekomendasi saat portofolio minus');
});

// ---------- Grup D: OwnershipSettingsPresenter._collect()/summary() ----------
test('OwnershipSettingsPresenter — D.investments ikut ter-collect & terhitung setelah holding diisi', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/investasi.js', 'modules/shared/ownership-settings-presenter.js'],
    { D, ...investExtraGlobals },
    ['Investment', 'OwnershipSettingsPresenter', 'OwnershipEngine'],
  );
  assert.equal(ctx.OwnershipSettingsPresenter._collect().length, 0);
  ctx.Investment.addHolding({ name: 'Emas Antam', type: 'Emas', unit: 5, avgPrice: 900000, currentPrice: 950000 });
  const collected = ctx.OwnershipSettingsPresenter._collect();
  assert.equal(collected.length, 1);
  const summary = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(summary.ok, true);
  assert.equal(summary.counts.SELF, 1);
});

// ---------- Grup E: user-finance-adapter._eieInvestmentBreakdown() ----------
test('_eieInvestmentBreakdown() (user-finance-adapter.js) — kosong sebelum ada holding (baseline dead-read)', () => {
  const D = makeD();
  const ctx = loadSource(['economic-intelligence/adapters/user-finance-adapter.js'], { D });
  const breakdown = norm(ctx._eieInvestmentBreakdown());
  assert.deepEqual(breakdown, { saham: 0, reksadana: 0, emas: 0, crypto: 0, obligasi: 0, deposito: 0, lainnya: 0 });
});

test('_eieInvestmentBreakdown() (user-finance-adapter.js) — membaca holding nyata (unit*currentPrice per type) setelah diisi via Investment.addHolding()', () => {
  const D = makeD();
  // Isi D.investments lewat jalur tulis nyata (Investment.addHolding()) di
  // sandbox terpisah dulu, lalu suntikkan hasilnya (D dipakai bersama —
  // adapter ini murni baca D.investments mentah, tidak butuh Investment
  // di-load bersamaan, pola sama Impact.3 di BUG_REGISTRY.md).
  const invCtx = loadSource(['modules/asset/investasi.js'], { D, ...investExtraGlobals }, ['Investment']);
  invCtx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 100, avgPrice: 5000, currentPrice: 6000 });
  invCtx.Investment.addHolding({ name: 'Sukuk Ritel', type: 'Obligasi', unit: 2, avgPrice: 1000000, currentPrice: 1010000 });

  const adapterCtx = loadSource(['economic-intelligence/adapters/user-finance-adapter.js'], { D });
  const breakdown = adapterCtx._eieInvestmentBreakdown();
  assert.equal(breakdown.saham, 100 * 6000);
  assert.equal(breakdown.obligasi, 2 * 1010000);
  assert.equal(breakdown.emas, 0);
});
