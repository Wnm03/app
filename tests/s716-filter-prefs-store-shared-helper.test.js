'use strict';
// tests/s716-filter-prefs-store-shared-helper.test.js — Sesi 716. Ekstraksi
// pola `_loadFilterPrefsOnce()`/`_saveFilterPrefs()` yang sebelumnya
// diduplikasi 3x SAMA PERSIS (InvestmentListUI S672, Aset S715,
// DanaTitipanPortfolioPresenter S715) ke 1 helper bersama
// `modules/shared/filter-prefs-store.js` (`FilterPrefsStore.loadOnce(target)`/
// `FilterPrefsStore.save(target)`). Ketiga consumer sekarang thin delegating
// wrapper (0 logic sendiri lagi) -- cakupan test PER CONSUMER yang SUDAH ADA
// (tests/s672-investmentlistui-filter-persist-localstorage.test.js,
// tests/s715-aset-filter-persist-localstorage.test.js,
// tests/s715-dana-titipan-filter-persist-localstorage.test.js) TETAP jalan
// apa adanya (0 diubah, cuma loadSource()-nya ditambah dependency
// filter-prefs-store.js) & TETAP jadi bukti wiring per-consumer benar --
// sesi ini fokus nge-tes LOGIKA helper itu sendiri secara langsung/terisolasi
// (save/load roundtrip, guard baca-sekali, independensi namespace antar
// domain/key, data localStorage korup/malformed, localStorage tidak
// tersedia/melempar), pola sama persis 3 file test consumer di atas TAPI
// dgn `target` palsu (plain object, bukan Aset/InvestmentListUI/
// DanaTitipanPortfolioPresenter sungguhan) supaya benar2 terisolasi dari
// domain masing2 consumer.
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/shared/filter-prefs-store.js (baru).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// makeMockLocalStorage() — implementasi in-memory SUNGGUHAN (bukan permissive
// stub bawaan loadSource), pola sama persis 3 file test consumer, supaya
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

function makeCtx(localStorage) {
  const extraGlobals = {};
  if (localStorage !== undefined) extraGlobals.localStorage = localStorage;
  return loadSource(
    ['modules/shared/filter-prefs-store.js'],
    extraGlobals,
    ['FilterPrefsStore'],
  );
}

// makeTarget() — objek `target` palsu yang memenuhi kontrak FilterPrefsStore
// apa adanya (filterOwnerIds/filterSettlement/_filterPrefsLoaded/
// _filterStorageKey), TIDAK ada logic lain (0 method render/handler) --
// murni supaya test ini terisolasi dari Aset/InvestmentListUI/
// DanaTitipanPortfolioPresenter.
function makeTarget(storageKey) {
  return {
    filterOwnerIds: [],
    filterSettlement: '',
    _filterPrefsLoaded: false,
    _filterStorageKey: storageKey || 'fakeFilterPrefs',
  };
}

// --- save() -------------------------------------------------------------

test('save() menulis {filterOwnerIds, filterSettlement} ke localStorage sebagai JSON di bawah key target', () => {
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');
  target.filterOwnerIds = ['istri1', 'anak2'];
  target.filterSettlement = 'titipan';

  ctx.FilterPrefsStore.save(target);

  const raw = ls.getItem('fakeFilterPrefs');
  assert.notEqual(raw, null);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed.filterOwnerIds, ['istri1', 'anak2']);
  assert.equal(parsed.filterSettlement, 'titipan');
});

test('save() TIDAK melempar kalau localStorage.setItem() melempar (penuh/diblokir)', () => {
  const ls = {
    getItem() { return null; },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  const ctx = makeCtx(ls);
  const target = makeTarget();
  target.filterOwnerIds = ['x'];

  assert.doesNotThrow(() => ctx.FilterPrefsStore.save(target));
});

test('save() TIDAK melempar & no-op kalau localStorage tidak tersedia (typeof undefined)', () => {
  const ctx = loadSource(
    ['modules/shared/filter-prefs-store.js'],
    {},
    ['FilterPrefsStore'],
  );
  const target = makeTarget();
  assert.doesNotThrow(() => ctx.FilterPrefsStore.save(target));
});

test('save() TIDAK melempar kalau target null/undefined', () => {
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(ls);
  assert.doesNotThrow(() => ctx.FilterPrefsStore.save(null));
  assert.doesNotThrow(() => ctx.FilterPrefsStore.save(undefined));
});

// --- loadOnce() -----------------------------------------------------------

test('loadOnce() membaca balik filterOwnerIds+filterSettlement yang sudah tersimpan', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: ['istri1'], filterSettlement: 'milik' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, ['istri1']);
  assert.equal(target.filterSettlement, 'milik');
});

test('loadOnce() HANYA membaca sekali per target (guard _filterPrefsLoaded) -- panggilan kedua tidak menimpa balik perubahan live', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: ['istri1'], filterSettlement: 'milik' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);
  // Simulasi perubahan live user setelah load pertama.
  target.filterOwnerIds = [];
  target.filterSettlement = '';

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
  assert.equal(target._filterPrefsLoaded, true);
});

