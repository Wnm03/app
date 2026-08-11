'use strict';
/**
 * s558-tx-asset-hint-generic-copy.test.js — Sesi 558 (fix gap kosmetik
 * dilaporkan user): teks hint di bawah dropdown "Kaitkan ke Aset
 * Multi-Owner" (modals.js, elemen #txAssetWrap > #txAssetHint) masih
 * hardcode kata "pemasukan" ("Kalau pemasukan ini terkait aset
 * patungan...") padahal logic visibility-nya (updateTxAssetWrapVisibility,
 * lihat komentar di transaksi.js) sudah berlaku utk Pemasukan MAUPUN
 * Pengeluaran sejak patch akun-multi-owner-doublecount-datahealthcheck-
 * restore — copy-nya belum ikut diupdate jadi generik.
 *
 * FIX: updateTxAssetHintText() baru (transaksi.js), dipanggil dari
 * updateTxAssetWrapVisibility() (jadi ikut refresh tiap ganti tipe
 * transaksi via setTxType() atau tiap buka modal via openTxModal()/
 * editTx()) — mengisi textContent #txAssetHint sesuai curTxType aktif:
 * "pemasukan" utk income, "pengeluaran" utk expense. 0 perubahan logic
 * split porsi/visibility wrap, murni sinkronisasi copy dgn field
 * transaksi.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
  }, overrides);
}

function makeFakeDoc() {
  const els = {};
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, curTxType }) {
  return loadSource(
    ['modules/finance/transaksi.js'],
    {
      document,
      curTxType,
      D: { assets: [] },
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      getMultiOwnerAssets: () => [{ id: 'a1', name: 'Tanah Patungan' }],
      populateEntryAssetSelect() {},
      updateTxAssetSplitPreview() {},
    },
  );
}

test('s558: updateTxAssetHintText() pakai kata "pemasukan" saat curTxType=income', () => {
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, curTxType: 'income' });
  ctx.updateTxAssetHintText();
  assert.match(els.txAssetHint.textContent, /Kalau pemasukan ini terkait aset patungan/);
});

test('s558: updateTxAssetHintText() pakai kata "pengeluaran" saat curTxType=expense (BUG sebelumnya: selalu "pemasukan")', () => {
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, curTxType: 'expense' });
  ctx.updateTxAssetHintText();
  assert.match(els.txAssetHint.textContent, /Kalau pengeluaran ini terkait aset patungan/);
  assert.doesNotMatch(els.txAssetHint.textContent, /Kalau pemasukan/);
});

test('s558: updateTxAssetWrapVisibility() ikut memanggil updateTxAssetHintText() (hint ikut ter-refresh otomatis, bukan cuma manual)', () => {
  const { doc, els } = makeFakeDoc();
  els.txAssetWrap = makeEl();
  const ctx = makeCtx({ document: doc, curTxType: 'expense' });
  ctx.updateTxAssetWrapVisibility();
  assert.match(els.txAssetHint.textContent, /Kalau pengeluaran ini terkait aset patungan/);
});

test('s558: updateTxAssetHintText() aman kalau elemen #txAssetHint belum ada di DOM (no-op, tidak throw)', () => {
  const doc = { getElementById() { return null; } };
  const ctx = makeCtx({ document: doc, curTxType: 'income' });
  assert.doesNotThrow(() => ctx.updateTxAssetHintText());
});
