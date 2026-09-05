'use strict';
// tests/piutang-utang-reminder-wiring.test.js — Regression test utk
// wiring PiutangUtangReminder ke LifeDashboardSummaryAPI/PriorityEngine
// (sesi lanjutan Fix #3 DASHBOARD-DEDUP.md, "Poin 1"). Pola sama persis
// tests/priority-engine-s286.test.js & tests/cross-module-own-contract-
// s286.test.js § LifeDashboardSummaryAPI — layer di bawah/atas di-mock
// langsung sbg plain object, TIDAK perlu load file aslinya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- LifeDashboardSummaryAPI ---------------------------------------

function lifeCtx(stubs) {
  const ctx = loadSource(['modules/cross/life-dashboard-summary-api.js'], stubs, ['LifeDashboardSummaryAPI']);
  return ctx.LifeDashboardSummaryAPI;
}

test('LifeDashboardSummaryAPI.summary(): PiutangUtangReminder belum dimuat -> piutangUtang default kosong, priorityCount TIDAK berubah (0 ditambahkan)', () => {
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, overCount: 1 } }, vehicle: { ok: true, reminder: { overdueCount: 0, dueSoonCount: 0 } }, insightCount: 0 }) },
  });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.piutangUtang.total, 0);
  assert.equal(r.piutangUtang.overdueCount, 0);
  assert.equal(r.piutangUtang.dueSoonCount, 0);
  assert.equal(r.piutangUtang.receivable.length, 0);
  assert.equal(r.piutangUtang.debt.length, 0);
  assert.equal(r.piutangUtang.all.length, 0);
  assert.equal(r.priorityCount, 1);
});

test('LifeDashboardSummaryAPI.summary(): PiutangUtangReminder.summary() apa adanya jadi field piutangUtang, overdueCount/dueSoonCount ikut masuk priorityCount', () => {
  const puStub = { total: 2, overdueCount: 1, dueSoonCount: 1, receivable: [{ id: 'a' }], debt: [], all: [{ id: 'a' }] };
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, overCount: 2 } }, vehicle: { ok: true, reminder: { overdueCount: 1, dueSoonCount: 3 } }, insightCount: 0 }) },
    PiutangUtangReminder: { summary: () => puStub },
  });
  const r = api.summary();
  assert.equal(r.piutangUtang, puStub);
  assert.equal(r.priorityCount, 2 + 1 + 3 + 1 + 1); // budgetOver+vehicleOverdue+vehicleDueSoon+puOverdue+puDueSoon
});

// --- PriorityEngine ---------------------------------------------------

function priorityCtx(LifeDashboardSummaryAPI) {
  const ctx = loadSource(['modules/cross/priority-engine.js'], { LifeDashboardSummaryAPI }, ['PriorityEngine']);
  return ctx.PriorityEngine;
}

test('PriorityEngine.getItems(): s.piutangUtang tidak ada (mock lama tanpa field ini) -> tidak throw, item lain tetap seperti sebelumnya', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } }, vehicle: { ok: true, reminder: { all: [] } } }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].kind, 'finance');
});

test('PriorityEngine.getItems(): piutangUtang.all difilter HANYA severity overdue/due-soon, severity lain diabaikan', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      piutangUtang: { all: [
        { type: 'receivable', name: 'Budi', severity: 'overdue', message: 'lewat' },
        { type: 'debt', name: 'KK', severity: 'ok', message: 'aman' },
        { type: 'debt', name: 'Cicilan', severity: 'due-soon', message: 'segera' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'piutangUtang:overdue,piutangUtang:due-soon');
});

test('PriorityEngine.getItems(): urutan = vehicle overdue -> piutangUtang overdue -> finance over -> vehicle due-soon -> piutangUtang due-soon', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } },
      vehicle: { ok: true, reminder: { all: [
        { type: 'oli', severity: 'overdue', message: 'oli' },
        { type: 'ban', severity: 'due-soon', message: 'ban' },
      ] } },
      piutangUtang: { all: [
        { type: 'receivable', name: 'Budi', severity: 'overdue', message: 'r-overdue' },
        { type: 'debt', name: 'KK', severity: 'due-soon', message: 'd-duesoon' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,piutangUtang:overdue,finance:over,vehicle:due-soon,piutangUtang:due-soon');
});

test('PriorityEngine.getItems(): count selalu sama dengan items.length (termasuk item piutangUtang)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      piutangUtang: { all: [{ type: 'receivable', name: 'A', severity: 'overdue', message: 'm' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 1);
});
