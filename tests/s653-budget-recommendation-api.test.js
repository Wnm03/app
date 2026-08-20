'use strict';
// tests/s653-budget-recommendation-api.test.js — cakupan tambahan
// modules/finance/budget-recommendation-api.js (BudgetRecommendationAPI),
// melengkapi tests/budget-recommendation-severity-sort-s333.test.js (yang
// sudah cover sorting/BUG-014) dengan bagian yang masih 0 test langsung
// (RENCANA-IMPLEMENTASI-S646-S664.md Blok F):
//   - _budget(): guard "FinanceIntelligence belum dimuat".
//   - _classify(): 4 cabang kategori secara terisolasi.
//   - budgetInsight(): 4 rule (over/near/underused/healthy).
//   - budgetSuggestion(): isi `message`/`suggestedLimit` per kategori
//     (s333 baru cek urutan & count, belum isi pesannya).
//   - summary(): kombinasi `ok` + passthrough insight.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(budgetSummaryImpl) {
  const extra = {};
  if (budgetSummaryImpl !== undefined) {
    extra.FinanceIntelligence = { budgetSummary: budgetSummaryImpl };
  }
  return loadSource(
    ['modules/finance/budget-recommendation-api.js'],
    extra,
    ['BudgetRecommendationAPI'],
  );
}

// --- _budget() ---

test('_budget() -> {ok:false} kalau FinanceIntelligence belum dimuat (tidak throw)', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  const bs = api._budget();
  assert.equal(bs.ok, false);
  assert.equal(typeof bs.reason, 'string');
});

test('_budget() -> {ok:false, reason default} kalau budgetSummary() balikin falsy', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(() => null);
  const bs = api._budget();
  assert.equal(bs.ok, false);
  assert.equal(bs.reason, 'budget summary tidak tersedia');
});

test('_budget() -> {ok:false, reason asli} diteruskan apa adanya kalau budgetSummary() sendiri {ok:false, reason}', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(() => ({ ok: false, reason: 'belum ada anggaran bulan ini' }));
  const bs = api._budget();
  assert.equal(bs.ok, false);
  assert.equal(bs.reason, 'belum ada anggaran bulan ini');
});

test('_budget(month, year) -> meneruskan parameter apa adanya ke FinanceIntelligence.budgetSummary()', () => {
  let calledWith = null;
  const { BudgetRecommendationAPI: api } = makeCtx((m, y) => { calledWith = [m, y]; return { ok: true, items: [] }; });
  api._budget(3, 2027);
  assert.deepEqual(calledWith, [3, 2027]);
});

// --- _classify() ---

test('_classify() -> "over" kalau item.over true (menang atas pct berapa pun)', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  assert.equal(api._classify({ over: true, pct: 0.1 }), 'over');
});

test('_classify() -> "near" kalau !over && pct >= 0.8', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  assert.equal(api._classify({ over: false, pct: 0.8 }), 'near');
  assert.equal(api._classify({ over: false, pct: 0.95 }), 'near');
});

test('_classify() -> "underused" kalau !over && pct < 0.4', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  assert.equal(api._classify({ over: false, pct: 0.39 }), 'underused');
  assert.equal(api._classify({ over: false, pct: 0 }), 'underused');
});

test('_classify() -> "ok" utk pct di antara 0.4 (inklusif) dan 0.8 (eksklusif)', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  assert.equal(api._classify({ over: false, pct: 0.4 }), 'ok');
  assert.equal(api._classify({ over: false, pct: 0.79 }), 'ok');
});

// --- budgetSuggestion(): isi message/suggestedLimit per kategori ---

function mockOneItem(item) {
  return () => ({
    ok: true, month: 8, year: 2026, items: [item],
    totalLimit: item.limit, totalUsed: item.used, totalSisa: item.sisa,
    overallPct: item.pct, overCount: item.over ? 1 : 0,
  });
}

test('budgetSuggestion(): kategori "over" -> suggestedLimit = item.used, message sebut "melebihi limit"', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b1', name: 'Makan', limit: 1000, used: 1200, sisa: -200, pct: 1.2, over: true }),
  );
  const s = api.budgetSuggestion().suggestions[0];
  assert.equal(s.suggestedLimit, 1200);
  assert.match(s.message, /melebihi limit/);
  assert.match(s.message, /Makan/);
});

