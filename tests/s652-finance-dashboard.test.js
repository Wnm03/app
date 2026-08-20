'use strict';
// tests/s652-finance-dashboard.test.js — cakupan modules/finance/finance-dashboard.js
// (FinanceDashboard), sebelumnya 0 test file yang menyentuhnya langsung
// (RENCANA-IMPLEMENTASI-S646-S664.md Blok F). Modul ini "HANYA presenter"
// (0 rumus baru, 100% reuse FinanceIntelligence.summary()/Kekayaan.
// currentNetWorth()/Sparepart.calcFinanceStats() — lihat komentar header
// file sumbernya), jadi test ini fokus ke:
//   - getAIHook(): guard "belum dimuat" + passthrough summary().
//   - _netWorthCard()/_cashFlowCard()/_budgetCard()/_healthCard()/
//     _sparepartCards(): builder kartu MURNI (tidak sentuh DOM) — nilai,
//     cls (warna), dan sub-label turun persis dari hook yang di-passing.
// render() SENGAJA tidak dites di sini (baca/tulis DOM lewat
// document.getElementById — di luar cakupan harness loadSource.js, ranah
// smoke-test.js/manual QA sesuai catatan di helpers/loadSource.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ FinanceIntelligence, Kekayaan, totalSaldoAkun, totalDebtValue, Sparepart, fmt } = {}) {
  const extra = {};
  if (FinanceIntelligence !== undefined) extra.FinanceIntelligence = FinanceIntelligence;
  if (Kekayaan !== undefined) extra.Kekayaan = Kekayaan;
  if (totalSaldoAkun !== undefined) extra.totalSaldoAkun = totalSaldoAkun;
  if (totalDebtValue !== undefined) extra.totalDebtValue = totalDebtValue;
  if (Sparepart !== undefined) extra.Sparepart = Sparepart;
  extra.D = { partsStock: [], servisLogs: [] };
  extra.fmt = fmt || ((n) => 'Rp ' + Math.round(n || 0));
  return loadSource(['modules/finance/finance-dashboard.js'], extra, ['FinanceDashboard']);
}

// --- getAIHook() ---

test('getAIHook() -> {ok:false} kalau FinanceIntelligence belum dimuat (tidak throw)', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const hook = fd.getAIHook();
  assert.equal(hook.ok, false);
  assert.equal(typeof hook.reason, 'string');
});

test('getAIHook() -> {ok:true, ...summary()} apa adanya (0 transformasi)', () => {
  const summary = { cashflow: { ok: true, currentMonth: { net: 1000 } }, budget: { ok: true }, healthScore: { score: 77, label: 'Baik' } };
  const { FinanceDashboard: fd } = makeCtx({ FinanceIntelligence: { summary: () => summary } });
  const hook = fd.getAIHook();
  assert.equal(hook.ok, true);
  assert.deepEqual(hook.cashflow, summary.cashflow);
  assert.deepEqual(hook.budget, summary.budget);
  assert.deepEqual(hook.healthScore, summary.healthScore);
});

// --- _netWorthCard() ---

test('_netWorthCard() -> dash "—" kalau salah satu dependency (Kekayaan/totalSaldoAkun/totalDebtValue) belum dimuat', () => {
  const { FinanceDashboard: fd } = makeCtx({ Kekayaan: { currentNetWorth: () => 100 } }); // totalSaldoAkun/totalDebtValue absen
  const card = fd._netWorthCard();
  assert.equal(card.value, '—');
});

test('_netWorthCard() -> reuse Kekayaan.currentNetWorth() (bukan totalSaldoAkun()-totalDebtValue() sendiri), cls hijau kalau net >= 0', () => {
  const { FinanceDashboard: fd } = makeCtx({
    Kekayaan: { currentNetWorth: () => 5000 },
    totalSaldoAkun: () => 8000,
    totalDebtValue: () => 3000,
  });
  const card = fd._netWorthCard();
  assert.equal(card.value, 'Rp 5000');
  assert.equal(card.cls, 'green');
  assert.match(card.sub, /Rp 8000/);
  assert.match(card.sub, /Rp 3000/);
});

test('_netWorthCard() -> cls merah + prefix "-" kalau net negatif', () => {
  const { FinanceDashboard: fd } = makeCtx({
    Kekayaan: { currentNetWorth: () => -2000 },
    totalSaldoAkun: () => 1000,
    totalDebtValue: () => 3000,
  });
  const card = fd._netWorthCard();
  assert.equal(card.value, '-Rp 2000');
  assert.equal(card.cls, 'red');
});

