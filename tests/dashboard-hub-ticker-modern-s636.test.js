'use strict';
// tests/dashboard-hub-ticker-modern-s636.test.js — cakupan Sesi s636
// (RENCANA-MODERNISASI-UI.md): pilot ticker strip ringkasan di Beranda
// (modules/dashboard-hub/dashboard-hub.js, DashboardHubTickerModern).
// MURNI TAMPILAN — 100% reuse _dashHubMonthTxShared() yang sudah dipakai
// DashboardHubSummary/DashboardHubAnalytics (S636 tidak menambah rumus
// baru). Visibilitas section ini didelegasikan ke CSS (gate
// [data-theme="modern"] .dashhub-ticker di styles.css) — TIDAK dites di
// sini krn loadSource() tidak menjalankan CSS, cuma diverifikasi bahwa
// render() sendiri tidak throw & datanya benar; gate CSS-nya diverifikasi
// terpisah lewat pengecekan string di styles.css.test.js kalau ada, atau
// cukup baca styles.css langsung.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function baseD(extra) {
  return Object.assign({ transactions: [] }, extra);
}

function makeEl() {
  return { innerHTML: '' };
}

function makeCtx(D, { withContainer = true } = {}) {
  const tickerEl = withContainer ? makeEl() : null;
  const byId = { dashHubTickerModern: tickerEl };
  const document = {
    getElementById: (id) => (Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null),
  };
  const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  const ctx = loadSource(
    ['modules/dashboard-hub/dashboard-hub.js'],
    { D, document, fmt, escapeHtml: (s) => String(s) },
    ['DashboardHubTickerModern'],
  );
  return { ctx, tickerEl };
}

test('render() — tidak throw kalau container #dashHubTickerModern tidak ada', () => {
  const { ctx } = makeCtx(baseD(), { withContainer: false });
  assert.doesNotThrow(() => ctx.DashboardHubTickerModern.render());
});

test('render() — tidak throw & tampil 0 kalau D.transactions kosong', () => {
  const { ctx, tickerEl } = makeCtx(baseD());
  assert.doesNotThrow(() => ctx.DashboardHubTickerModern.render());
  assert.match(tickerEl.innerHTML, /Rp 0/);
  assert.match(tickerEl.innerHTML, />0</); // jumlah transaksi
});

test('render() — reuse _dashHubMonthTxShared(): pemasukan/pengeluaran/bersih bulan berjalan sama persis pola Summary/Analytics', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 500000, date: now.toISOString() },
      { type: 'expense', amount: 200000, date: now.toISOString() },
      // transaksi bulan lalu -- HARUS tidak ikut terhitung (sama seperti Summary/Analytics)
      { type: 'income', amount: 999999, date: new Date(now.getFullYear() - 1, 0, 1).toISOString() },
    ],
  });
  const { ctx, tickerEl } = makeCtx(D);
  ctx.DashboardHubTickerModern.render();
  assert.match(tickerEl.innerHTML, /Rp 500\.000/);
  assert.match(tickerEl.innerHTML, /Rp 200\.000/);
  assert.match(tickerEl.innerHTML, /Rp 300\.000/); // bersih = 500rb - 200rb
  assert.doesNotMatch(tickerEl.innerHTML, /999\.999/);
});

test('render() — bersih negatif dapat class "red", bersih/positif dapat class "green" (pola sama Summary Cards)', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 100000, date: now.toISOString() },
      { type: 'expense', amount: 400000, date: now.toISOString() },
    ],
  });
  const { ctx, tickerEl } = makeCtx(D);
  ctx.DashboardHubTickerModern.render();
  assert.match(tickerEl.innerHTML, /stat-val red">-Rp 300\.000/);
});

test('render() — 4 item ditampilkan: Masuk, Keluar, Bersih, Transaksi', () => {
  const { ctx, tickerEl } = makeCtx(baseD());
  ctx.DashboardHubTickerModern.render();
  ['Masuk', 'Keluar', 'Bersih', 'Transaksi'].forEach((label) => {
    assert.match(tickerEl.innerHTML, new RegExp(label));
  });
});

test('DashboardHub.render() memanggil DashboardHubTickerModern.render() (dipanggil dari pipeline utama, guard typeof)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
  assert.match(src, /if \(typeof DashboardHubTickerModern !== 'undefined'\) DashboardHubTickerModern\.render\(\);/);
});

test('CSS — .dashhub-ticker default display:none & tampil khusus [data-theme="modern"]', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.dashhub-ticker\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(css, /\[data-theme="modern"\]\s*\.dashhub-ticker\s*\{\s*display:\s*flex;?\s*\}/);
});

test('index.html — container #dashHubTickerModern ada, sebelum #dashHubQuickActions (posisi tepat setelah Hero Card)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const idxTicker = html.indexOf('id="dashHubTickerModern"');
  const idxQa = html.indexOf('id="dashHubQuickActions"');
  const idxHero = html.indexOf('id="dashHubHeroCard"');
  assert.ok(idxTicker !== -1, 'container ticker harus ada di index.html');
  assert.ok(idxHero < idxTicker, 'ticker harus setelah Hero Card');
  assert.ok(idxTicker < idxQa, 'ticker harus sebelum Quick Actions');
});
