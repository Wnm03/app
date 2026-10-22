'use strict';
// tests/dashboard-hub-overview-s2612.test.js — Pusat Pantau Beranda
// (modules/dashboard-hub/dashboard-hub-overview.js). Presenter read-only:
// mengelompokkan PriorityEngine per domain, membangun tile domain, dan tren 6 bulan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function makeCtx(extra) {
  const els = {};
  const document = { getElementById: (id) => (els[id] || (els[id] = { innerHTML: '', style: {}, textContent: '' })) };
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-overview.js'],
    Object.assign({ document, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(Math.abs(n || 0)) }, extra), ['DashboardHubOverview']);
  return { ctx, els };
}
const ov = (c) => c.DashboardHubOverview || c.window.DashboardHubOverview;

test('attentionGroups: item PriorityEngine dikelompokkan per domain, dihitung & diurut', () => {
  const items = [
    { kind: 'vehicle', severity: 'due-soon', message: 'Servis A' },
    { kind: 'vehicle', severity: 'due-soon', message: 'Servis B' },
    { kind: 'tagihan', severity: 'overdue', name: 'PLN', message: 'PLN lewat' },
    { kind: 'finance', severity: 'over', name: 'Makan' },
    { kind: 'financialRisk', severity: 'warning', domain: 'cashflow_budget', message: 'dobel anggaran' },
    { kind: 'financialRisk', severity: 'warning', domain: 'health', message: 'Skor 42' },
  ];
  const { ctx } = makeCtx({ D: { transactions: [{}, {}, {}], kmLogs: [{}] }, PriorityEngine: { getItems: () => ({ ok: true, items }) } });
  const g = ov(ctx).attentionGroups();
  assert.equal(JSON.stringify(g.map((x) => x.key)), JSON.stringify(['tagihan', 'finance', 'vehicle', 'financialRisk']));
  assert.equal(g.find((x) => x.key === 'vehicle').count, 2);
  assert.equal(g.find((x) => x.key === 'tagihan').worst, 'danger');
  const risk = g.find((x) => x.key === 'financialRisk');
  assert.equal(risk.count, 1, 'risiko anggaran tidak dihitung dobel dengan grup Anggaran');
  assert.equal(risk.message, 'Skor 42');
});

test('attentionGroups: akun baru tanpa data tidak dibanjiri peringatan kendaraan/risiko semu', () => {
  const items = [{ kind: 'vehicle', severity: 'due-soon', message: 'x' }, { kind: 'financialRisk', severity: 'warning', domain: 'health', message: 'y' }, { kind: 'tagihan', severity: 'overdue', message: 'z' }];
  const g = ov(makeCtx({ D: { transactions: [] }, PriorityEngine: { getItems: () => ({ ok: true, items }) } }).ctx).attentionGroups();
  assert.equal(JSON.stringify(g.map((x) => x.key)), JSON.stringify(['tagihan']));
});

test('attentionGroups: PriorityEngine tidak ada / gagal -> tidak throw', () => {
  assert.equal(ov(makeCtx({ D: {} }).ctx).attentionGroups().length, 0);
  const bad = makeCtx({ D: {}, PriorityEngine: { getItems: () => { throw new Error('x'); } } }).ctx;
  assert.equal(ov(bad).attentionGroups().length, 0);
});

test('renderAttention: kosong -> pesan aman; ada item -> tombol per domain + badge total', () => {
  const a = makeCtx({ D: {}, PriorityEngine: { getItems: () => ({ ok: true, items: [] }) } });
  ov(a.ctx).renderAttention();
  assert.match(a.els.dashHubAttentionBody.innerHTML, /Semua domain aman/);
  const b = makeCtx({ D: {}, PriorityEngine: { getItems: () => ({ ok: true, items: [{ kind: 'zakat', severity: 'warning', message: 'wajib' }] }) } });
  ov(b.ctx).renderAttention();
  assert.match(b.els.dashHubAttentionBody.innerHTML, /DashboardHubOverview\.go/);
  assert.equal(b.els.dashHubAttentionBadge.textContent, '1');
});

test('tiles: arus kas dihitung dari transaksi bulan berjalan; domain tanpa data tidak muncul', () => {
  const now = new Date(); const d = (n) => new Date(now.getFullYear(), now.getMonth(), n, 12).toISOString().slice(0, 10);
  const D = { transactions: [
    { type: 'income', amount: 1000, date: d(1) }, { type: 'expense', amount: 400, date: d(2) },
    { type: 'expense', amount: 999, date: d(3), hitungKas: false },
  ], bills: [], vehicles: [] };
  const { ctx } = makeCtx({ D });
  const tiles = ov(ctx).tiles();
  assert.equal(tiles.length, 1);
  assert.equal(tiles[0].title, 'Arus Kas Bulan Ini');
  assert.equal(tiles[0].main, 'Rp 600');
  assert.ok(tiles[0].rows.some((r) => r[0] === 'Tingkat tabungan' && r[1] === '60%'));
});

test('renderTiles: tanpa data sama sekali -> empty state, tidak throw', () => {
  const { ctx, els } = makeCtx({ D: { transactions: [], bills: [], vehicles: [] } });
  ov(ctx).renderTiles();
  assert.match(els.dashHubOverviewTiles.innerHTML, /Belum ada data/);
});

test('renderTrend: 6 kolom bulan + rata-rata; kosong -> pesan', () => {
  const now = new Date();
  const D = { transactions: [{ type: 'income', amount: 500, date: now.toISOString().slice(0, 10) }, { type: 'expense', amount: 200, category: 'Makan', date: now.toISOString().slice(0, 10) }] };
  const a = makeCtx({ D });
  ov(a.ctx).renderTrend();
  assert.equal((a.els.dashHubTrendBody.innerHTML.match(/dhb-tr-col/g) || []).length, 6);
  assert.match(a.els.dashHubTrendBody.innerHTML, /Makan/);
  const b = makeCtx({ D: { transactions: [] } });
  ov(b.ctx).renderTrend();
  assert.match(b.els.dashHubTrendBody.innerHTML, /Belum ada transaksi/);
});

test('wiring: file terdaftar di build, container ada di HTML, ownership card & cross card tidak lagi di Beranda', () => {
  assert.match(read('scripts/build.js'), /dashboard-hub\/dashboard-hub-overview\.js/);
  const html = read('index.html');
  for (const id of ['dashHubOverviewWrap', 'dashHubOverviewTiles', 'dashHubTrendWrap', 'dashHubTrendBody', 'dashHubAttentionBadge']) assert.ok(html.includes('id="' + id + '"'), id);
  assert.ok(!html.includes('id="dashHubOwnershipSummaryCard"'));
  const hub = read('modules/dashboard-hub/dashboard-hub.js');
  assert.match(hub, /ringkasan: \['dashHubOverviewWrap'\]/);
  assert.doesNotMatch(hub, /safe\('CrossDashboardCard'/);
});

test('read-only: presenter tidak menulis data (save/D.*= )', () => {
  const src = read('modules/dashboard-hub/dashboard-hub-overview.js');
  assert.doesNotMatch(src, /\bsave\(/);
  assert.doesNotMatch(src, /\bD\.\w+\s*=[^=]/);
});
