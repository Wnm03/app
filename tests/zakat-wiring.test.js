'use strict';
// tests/zakat-wiring.test.js — Regression test utk wiring ZakatReminder ke
// LifeDashboardSummaryAPI/PriorityEngine (sesi lanjutan
// AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §2 "Zakat", dikonfirmasi user:
// Penghasilan & Maal, Fitrah ditunda). Pola sama persis
// tests/financial-risk-wiring.test.js — layer di bawah/atas di-mock
// langsung sbg plain object, TIDAK perlu load file aslinya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- LifeDashboardSummaryAPI ---------------------------------------

function lifeCtx(stubs) {
  const ctx = loadSource(['modules/cross/life-dashboard-summary-api.js'], stubs, ['LifeDashboardSummaryAPI']);
  return ctx.LifeDashboardSummaryAPI;
}

function baseUnified(overrides) {
  return Object.assign({
    ok: true,
    finance: { ok: true, budget: { ok: true, overCount: 0 } },
    vehicle: { ok: true, reminder: { overdueCount: 0, dueSoonCount: 0 } },
    insightCount: 0,
  }, overrides);
}

test('LifeDashboardSummaryAPI.summary(): ZakatReminder belum dimuat -> zakat default {total:0,warningCount:0,all:[]}, priorityCount TIDAK berubah', () => {
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified({ finance: { ok: true, budget: { ok: true, overCount: 1 } } }) },
  });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.zakat.total, 0);
  assert.equal(r.zakat.warningCount, 0);
  assert.equal(r.zakat.all.length, 0);
  assert.equal(r.priorityCount, 1);
});

test('LifeDashboardSummaryAPI.summary(): ZakatReminder.summary() apa adanya jadi field zakat, warningCount ikut priorityCount', () => {
  const zakatStub = {
    total: 2,
    warningCount: 2,
    all: [
      { type: 'zakatPenghasilan', severity: 'warning', jumlah: 250000, message: 'a' },
      { type: 'zakatMaal', severity: 'warning', jumlah: 5000000, message: 'b' },
    ],
  };
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified({ finance: { ok: true, budget: { ok: true, overCount: 2 } }, vehicle: { ok: true, reminder: { overdueCount: 1, dueSoonCount: 0 } } }) },
    ZakatReminder: { summary: () => zakatStub },
  });
  const r = api.summary();
  assert.equal(r.zakat, zakatStub);
  assert.equal(r.priorityCount, 2 + 1 + 0 + 2); // budgetOver+vehicleOverdue+vehicleDueSoon+zakat.warningCount
});

// --- PriorityEngine ---------------------------------------------------

function priorityCtx(LifeDashboardSummaryAPI) {
  const ctx = loadSource(['modules/cross/priority-engine.js'], { LifeDashboardSummaryAPI }, ['PriorityEngine']);
  return ctx.PriorityEngine;
}

test('PriorityEngine.getItems(): s.zakat tidak ada (mock lama tanpa field ini) -> tidak throw, item lain tetap seperti sebelumnya', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } }, vehicle: { ok: true, reminder: { all: [] } } }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].kind, 'finance');
});

test('PriorityEngine.getItems(): s.zakat.all dipetakan jadi kind zakat severity warning, apa adanya (tanpa filter tambahan selain severity)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      zakat: { all: [
        { type: 'zakatPenghasilan', severity: 'warning', jumlah: 250000, message: 'Zakat Penghasilan wajib' },
        { type: 'zakatMaal', severity: 'warning', jumlah: 5000000, message: 'Zakat Maal wajib' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'zakat:warning,zakat:warning');
  assert.equal(r.items[0].zakatType, 'zakatPenghasilan');
  assert.equal(r.items[0].jumlah, 250000);
  assert.equal(r.items[0].message, 'Zakat Penghasilan wajib');
});

test('PriorityEngine.getItems(): urutan zakat PALING AKHIR, setelah financialRisk & danaTitipan', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } },
      vehicle: { ok: true, reminder: { all: [
        { type: 'oli', severity: 'overdue', message: 'oli' },
        { type: 'ban', severity: 'due-soon', message: 'ban' },
      ] } },
      danaTitipan: { all: [{ type: 'danaTitipan', severity: 'warning', message: 'gap' }] },
      financialRisk: { riskFactors: [{ domain: 'debt', message: 'DSR tinggi' }] },
      zakat: { all: [{ type: 'zakatMaal', severity: 'warning', message: 'Zakat Maal wajib' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,finance:over,vehicle:due-soon,danaTitipan:warning,financialRisk:warning,zakat:warning');
});

test('PriorityEngine.getItems(): count selalu sama dengan items.length (termasuk item zakat)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      zakat: { all: [{ type: 'zakatPenghasilan', severity: 'warning', message: 'm1' }, { type: 'zakatMaal', severity: 'warning', message: 'm2' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 2);
});

test('PriorityEngine.getItems(): s.zakat.all item severity BUKAN warning (data cacat/masa depan) TIDAK ikut masuk (guard filter tetap ada meski kontrak saat ini selalu warning)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      zakat: { all: [{ type: 'zakatFitrah', severity: 'info', message: 'bukan warning' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.items.length, 0);
});
