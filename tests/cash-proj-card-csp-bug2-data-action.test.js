'use strict';
/**
 * tests/cash-proj-card-csp-bug2-data-action.test.js — Sesi Fix Bug #2 (2026-09-07).
 *
 * Konteks: CSP `script-src-attr 'none'` memblokir semua atribut onclick=/onchange=
 * inline. Kartu "💰 Proyeksi Kas Bulan Ini" (`_renderCashProjectionCard()`,
 * modules/shared/modules-render.js) masih pakai 10 onclick inline (termasuk
 * tombol "Detail ▾") sehingga mati total di browser dgn CSP ketat. Sesi ini
 * memigrasi SEMUANYA ke dispatcher `data-action`/`data-args` yang sudah ada &
 * aktif di codebase (0 fungsi/logika baru selain `_dashCashProjToggleDetail()`,
 * yang cuma exact-preserve toggle lama).
 *
 * Cakupan test:
 * 1) 0 atribut onclick=/onchange= tersisa di HTML hasil render kartu ini.
 * 2) Tiap 10 elemen interaktif punya data-action yang benar (+ data-args utk
 *    3 panggilan showFilteredTx yang bawa parameter).
 * 3) `_dashCashProjToggleDetail()` — fungsi baru — exact-preserve perilaku
 *    toggle class 'u-dnone' yang lama (guard elemen absen -> tidak throw).
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

function escapeHtmlMirror(str) {
  // Mirror persis modules/shared/helper-teks.js#escapeHtml — sandbox VM di
  // bawah TIDAK me-load file itu (pola sama test cash-projection-* lain).
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function makeEl(id) {
  return { id, innerHTML: '', classList: { list: new Set(), toggle(c){ this.list.has(c)?this.list.delete(c):this.list.add(c); }, remove(c){ this.list.delete(c); } } };
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
    escapeHtml: escapeHtmlMirror,
  };
  vm.createContext(context);
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  const snippet = `${extractFnSource('_dashCashProjSettingsToggle')}\n${extractFnSource('_renderPolaAbsenBlock')}\n${extractFnSource('_dashCashProjMoMHtml')}\n${extractFnSource('_dashCashProjInsightHtml')}\n${extractFnSource('_dashCashProjSparklineHtml')}\n${extractFnSource('_dashCashProjCalibrationHtml')}\n${extractFnSource('_dashCashProjForecastHtml')}\n${extractFnSource('_renderCashProjectionCard')}\n${extractFnSource('_dashCashProjToggleDetail')}\nthis._renderCashProjectionCard = _renderCashProjectionCard;\nthis._dashCashProjToggleDetail = _dashCashProjToggleDetail;`;
  vm.runInContext(snippet, context, { filename: '_renderCashProjectionCard-extract.js' });
  return { context, byId };
}

function renderCardHtml() {
  const D = { transactions: [], bills: [], workDays: [] };
  const { context, byId } = loadCardSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  return { html: el.innerHTML, context, byId };
}

test('_renderCashProjectionCard() — 0 atribut onclick= tersisa di HTML kartu (CSP script-src-attr none)', () => {
  const { html } = renderCardHtml();
  assert.doesNotMatch(html, /\ onclick=/);
});

test('_renderCashProjectionCard() — 0 atribut onchange= tersisa di HTML kartu (CSP script-src-attr none)', () => {
  const { html } = renderCardHtml();
  assert.doesNotMatch(html, /\ onchange=/);
});

test('_renderCashProjectionCard() — tombol "Detail ▾" pakai data-action="_dashCashProjToggleDetail" (Bug #2, headline)', () => {
  const { html } = renderCardHtml();
  assert.match(html, /Detail ▾<\/button>/);
  assert.match(html, /data-action="_dashCashProjToggleDetail"[^>]*>Detail ▾/);
});

test('_renderCashProjectionCard() — Proyeksi Gaji/Sisa Kewajiban/Kiriman Mingguan pakai data-action="_dashCashProjOpenDetail" (3x)', () => {
  const { html } = renderCardHtml();
  const matches = html.match(/data-action="_dashCashProjOpenDetail"/g) || [];
  assert.equal(matches.length, 3, 'harus ada tepat 3 pemicu _dashCashProjOpenDetail (Proyeksi Gaji, Sisa Kewajiban, Kiriman Mingguan)');
});

test('_renderCashProjectionCard() — Pemasukan/Pengeluaran Bulan Ini pakai data-action="showFilteredTx" dgn data-args benar', () => {
  const { html } = renderCardHtml();
  assert.match(html, /data-action="showFilteredTx" data-args="[^"]*"><div class="stat-label">Pemasukan Bulan Ini/);
  assert.match(html, /data-action="showFilteredTx" data-args="[^"]*"><div class="stat-label">Pengeluaran Bulan Ini/);
  // data-args harus JSON valid (setelah unescape entity) & argumen sesuai onclick lama.
  const incMatch = html.match(/data-args="([^"]*)"><div class="stat-label">Pemasukan Bulan Ini/);
  const rawInc = incMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  assert.deepEqual(JSON.parse(rawInc), ['dashboard', 'income', 'Pemasukan Bulan Ini']);
  const expMatch = html.match(/data-args="([^"]*)"><div class="stat-label">Pengeluaran Bulan Ini/);
  const rawExp = expMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  assert.deepEqual(JSON.parse(rawExp), ['dashboard', 'expense', 'Pengeluaran Bulan Ini']);
});

test('_renderCashProjectionCard() — di dalam blok Detail: Gaji Tercatat pakai showFilteredTx, Gaji Pending/Total Kewajiban/Sudah Dibayar pakai data-action masing-masing', () => {
  const { html } = renderCardHtml();
  const gajiTercatatMatch = html.match(/data-args="([^"]*)"><div class="stat-label">Gaji Tercatat/);
  assert.ok(gajiTercatatMatch, 'Gaji Tercatat harus punya data-args showFilteredTx');
  const rawGaji = gajiTercatatMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  assert.deepEqual(JSON.parse(rawGaji), ['dashboard', 'gaji', 'Gaji Tercatat Bulan Ini']);
  assert.match(html, /data-action="_dashCashProjGoToAbsensi"><div class="stat-label">Gaji Pending/);
  const tagihanMatches = html.match(/data-action="_dashCashProjGoToTagihan"/g) || [];
  assert.equal(tagihanMatches.length, 2, 'harus ada tepat 2 pemicu _dashCashProjGoToTagihan (Total Kewajiban, Sudah Dibayar)');
});

test('_dashCashProjToggleDetail() — toggle class u-dnone pada #dashCashProjDetailBody (exact-preserve toggle lama)', () => {
  const { context, byId } = loadCardSandbox({ transactions: [], bills: [], workDays: [] });
  const body = makeEl('dashCashProjDetailBody');
  body.classList.list.add('u-dnone');
  byId[body.id] = body;
  context._dashCashProjToggleDetail();
  assert.equal(body.classList.list.has('u-dnone'), false, 'toggle pertama harus membuka (hapus u-dnone)');
  context._dashCashProjToggleDetail();
  assert.equal(body.classList.list.has('u-dnone'), true, 'toggle kedua harus menutup lagi (tambah u-dnone)');
});

test('_dashCashProjToggleDetail() — elemen #dashCashProjDetailBody absen -> tidak throw (guard SILENT)', () => {
  const { context } = loadCardSandbox({ transactions: [], bills: [], workDays: [] });
  assert.doesNotThrow(() => context._dashCashProjToggleDetail());
});
