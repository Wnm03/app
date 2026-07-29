'use strict';
// tests/decision-center-api-s286.test.js — S286 lanjutan, prioritas SEDANG
// dari audit (temuan: modules/cross/decision-center-api.js 0 test sama
// sekali, padahal jadi satu-satunya pintu masuk data gabungan Personal
// Decision Center — dikonsumsi ActionQueue & RecommendationPanel). Cakupan:
// DecisionCenterAPI.recommendations()/.summary() murni (0 DOM) — 100% reuse
// LifeDashboardSummaryAPI/PriorityEngine/FinanceIntelligence/
// VehicleIntelligence di-mock langsung sbg plain object, konsisten dgn pola
// tests/priority-engine-s286.test.js (sumber sudah final, tidak perlu load
// file aslinya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ LifeDashboardSummaryAPI, PriorityEngine, FinanceIntelligence, VehicleIntelligence } = {}) {
  const extra = {};
  if (LifeDashboardSummaryAPI !== undefined) extra.LifeDashboardSummaryAPI = LifeDashboardSummaryAPI;
  if (PriorityEngine !== undefined) extra.PriorityEngine = PriorityEngine;
  if (FinanceIntelligence !== undefined) extra.FinanceIntelligence = FinanceIntelligence;
  if (VehicleIntelligence !== undefined) extra.VehicleIntelligence = VehicleIntelligence;
  const ctx = loadSource(['modules/cross/decision-center-api.js'], extra, ['DecisionCenterAPI']);
  return ctx.DecisionCenterAPI;
}

// ---- recommendations() ----

test('recommendations(): FinanceIntelligence/VehicleIntelligence belum dimuat -> [] (tidak throw)', () => {
  const api = makeCtx();
  const r = api.recommendations();
  assert.equal(Array.isArray(r), true);
  assert.equal(r.length, 0);
});

test('recommendations(): gabungan finance+vehicle, HANYA type==="warning" yang lolos', () => {
  const api = makeCtx({
    FinanceIntelligence: { insights: () => [{ type: 'warning', message: 'Boros' }, { type: 'positive', message: 'Aman' }] },
    VehicleIntelligence: { insights: () => [{ type: 'warning', message: 'Servis telat' }, { type: 'info', message: 'Info' }] },
  });
  const r = api.recommendations();
  assert.equal(r.length, 2);
  assert.equal(r.map((x) => x.message).join(','), 'Boros,Servis telat');
});

// ---- summary() ----

test('summary(): LifeDashboardSummaryAPI belum dimuat -> ok:false, reason terisi', () => {
  const api = makeCtx();
  const s = api.summary();
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'LifeDashboardSummaryAPI belum dimuat');
});

test('summary(): LifeDashboardSummaryAPI.summary() {ok:false} -> diteruskan apa adanya', () => {
  const api = makeCtx({ LifeDashboardSummaryAPI: { summary: () => ({ ok: false, reason: 'D belum siap' }) } });
  const s = api.summary();
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'D belum siap');
});

test('summary(): ok:true -> briefing diteruskan apa adanya, priorityItems/priorityCount dari PriorityEngine (bukan dihitung ulang)', () => {
  const api = makeCtx({
    LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: 'Ringkasan hari ini', priorityCount: 99 }) },
    PriorityEngine: { getItems: () => ({ ok: true, items: [{ kind: 'finance', name: 'Makan' }], count: 1 }) },
  });
  const s = api.summary();
  assert.equal(s.ok, true);
  assert.equal(s.briefing, 'Ringkasan hari ini');
  assert.equal(s.priorityItems.length, 1);
  assert.equal(s.priorityCount, 1); // dari PriorityEngine, BUKAN 99 milik LifeDashboardSummaryAPI
});

test('summary(): PriorityEngine belum dimuat -> priorityItems kosong, priorityCount fallback ke s.priorityCount', () => {
  const api = makeCtx({
    LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: 'x', priorityCount: 7 }) },
  });
  const s = api.summary();
  assert.equal(s.priorityItems.length, 0);
  assert.equal(s.priorityCount, 7);
});

test('summary(): PriorityEngine.getItems() {ok:false} -> priorityItems kosong, priorityCount fallback ke s.priorityCount', () => {
  const api = makeCtx({
    LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: 'x', priorityCount: 3 }) },
    PriorityEngine: { getItems: () => ({ ok: false, items: [], count: 0 }) },
  });
  const s = api.summary();
  assert.equal(s.priorityItems.length, 0);
  assert.equal(s.priorityCount, 3);
});

test('summary(): recommendations & recommendationCount ikut ditempel dari recommendations()', () => {
  const api = makeCtx({
    LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: 'x', priorityCount: 0 }) },
    FinanceIntelligence: { insights: () => [{ type: 'warning', message: 'Boros' }] },
    VehicleIntelligence: { insights: () => [] },
  });
  const s = api.summary();
  assert.equal(s.recommendationCount, 1);
  assert.equal(s.recommendations[0].message, 'Boros');
});
