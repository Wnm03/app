'use strict';
// tests/s690-finance-dashboard-cardclick-tosource.test.js — cakupan
// tambahan modules/finance/finance-dashboard.js (S690, lanjutan audit
// "kartu klik->sumber data" — lihat AUDIT-RENCANA-kartu-klik-ke-sumber-
// v1503.md GAP #1). Sebelum sesi ini _netWorthCard()/_cashFlowCard()/
// _budgetCard()/_healthCard() TIDAK punya field onClick sama sekali (satu2
// nya di file ini yang belum, _sparepartCards() sudah lewat goSparepart()
// — lihat tests/s652-finance-dashboard.test.js). Test di sini MURNI
// menambah cakupan onClick 4 kartu itu, TIDAK mengubah/menduplikasi test
// s652 yang sudah ada (pola sama tests/timeline-w-cardclick-tosource.js
// dari S689 — file test baru per-sesi, bukan edit file test lama).

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
  return loadSource(['modules/finance/finance-dashboard.js'], extra, ['FinanceDashboard', 'FINANCE_DASHBOARD_CARD_NAV_TARGETS']);
}

test('FINANCE_DASHBOARD_CARD_NAV_TARGETS -> 4 target, semua {page,...} valid (0 target kosong)', () => {
  const { FINANCE_DASHBOARD_CARD_NAV_TARGETS: T } = makeCtx();
  assert.equal(T.netWorth.page, 'keuangan');
  assert.equal(T.netWorth.tab, 'laporan');
  assert.equal(T.netWorth.subtab, 'ringkasan');
  assert.equal(T.cashFlow.page, 'keuangan');
  assert.equal(T.cashFlow.tab, 'laporan');
  assert.equal(T.cashFlow.subtab, 'aruskas');
  assert.equal(T.budget.page, 'keuangan');
  assert.equal(T.budget.tab, 'budget');
  assert.equal(T.health.page, 'dashboard-hub');
  assert.equal(T.health.goTo, 'financialHealthScoreWrap');
});

// Catatan: dibanding structural-compare (assert.deepEqual) ke object dari
// FINANCE_DASHBOARD_CARD_NAV_TARGETS -- dua sisi (card.onClick.args[0] vs T)
// SEBENARNYA sama isinya tapi dibuat oleh 2 pemanggilan loadSource() (vm
// context) berbeda -> assert.deepEqual node kadang tolak dgn pesan "same
// structure but not reference-equal" krn beda realm. Utk hindari itu, cek
// field primitif satu2 (page/tab/subtab/goTo) -- cukup & lebih stabil.
test('_netWorthCard() -> onClick dashHubNavigateToFeature + target netWorth, termasuk saat dash "—" (dependency belum dimuat)', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const card = fd._netWorthCard();
  assert.equal(card.value, '—');
  assert.equal(card.onClick.action, 'dashHubNavigateToFeature');
  const target = card.onClick.args[0];
  assert.equal(target.page, 'keuangan');
  assert.equal(target.tab, 'laporan');
  assert.equal(target.subtab, 'ringkasan');
});

test('_cashFlowCard() -> onClick target cashFlow, termasuk saat cf tidak ok', () => {
  const { FinanceDashboard: fd } = makeCtx();
  for (const cf of [{ ok: false, reason: 'x' }, { ok: true, currentMonth: { net: 5000 }, projected: null }]) {
    const card = fd._cashFlowCard(cf);
    assert.equal(card.onClick.action, 'dashHubNavigateToFeature');
    const target = card.onClick.args[0];
    assert.equal(target.page, 'keuangan');
    assert.equal(target.tab, 'laporan');
    assert.equal(target.subtab, 'aruskas');
  }
});

test('_budgetCard() -> onClick target budget, termasuk saat bs tidak ok', () => {
  const { FinanceDashboard: fd } = makeCtx();
  for (const bs of [{ ok: false }, { ok: true, overallPct: 0.5, totalUsed: 100, totalLimit: 200, overCount: 0 }]) {
    const card = fd._budgetCard(bs);
    assert.equal(card.onClick.action, 'dashHubNavigateToFeature');
    const target = card.onClick.args[0];
    assert.equal(target.page, 'keuangan');
    assert.equal(target.tab, 'budget');
  }
});

test('_healthCard() -> onClick target health, termasuk saat hs falsy', () => {
  const { FinanceDashboard: fd } = makeCtx();
  for (const hs of [null, { score: 77, label: 'Baik' }]) {
    const card = fd._healthCard(hs);
    assert.equal(card.onClick.action, 'dashHubNavigateToFeature');
    const target = card.onClick.args[0];
    assert.equal(target.page, 'dashboard-hub');
    assert.equal(target.goTo, 'financialHealthScoreWrap');
  }
});

test('4 kartu inti findashGrid semua carry onClick (0 kartu yang lolos dari S690) -- tidak termasuk _sparepartCards, sudah dicover s652', () => {
  const { FinanceDashboard: fd } = makeCtx();
  const cards = [fd._netWorthCard(), fd._cashFlowCard({ ok: false }), fd._budgetCard({ ok: false }), fd._healthCard(null)];
  for (const c of cards) {
    assert.equal(typeof c.onClick, 'object');
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  }
});
