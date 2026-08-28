'use strict';
/**
 * cash-projection-card-s-q3.test.js — Sesi Q3 (AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md,
 * Keputusan #2). Cakupan: `_renderCashProjectionCard(ctx)` (modules/shared/modules-render.js)
 * — metrik ke-4 "Rata-rata Surplus Bulanan" (REUSE fiMonthlySurplus(), 0 rumus baru), SELALU
 * tampil (bukan di balik toggle), + penjelasan singkat beda window dgn "Proyeksi Kas".
 *
 * Sandbox load bareng modules/finance/tagihan-kalender.js + cash-projection.js (dependency lama)
 * DAN modules/shared/modules-calc.js (dependency baru fiMonthlySurplus()/FI.effectiveMonths()),
 * pola sama tests/cash-projection-card-s-q1/q2.test.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'), 'utf8');
const SRC_BILL = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');
const SRC_PROJ = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'cash-projection.js'), 'utf8');
const SRC_CALC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-calc.js'), 'utf8');

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = SRC_RENDER.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = SRC_RENDER.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC_RENDER.length && depth > 0) {
    if (SRC_RENDER[i] === '{') depth++;
    else if (SRC_RENDER[i] === '}') depth--;
    i++;
  }
  return SRC_RENDER.slice(start, i);
}

function makeEl(id) {
  return { id, innerHTML: '' };
}

function loadSandbox(D, withCalc) {
  const byId = Object.create(null);
  const context = {
    console,
    D,
    document: { getElementById: (id) => byId[id] || null },
    window: {},
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('id-ID'),
    fmtFullSigned: (n) => {
      n = Number(n) || 0;
      return (n < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
    },
  };
  vm.createContext(context);
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  if (withCalc) vm.runInContext(SRC_CALC, context, { filename: 'modules-calc.js' });
  // S667B: _renderCashProjectionCard() sekarang memanggil _dashCashProjSettingsToggle()
  // (panel "⚙️ Atur") -- ikut di-extract, lihat komentar sama di cash-projection-card-s-p2.test.js.
  const snippet = `${extractFnSource('_dashCashProjSettingsToggle')}\n${extractFnSource('_renderCashProjectionCard')}\nthis._renderCashProjectionCard = _renderCashProjectionCard;`;
  vm.runInContext(snippet, context, { filename: '_renderCashProjectionCard-extract.js' });
  return { context, byId };
}

test('_renderCashProjectionCard() — "Rata-rata Surplus Bulanan" tampil SELALU (bukan di balik toggle) saat FI dimuat', () => {
  const D = {
    transactions: [
      { type: 'income', amount: 3000000, date: '2026-07-05' },
      { type: 'expense', amount: 1000000, date: '2026-07-06' },
    ],
    bills: [],
    workDays: [],
    finansialFreedom: {},
  };
  const { context, byId } = loadSandbox(D, true);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /Rata-rata Surplus Bulanan/);
  // Bagian ini TIDAK boleh berada di dalam blok dashCashProjDetailBody (yang di-toggle)
  const detailStart = el.innerHTML.indexOf('dashCashProjDetailBody');
  const surplusIdx = el.innerHTML.indexOf('Rata-rata Surplus Bulanan');
  assert.ok(surplusIdx < detailStart, 'surplus harus muncul SEBELUM blok toggle Detail (selalu tampil)');
});

test('_renderCashProjectionCard() — wajib ada penjelasan beda window vs Proyeksi Kas', () => {
  const D = { transactions: [], bills: [], workDays: [] };
  const { context, byId } = loadSandbox(D, true);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /Proyeksi Kas/);
  assert.match(el.innerHTML, /bulan kalender berjalan/);
});

test('_renderCashProjectionCard() — modules-calc.js (FI/fiMonthlySurplus) TIDAK dimuat -> kartu tetap render tanpa metrik surplus, tidak throw', () => {
  const D = { transactions: [], bills: [], workDays: [] };
  const { context, byId } = loadSandbox(D, false); // withCalc=false
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  assert.doesNotThrow(() => context._renderCashProjectionCard({ m: 6, y: 2026 }));
  assert.doesNotMatch(el.innerHTML, /Rata-rata Surplus Bulanan/);
  assert.match(el.innerHTML, /Proyeksi Kas Bulan Ini/); // sisanya tetap render normal
});

test('_renderCashProjectionCard() — 0 regresi: 5 angka Sesi P1/P2/Q1 + breakdown Q2 tetap utuh', () => {
  const D = {
    transactions: [{ type: 'income', category: 'Penghasilan', note: 'Gaji mingguan dari absensi', amount: 1000000, date: '2026-07-11' }],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 400000, nextDue: '2026-07-20' }],
    workDays: [],
  };
  const { context, byId } = loadSandbox(D, true);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026, inc: 1200000, exp: 500000 });
  assert.match(el.innerHTML, /Proyeksi Gaji/);
  assert.match(el.innerHTML, /Sisa Kewajiban/);
  assert.match(el.innerHTML, /Pemasukan Bulan Ini/);
  assert.match(el.innerHTML, /Pengeluaran Bulan Ini/);
  assert.match(el.innerHTML, /Proyeksi Kas Bulan Ini/);
  assert.match(el.innerHTML, /Gaji Tercatat/);
  assert.match(el.innerHTML, /Sudah Dibayar/);
});

test('_renderCashProjectionCard() — elemen dashCashProjBody tidak ada di DOM -> tidak throw (guard aman)', () => {
  const { context } = loadSandbox({ transactions: [], bills: [], workDays: [] }, true);
  assert.doesNotThrow(() => context._renderCashProjectionCard({ inc: 1, exp: 1 }));
});
