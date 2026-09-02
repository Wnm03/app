'use strict';
// tests/s498-dana-titipan-tab-terpadu.test.js — Sesi 498 (Tab "Dana Titipan"
// Terpadu, Sesi A — fondasi tab, lihat AUDIT-DANA-TITIPAN-TAB-TERPADU.md
// §2/§3). Sesi A = murni presenter + orkestrasi, 0 rumus finansial baru, 0
// field baru. Target test:
//   1. DanaTitipanPortfolioPresenter.renderInto(containerId) — generalisasi
//      render() lama, non-breaking (render() = renderInto('danaTitipanPortfolioList')
//      persis seperti sebelumnya, tidak diubah perilakunya).
//   2. Container BARU #danaTitipanTabList bisa dirender via renderInto()
//      dgn output SAMA PERSIS (sumber data sama: DanaTitipanPortfolioAPI.build()).
//   3. Kedua container independen (render ke satu tidak menghapus isi yang lain).
//   4. Cross-check struktural: index.html benar-benar punya sub-tab ke-4
//      "titipan" (tombol + pane + container), LAPORAN_SUBTAB_ORDER/LABEL
//      (tx-list-cashflow.js) dan LAPORAN_SUBTAB_IDX (dashboard-hub.js)
//      konsisten menyertakan 'titipan'.
//   5. setLaporanTab('titipan', ...) toggle visibility pane baru dgn benar
//      (dan sebaliknya, subtab lain toggle pane titipan jadi tersembunyi).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// ============================================================
// DOM tiruan STATEFUL minimal (pola sama tests/s485d-titipan-commitment-ui.test.js)
// ============================================================
function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  el.classList = {
    _set: new Set(),
    toggle(cls, force) {
      const on = force !== undefined ? !!force : !this._set.has(cls);
      if (on) this._set.add(cls); else this._set.delete(cls);
    },
    contains(cls) { return this._set.has(cls); },
    add(cls) { this._set.add(cls); },
    remove(cls) { this._set.delete(cls); },
  };
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    querySelectorAll() { return []; },
    _registry: registry,
  };
}

function makeD(investments, titipanCommitments, titipanReturns) {
  return {
    investments: investments || [],
    investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [],
    titipanCommitments: titipanCommitments || [],
    titipanReturns: titipanReturns || [],
  };
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

// ============================================================
// LAPIS 1 -- renderInto() perilaku dasar
// ============================================================

test('1. render() TETAP delegasi ke renderInto("danaTitipanPortfolioList") -- 0 perubahan perilaku vs S484-486', () => {
  const D = makeD([], [{ ownerId: 'own1', ownerName: 'Budi', principalAmount: 1000000, committedDate: '2026-01-01', notes: '' }]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Budi/, 'render() harus tetap mengisi container lama seperti sebelumnya');
  assert.match(html, /Rp/, 'render() harus tetap menampilkan angka pokok');
});

test('2. renderInto("danaTitipanTabList") -- container BARU, output sama persis (sumber data sama)', () => {
  const D = makeD([], [{ ownerId: 'own1', ownerName: 'Cici', principalAmount: 2000000, committedDate: '2026-01-01', notes: '' }]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanTabList');
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  const html = dom.getElementById('danaTitipanTabList').innerHTML;
  assert.match(html, /Cici/, 'renderInto() ke container baru harus tetap render data owner');
  assert.match(html, /DanaTitipanCommitmentUI\.open/, 'tombol "Catat\\/Update Pokok" (= "+ Tambah Pemilik Titipan" dari rancangan) harus tetap ada');
});

test('3. render() ke container lama TIDAK menghapus/mengubah isi container baru, dan sebaliknya (independen)', () => {
  const D = makeD([], [{ ownerId: 'own1', ownerName: 'Dedi', principalAmount: 500000, committedDate: '2026-01-01', notes: '' }]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  dom.getElementById('danaTitipanTabList');
  ctx.DanaTitipanPortfolioPresenter.render();
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  const htmlOld = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const htmlNew = dom.getElementById('danaTitipanTabList').innerHTML;
  assert.match(htmlOld, /Dedi/);
  assert.match(htmlNew, /Dedi/);
});

test('4. renderInto(): container tidak ada di halaman -- aman diam2ny (pola sama render() lama), tidak throw', () => {
  const D = makeD([], []);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.renderInto('containerYangTidakAda'));
});

// ============================================================
// LAPIS 2 -- cross-check struktural index.html / tx-list-cashflow.js /
// dashboard-hub.js (murni cek teks source, sama pola s485d LAPIS 1)
// ============================================================

test('5. [struktur] index.html: sub-tab ke-4 "titipan" ada -- tombol + pane #laporanTab-titipan + container #danaTitipanTabList', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /data-action="setLaporanTab" data-args='\["titipan", "\$el"\]'/, 'tombol sub-tab "titipan" harus ada');
  assert.match(html, /<div id="laporanTab-titipan"/, 'pane #laporanTab-titipan harus ada');
  assert.match(html, /<div id="danaTitipanTabList">/, 'container #danaTitipanTabList harus ada di dalam pane baru');
  // Pane lama TIDAK boleh hilang/berubah id -- Sesi A tidak menghapus apa pun.
  assert.match(html, /<div id="danaTitipanPortfolioList">/, 'container lama #danaTitipanPortfolioList harus tetap ada (tidak dihapus)');
});

