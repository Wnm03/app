'use strict';
// tests/s715-dana-titipan-filter-persist-localstorage.test.js — Sesi 715
// (item backlog #4 dari catatan "Sisa backlog" SESSION-NOTE-S714-FINCOACH-
// TITIPAN-DEBT-STALE-INSIGHT.md: "Multi-select owner untuk Buku Aset & Dana
// Titipan (+ tombol Pilih Semua/Bersihkan + persist filterOwnerIds ke
// localStorage)" — multi-select + tombol SUDAH SELESAI S674 (tests/s668-
// dana-titipan-owner-status-filter.test.js), sesi ini HANYA menambah
// persist ke localStorage, pola SAMA PERSIS Aset (S715,
// tests/s715-aset-filter-persist-localstorage.test.js)/InvestmentListUI
// (S672).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/finance/dana-titipan-portfolio-render.js. Handler filter existing
// (onFilterOwnerToggle() dkk, S674) & _renderFilterBar()/
// _ownerMatchesFilter() TIDAK berubah perilaku query-nya sesi ini -- lihat
// tests/s668-dana-titipan-owner-status-filter.test.js utk cakupan itu,
// TIDAK diulang di sini.
//
// Cakupan test ini:
//   1. onFilterOwnerToggle()/onFilterSettlementChange()/
//      onFilterOwnerSelectAll()/onFilterOwnerClearAll() -- masing-masing
//      memanggil _saveFilterPrefs() (renderInto() TETAP di-spy, pola sama
//      S674, TIDAK dijalankan sungguhan).
//   2. _saveFilterPrefs() -- menulis {filterOwnerIds, filterSettlement} ke
//      localStorage key 'danaTitipanFilterPrefs' sebagai JSON.
//   3. _loadFilterPrefsOnce() -- baca balik dari localStorage & terapkan ke
//      state; guard baca-sekali (_filterPrefsLoaded); validasi bentuk data;
//      0 lempar kalau kosong/korup/tidak-valid/localStorage tidak tersedia.
//   4. _renderNow(el) end-to-end (DOM ringan) -- filter tersimpan
//      diterapkan otomatis begitu renderInto() dipanggil pertama kali,
//      TERLEPAS dari container mana (danaTitipanTabList ATAU
//      danaTitipanPortfolioList) yang dirender lebih dulu.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeMockLocalStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, val) { store.set(key, String(val)); },
    removeItem(key) { store.delete(key); },
    _store: store,
  };
}

function makeCtx(D, localStorage) {
  const extraGlobals = {
    D,
    uid: () => 'u' + (D._n = (D._n || 0) + 1),
    save: () => {},
    toast: () => {},
    sameId: (a, b) => String(a) === String(b),
    todayStr: () => '2026-08-30',
    escapeHtml: (s) => String(s),
    fmt: (n) => String(n),
    fmtFull: (n) => String(n),
    fmtFullSigned: (n) => (n >= 0 ? String(n) : String(n)),
  };
  if (localStorage !== undefined) extraGlobals.localStorage = localStorage;
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/aset-owners.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/aset.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    extraGlobals,
    ['Investment', 'Aset', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

function baseD() {
  return {
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000,
        owners: [
          { ownerId: 'SELF', porsi: 20, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'budi1', porsi: 80, ownerName: 'Budi' },
        ],
      },
    ],
    investmentTx: [],
    investmentWatchlist: [],
    assets: [
      {
        id: 'as1', name: 'Motor Titipan Adik', nilai: 20000000,
        owners: [
          { ownerId: 'SELF', porsi: 10, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'adik1', porsi: 90, ownerName: 'Adik' },
        ],
      },
    ],
    debts: [],
    titipanCommitments: [],
    titipanReturns: [],
    transactions: [],
  };
}

function makeEl(id) {
  return { id, innerHTML: '', querySelectorAll: () => [] };
}

// --- handler -> _saveFilterPrefs() ------------------------------------

test('onFilterOwnerToggle() menulis filterOwnerIds+filterSettlement ke localStorage', () => {
  const D = baseD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');

  const raw = ls.getItem('danaTitipanFilterPrefs');
  assert.notEqual(raw, null);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed.filterOwnerIds, ['budi1']);
  assert.equal(parsed.filterSettlement, 'milik');
});

