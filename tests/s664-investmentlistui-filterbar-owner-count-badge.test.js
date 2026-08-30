'use strict';
// tests/s664-investmentlistui-filterbar-owner-count-badge.test.js — Sesi 664
// (lanjutan dari daftar "Ide lanjutan" user pasca-S662/S663, poin 2 kategori
// "Ringan, sesi kecil"):
//
//   "Badge jumlah di opsi dropdown owner, mis. 'Istri (3 holding)' — biar
//   user tahu seberapa banyak sebelum klik."
//
// InvestmentListUI._renderFilterBar() (S662) sekarang menambahkan
// "(N holding)" ke tiap opsi owner non-SELF di dropdown "Pemilik" -- N =
// jumlah HOLDING (bukan jumlah baris kepemilikan) di mana owner tsb muncul.
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js. modules/asset/investasi.js (S660)
// TIDAK disentuh -- reuse penuh Investment.getOwners() yang sudah ada, 0
// rumus baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
}

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
      },
      insertAdjacentElement(_position, node) {
        if (node && node.id) registry.set(node.id, node);
      },
      insertAdjacentHTML() {},
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    createElement(_tag) { return makeElement(undefined); },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  let _n = 0;
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'inv_' + (_n += 1),
      save: () => {},
      toast: () => {},
    },
    ['Investment', 'InvestmentListUI', 'MultiOwnerEngine'],
  );
}

test('1 owner, 1 holding -> opsi dropdown "Istri (1 holding)"', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onFilterOwnerToggle\('istri1'\)/);
  assert.match(html, /Istri <span[^>]*>\(1 holding\)<\/span>/);
});

test('1 owner, 3 holding berbeda -> badge "(3 holding)"', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ['Emas Istri', 'RD Istri', 'Saham Istri'].forEach((name) => {
    const h = ctx.Investment.addHolding({ name, type: 'Emas', unit: 1, avgPrice: 100000 });
    ctx.Investment.setOwners(h.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  });

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onFilterOwnerToggle\('istri1'\)/);
  assert.match(html, /Istri <span[^>]*>\(3 holding\)<\/span>/);
});

test('2 owner berbeda dgn jumlah holding beda -> badge masing-masing sesuai hitungan sendiri', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h1 = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 1, avgPrice: 100000 });
  ctx.Investment.setOwners(h1.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const h2 = ctx.Investment.addHolding({ name: 'RD Istri', type: 'Reksa Dana', unit: 1, avgPrice: 100000 });
  ctx.Investment.setOwners(h2.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const h3 = ctx.Investment.addHolding({ name: 'Emas Anak', type: 'Emas', unit: 1, avgPrice: 100000 });
  ctx.Investment.setOwners(h3.id, [{ ownerId: 'anak1', porsi: 100, ownerName: 'Anak', isSelf: false }]);

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Istri <span[^>]*>\(2 holding\)<\/span>/);
  assert.match(html, /Anak <span[^>]*>\(1 holding\)<\/span>/);
});

test('1 holding patungan 2 pemilik non-SELF -> masing-masing badge tetap "(1 holding)", bukan double-count', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const patungan = ctx.Investment.addHolding({ name: 'Reksadana Patungan', type: 'Reksa Dana', unit: 100, avgPrice: 10000 });
  ctx.Investment.setOwners(patungan.id, [
    { ownerId: 'istri1', porsi: 50, ownerName: 'Istri', isSelf: false },
    { ownerId: 'anak1', porsi: 50, ownerName: 'Anak', isSelf: false },
  ]);

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onFilterOwnerToggle\('istri1'\)/);
  assert.match(html, /Istri <span[^>]*>\(1 holding\)<\/span>/);
  assert.match(html, /Anak <span[^>]*>\(1 holding\)<\/span>/);
});

test('"Semua Pemilik" (opsi default) TIDAK ikut diberi badge angka', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.doesNotMatch(html, /Semua Pemilik/, 'checkbox-list S669 tidak lagi punya opsi "Semua Pemilik" -- kosongkan semua centang = tampilkan semua');
});

test('badge tetap benar walau dipanggil ulang setelah tambah holding baru (re-render, bukan basi)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h1 = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 1, avgPrice: 100000 });
  ctx.Investment.setOwners(h1.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.InvestmentListUI._renderList();
  assert.match(dom.getElementById('investmentHoldingList').innerHTML, /Istri <span[^>]*>\(1 holding\)<\/span>/);

  const h2 = ctx.Investment.addHolding({ name: 'RD Istri', type: 'Reksa Dana', unit: 1, avgPrice: 100000 });
  ctx.Investment.setOwners(h2.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.InvestmentListUI._renderList();
  assert.match(dom.getElementById('investmentHoldingList').innerHTML, /Istri <span[^>]*>\(2 holding\)<\/span>/);
});
