'use strict';
// tests/tagihan-danatitipan-wiring.test.js — Regression test utk wiring
// TagihanReminder + TitipanReconcile (dibungkus jadi danaTitipan) ke
// LifeDashboardSummaryAPI/PriorityEngine (sesi lanjutan Fix #3
// DASHBOARD-DEDUP.md, "Poin 1", lanjutan dari Piutang/Utang — lihat
// tests/piutang-utang-reminder-wiring.test.js utk pola dasar & DESIGN-
// LOCK-PERLUASAN-SARAN-DASHBOARD.md utk keputusan bentuk danaTitipan).
// Layer di bawah/atas di-mock langsung sbg plain object, TIDAK perlu
// load file aslinya.

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

test('LifeDashboardSummaryAPI.summary(): TagihanReminder/TitipanReconcile belum dimuat -> default kosong/ok, priorityCount TIDAK berubah', () => {
  const api = lifeCtx({ UnifiedSummaryAPI: { summary: () => baseUnified({ finance: { ok: true, budget: { ok: true, overCount: 1 } } }) } });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.tagihan.total, 0);
  assert.equal(r.tagihan.overdueCount, 0);
  assert.equal(r.tagihan.dueSoonCount, 0);
  assert.equal(r.tagihan.all.length, 0);
  assert.equal(r.danaTitipan.ok, true);
  assert.equal(r.danaTitipan.warningCount, 0);
  assert.equal(r.danaTitipan.all.length, 0);
  assert.equal(r.priorityCount, 1);
});

test('LifeDashboardSummaryAPI.summary(): TagihanReminder.summary() apa adanya jadi field tagihan, overdueCount/dueSoonCount ikut priorityCount', () => {
  const tagihanStub = { total: 2, overdueCount: 1, dueSoonCount: 1, all: [{ id: 'a' }] };
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified() },
    TagihanReminder: { summary: () => tagihanStub },
  });
  const r = api.summary();
  assert.equal(r.tagihan, tagihanStub);
  assert.equal(r.priorityCount, 1 + 1); // tagihanOverdue+tagihanDueSoon
});

test('LifeDashboardSummaryAPI.summary(): TitipanReconcile.checkAll() ok:true -> danaTitipan.all kosong, 0 ditambahkan ke priorityCount', () => {
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified() },
    TitipanReconcile: { checkAll: () => ({ ok: true }) },
  });
  const r = api.summary();
  assert.equal(r.danaTitipan.ok, true);
  assert.equal(r.danaTitipan.warningCount, 0);
  assert.equal(r.danaTitipan.all.length, 0);
  assert.equal(r.priorityCount, 0);
});

test('LifeDashboardSummaryAPI.summary(): TitipanReconcile.checkAll() ok:false -> danaTitipan dibungkus 1 item severity warning, +1 ke priorityCount', () => {
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified() },
    TitipanReconcile: { checkAll: () => ({ ok: false, sync: { ok: false } }) },
  });
  const r = api.summary();
  assert.equal(r.danaTitipan.ok, false);
  assert.equal(r.danaTitipan.warningCount, 1);
  assert.equal(r.danaTitipan.all.length, 1);
  assert.equal(r.danaTitipan.all[0].severity, 'warning');
  assert.equal(r.danaTitipan.all[0].type, 'danaTitipan');
  assert.equal(r.priorityCount, 1);
});

test('LifeDashboardSummaryAPI.summary(): ShopRestockReminder belum dimuat -> shopRestock default kosong, priorityCount TIDAK berubah', () => {
  const api = lifeCtx({ UnifiedSummaryAPI: { summary: () => baseUnified() } });
  const r = api.summary();
  assert.equal(r.shopRestock.total, 0);
  assert.equal(r.shopRestock.overdueCount, 0);
  assert.equal(r.shopRestock.dueSoonCount, 0);
  assert.equal(r.shopRestock.all.length, 0);
});

