'use strict';
// tests/s715-aset-filter-persist-localstorage.test.js — Sesi 715 (item
// backlog #4 dari catatan "Sisa backlog" SESSION-NOTE-S714-FINCOACH-TITIPAN-
// DEBT-STALE-INSIGHT.md: "Multi-select owner untuk Buku Aset & Dana Titipan
// (+ tombol Pilih Semua/Bersihkan + persist filterOwnerIds ke localStorage)"
// — multi-select + tombol SUDAH SELESAI S673 (tests/s667-aset-owner-status-
// filter.test.js), sesi ini HANYA menambah persist ke localStorage, pola
// SAMA PERSIS InvestmentListUI (S672,
// tests/s672-investmentlistui-filter-persist-localstorage.test.js).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/aset.js. Handler filter existing (onFilterOwnerToggle() dkk,
// S673) & _renderFilterBar()/_assetMatchesFilter() TIDAK berubah perilaku
// query-nya sesi ini -- lihat tests/s667-aset-owner-status-filter.test.js
// utk cakupan itu, TIDAK diulang di sini.
//
// Cakupan test ini:
//   1. onFilterOwnerToggle()/onFilterSettlementChange()/
//      onFilterOwnerSelectAll()/onFilterOwnerClearAll() -- masing-masing
//      memanggil _saveFilterPrefs() (delegasi ke Aset.renderList() TETAP
//      di-spy, pola sama S673, TIDAK dijalankan sungguhan).
//   2. _saveFilterPrefs() -- menulis {filterOwnerIds, filterSettlement} ke
//      localStorage key 'assetListFilterPrefs' sebagai JSON.
//   3. _loadFilterPrefsOnce() -- baca balik dari localStorage & terapkan ke
//      state; guard baca-sekali (_filterPrefsLoaded); validasi bentuk data
//      (Array.isArray/whitelist milik|titipan); 0 lempar kalau
//      kosong/korup/tidak-valid/localStorage tidak tersedia.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// makeMockLocalStorage() — implementasi in-memory SUNGGUHAN (bukan
// permissive stub bawaan loadSource), pola sama persis
// tests/s672-investmentlistui-filter-persist-localstorage.test.js, supaya
// getItem()/setItem() berperilaku persis localStorage asli (string-in
// string-out) -- perlu buat nge-tes alur baca-tulis JSON sesungguhnya.
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
  let _n = 9000;
  const extraGlobals = {
    D,
    escapeHtml: (s) => String(s),
    uid: () => (_n += 1),
    sameId: (a, b) => String(a) === String(b),
    save: () => {},
    toast: () => {},
    todayStr: () => '2026-08-30',
  };
  if (localStorage !== undefined) extraGlobals.localStorage = localStorage;
  return loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    extraGlobals,
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
}

function makeD() { return { assets: [] }; }

// --- handler -> _saveFilterPrefs() ------------------------------------

test('onFilterOwnerToggle() menulis filterOwnerIds+filterSettlement ke localStorage', () => {
  const D = makeD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.Aset.renderList = () => {};

  ctx.Aset.onFilterOwnerToggle('istri1');
  ctx.Aset.onFilterSettlementChange('milik');

  const raw = ls.getItem('assetListFilterPrefs');
  assert.notEqual(raw, null);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed.filterOwnerIds, ['istri1']);
  assert.equal(parsed.filterSettlement, 'milik');
});

test('onFilterOwnerToggle() sampai filterOwnerIds kosong lagi -> filterSettlement ikut direset & tersimpan kosong', () => {
  const D = makeD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.Aset.renderList = () => {};

  ctx.Aset.onFilterOwnerToggle('istri1');
  ctx.Aset.onFilterSettlementChange('titipan');
  ctx.Aset.onFilterOwnerToggle('istri1'); // lepas centang -> kosong lagi

  const parsed = JSON.parse(ls.getItem('assetListFilterPrefs'));
  assert.deepEqual(parsed.filterOwnerIds, []);
  assert.equal(parsed.filterSettlement, '');
});

