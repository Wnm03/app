'use strict';
// tests/priority-engine-s286.test.js — S286, prioritas tinggi dari audit
// Regression Test (temuan: priority-engine.js 0 test sama sekali). Engine
// ini murni FILTER+URUTKAN hasil LifeDashboardSummaryAPI.summary() yang
// sudah final (0 rumus baru — lihat komentar di priority-engine.js), jadi
// LifeDashboardSummaryAPI di-mock langsung sbg plain object (tidak perlu
// load file aslinya, konsisten dgn prinsip "getItems() cuma reuse output
// summary(), tidak menghitung ulang apa pun").

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(LifeDashboardSummaryAPI) {
  const ctx = loadSource(
    ['modules/cross/priority-engine.js'],
    LifeDashboardSummaryAPI === undefined ? {} : { LifeDashboardSummaryAPI },
    ['PriorityEngine']
  );
  return ctx.PriorityEngine;
}

function okSummary({ financeItems = [], vehicleAll = [] } = {}) {
  return {
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: financeItems } },
      vehicle: { ok: true, reminder: { all: vehicleAll } },
    }),
  };
}

test('PriorityEngine.getItems(): LifeDashboardSummaryAPI belum dimuat -> ok:false, items/count kosong (tidak throw)', () => {
  const PriorityEngine = makeCtx(undefined);
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, false);
  assert.equal(r.items.length, 0);
  assert.equal(r.count, 0);
});

test('PriorityEngine.getItems(): summary() {ok:false} -> reason diteruskan, items/count kosong', () => {
  const PriorityEngine = makeCtx({ summary: () => ({ ok: false, reason: 'D belum siap' }) });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'D belum siap');
  assert.equal(r.items.length, 0);
});

test('PriorityEngine.getItems(): budget item difilter HANYA yang over===true', () => {
  const PriorityEngine = makeCtx(okSummary({
    financeItems: [{ name: 'Makan', over: true }, { name: 'Hiburan', over: false }, { name: 'Transport', over: true }],
  }));
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  const names = r.items.filter((i) => i.kind === 'finance').map((i) => i.name).join(',');
  assert.equal(names, 'Makan,Transport');
});

test('PriorityEngine.getItems(): vehicle reminder difilter HANYA severity overdue/due-soon, severity lain diabaikan', () => {
  const PriorityEngine = makeCtx(okSummary({
    vehicleAll: [
      { type: 'oli', severity: 'overdue', message: 'Ganti oli telat' },
      { type: 'pajak', severity: 'ok', message: 'Aman' },
      { type: 'ban', severity: 'due-soon', message: 'Cek ban segera' },
    ],
  }));
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'vehicle:overdue,vehicle:due-soon');
});

test('PriorityEngine.getItems(): urutan hasil = vehicle overdue -> finance over -> vehicle due-soon', () => {
  const PriorityEngine = makeCtx(okSummary({
    financeItems: [{ name: 'Makan', over: true }],
    vehicleAll: [
      { type: 'ban', severity: 'due-soon', message: 'Cek ban' },
      { type: 'oli', severity: 'overdue', message: 'Ganti oli' },
    ],
  }));
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,finance:over,vehicle:due-soon');
});

test('PriorityEngine.getItems(): sub-objek finance/vehicle hilang/tidak ok -> diperlakukan kosong, tidak throw', () => {
  const PriorityEngine = makeCtx({
    summary: () => ({ ok: true, finance: { ok: false }, vehicle: null }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 0);
  assert.equal(r.count, 0);
});

test('PriorityEngine.getItems(): count selalu sama dengan items.length', () => {
  const PriorityEngine = makeCtx(okSummary({
    financeItems: [{ name: 'A', over: true }],
    vehicleAll: [{ type: 'x', severity: 'overdue', message: 'm' }],
  }));
  const r = PriorityEngine.getItems();
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 2);
});
