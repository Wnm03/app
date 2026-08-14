'use strict';
// tests/modules-calc-remaining-share-af1.test.js — Sesi AF1 lanjutan: unit
// test PURE utk calculateRemainingShare() (modules/shared/modules-calc.js),
// util SSOT dipakai 3 modal porsi kepemilikan (Aset._applyRemainingShare(),
// InvestmentUI._applyRemainingShare(), AccOwners.onPorsiInput()) -- lihat
// DESIGN-LOCK-autofill-sisa-porsi.md bagian "Test yang wajib ada".
//
// 0 DOM di sini (fungsi murni: array in, {targetIndex,porsi}|null out) --
// wiring per-modal (DOM + draft) sudah dites terpisah di
// tests/asset-owners-nominal-autodistribute-s431.test.js,
// tests/asset-owners-nominal-autodistribute-proportional-s449.test.js,
// tests/asset-owners-nominal-precision-s457.test.js (Aset), dan test
// investasi-view.js/akun.js yang sudah ada (S552/S494) utk 2 modal lain.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadCalc() {
  return loadSource(['modules/shared/modules-calc.js'], {}, ['calculateRemainingShare']);
}

test('calculateRemainingShare(): 2 baris -- isi baris A -> baris B (kosong) otomatis dapat 100 - A', () => {
  const { calculateRemainingShare } = loadCalc();
  const rows = [{ porsi: 60 }, { porsi: 0 }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result.targetIndex, 1);
  assert.equal(result.porsi, 40);
});

test('calculateRemainingShare(): 3+ baris -- isi baris pertama -> HANYA baris kosong berikutnya (index 1) yang jadi target, bukan semua baris lain', () => {
  const { calculateRemainingShare } = loadCalc();
  const rows = [{ porsi: 20 }, { porsi: 0 }, { porsi: 0 }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result.targetIndex, 1);
  assert.equal(result.porsi, 80);
});

test('calculateRemainingShare(): semua baris lain sudah _touched -> null (tidak ada auto-fill, biarkan user atur manual walau total <100%)', () => {
  const { calculateRemainingShare } = loadCalc();
  const rows = [{ porsi: 50 }, { porsi: 10, _touched: true }, { porsi: 0, _touched: true }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result, null);
});

test('calculateRemainingShare(): baris dgn porsi lama >0 (bukan kosong) dilewati sbg target walau belum _touched -- hanya baris porsi<=0 yang dianggap "kosong"', () => {
  const { calculateRemainingShare } = loadCalc();
  const rows = [{ porsi: 40 }, { porsi: 20 }, { porsi: 0 }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result.targetIndex, 2, 'baris index 1 (porsi 20, >0) dilewati; baris index 2 (porsi 0) jadi target');
  assert.equal(result.porsi, 40, 'sisa 100-40-20=40');
});

test('calculateRemainingShare(): sisa pas 0 atau negatif setelah dijepit -> null (tidak menulis 0% ke baris manapun)', () => {
  const { calculateRemainingShare } = loadCalc();
  const rows = [{ porsi: 100 }, { porsi: 0 }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result, null);
  const rowsOver = [{ porsi: 130 }, { porsi: 0 }];
  assert.equal(calculateRemainingShare(rowsOver, 0), null);
});

test('calculateRemainingShare(): <2 baris -> null (tidak ada baris lain utk diisi)', () => {
  const { calculateRemainingShare } = loadCalc();
  assert.equal(calculateRemainingShare([{ porsi: 100 }], 0), null);
  assert.equal(calculateRemainingShare([], 0), null);
});

test('calculateRemainingShare(): hasil presisi 4 desimal (Math.round(x*10000)/10000), bukan 2 desimal', () => {
  const { calculateRemainingShare } = loadCalc();
  // baris lain (bukan target) 33.3333% -> sisa = 100 - 33.3333 = 66.6667
  const rows = [{ porsi: 33.3333 }, { porsi: 0 }];
  const result = calculateRemainingShare(rows, 0);
  assert.equal(result.porsi, 66.6667);
});

test('calculateRemainingShare(): editedIndex tidak valid (baris tidak ada) -> null, tidak throw', () => {
  const { calculateRemainingShare } = loadCalc();
  assert.equal(calculateRemainingShare([{ porsi: 50 }, { porsi: 0 }], 5), null);
});

test('calculateRemainingShare(): rows bukan array atau kosong -> null, tidak throw', () => {
  const { calculateRemainingShare } = loadCalc();
  assert.equal(calculateRemainingShare(null, 0), null);
  assert.equal(calculateRemainingShare(undefined, 0), null);
});
