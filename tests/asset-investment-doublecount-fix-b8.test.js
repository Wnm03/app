'use strict';
// tests/asset-investment-doublecount-fix-b8.test.js — Sesi B8: FIX (bukan cuma
// deteksi lagi) dobel-hitung yang diaudit B7. Opsi A dipilih dari 3 opsi
// trade-off yang dipresentasikan (exclude sisi Aset, pola SAMA PERSIS
// `_migratedToInvestmentId` s476a) -- diterapkan di 2 titik:
//   1. Aset.totalValue() (aset.js) -- komponen Kekayaan Bersih (poin #1 audit).
//   2. Zakat.hitungMaal() asetZakatable (pajak-pbb-zakat.js) -- poin #4 audit.
// Warn "berpotensi dihitung 2x" dari B7 di data-health-check.js DIHAPUS sesi
// ini (sudah tidak akurat -- lihat komentar di sana), makanya file test lama
// tests/data-health-check-asset-investment-doublecount-b7.test.js juga
// dihapus, bukan cuma jadi legacy yang gagal.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, uid: () => 'uid_' + Math.random().toString(36).slice(2), save: () => {} },
    ['Aset', 'Investment', 'MultiOwnerEngine'],
  );
}

test('Aset.totalValue() — aset TANPA investmentId tetap ikut dijumlah (0 regresi)', () => {
  const D = { assets: [{ id: 'a1', name: 'Rumah', nilai: 500000000 }], investments: [], investmentTx: [] };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset.totalValue(), 500000000);
});

test('Aset.totalValue() — aset YANG ditautkan (investmentId, B1) ke holding yang masih ada DIKECUALIKAN', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'RDPU X', nilai: 10000000, investmentId: 'h1' },
      { id: 'a2', name: 'Tanah', nilai: 500000000 },
    ],
    investments: [{ id: 'h1', name: 'RDPU X' }],
    investmentTx: [],
  };
  const ctx = makeCtx(D);
  // hanya a2 yang ikut -- a1 sudah "milik" sisi Investment.selfOwnedTotalValue()
  assert.equal(ctx.Aset.totalValue(), 500000000);
});

test('Aset.totalValue() — aset dgn investmentId ORPHAN (holding sudah dihapus) TETAP dikecualikan (bukan dihitung ulang diam-diam)', () => {
  // Selaras dgn pola _migratedToInvestmentId: field jadi sinyal "nilai sudah
  // dipindah", bukan divalidasi ulang tiap hitung. Orphan tetap terdeteksi &
  // diberi tahu lewat cek B6 di data-health-check.js supaya user bisa lepas
  // tautannya (setelah dilepas, otomatis ikut dihitung lagi normal).
  const D = { assets: [{ id: 'a1', name: 'RDPU X', nilai: 10000000, investmentId: 'inv_ghost' }], investments: [], investmentTx: [] };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset.totalValue(), 0);
});

test('Aset.totalValue() — aset yg _migratedToInvestmentId (s476a) DAN yg investmentId (B1) sama-sama dikecualikan bareng', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'BTC', nilai: 15000000, _migratedToInvestmentId: 'h-migrated' },
      { id: 'a2', name: 'RDPU X', nilai: 10000000, investmentId: 'h-linked' },
      { id: 'a3', name: 'Tanah', nilai: 500000000 },
    ],
    investments: [{ id: 'h-linked', name: 'RDPU X' }],
    investmentTx: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset.totalValue(), 500000000);
});