// --- _cashFlowCard(cf) ---

test('_cashFlowCard() -> dash + reason kalau cf tidak ok', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._cashFlowCard({ ok: false, reason: 'belum ada transaksi' });
  assert.equal(card.value, '—');
  assert.equal(card.sub, 'belum ada transaksi');
});

test('_cashFlowCard() -> net negatif -> cls merah + proyeksi ikut ditampilkan apa adanya', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._cashFlowCard({ ok: true, currentMonth: { net: -1500 }, projected: -3000 });
  assert.equal(card.value, '-Rp 1500');
  assert.equal(card.cls, 'red');
  assert.match(card.sub, /Proyeksi 30 hari: -Rp 3000/);
});

test('_cashFlowCard() -> projected null -> sub undefined (tidak dipaksa tampil)', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._cashFlowCard({ ok: true, currentMonth: { net: 2000 }, projected: null });
  assert.equal(card.cls, 'green');
  assert.equal(card.sub, undefined);
});

// --- _budgetCard(bs) ---

test('_budgetCard() -> dash + reason kalau bs tidak ok', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._budgetCard({ ok: false, reason: 'belum ada anggaran' });
  assert.equal(card.value, '—');
  assert.equal(card.sub, 'belum ada anggaran');
});

test('_budgetCard() -> overCount > 0 -> cls merah walau pct rendah', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._budgetCard({ ok: true, overallPct: 0.3, totalUsed: 300, totalLimit: 1000, overCount: 2 });
  assert.equal(card.value, '30%');
  assert.equal(card.cls, 'red');
  assert.match(card.sub, /2 lewat batas/);
});

test('_budgetCard() -> overCount 0, pct >= 80 -> cls orange; pct < 80 -> cls hijau', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const high = fd._budgetCard({ ok: true, overallPct: 0.85, totalUsed: 850, totalLimit: 1000, overCount: 0 });
  assert.equal(high.cls, 'orange');
  const low = fd._budgetCard({ ok: true, overallPct: 0.4, totalUsed: 400, totalLimit: 1000, overCount: 0 });
  assert.equal(low.cls, 'green');
});

// --- _healthCard(hs) ---

test('_healthCard() -> dash kalau hs falsy', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._healthCard(null);
  assert.equal(card.value, '—');
});

test('_healthCard() -> 4 tingkat cls sesuai ambang score (80/60/40)', () => {
  const { FinanceDashboard: fd } = makeCtx();
  assert.equal(fd._healthCard({ score: 90, label: 'A' }).cls, 'green');
  assert.equal(fd._healthCard({ score: 65, label: 'B' }).cls, '');
  assert.equal(fd._healthCard({ score: 45, label: 'C' }).cls, 'orange');
  assert.equal(fd._healthCard({ score: 10, label: 'D' }).cls, 'red');
});

// --- _sparepartCards() ---

test('_sparepartCards() -> [] kalau Sparepart/calcFinanceStats belum dimuat', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const cards = fd._sparepartCards();
  assert.equal(Array.isArray(cards), true);
  assert.equal(cards.length, 0);
});

test('_sparepartCards() -> 6 kartu, reuse Sparepart.calcFinanceStats(D.partsStock, D.servisLogs) apa adanya, onClick goToList carnotes/servis tab', () => {
  const stats = {
    totalPembelian: 1000, totalNilaiStok: 2000, totalNilaiTerpakai: 500, biayaServisSparepart: 300,
    trenPembelianBulanan: [{ label: 'Jul', total: 100 }, { label: 'Agu', total: 150 }],
    trenPemakaianBulanan: [],
  };
  let calledWith = null;
  const { FinanceDashboard: fd } = makeCtx({
    Sparepart: { calcFinanceStats: (parts, logs) => { calledWith = [parts, logs]; return stats; } },
  });
  const cards = fd._sparepartCards();
  assert.equal(cards.length, 6);
  assert.deepEqual(calledWith, [[], []]);
  cards.forEach((c) => {
    assert.equal(c.onClick.action, 'goToList');
    assert.equal(c.onClick.args[1], 'carnotes');
    assert.equal(c.onClick.args[4], 'servis');
  });
  // tren naik 50% (100 -> 150) -> sub pakai simbol ▲
  const trenCard = cards.find((c) => c.label === 'Tren Pembelian Bulanan');
  assert.match(trenCard.sub, /▲50%/);
});