test('LifeDashboardSummaryAPI.summary(): ShopRestockReminder.summary() apa adanya jadi field shopRestock, overdueCount/dueSoonCount ikut priorityCount', () => {
  const shopStub = { total: 2, overdueCount: 1, dueSoonCount: 1, all: [{ id: 'a' }] };
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified() },
    ShopRestockReminder: { summary: () => shopStub },
  });
  const r = api.summary();
  assert.equal(r.shopRestock, shopStub);
  assert.equal(r.priorityCount, 1 + 1);
});

// --- PriorityEngine ---------------------------------------------------

function priorityCtx(LifeDashboardSummaryAPI) {
  const ctx = loadSource(['modules/cross/priority-engine.js'], { LifeDashboardSummaryAPI }, ['PriorityEngine']);
  return ctx.PriorityEngine;
}

test('PriorityEngine.getItems(): s.tagihan/s.danaTitipan tidak ada (mock lama tanpa field ini) -> tidak throw, item lain tetap seperti sebelumnya', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } }, vehicle: { ok: true, reminder: { all: [] } } }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].kind, 'finance');
});

test('PriorityEngine.getItems(): urutan lengkap = vehicle overdue -> piutangUtang overdue -> tagihan overdue -> finance over -> vehicle due-soon -> piutangUtang due-soon -> tagihan due-soon -> danaTitipan warning', () => {
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
      tagihan: { all: [
        { name: 'Listrik', severity: 'overdue', message: 't-overdue' },
        { name: 'Internet', severity: 'due-soon', message: 't-duesoon' },
      ] },
      danaTitipan: { all: [
        { severity: 'warning', message: 'gap' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,piutangUtang:overdue,tagihan:overdue,finance:over,vehicle:due-soon,piutangUtang:due-soon,tagihan:due-soon,danaTitipan:warning');
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 8);
});

test('PriorityEngine.getItems(): urutan lengkap = vehicle overdue -> piutangUtang overdue -> tagihan overdue -> shopRestock overdue -> finance over -> vehicle due-soon -> piutangUtang due-soon -> tagihan due-soon -> shopRestock due-soon -> danaTitipan warning', () => {
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
      tagihan: { all: [
        { name: 'Listrik', severity: 'overdue', message: 't-overdue' },
        { name: 'Internet', severity: 'due-soon', message: 't-duesoon' },
      ] },
      shopRestock: { all: [
        { name: 'Cobek', severity: 'overdue', message: 's-overdue' },
        { name: 'Lumpang', severity: 'due-soon', message: 's-duesoon' },
      ] },
      danaTitipan: { all: [
        { severity: 'warning', message: 'gap' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,piutangUtang:overdue,tagihan:overdue,shopRestock:overdue,finance:over,vehicle:due-soon,piutangUtang:due-soon,tagihan:due-soon,shopRestock:due-soon,danaTitipan:warning');
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 10);
});

test('PriorityEngine.getItems(): shopRestock.all difilter HANYA severity overdue/due-soon, severity lain diabaikan', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      shopRestock: { all: [
        { name: 'A', severity: 'overdue', message: 'a' },
        { name: 'B', severity: 'aman', message: 'b' },
        { name: 'C', severity: 'due-soon', message: 'c' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'shopRestock:overdue,shopRestock:due-soon');
});

test('PriorityEngine.getItems(): tagihan.all difilter HANYA severity overdue/due-soon, severity lain diabaikan', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      tagihan: { all: [
        { name: 'A', severity: 'overdue', message: 'a' },
        { name: 'B', severity: 'ok', message: 'b' },
        { name: 'C', severity: 'due-soon', message: 'c' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'tagihan:overdue,tagihan:due-soon');
});

test('PriorityEngine.getItems(): danaTitipan.all TANPA severity warning (mis. hanya "ok") diabaikan total', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      danaTitipan: { all: [{ severity: 'ok', message: 'aman' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.items.length, 0);
});