test('loadOnce() 2 target dgn _filterStorageKey berbeda TIDAK saling bocor (namespace independen)', () => {
  const ls = makeMockLocalStorage({
    prefsA: JSON.stringify({ filterOwnerIds: ['a1'], filterSettlement: 'milik' }),
    prefsB: JSON.stringify({ filterOwnerIds: ['b1', 'b2'], filterSettlement: 'titipan' }),
  });
  const ctx = makeCtx(ls);
  const targetA = makeTarget('prefsA');
  const targetB = makeTarget('prefsB');

  ctx.FilterPrefsStore.loadOnce(targetA);
  ctx.FilterPrefsStore.loadOnce(targetB);

  assert.deepEqual(targetA.filterOwnerIds, ['a1']);
  assert.equal(targetA.filterSettlement, 'milik');
  assert.deepEqual(targetB.filterOwnerIds, ['b1', 'b2']);
  assert.equal(targetB.filterSettlement, 'titipan');
});

test('loadOnce() localStorage kosong (belum pernah disimpan) -> target tetap default, 0 crash', () => {
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(target));
  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
});

test('loadOnce() data JSON korup (bukan JSON valid) -> abaikan, target tetap default, 0 crash', () => {
  const ls = makeMockLocalStorage({ fakeFilterPrefs: '{bukan json valid' });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(target));
  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
});

test('loadOnce() filterOwnerIds bukan array (mis. diedit manual dari DevTools) -> diabaikan tetap default, TIDAK menghalangi filterSettlement valid tetap dipakai (2 validasi independen)', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: 'bukan-array', filterSettlement: 'milik' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, []);
  // filterSettlement divalidasi TERPISAH lewat whitelist-nya sendiri
  // ('milik'/'titipan') -- valid di sini, jadi tetap dipakai TERLEPAS dari
  // filterOwnerIds gagal validasi. Guard "kosongkan filterSettlement kalau
  // filterOwnerIds kosong" HANYA berlaku sebagai fallback saat
  // filterSettlement sendiri TIDAK lolos whitelist (lihat test di bawah).
  assert.equal(target.filterSettlement, 'milik');
});

test('loadOnce() filterSettlement bukan milik/titipan (whitelist) -> diabaikan jadi string kosong', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: ['a1'], filterSettlement: 'HALUSINASI' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, ['a1']);
  assert.equal(target.filterSettlement, '');
});

test('loadOnce() filterOwnerIds array kosong TAPI filterSettlement valid whitelist -> filterSettlement TETAP dipakai (validasi filterSettlement independen dari isi filterOwnerIds)', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: [], filterSettlement: 'titipan' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, 'titipan');
});

test('loadOnce() filterOwnerIds kosong DAN filterSettlement TIDAK lolos whitelist -> fallback kosongkan filterSettlement (guard "status tanpa owner terpilih tidak bermakna")', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: [], filterSettlement: 'HALUSINASI' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
});

test('loadOnce() filterOwnerIds berisi angka (bukan string) -> dikonversi ke String() semua', () => {
  const ls = makeMockLocalStorage({
    fakeFilterPrefs: JSON.stringify({ filterOwnerIds: [123, 456], filterSettlement: '' }),
  });
  const ctx = makeCtx(ls);
  const target = makeTarget('fakeFilterPrefs');

  ctx.FilterPrefsStore.loadOnce(target);

  assert.deepEqual(target.filterOwnerIds, ['123', '456']);
});

test('loadOnce() localStorage tidak tersedia sama sekali (typeof undefined) -> tidak melempar, target tetap default, guard tetap ditandai loaded', () => {
  const ctx = loadSource(
    ['modules/shared/filter-prefs-store.js'],
    {},
    ['FilterPrefsStore'],
  );
  const target = makeTarget();

  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(target));
  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
  assert.equal(target._filterPrefsLoaded, true);
});

test('loadOnce() localStorage.getItem() melempar (mis. diblokir mode privat) -> abaikan, 0 crash', () => {
  const ls = {
    getItem() { throw new Error('SecurityError'); },
    setItem() {},
  };
  const ctx = makeCtx(ls);
  const target = makeTarget();

  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(target));
  assert.deepEqual(target.filterOwnerIds, []);
  assert.equal(target.filterSettlement, '');
});

test('loadOnce() TIDAK melempar kalau target null/undefined (no-op)', () => {
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(ls);
  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(null));
  assert.doesNotThrow(() => ctx.FilterPrefsStore.loadOnce(undefined));
});

// --- roundtrip end-to-end -------------------------------------------------

test('save() lalu loadOnce() di target BARU (simulasi reload halaman) -> nilai persist lintas "reload"', () => {
  const ls = makeMockLocalStorage();
  const ctx = makeCtx(ls);
  const before = makeTarget('fakeFilterPrefs');
  before.filterOwnerIds = ['a1', 'a2'];
  before.filterSettlement = 'titipan';
  ctx.FilterPrefsStore.save(before);

  // target baru, simulasi objek Aset/InvestmentListUI/dst versi "fresh"
  // setelah reload halaman (_filterPrefsLoaded balik ke false).
  const after = makeTarget('fakeFilterPrefs');
  ctx.FilterPrefsStore.loadOnce(after);

  assert.deepEqual(after.filterOwnerIds, ['a1', 'a2']);
  assert.equal(after.filterSettlement, 'titipan');
});
