'use strict';
// tests/s672-investmentlistui-filter-persist-localstorage.test.js — Sesi 672
// (item backlog dari catatan "Belum dikerjakan" SESSION-NOTE-S670.md/S671.md:
// "Persist pilihan filter owner (filterOwnerIds dkk) ke localStorage, pola
// sama cardCollapsePrefs — saat ini semua state filter murni UI, reset tiap
// reload halaman"). Scope SENGAJA cuma InvestmentListUI (filter yang sudah
// multi-select sejak S669/S671) -- filter Buku Aset (Aset.filterOwnerId) &
// Dana Titipan (DanaTitipanPortfolioPresenter.filterOwnerId) TETAP di
// backlog, sengaja ditunda (1 sesi 1 target, & masih single-select).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js.

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

// makeMockLocalStorage() — implementasi in-memory sungguhan (bukan permissive
// stub bawaan loadSource) supaya getItem()/setItem() berperilaku PERSIS
// localStorage asli (string-in string-out), perlu buat nge-tes alur baca-
// tulis JSON yang sesungguhnya (bukan cuma "tidak melempar").
function makeMockLocalStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, val) { store.set(key, String(val)); },
    removeItem(key) { store.delete(key); },
    _store: store,
  };
}

function makeCtx(D, dom, localStorage) {
  let _n = 0;
  const extraGlobals = {
    D,
    document: dom,
    escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    uid: () => 'inv_' + (_n += 1),
    save: () => {},
    toast: () => {},
  };
  if (localStorage) extraGlobals.localStorage = localStorage;
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/investasi-list-view.js',
    ],
    extraGlobals,
    ['Investment', 'InvestmentListUI', 'MultiOwnerEngine'],
  );
}

function seedTiga(ctx) {
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const emasAnak = ctx.Investment.addHolding({ name: 'Emas Anak', type: 'Emas', unit: 5, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasAnak.id, [{ ownerId: 'anak1', porsi: 100, ownerName: 'Anak', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });
  return { emasIstri, emasAnak };
}

test('onFilterOwnerToggle() menulis filterOwnerIds+filterSettlement ke localStorage', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('milik');

  const raw = ls.getItem('investmentListFilterPrefs');
  assert.notEqual(raw, null);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed.filterOwnerIds, ['istri1']);
  assert.equal(parsed.filterSettlement, 'milik');
});

test('onFilterOwnerSelectAll()/onFilterOwnerClearAll() juga menulis ke localStorage', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerSelectAll();
  let parsed = JSON.parse(ls.getItem('investmentListFilterPrefs'));
  assert.equal(parsed.filterOwnerIds.length, 2);

  ctx.InvestmentListUI.onFilterOwnerClearAll();
  parsed = JSON.parse(ls.getItem('investmentListFilterPrefs'));
  assert.deepEqual(parsed.filterOwnerIds, []);
  assert.equal(parsed.filterSettlement, '');
});

test('render() di halaman/context BARU membaca filter tersimpan dari localStorage & menerapkannya', () => {
  const D1 = makeD();
  const dom1 = makeStatefulDom();
  const ls = makeMockLocalStorage();
  const ctx1 = makeCtx(D1, dom1, ls);
  seedTiga(ctx1);
  ctx1.InvestmentListUI.onFilterOwnerToggle('istri1');

  // Simulasikan "reload halaman": context/sandbox BARU (state module fresh),
  // localStorage yang sama (ls) dibawa lintas -- ini yang membedakan tes ini
  // dari S669/S671 (yang semuanya fresh context TANPA localStorage terisi).
  const D2 = makeD();
  const dom2 = makeStatefulDom();
  const ctx2 = makeCtx(D2, dom2, ls);
  seedTiga(ctx2);

  assert.equal(ctx2.InvestmentListUI.filterOwnerIds.length, 0); // sebelum render()
  ctx2.InvestmentListUI.render();
  assert.deepEqual(ctx2.InvestmentListUI.filterOwnerIds, ['istri1']);

  const html = dom2.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Emas Anak/);
  assert.doesNotMatch(html, /Reksadana Sendiri/);
});

test('render() dipanggil 2x -> baca localStorage HANYA sekali (tidak menimpa perubahan live user)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage({
    investmentListFilterPrefs: JSON.stringify({ filterOwnerIds: ['istri1'], filterSettlement: '' }),
  });
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  ctx.InvestmentListUI.render();
  assert.deepEqual(ctx.InvestmentListUI.filterOwnerIds, ['istri1']);

  // User ganti filter secara live (bukan dari storage) SEBELUM render() ke-2.
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');
  assert.deepEqual(ctx.InvestmentListUI.filterOwnerIds.sort(), ['anak1', 'istri1']);

  ctx.InvestmentListUI.render();
  // Kalau render() ke-2 baca ulang localStorage, filterOwnerIds akan balik ke
  // ['istri1'] (nilai lama sebelum toggle anak1) -- harus TETAP ['anak1','istri1'].
  assert.deepEqual(ctx.InvestmentListUI.filterOwnerIds.sort(), ['anak1', 'istri1']);
});

test('data localStorage kosong/belum ada -> render() tidak melempar, filter tetap default kosong', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  assert.doesNotThrow(() => ctx.InvestmentListUI.render());
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
});

test('data localStorage korup (bukan JSON valid) -> render() tidak melempar, filter tetap default kosong', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage({ investmentListFilterPrefs: '{bukan json valid' });
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  assert.doesNotThrow(() => ctx.InvestmentListUI.render());
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
});

test('data localStorage bentuknya tidak valid (filterOwnerIds bukan array, filterSettlement bukan milik/titipan) -> diabaikan, balik ke default', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ls = makeMockLocalStorage({
    investmentListFilterPrefs: JSON.stringify({ filterOwnerIds: 'bukan-array', filterSettlement: 'nilai-sembarangan' }),
  });
  const ctx = makeCtx(D, dom, ls);
  seedTiga(ctx);

  ctx.InvestmentListUI.render();
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
});

test('localStorage TIDAK tersedia sama sekali (typeof undefined) -> render()/handler filter tidak melempar', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  // Sengaja TIDAK pass localStorage ke extraGlobals -- override jadi undefined
  // eksplisit lewat sandbox kosong (bukan pakai default permissive stub
  // bawaan loadSource, supaya benar-benar menguji cabang `typeof localStorage
  // === 'undefined'`).
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      localStorage: undefined,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'inv_1',
      save: () => {},
      toast: () => {},
    },
    ['Investment', 'InvestmentListUI', 'MultiOwnerEngine'],
  );
  seedTiga(ctx);

  assert.doesNotThrow(() => ctx.InvestmentListUI.render());
  assert.doesNotThrow(() => ctx.InvestmentListUI.onFilterOwnerToggle('istri1'));
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 1);
});
