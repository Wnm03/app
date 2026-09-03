'use strict';
/**
 * cash-projection-card-s-p2.test.js — Sesi P2 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-
 * kas.md Track 2, lanjutan Sesi P1). Cakupan: `_renderCashProjectionCard(ctx)`
 * (modules/shared/modules-render.js) — card baru "💰 Proyeksi Kas Bulan Ini", wiring
 * `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`.
 *
 * Fungsi load bareng modules/finance/tagihan-kalender.js + modules/finance/cash-projection.js
 * (dependency getMonthlyCashProjection()) lewat brace-counting manual (pola sama
 * tests/dash-card-show-hide.test.js) supaya `document` tiruan bisa disuntik ke 1 sandbox.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'), 'utf8');
const SRC_BILL = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');
const SRC_PROJ = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'cash-projection.js'), 'utf8');

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

function loadSandbox(D) {
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
  // Load dependency getMonthlyCashProjection() (butuh getBillStats() dst dari tagihan-kalender.js)
  // duluan, baru fungsi render yang di-extract dari modules-render.js.
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  // S667B: _renderCashProjectionCard() sekarang memanggil _dashCashProjSettingsToggle()
  // (panel "⚙️ Atur") -- perlu ikut di-extract, walau di sandbox sempit ini dia balik lebih
  // awal (bodyEl.parentElement undefined -> stub document di bawah tidak set parentElement,
  // pola sama guard `if(!el)return` yang sudah ada), 0 assertion baru dites di sini (cakupan
  // panel Atur ada di tests/cash-projection-s667b-siklus.test.js).
  // Sesi "Proyeksi Pola Absen": _renderCashProjectionCard() sekarang juga memanggil
  // _renderPolaAbsenBlock() (guarded typeof, tapi tetap ikut di-extract di sini spy
  // path normalnya kepakai, bukan cuma fallback string kosong) -- 0 assertion baru
  // dites di sini (cakupan pola absen ada di tests/cash-projection-pola-absen.test.js).
  const snippet = `${extractFnSource('_dashCashProjSettingsToggle')}\n${extractFnSource('_renderPolaAbsenBlock')}\n${extractFnSource('_dashCashProjMoMHtml')}\n${extractFnSource('_dashCashProjInsightHtml')}\n${extractFnSource('_dashCashProjSparklineHtml')}\n${extractFnSource('_dashCashProjCalibrationHtml')}\n${extractFnSource('_dashCashProjForecastHtml')}\n${extractFnSource('_renderCashProjectionCard')}\nthis._renderCashProjectionCard = _renderCashProjectionCard;`;
  vm.runInContext(snippet, context, { filename: '_renderCashProjectionCard-extract.js' });
  return { context, byId };
}

test('_renderCashProjectionCard() — render 3 angka terpisah (kriteria #5: tidak ada mode 1-angka gabungan)', () => {
  const D = {
    transactions: [{ type: 'income', category: 'Penghasilan', note: 'Gaji mingguan dari absensi', amount: 1000000, date: '2026-07-11' }],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 400000, nextDue: '2026-07-20' }],
    workDays: [],
  };
  const { context, byId } = loadSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /Proyeksi Gaji/);
  assert.match(el.innerHTML, /Sisa Kewajiban/);
  assert.match(el.innerHTML, /Proyeksi Kas Bulan Ini/);
  assert.match(el.innerHTML, /Rp\s*1\.000\.000/); // gajiProjected
  assert.match(el.innerHTML, /Rp\s*400\.000/); // kewajibanSisa
  assert.match(el.innerHTML, /Rp\s*600\.000/); // proyeksiKas = 1jt - 400rb
});

test('_renderCashProjectionCard() — proyeksiKas negatif dapat class "red" (bukan "green")', () => {
  const D = {
    transactions: [],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 900000, nextDue: '2026-07-05' }],
    workDays: [],
  };
  const { context, byId } = loadSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /stat-val red/);
  assert.doesNotMatch(el.innerHTML, /stat-val green/);
});

test('_renderCashProjectionCard() — proyeksiKas positif dapat class "green"', () => {
  const D = {
    transactions: [{ type: 'income', category: 'Penghasilan', note: 'Gaji mingguan dari absensi', amount: 2000000, date: '2026-07-11' }],
    bills: [],
    workDays: [],
  };
  const { context, byId } = loadSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /stat-val green/);
});

test('_renderCashProjectionCard() — elemen dashCashProjBody tidak ada di DOM -> tidak throw (guard aman)', () => {
  const { context } = loadSandbox({ transactions: [], bills: [], workDays: [] });
  assert.doesNotThrow(() => context._renderCashProjectionCard({ m: 6, y: 2026 }));
});

test('_renderCashProjectionCard() — dipanggil tanpa ctx sama sekali -> fallback ke bulan/tahun berjalan, tidak throw', () => {
  const { context, byId } = loadSandbox({ transactions: [], bills: [], workDays: [] });
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  assert.doesNotThrow(() => context._renderCashProjectionCard());
  assert.match(el.innerHTML, /Proyeksi Kas Bulan Ini/);
});

// ---- Wiring DASH_CARD_DEFS / DASH_RENDER_ORDER ----

test('DASH_CARD_DEFS — entry "cashProjection" terdaftar dgn elId dashCashProjCard', () => {
  assert.match(SRC_RENDER, /\{key:'cashProjection',label:'💰 Proyeksi Kas Bulan Ini',elId:'dashCashProjCard',render:\(ctx\)=>_renderCashProjectionCard\(ctx\)\}/);
});

test('DASH_RENDER_ORDER — key "cashProjection" ikut terdaftar (supaya benar-benar dirender, bukan cuma checklist Pengaturan)', () => {
  const m = SRC_RENDER.match(/const DASH_RENDER_ORDER=\[([^\]]*)\]/);
  assert.ok(m, 'DASH_RENDER_ORDER tidak ditemukan');
  assert.match(m[1], /'cashProjection'/);
});
