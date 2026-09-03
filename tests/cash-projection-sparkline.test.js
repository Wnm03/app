'use strict';
// tests/cash-projection-sparkline.test.js — Sesi audit-kartu-proyeksi-kas-insight
// (item besar-effort #9, sparkline tren beberapa bulan). Cakupan:
// 1) getCashProjectionTrend() (modules/finance/cash-projection.js) — fungsi murni,
//    0 rumus baru, cuma memanggil getMonthlyCashProjection() berulang.
// 2) _dashCashProjSparklineHtml() (modules/shared/modules-render.js) — presenter,
//    dirender sbg inline SVG polyline.
// 3) _renderCashProjectionCard() — sparkline WAJIB tampil di kartu (di luar blok
//    Detail yang di-toggle, supaya kelihatan tanpa expand).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'), 'utf8');
const SRC_BILL = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');
const SRC_PROJ = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'cash-projection.js'), 'utf8');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    debts: [],
    profile: {},
  }, overrides);
}

function makeProjCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D }
  );
}

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

function loadCardSandbox(D) {
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
  const snippet = `${extractFnSource('_dashCashProjSettingsToggle')}\n${extractFnSource('_renderPolaAbsenBlock')}\n${extractFnSource('_dashCashProjMoMHtml')}\n${extractFnSource('_dashCashProjInsightHtml')}\n${extractFnSource('_dashCashProjSparklineHtml')}\n${extractFnSource('_dashCashProjCalibrationHtml')}\n${extractFnSource('_dashCashProjForecastHtml')}\n${extractFnSource('_renderCashProjectionCard')}\nthis._renderCashProjectionCard = _renderCashProjectionCard;`;
  vm.runInContext(snippet, context, { filename: '_renderCashProjectionCard-extract.js' });
  return { context, byId };
}

// --- getCashProjectionTrend() ---

test('getCashProjectionTrend() — default 6 bulan, kronologis (bulan tertua duluan, target di akhir)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const trend = ctx.getCashProjectionTrend(6, 2026, {}); // Juli 2026 (0-index bulan 6)
  assert.equal(trend.length, 6);
  assert.equal(trend[trend.length - 1].month, 6);
  assert.equal(trend[trend.length - 1].year, 2026);
  assert.equal(trend[0].month, 1); // 5 bulan mundur dari Juli = Februari
  assert.equal(trend[0].year, 2026);
});

test('getCashProjectionTrend() — wrap tahun mundur (Januari - 5 bulan -> Agustus tahun lalu)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const trend = ctx.getCashProjectionTrend(0, 2026, {}); // Januari 2026
  assert.equal(trend.length, 6);
  assert.equal(trend[0].month, 7); // Agustus tahun lalu (0-index 7)
  assert.equal(trend[0].year, 2025);
  assert.equal(trend[trend.length - 1].month, 0);
  assert.equal(trend[trend.length - 1].year, 2026);
});

test('getCashProjectionTrend() — monthsBack custom (3 bulan)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const trend = ctx.getCashProjectionTrend(6, 2026, {}, 3);
  assert.equal(trend.length, 3);
  assert.equal(trend[0].month, 4); // Mei
  assert.equal(trend[trend.length - 1].month, 6); // Juli
});

test('getCashProjectionTrend() — tiap titik konsisten dgn panggilan getMonthlyCashProjection() langsung (0 rumus baru)', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 500000, date: '2026-07-05' }],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 200000, nextDue: '2026-07-20' }],
  });
  const ctx = makeProjCtx(D);
  const trend = ctx.getCashProjectionTrend(6, 2026, {});
  const direct = ctx.getMonthlyCashProjection(6, 2026, {});
  const last = trend[trend.length - 1];
  assert.equal(last.proyeksiKas, direct.proyeksiKas);
  assert.equal(last.sisaKewajiban, direct.sisaKewajiban);
});

test('getCashProjectionTrend() — monthsBack<=0 fallback ke default 6', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const trend = ctx.getCashProjectionTrend(6, 2026, {}, 0);
  assert.equal(trend.length, 6);
});

// --- _dashCashProjSparklineHtml() / integrasi ke kartu ---

test('_renderCashProjectionCard() — sparkline tren tampil di kartu (di luar blok Detail toggle)', () => {
  const D = { transactions: [], bills: [], workDays: [] };
  const { context, byId } = loadCardSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.match(el.innerHTML, /Tren Proyeksi Kas/);
  assert.match(el.innerHTML, /<svg/);
  const detailStart = el.innerHTML.indexOf('dashCashProjDetailBody');
  const sparkIdx = el.innerHTML.indexOf('Tren Proyeksi Kas');
  assert.ok(sparkIdx > -1 && sparkIdx < detailStart, 'sparkline harus muncul SEBELUM blok toggle Detail (selalu tampil)');
});

test('_renderCashProjectionCard() — cash-projection.js TIDAK dimuat -> sparkline tidak muncul, kartu tetap render (guard typeof)', () => {
  const byId = Object.create(null);
  const context = {
    console,
    D: { transactions: [], bills: [], workDays: [] },
    document: { getElementById: (id) => byId[id] || null },
    window: {},
    fmtFull: (n) => 'Rp ' + n,
    fmtFullSigned: (n) => 'Rp ' + n,
  };
  vm.createContext(context);
  // Sengaja TIDAK load cash-projection.js -> getMonthlyCashProjection tidak terdefinisi,
  // _renderCashProjectionCard() sudah punya guard early-return sebelum sparkline dipanggil.
  const snippet = `${extractFnSource('_dashCashProjSparklineHtml')}\nthis._dashCashProjSparklineHtml = _dashCashProjSparklineHtml;`;
  vm.runInContext(snippet, context, { filename: 'sparkline-only.js' });
  assert.doesNotThrow(() => context._dashCashProjSparklineHtml({ m: 6, y: 2026 }, {}));
  assert.equal(context._dashCashProjSparklineHtml({ m: 6, y: 2026 }, {}), '');
});

test('_dashCashProjSparklineHtml() — polyline berisi N titik sesuai panjang trend (6 bulan default)', () => {
  const D = { transactions: [], bills: [], workDays: [] };
  const { context } = loadCardSandbox(D);
  const html = context._dashCashProjSparklineHtml({ m: 6, y: 2026 }, {});
  const match = html.match(/<polyline points="([^"]*)"/);
  assert.ok(match, 'polyline harus ada di HTML sparkline');
  const points = match[1].trim().split(' ').filter(Boolean);
  assert.equal(points.length, 6);
});
