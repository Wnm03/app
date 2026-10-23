'use strict';
// S2707 — batas performa (performance budget) untuk jalur panas hasil optimasi S2702–S2706.
// Prinsip: menghitung OPERASI (konstruksi Date, regex, normalisasi string, panggilan pencocokan), bukan waktu jam,
// supaya deterministik di mesin mana pun. Satu cek jam-dinding sangat longgar sebagai jaring pengaman terakhir.
// Kalau optimasi hilang diam-diam di patch berikutnya, tes ini gagal. Terbukti gagal pada implementasi lama
// (lihat tests/fixtures/*-original.js) — tes mutasi dijalankan manual saat dibuat.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const SRC = {
  calc: process.env.S2707_CALC || 'modules/shared/modules-calc.js',
  helpers: process.env.S2707_HELPERS || 'modules/shared/features-helpers-global-security.js',
  catalog: process.env.S2707_CATALOG || 'modules/vehicle/service-input-catalog.js'
};

// Date yang menghitung konstruksi di dalam realm vm.
const COUNTING_PRELUDE = `
  globalThis.__dateNew = 0;
  const __D = Date;
  globalThis.Date = new Proxy(__D, { construct(t, a, nt) { globalThis.__dateNew++; return Reflect.construct(t, a, nt); } });
`;

function makeTxs(n, now) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ date: new Date(now - (i % 600) * 86400000).toISOString().slice(0, 10), amount: 1000, category: 'a' });
  return out;
}

test('getCachedTxDateMs: putaran kedua atas 5.000 transaksi tanpa regex & tanpa Date baru', () => {
  const file = read(SRC.helpers);
  const a = file.indexOf('const _txDateCache='), b = file.indexOf('function _perfMark');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(COUNTING_PRELUDE + file.slice(a, b) + `
    globalThis.f = getCachedTxDateMs; globalThis.__match = 0;
    const _m = String.prototype.match; String.prototype.match = function () { globalThis.__match++; return _m.apply(this, arguments); };`, ctx);
  const txs = makeTxs(5000, Date.now());
  txs.forEach((t) => ctx.f(t));
  const m0 = ctx.__match, d0 = ctx.__dateNew;
  assert.ok(m0 >= 5000 && d0 >= 5000, 'penghitung aktif pada putaran pertama');
  for (let k = 0; k < 4; k++) txs.forEach((t) => ctx.f(t));
  assert.equal(ctx.__match - m0, 0, 'regex pada cache hit');
  assert.equal(ctx.__dateNew - d0, 0, 'Date baru pada cache hit');
});

function loadCalc(txs, fi) {
  const file = read(SRC.calc);
  const cache = new WeakMap();
  const ctx = {
    console, window: {}, document: {}, localStorage: {},
    D: { transactions: txs, finansialFreedom: fi || { avgMonths: 12 } },
    getCachedTxDateMs: (t) => { if (!t) return NaN; let v = cache.get(t); if (v === undefined) { v = new Date(t.date).getTime(); cache.set(t, v); } return v; },
    budgetMatchesTx: () => true, totalAssetValue: () => 0, totalSaldoAkun: () => 0, totalPiutangValue: () => 0
  };
  vm.createContext(ctx);
  vm.runInContext(COUNTING_PRELUDE + file + '\nthis.FI=FI;', ctx);
  return ctx;
}

test('FI.annualExpense & monthsOfDataAvailable: konstruksi Date tidak tumbuh seiring jumlah transaksi', () => {
  const ctx = loadCalc(makeTxs(5000, Date.now()));
  ctx.FI.annualExpense(); ctx.FI.monthsOfDataAvailable();            // pemanasan (cache tanggal diisi)
  const before = ctx.__dateNew;
  ctx.FI.annualExpense();
  const forExpense = ctx.__dateNew - before;
  const b2 = ctx.__dateNew;
  ctx.FI.monthsOfDataAvailable();
  const forMonths = ctx.__dateNew - b2;
  assert.ok(forExpense <= 10, 'annualExpense membuat ' + forExpense + ' Date (batas 10)');
  assert.ok(forMonths <= 5, 'monthsOfDataAvailable membuat ' + forMonths + ' Date (batas 5)');
});

test('ServiceInputCatalog.infer: normalisasi nama tidak diulang per panggilan', () => {
  const file = read(SRC.catalog);
  const groups = require('../modules/vehicle/service-master-data.generated.js').SERVICE_CHECKLIST_GROUPS;
  const ctx = { console, window: null, escapeHtml: (x) => String(x), SERVICE_CHECKLIST_GROUPS: groups };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(file, ctx);
  vm.runInContext(`globalThis.__lc = 0; const _l = String.prototype.toLowerCase; String.prototype.toLowerCase = function () { globalThis.__lc++; return _l.apply(this, arguments); };`, ctx);
  const texts = ['busi', 'oli mesin', 'kampas rem depan', 'v-belt', 'filter udara', 'aki', 'rantai', 'ban belakang', 'lampu', 'tidak ada'];
  texts.forEach((q) => ctx.ServiceInputCatalog.infer(q));            // pemanasan
  const before = ctx.__lc;
  for (let k = 0; k < 200; k++) texts.forEach((q) => ctx.ServiceInputCatalog.infer(q));
  const used = ctx.__lc - before;
  // 2.000 panggilan; implementasi lama menormalisasi ~100 nama per panggilan (>100.000).
  assert.ok(used <= 4000, 'toLowerCase dipanggil ' + used + 'x untuk 2.000 infer (batas 4.000)');
});

test('jaring pengaman jam-dinding (sangat longgar): annualExpense 25.000 transaksi < 400 ms', () => {
  const ctx = loadCalc(makeTxs(25000, Date.now()));
  ctx.FI.annualExpense();
  const s = process.hrtime.bigint();
  ctx.FI.annualExpense();
  const ms = Number(process.hrtime.bigint() - s) / 1e6;
  assert.ok(ms < 400, 'annualExpense ' + ms.toFixed(1) + ' ms');
});
