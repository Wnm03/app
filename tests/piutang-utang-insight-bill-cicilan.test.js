'use strict';
// tests/piutang-utang-insight-bill-cicilan.test.js — cakupan KW-170 lanjutan:
// PiutangUtangInsight (modules/ai/feature-insights.js) ikut cek cicilan
// barang (D.bills kind:'cicilan') utk insight "jatuh tempo dekat" & hasData,
// tidak cuma D.debts kayak sebelumnya. Fokus test: compute()/render()-nya
// baca getElementById cuma di render() (bukan compute()), jadi compute()
// aman dites murni; render() dites lewat cek tidak error saat container
// tidak ada (pola guard `if(!card||!box)return` di FeatureInsightUI).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/helper-teks.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js', 'modules/finance/piutang-utang.js', 'modules/ai/feature-insights.js'],
    { D },
    ['Debt', 'PiutangUtangInsight']
  );
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

test('compute() — cicilan barang jatuh tempo 3 hari lagi ikut muncul sbg insight, walau D.debts kosong', () => {
  const D = {
    debts: [],
    piutang: [],
    bills: [{ id: 'b1', name: 'Cicilan Kulkas', kind: 'cicilan', sisaTenor: 4, amount: 200000, nextDue: inDays(3) }],
  };
  const ctx = makeCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  const hit = out.find((x) => x.id === 'debt-due-bill-b1');
  assert.ok(hit, 'insight cicilan barang jatuh tempo harus ada');
  assert.match(hit.text, /Cicilan Kulkas/);
});

test('compute() — cicilan barang jatuh tempo LEBIH dekat dari utang formal -> yang dipilih cicilan barang', () => {
  const D = {
    debts: [{ id: 'd1', name: 'KTA', nilai: 1000000, lunas: false, jatuhTempo: inDays(6) }],
    piutang: [],
    bills: [{ id: 'b1', name: 'Cicilan Kulkas', kind: 'cicilan', sisaTenor: 4, amount: 200000, nextDue: inDays(2) }],
  };
  const ctx = makeCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  const dueInsights = out.filter((x) => x.id.startsWith('debt-due'));
  assert.equal(dueInsights.length, 1, 'cuma 1 insight jatuh-tempo yg diambil (paling dekat)');
  assert.equal(dueInsights[0].id, 'debt-due-bill-b1');
});

test('compute() — tidak ada yg jatuh tempo dekat (D.debts & bills kosong/jauh) -> tidak ada insight debt-due', () => {
  const D = { debts: [], piutang: [], bills: [] };
  const ctx = makeCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  assert.equal(out.filter((x) => x.id.startsWith('debt-due')).length, 0);
});
