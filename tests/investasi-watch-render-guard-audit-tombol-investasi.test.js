'use strict';
// tests/investasi-watch-render-guard-audit-tombol-investasi.test.js — Regression utk audit
// user "tab Aset bagian Investasi: semua tombol tidak berfungsi, 0 toast, ada console
// error". Root cause: InvestmentWatchUI.render() (modules/asset/investasi-watch-view.js)
// TIDAK punya try/catch, padahal dipanggil langsung dari InvestmentListUI.render() (bukan
// lewat dispatcher data-action yang selalu toast) yang gilirannya dipanggil langsung dari
// setAsetTab('investasi')/renderPageContent('aset'). Kalau SATU item watchlist bikin
// Investment.watchlistAlerts()/getWatchlist() atau field-nya throw, exception itu
// merambat keluar TANPA toast (persis pola _renderSummary()/_renderList() yang sudah
// dilindungi lebih dulu di investasi-list-view.js, s614/s689) -- dan karena render() tab
// Investasi gagal di tengah jalan, sisa alur pemanggil (mis. langkah lanjutan
// showPage()/setAsetTab() setelah baris ini) ikut batal, sehingga tombol-tombol di tab ini
// terlihat "tidak bereaksi sama sekali".
//
// Pola & harness SAMA PERSIS tests/investasi-ghost-migration-and-summary-guard-s614.test.js
// & tests/investment-tx-watch-ui-s467.test.js: loadSource() dari source ASLI dgn DOM
// tiruan stateful.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD(extra = {}) {
  return {
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [], debts: [],
    ...extra,
  };
}

function makeCtx(D, dom) {
  const calls = { toast: [] };
  const ctx = loadSource(
    [
      'modules/asset/investasi.js',
      'modules/asset/investasi-list-view.js',
      'modules/asset/investasi-watch-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'inv_' + Math.random().toString(36).slice(2),
      save: () => {},
      openModal: () => {},
      closeModal: () => {},
      toast: (msg) => { calls.toast.push(msg); },
    },
    ['Investment', 'InvestmentListUI', 'InvestmentWatchUI'],
  );
  ctx.calls = calls;
  return ctx;
}

test('[InvestmentWatchUI.render] item watchlist yg bikin watchlistAlerts() throw TIDAK menjatuhkan render() -- item lain tetap dirender', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.Investment.addWatch({ name: 'BBCA', type: 'Saham', lastPrice: 9000, targetPrice: 9500 });

  // Paksa watchlistAlerts() (dipanggil PERTAMA di render(), sebelum .map() per-item) throw
  // -- simulasi data yg bikin filter di dalamnya invalid.
  const origAlerts = ctx.Investment.watchlistAlerts;
  ctx.Investment.watchlistAlerts = () => { throw new Error('simulated alert calc error'); };

  assert.doesNotThrow(() => ctx.InvestmentWatchUI.render());
  const html = dom.getElementById('investmentWatchlist').innerHTML;
  // Item tetap dirender (fallback alertIds kosong), bukan halaman kosong/exception.
  assert.match(html, /InvestmentWatchUI\.openModal/, 'render() harus tetap menghasilkan baris watchlist walau watchlistAlerts() gagal hitung');
  assert.match(html, /BBCA/);

  ctx.Investment.watchlistAlerts = origAlerts;
});

test('[InvestmentWatchUI.render] SATU item watchlist "beracun" (properti throw) TIDAK menjatuhkan render() -- item lain tetap tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.Investment.addWatch({ name: 'BBRI', type: 'Saham', lastPrice: 4500, targetPrice: 5000 });
  const poison = ctx.Investment.addWatch({ name: 'Poison', type: 'Saham', lastPrice: 100, targetPrice: 200 });
  // Rusak salah satu field item watchlist supaya akses properti di dalam .map() throw --
  // pola sama persis "holding beracun" di s614 (override fungsi kalkulasi), di sini cukup
  // pasang getter yg throw di properti yang dibaca render().
  Object.defineProperty(poison, 'name', { get() { throw new Error('simulated corrupt field'); } });

  assert.doesNotThrow(() => ctx.InvestmentWatchUI.render());
  const html = dom.getElementById('investmentWatchlist').innerHTML;
  // Item normal tetap tampil dgn data-action yg valid...
  assert.match(html, /BBRI/);
  assert.match(html, /InvestmentWatchUI\.openModal/);
  // ...dan item beracun tetap dirender sbg baris yang bisa di-tap (bukan dihilangkan diam2
  // atau menjatuhkan seluruh render), ditandai badge peringatan.
  assert.match(html, /Gagal menghitung item ini/, 'item beracun harus tetap dirender dgn badge peringatan, bukan menjatuhkan seluruh list');
});

test('[InvestmentWatchUI.render] tanpa error -- perilaku normal tidak berubah (badge target tercapai tetap muncul)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.Investment.addWatch({ name: 'Target Kena', type: 'Saham', lastPrice: 100, targetPrice: 150 });
  ctx.Investment.addWatch({ name: 'Belum Kena', type: 'Saham', lastPrice: 200, targetPrice: 150 });

  ctx.InvestmentWatchUI.render();
  const html = dom.getElementById('investmentWatchlist').innerHTML;
  assert.match(html, /Target Kena/);
  assert.match(html, /Belum Kena/);
  assert.match(html, /🎯 Target tercapai/);
  assert.doesNotMatch(html, /Gagal menghitung item ini/);
});