test('onFilterOwnerToggle() sampai filterOwnerIds kosong lagi -> filterSettlement ikut direset & tersimpan kosong', () => {
  const D = baseD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('titipan');
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1'); // lepas centang

  const parsed = JSON.parse(ls.getItem('danaTitipanFilterPrefs'));
  assert.deepEqual(parsed.filterOwnerIds, []);
  assert.equal(parsed.filterSettlement, '');
});

test('onFilterOwnerSelectAll()/onFilterOwnerClearAll() juga menulis ke localStorage', () => {
  const D = baseD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll();
  let parsed = JSON.parse(ls.getItem('danaTitipanFilterPrefs'));
  assert.equal(parsed.filterOwnerIds.length, 2); // budi1 + adik1

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerClearAll();
  parsed = JSON.parse(ls.getItem('danaTitipanFilterPrefs'));
  assert.deepEqual(parsed.filterOwnerIds, []);
  assert.equal(parsed.filterSettlement, '');
});

// --- _loadFilterPrefsOnce() --------------------------------------------

test('_loadFilterPrefsOnce() membaca filterOwnerIds+filterSettlement tersimpan & menerapkannya ke state', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({
    danaTitipanFilterPrefs: JSON.stringify({ filterOwnerIds: ['budi1', 'adik1'], filterSettlement: 'titipan' }),
  });
  const ctx = makeCtx(D, ls);

  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce();
  assert.deepEqual(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds, ['budi1', 'adik1']);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, 'titipan');
});

test('_loadFilterPrefsOnce() dipanggil 2x -> baca localStorage HANYA sekali (tidak menimpa perubahan live user)', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({
    danaTitipanFilterPrefs: JSON.stringify({ filterOwnerIds: ['budi1'], filterSettlement: '' }),
  });
  const ctx = makeCtx(D, ls);

  ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce();
  assert.deepEqual(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds, ['budi1']);

  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['adik1'];
  ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce();
  assert.deepEqual(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds, ['adik1']);
});

test('data localStorage kosong/belum ada -> _loadFilterPrefsOnce() tidak melempar, filter tetap default kosong', () => {
  const D = baseD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);

  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce());
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('data localStorage korup (bukan JSON valid) -> _loadFilterPrefsOnce() tidak melempar, filter tetap default kosong', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({ danaTitipanFilterPrefs: '{bukan json valid' });
  const ctx = makeCtx(D, ls);

  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce());
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('data localStorage bentuknya tidak valid (filterOwnerIds bukan array, filterSettlement bukan milik/titipan) -> diabaikan, balik ke default', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({
    danaTitipanFilterPrefs: JSON.stringify({ filterOwnerIds: 'bukan-array', filterSettlement: 'nilai-sembarangan' }),
  });
  const ctx = makeCtx(D, ls);

  ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce();
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('localStorage TIDAK tersedia sama sekali (typeof undefined) -> load/save/handler filter tidak melempar', () => {
  const D = baseD();
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/aset-owners.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/aset.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      localStorage: undefined,
      uid: () => 'u1',
      save: () => {},
      toast: () => {},
      sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-08-30',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      fmtFullSigned: (n) => (n >= 0 ? String(n) : String(n)),
    },
    ['Investment', 'Aset', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};

  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter._loadFilterPrefsOnce());
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1'));
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 1);
});

// --- _renderNow(el) end-to-end (DOM ringan) -----------------------------

test('renderInto("danaTitipanTabList") pertama kali -> filter tersimpan otomatis diterapkan (baca localStorage via _renderNow)', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({
    danaTitipanFilterPrefs: JSON.stringify({ filterOwnerIds: ['budi1'], filterSettlement: '' }),
  });
  const ctx = makeCtx(D, ls);
  const elTab = makeEl('danaTitipanTabList');
  ctx.document = { getElementById: () => elTab };

  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  assert.deepEqual(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds, ['budi1']);
  assert.match(elTab.innerHTML, /👤 Budi/);
  assert.doesNotMatch(elTab.innerHTML, /👤 Adik/);
});

test('renderInto("danaTitipanPortfolioList") pertama kali (container LAIN) tetap membaca filter tersimpan yang sama', () => {
  const D = baseD();
  const ls = makeMockLocalStorage({
    danaTitipanFilterPrefs: JSON.stringify({ filterOwnerIds: ['adik1'], filterSettlement: '' }),
  });
  const ctx = makeCtx(D, ls);
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };

  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.deepEqual(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds, ['adik1']);
});
