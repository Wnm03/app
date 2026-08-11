'use strict';
// tests/budget-recommendation-severity-sort-s333.test.js — regression test
// utk BUG-014 (docs/BUG_REGISTRY.md §0a-7, Sesi Audit-Docs 9), diperbaiki
// Sesi 333: modules/finance/budget-recommendation-api.js
// `spendingAnalysis()`/`budgetSuggestion()` tidak mengurutkan `items`/
// `suggestions` berdasarkan prioritas (over/near/underused) atau nominal —
// urutan sebelumnya murni mengikuti urutan `D.budgets` (urutan pembuatan
// anggaran), membuat `suggestions[0]` ("Rekomendasi Utama" di presenter)
// & pencarian "Terbesar" (`.find()` kategori 'over' pertama di
// `budget-recommendation-presenter.js`) berpotensi keliru menunjuk item
// yang bukan prioritas/nominal tertinggi.
//
// Test ini menjalankan SOURCE ASLI `budget-recommendation-api.js` (bukan
// re-implementasi logic) lewat harness `loadSource`, dgn
// `FinanceIntelligence.budgetSummary()` di-mock supaya urutan `D.budgets`
// bisa dikontrol persis skenario BUG-014 (underused-first, over-second).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(budgetSummaryImpl) {
  const FinanceIntelligence = {
    budgetSummary: budgetSummaryImpl,
  };
  return loadSource(
    ['modules/finance/budget-recommendation-api.js'],
    { FinanceIntelligence },
    ['BudgetRecommendationAPI'],
  );
}

// Skenario persis reproduction BUG-014: "Hiburan" (underused, dibuat lebih
// dulu) ada SEBELUM "Makan" (over limit, dibuat setelahnya) di D.budgets.
function mockBudgetSummary() {
  return {
    ok: true,
    month: 7,
    year: 2026,
    items: [
      { id: 'b1', name: 'Hiburan', limit: 500000, used: 100000, sisa: 400000, pct: 0.2, over: false },
      { id: 'b2', name: 'Makan', limit: 1000000, used: 1200000, sisa: -200000, pct: 1.2, over: true },
      { id: 'b3', name: 'Transport', limit: 300000, used: 270000, sisa: 30000, pct: 0.9, over: false },
      { id: 'b4', name: 'Belanja', limit: 800000, used: 2000000, sisa: -1200000, pct: 2.5, over: true },
    ],
    totalLimit: 2600000,
    totalUsed: 3570000,
    totalSisa: -970000,
    overallPct: 3570000 / 2600000,
    overCount: 2,
  };
}

test('spendingAnalysis(): items diurutkan over -> near -> underused, bukan urutan D.budgets', () => {
  const ctx = makeCtx(mockBudgetSummary);
  const sa = ctx.BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(sa.ok, true);
  assert.deepEqual(sa.items.map((it) => it.category), ['over', 'over', 'near', 'underused']);
  // Dalam kategori 'over', urutan berdasarkan (used-limit) menurun —
  // "Belanja" (overage 1.200.000) harus di depan "Makan" (overage 200.000).
  assert.deepEqual(sa.items.filter((it) => it.category === 'over').map((it) => it.name), ['Belanja', 'Makan']);
});

test('spendingAnalysis(): count per kategori tetap benar setelah sorting (tidak ada item hilang/dobel)', () => {
  const ctx = makeCtx(mockBudgetSummary);
  const sa = ctx.BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(sa.overCount, 2);
  assert.equal(sa.nearCount, 1);
  assert.equal(sa.underusedCount, 1);
  assert.equal(sa.items.length, 4);
});

test('budgetSuggestion(): suggestions[0] adalah item over dgn overage terbesar (FIX BUG-014)', () => {
  const ctx = makeCtx(mockBudgetSummary);
  const bsg = ctx.BudgetRecommendationAPI.budgetSuggestion();
  assert.equal(bsg.ok, true);
  assert.equal(bsg.suggestions[0].category, 'over');
  assert.equal(bsg.suggestions[0].name, 'Belanja');
  // 4 item mock, 0 kategori 'ok' -> seluruh 4 masuk suggestions.
  assert.equal(bsg.suggestions.length, 4);
});

test('budgetSuggestion(): urutan suggestions penuh over->over->near->underused', () => {
  const ctx = makeCtx(mockBudgetSummary);
  const bsg = ctx.BudgetRecommendationAPI.budgetSuggestion();
  assert.deepEqual(bsg.suggestions.map((s) => s.category), ['over', 'over', 'near', 'underused']);
});

test('spendingAnalysis(): kategori "underused" diurutkan pct menaik (paling sedikit terpakai duluan)', () => {
  const ctx = makeCtx(() => ({
    ok: true,
    month: 7,
    year: 2026,
    items: [
      { id: 'u1', name: 'Langganan', limit: 200000, used: 150000, sisa: 50000, pct: 0.75, over: false },
      { id: 'u2', name: 'Hobi', limit: 500000, used: 50000, sisa: 450000, pct: 0.1, over: false },
      { id: 'u3', name: 'Servis', limit: 300000, used: 90000, sisa: 210000, pct: 0.3, over: false },
    ],
    totalLimit: 1000000,
    totalUsed: 290000,
    totalSisa: 710000,
    overallPct: 0.29,
    overCount: 0,
  }));
  const sa = ctx.BudgetRecommendationAPI.spendingAnalysis();
  // Langganan pct=0.75 -> bukan over, bukan >=0.8 (near), bukan <0.4 (underused)
  // -> jatuh ke kategori 'ok', sengaja disertakan sbg pembanding negatif.
  const underusedNames = sa.items.filter((it) => it.category === 'underused').map((it) => it.name);
  assert.deepEqual(underusedNames, ['Hobi', 'Servis']); // 0.1 sebelum 0.3 (menaik)
});

test('spendingAnalysis()/budgetSuggestion(): tidak memutasi array asli dari FinanceIntelligence.budgetSummary()', () => {
  const original = mockBudgetSummary();
  const ctx = makeCtx(() => original);
  ctx.BudgetRecommendationAPI.spendingAnalysis();
  // Urutan asli mock TIDAK berubah (spendingAnalysis() harus bekerja di atas copy).
  assert.deepEqual(original.items.map((it) => it.name), ['Hiburan', 'Makan', 'Transport', 'Belanja']);
});

test('spendingAnalysis(): {ok:false} dari budgetSummary() diteruskan apa adanya (guard tidak berubah)', () => {
  const ctx = makeCtx(() => ({ ok: false, reason: 'Budget belum dimuat' }));
  const sa = ctx.BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(sa.ok, false);
  assert.equal(sa.reason, 'Budget belum dimuat');
});