test('onFilterOwnerSelectAll()/onFilterOwnerClearAll() juga menulis ke localStorage', () => {
  const D = {
    assets: [
      { id: 'a1', nilai: 1, owners: [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri' }] },
      { id: 'a2', nilai: 1, owners: [{ ownerId: 'anak1', porsi: 100, ownerName: 'Anak' }] },
    ],
  };
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);
  ctx.Aset.renderList = () => {};

  ctx.Aset.onFilterOwnerSelectAll();
  let parsed = JSON.parse(ls.getItem('assetListFilterPrefs'));
  assert.equal(parsed.filterOwnerIds.length, 2);

  ctx.Aset.onFilterOwnerClearAll();
  parsed = JSON.parse(ls.getItem('assetListFilterPrefs'));
  assert.deepEqual(parsed.filterOwnerIds, []);
  assert.equal(parsed.filterSettlement, '');
});

// --- _loadFilterPrefsOnce() --------------------------------------------

test('_loadFilterPrefsOnce() membaca filterOwnerIds+filterSettlement tersimpan & menerapkannya ke state', () => {
  const D = makeD();
  const ls = makeMockLocalStorage({
    assetListFilterPrefs: JSON.stringify({ filterOwnerIds: ['istri1', 'anak1'], filterSettlement: 'titipan' }),
  });
  const ctx = makeCtx(D, ls);

  assert.equal(ctx.Aset.filterOwnerIds.length, 0); // sebelum load
  ctx.Aset._loadFilterPrefsOnce();
  assert.deepEqual(ctx.Aset.filterOwnerIds, ['istri1', 'anak1']);
  assert.equal(ctx.Aset.filterSettlement, 'titipan');
});

test('_loadFilterPrefsOnce() dipanggil 2x -> baca localStorage HANYA sekali (tidak menimpa perubahan live user)', () => {
  const D = makeD();
  const ls = makeMockLocalStorage({
    assetListFilterPrefs: JSON.stringify({ filterOwnerIds: ['istri1'], filterSettlement: '' }),
  });
  const ctx = makeCtx(D, ls);

  ctx.Aset._loadFilterPrefsOnce();
  assert.deepEqual(ctx.Aset.filterOwnerIds, ['istri1']);

  // User ganti filter secara live (bukan dari storage) SEBELUM load ke-2.
  ctx.Aset.filterOwnerIds = ['anak1'];
  ctx.Aset._loadFilterPrefsOnce();
  // Kalau load ke-2 baca ulang localStorage, filterOwnerIds akan balik ke
  // ['istri1'] -- harus TETAP ['anak1'].
  assert.deepEqual(ctx.Aset.filterOwnerIds, ['anak1']);
});

test('renderList() memanggil _loadFilterPrefsOnce() (source-check wiring)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'modules/asset/aset.js'), 'utf8');
  assert.match(src, /renderList\(\)\{\s*\nconst el=document\.getElementById\('assetList'\);\s*\nif\(!el\)return;\s*\n\/\/[^\n]*\n[\s\S]{0,400}?Aset\._loadFilterPrefsOnce\(\);/);
});

test('data localStorage kosong/belum ada -> _loadFilterPrefsOnce() tidak melempar, filter tetap default kosong', () => {
  const D = makeD();
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(D, ls);

  assert.doesNotThrow(() => ctx.Aset._loadFilterPrefsOnce());
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('data localStorage korup (bukan JSON valid) -> _loadFilterPrefsOnce() tidak melempar, filter tetap default kosong', () => {
  const D = makeD();
  const ls = makeMockLocalStorage({ assetListFilterPrefs: '{bukan json valid' });
  const ctx = makeCtx(D, ls);

  assert.doesNotThrow(() => ctx.Aset._loadFilterPrefsOnce());
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('data localStorage bentuknya tidak valid (filterOwnerIds bukan array, filterSettlement bukan milik/titipan) -> diabaikan, balik ke default', () => {
  const D = makeD();
  const ls = makeMockLocalStorage({
    assetListFilterPrefs: JSON.stringify({ filterOwnerIds: 'bukan-array', filterSettlement: 'nilai-sembarangan' }),
  });
  const ctx = makeCtx(D, ls);

  ctx.Aset._loadFilterPrefsOnce();
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('localStorage TIDAK tersedia sama sekali (typeof undefined) -> load/save/handler filter tidak melempar', () => {
  const D = makeD();
  // Sengaja TIDAK pass localStorage ke extraGlobals -- override eksplisit
  // undefined lewat sandbox kosong, supaya benar-benar menguji cabang
  // `typeof localStorage === 'undefined'`.
  const ctx = loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      localStorage: undefined,
      escapeHtml: (s) => String(s),
      uid: () => 'a1',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
  ctx.Aset.renderList = () => {};

  assert.doesNotThrow(() => ctx.Aset._loadFilterPrefsOnce());
  assert.doesNotThrow(() => ctx.Aset.onFilterOwnerToggle('istri1'));
  assert.equal(ctx.Aset.filterOwnerIds.length, 1);
});
