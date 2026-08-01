'use strict';
// tests/financial-health-score-api.test.js — cakupan
// modules/finance/financial-health-score-api.js (FinancialHealthScoreAPI),
// sebelumnya 0 test file yang menyentuhnya langsung. Beda dari
// cashflow-projection/financial-forecast (pure wrapper 1:1): file ini
// punya derivatif tipis di atas FinanceIntelligence.healthScore() — label
// tampilan per komponen, pct (score/weight), dan threshold rekomendasi
// (score & pct<0.5) — jadi dites eksplisit juga.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(FinanceIntelligence) {
  return loadSource(
    ['modules/finance/financial-health-score-api.js'],
    FinanceIntelligence !== undefined ? { FinanceIntelligence } : {},
    ['FinancialHealthScoreAPI'],
  );
}

const GOOD_HS = {
  score: 85, label: 'Sehat',
  parts: [
    { key: 'savings', weight: 30, score: 28 },
    { key: 'budget', weight: 30, score: 27 },
    { key: 'debt', weight: 20, score: 18 },
    { key: 'cashflow', weight: 20, score: 19 },
  ],
};

const LOW_HS = {
  score: 45, label: 'Kurang Sehat',
  parts: [
    { key: 'savings', weight: 30, score: 5 },   // pct 0.166 -> warning
    { key: 'unknown', weight: 10, score: 8 },   // pct 0.8 -> ok, label fallback ke key
  ],
};

test('_score() -> {ok:false} kalau FinanceIntelligence belum dimuat', () => {
  const { FinancialHealthScoreAPI } = makeCtx(undefined);
  const r = FinancialHealthScoreAPI._score();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('_score() -> {ok:false} kalau healthScore() throw', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => { throw new Error('boom'); } });
  const r = FinancialHealthScoreAPI._score();
  assert.equal(r.ok, false);
  assert.match(r.reason, /gagal dipanggil/);
});

test('scoreOverview() -> score/label/parts dibaca apa adanya + ok:true', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => GOOD_HS });
  const r = FinancialHealthScoreAPI.scoreOverview();
  assert.equal(r.ok, true);
  assert.equal(r.score, 85);
  assert.equal(r.label, 'Sehat');
  assert.equal(r.parts.length, 4);
});

test('componentBreakdown() -> label dipetakan per key, pct = score/weight', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => GOOD_HS });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.ok, true);
  const savings = r.items.find((i) => i.key === 'savings');
  assert.equal(savings.label, 'Tingkat Tabungan');
  assert.ok(Math.abs(savings.pct - 28 / 30) < 1e-9);
});

test('componentBreakdown() -> key tak dikenal fallback label ke key itu sendiri', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => LOW_HS });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  const unknown = r.items.find((i) => i.key === 'unknown');
  assert.equal(unknown.label, 'unknown');
});

test('componentBreakdown() -> pct 0 kalau weight <= 0 (hindari div/0), dan {ok:false} diteruskan kalau score gagal', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => ({ score: 0, label: 'x', parts: [{ key: 'debt', weight: 0, score: 5 }] }) });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.items[0].pct, 0);

  const { FinancialHealthScoreAPI: Failing } = makeCtx(undefined);
  const rFail = Failing.componentBreakdown();
  assert.equal(rFail.ok, false);
});

test('financialHealthRecommendation() -> [] kalau scoreOverview gagal', () => {
  const { FinancialHealthScoreAPI } = makeCtx(undefined);
  assert.equal(FinancialHealthScoreAPI.financialHealthRecommendation().length, 0);
});

test('financialHealthRecommendation() -> overall "positive" kalau score>=80, tanpa warning komponen (semua pct>=0.5)', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => GOOD_HS });
  const recs = FinancialHealthScoreAPI.financialHealthRecommendation();
  assert.equal(recs[0].type, 'positive');
  assert.equal(recs[0].code, 'health_score_overall');
  assert.match(recs[0].message, /85\/100 \(Sehat\)/);
  assert.equal(recs.length, 1); // tidak ada komponen dengan pct<0.5
});

test('financialHealthRecommendation() -> overall "warning" kalau score<60, + warning per komponen pct<0.5', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => LOW_HS });
  const recs = FinancialHealthScoreAPI.financialHealthRecommendation();
  assert.equal(recs[0].type, 'warning');
  const compWarn = recs.filter((r) => r.code === 'health_component_low');
  assert.equal(compWarn.length, 1); // cuma "savings" (pct ~0.166), "unknown" (pct 0.8) tidak masuk
  assert.match(compWarn[0].message, /Tingkat Tabungan/);
});

test('financialHealthRecommendation() -> overall "info" kalau score di antara 60-79', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => ({ score: 65, label: 'Cukup Sehat', parts: [] }) });
  const recs = FinancialHealthScoreAPI.financialHealthRecommendation();
  assert.equal(recs[0].type, 'info');
});

test('summary() -> ok:true & gabungan ke-3 kalau scoreOverview ok', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ healthScore: () => GOOD_HS });
  const r = FinancialHealthScoreAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.scoreOverview.score, 85);
  assert.equal(r.componentBreakdown.items.length, 4);
  assert.equal(r.recommendation.length, 1);
});

test('summary() -> ok:false kalau FinanceIntelligence belum dimuat, recommendation tetap array', () => {
  const { FinancialHealthScoreAPI } = makeCtx(undefined);
  const r = FinancialHealthScoreAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