test('6. [struktur] app_production.html sinkron dgn index.html untuk sub-tab baru (build.js sudah menyalin)', () => {
  const prod = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');
  assert.match(prod, /data-action="setLaporanTab" data-args='\["titipan", "\$el"\]'/);
  assert.match(prod, /<div id="laporanTab-titipan"/);
});

test('7. [struktur] tx-list-cashflow.js: LAPORAN_SUBTAB_ORDER/LABEL menyertakan "titipan"', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/tx-list-cashflow.js'), 'utf8');
  assert.match(src, /LAPORAN_SUBTAB_ORDER\s*=\s*\[[^\]]*'titipan'[^\]]*\]/);
  assert.match(src, /titipan\s*:\s*'Dana Titipan'/);
  assert.match(src, /laporanTab-titipan/, 'setLaporanTab() harus toggle pane baru');
});

test('8. [struktur] dashboard-hub.js: LAPORAN_SUBTAB_IDX menyertakan titipan:3 (index tombol ke-4)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
  assert.match(src, /LAPORAN_SUBTAB_IDX\s*=\s*\{[^}]*titipan\s*:\s*3[^}]*\}/);
});

// ============================================================
// LAPIS 3 -- setLaporanTab() lewat DOM stateful (perilaku toggle nyata)
// ============================================================

function makeRenderCtx(dom) {
  return loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      document: dom,
      renderLaporan: () => {}, // di-stub -- di luar lingkup test ini
    },
    ['setLaporanTab', 'LAPORAN_SUBTAB_ORDER', 'LAPORAN_SUBTAB_LABEL'],
  );
}

test('9. setLaporanTab("titipan", el): pane #laporanTab-titipan jadi terlihat (u-dnone dilepas), 3 pane lain disembunyikan', () => {
  const dom = makeStatefulDom();
  ['laporanTab-ringkasan', 'laporanTab-aruskas', 'laporanTab-transaksi', 'laporanTab-titipan'].forEach((id) => dom.getElementById(id));
  const ctx = makeRenderCtx(dom);
  ctx.setLaporanTab('titipan', dom.getElementById('btnTitipan'));
  assert.equal(dom.getElementById('laporanTab-titipan').classList.contains('u-dnone'), false, 'pane titipan harus TIDAK punya class u-dnone saat aktif');
  assert.equal(dom.getElementById('laporanTab-ringkasan').classList.contains('u-dnone'), true);
  assert.equal(dom.getElementById('laporanTab-aruskas').classList.contains('u-dnone'), true);
  assert.equal(dom.getElementById('laporanTab-transaksi').classList.contains('u-dnone'), true);
});

test('10. setLaporanTab("ringkasan", el): pane titipan ikut disembunyikan lagi (simetris, tidak "nyangkut" terlihat)', () => {
  const dom = makeStatefulDom();
  ['laporanTab-ringkasan', 'laporanTab-aruskas', 'laporanTab-transaksi', 'laporanTab-titipan'].forEach((id) => dom.getElementById(id));
  const ctx = makeRenderCtx(dom);
  ctx.setLaporanTab('titipan', dom.getElementById('btnTitipan'));
  ctx.setLaporanTab('ringkasan', dom.getElementById('btnRingkasan'));
  assert.equal(dom.getElementById('laporanTab-titipan').classList.contains('u-dnone'), true);
  assert.equal(dom.getElementById('laporanTab-ringkasan').classList.contains('u-dnone'), false);
});

test('11. setLaporanTab(): breadcrumb #laporanBreadcrumbSub menampilkan label "Dana Titipan"', () => {
  const dom = makeStatefulDom();
  ['laporanTab-ringkasan', 'laporanTab-aruskas', 'laporanTab-transaksi', 'laporanTab-titipan', 'laporanBreadcrumbSub'].forEach((id) => dom.getElementById(id));
  const ctx = makeRenderCtx(dom);
  ctx.setLaporanTab('titipan', dom.getElementById('btnTitipan'));
  assert.equal(dom.getElementById('laporanBreadcrumbSub').textContent, 'Dana Titipan');
});

test('12. setLaporanTab(): pane #laporanTab-titipan TIDAK ADA di DOM -- tidak throw (guard defensif, pola aman diam2ny)', () => {
  const dom = makeStatefulDom();
  ['laporanTab-ringkasan', 'laporanTab-aruskas', 'laporanTab-transaksi'].forEach((id) => dom.getElementById(id));
  const ctx = makeRenderCtx(dom);
  assert.doesNotThrow(() => ctx.setLaporanTab('titipan', null));
});
