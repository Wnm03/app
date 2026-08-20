'use strict';
// tests/s654-filter-laporan-tx-match.test.js — cakupan langsung
// modules/finance/filter-laporan.js: txMatchesFilters()/txMatchesSearch()
// (RENCANA-IMPLEMENTASI-S646-S664.md Blok F, lanjutan sesi S652/S653).
// Kedua fungsi ini PURE (0 DOM, 0 D mutation) tapi sebelumnya 0 test
// langsung — satu-satunya penyentuh (`tests/virtual-bill-alltx-wiring-
// s468c.test.js`) cuma MOCK keduanya (`() => true`), tidak menjalankan
// source aslinya. goToList()/showFilteredTx() SENGAJA tidak dites di sini
// (baca/tulis DOM berat lewat querySelectorAll/showPage/setShopTab dst —
// di luar cakupan harness loadSource.js, sama alasan `render()`
// FinanceDashboard di-skip sesi S652).
//
// Sumber file yang dites: versi KUMULATIF pasca-fix BUG-009 (S647,
// toggleKeuFilter panel-state) + BUG-010 (S648, showFilteredTx search
// scope keuangan) — 2 fix itu tidak menyentuh txMatchesFilters()/
// txMatchesSearch() sama sekali, jadi tidak relevan ke test ini, tapi
// dicatat supaya jelas source mana yang diverifikasi (lihat SESSION-NOTE
// sesi ini soal app-main baseline yang dipakai utk verifikasi lokal
// belum termasuk merge S646-S651).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(accounts) {
  return loadSource(
    ['modules/finance/filter-laporan.js'],
    { D: { accounts: accounts || [] } },
    ['txMatchesFilters', 'txMatchesSearch'],
  );
}

// --- txMatchesFilters() ---

test('txMatchesFilters(): f kosong/semua -> selalu match (tidak ada filter aktif)', () => {
  const { txMatchesFilters } = makeCtx();
  const t = { type: 'pengeluaran', category: 'Makan', subcategory: 'Warung', accountId: 'a1', payMethod: 'tunai' };
  assert.equal(txMatchesFilters(t, { tipe: 'semua', kat: 'semua', sub: 'semua', acc: 'semua', method: 'semua' }), true);
  assert.equal(txMatchesFilters(t, {}), true);
});

test('txMatchesFilters(): f.tipe -> cocok type persis (selain transfer)', () => {
  const { txMatchesFilters } = makeCtx();
  assert.equal(txMatchesFilters({ type: 'pemasukan' }, { tipe: 'pemasukan' }), true);
  assert.equal(txMatchesFilters({ type: 'pengeluaran' }, { tipe: 'pemasukan' }), false);
});

test('txMatchesFilters(): f.tipe==="transfer" -> cocok transfer_in ATAU transfer_out (bukan match type persis)', () => {
  const { txMatchesFilters } = makeCtx();
  assert.equal(txMatchesFilters({ type: 'transfer_in' }, { tipe: 'transfer' }), true);
  assert.equal(txMatchesFilters({ type: 'transfer_out' }, { tipe: 'transfer' }), true);
  assert.equal(txMatchesFilters({ type: 'pengeluaran' }, { tipe: 'transfer' }), false);
});

test('txMatchesFilters(): f.kat/f.sub/f.acc/f.method masing-masing di-AND-kan (semua harus cocok)', () => {
  const { txMatchesFilters } = makeCtx();
  const t = { type: 'pengeluaran', category: 'Makan', subcategory: 'Warung', accountId: 'a1', payMethod: 'debit' };
  const f = { tipe: 'pengeluaran', kat: 'Makan', sub: 'Warung', acc: 'a1', method: 'debit' };
  assert.equal(txMatchesFilters(t, f), true);
  // ganti 1 field saja (sub) jadi tidak cocok -> keseluruhan false.
  assert.equal(txMatchesFilters(t, { ...f, sub: 'Kafe' }), false);
});

test('txMatchesFilters(): f.method default "tunai" kalau t.payMethod tidak diisi', () => {
  const { txMatchesFilters } = makeCtx();
  const t = { type: 'pengeluaran', payMethod: undefined };
  assert.equal(txMatchesFilters(t, { tipe: 'pengeluaran', method: 'tunai' }), true);
  assert.equal(txMatchesFilters(t, { tipe: 'pengeluaran', method: 'debit' }), false);
});

test('txMatchesFilters(): f.sub kosong string t.subcategory dianggap "" (bukan crash pada undefined)', () => {
  const { txMatchesFilters } = makeCtx();
  const t = { type: 'pengeluaran', subcategory: undefined };
  assert.equal(txMatchesFilters(t, { tipe: 'pengeluaran', sub: '' }), true);
});

// --- txMatchesSearch() ---

test('txMatchesSearch(): q kosong/falsy -> selalu match', () => {
  const { txMatchesSearch } = makeCtx();
  assert.equal(txMatchesSearch({ category: 'Makan' }, ''), true);
  assert.equal(txMatchesSearch({ category: 'Makan' }, undefined), true);
});

test('txMatchesSearch(): cocok kalau q ada di category/subcategory/note (case-insensitive, sudah lowercase)', () => {
  const { txMatchesSearch } = makeCtx();
  const t = { category: 'Makan', subcategory: 'Warung Nasi', note: 'beli lauk' };
  assert.equal(txMatchesSearch(t, 'warung'), true);
  assert.equal(txMatchesSearch(t, 'lauk'), true);
  assert.equal(txMatchesSearch(t, 'bensin'), false);
});

test('txMatchesSearch(): ikut cocokkan nama akun (D.accounts lookup by accountId)', () => {
  const { txMatchesSearch } = makeCtx([{ id: 'a1', name: 'BCA Utama' }]);
  const t = { category: 'Makan', accountId: 'a1' };
  assert.equal(txMatchesSearch(t, 'bca'), true);
});

test('txMatchesSearch(): accountId tidak ditemukan di D.accounts -> tidak crash, cuma skip nama akun', () => {
  const { txMatchesSearch } = makeCtx([]);
  const t = { category: 'Makan', accountId: 'tidak-ada' };
  assert.equal(txMatchesSearch(t, 'makan'), true);
  assert.equal(txMatchesSearch(t, 'bca'), false);
});

test('txMatchesSearch(): field kosong/null di-filter (Boolean) sebelum digabung, tidak bikin " undefined "', () => {
  const { txMatchesSearch } = makeCtx();
  const t = { category: 'Makan', subcategory: null, note: undefined };
  assert.equal(txMatchesSearch(t, 'undefined'), false);
  assert.equal(txMatchesSearch(t, 'null'), false);
});