test('budgetSuggestion(): kategori "near" -> TIDAK ada suggestedLimit, message sebut persen pct', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b2', name: 'Transport', limit: 300, used: 270, sisa: 30, pct: 0.9, over: false }),
  );
  const s = api.budgetSuggestion().suggestions[0];
  assert.equal('suggestedLimit' in s, false);
  assert.match(s.message, /90%/);
});

test('budgetSuggestion(): kategori "underused" -> TIDAK ada suggestedLimit, message sebut "dialihkan"', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b3', name: 'Hobi', limit: 500, used: 50, sisa: 450, pct: 0.1, over: false }),
  );
  const s = api.budgetSuggestion().suggestions[0];
  assert.equal('suggestedLimit' in s, false);
  assert.match(s.message, /dialihkan/);
});

test('budgetSuggestion(): kategori "ok" TIDAK disertakan sebagai suggestion', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b4', name: 'Internet', limit: 200, used: 100, sisa: 100, pct: 0.5, over: false }),
  );
  const bsg = api.budgetSuggestion();
  assert.equal(bsg.suggestions.length, 0);
});

// --- budgetInsight() ---

test('budgetInsight(): {ok:false} dari spendingAnalysis() diteruskan apa adanya (bukan array)', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(() => ({ ok: false, reason: 'x' }));
  const ins = api.budgetInsight();
  assert.equal(ins.ok, false);
});

test('budgetInsight(): overCount>0 -> warning budget_over_count', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b1', name: 'Makan', limit: 1000, used: 1500, sisa: -500, pct: 1.5, over: true }),
  );
  const ins = api.budgetInsight();
  assert.equal(ins.length, 1);
  assert.equal(ins[0].type, 'warning');
  assert.equal(ins[0].code, 'budget_over_count');
});

test('budgetInsight(): nearCount>0 (tanpa over) -> warning budget_near_count', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b2', name: 'Transport', limit: 300, used: 270, sisa: 30, pct: 0.9, over: false }),
  );
  const ins = api.budgetInsight();
  assert.equal(ins.length, 1);
  assert.equal(ins[0].code, 'budget_near_count');
});

test('budgetInsight(): 0 over & 0 near (walau ada underused) -> tetap positive budget_healthy TAMBAHAN', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b3', name: 'Hobi', limit: 500, used: 50, sisa: 450, pct: 0.1, over: false }),
  );
  const ins = api.budgetInsight();
  // underused (info) + healthy (positive) -> keduanya bisa muncul bersamaan
  // krn syarat healthy cuma overCount===0 && nearCount===0 (bukan
  // exclusive thd underused).
  assert.equal(ins.some((i) => i.code === 'budget_underused_count'), true);
  assert.equal(ins.some((i) => i.code === 'budget_healthy'), true);
});

test('budgetInsight(): semua kategori "ok" -> HANYA positive budget_healthy', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b4', name: 'Internet', limit: 200, used: 100, sisa: 100, pct: 0.5, over: false }),
  );
  const ins = api.budgetInsight();
  const codes = Array.from(ins).map((i) => i.code);
  assert.equal(codes.length, 1);
  assert.equal(codes[0], 'budget_healthy');
  assert.equal(ins[0].type, 'positive');
});

// --- summary() ---

test('summary(): ok=true kalau spendingAnalysis & budgetSuggestion ok, insight tetap array', () => {
  const { BudgetRecommendationAPI: api } = makeCtx(
    mockOneItem({ id: 'b4', name: 'Internet', limit: 200, used: 100, sisa: 100, pct: 0.5, over: false }),
  );
  const sum = api.summary();
  assert.equal(sum.ok, true);
  assert.equal(sum.spendingAnalysis.ok, true);
  assert.equal(sum.budgetSuggestion.ok, true);
  assert.equal(Array.isArray(sum.insight), true);
});

test('summary(): ok=false kalau FinanceIntelligence belum dimuat, insight tetap array kosong (bukan {ok:false})', () => {
  const { BudgetRecommendationAPI: api } = makeCtx();
  const sum = api.summary();
  assert.equal(sum.ok, false);
  assert.equal(sum.spendingAnalysis.ok, false);
  assert.equal(sum.budgetSuggestion.ok, false);
  assert.equal(Array.isArray(sum.insight), true);
  assert.equal(sum.insight.length, 0);
});
