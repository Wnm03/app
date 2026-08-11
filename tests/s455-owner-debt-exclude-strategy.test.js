'use strict';
// tests/s455-owner-debt-exclude-strategy.test.js — Sesi 455: entri utang
// "dana titipan" (linkedAssetId terisi, auto-sync dari
// Aset._syncOwnerDebts()) BUKAN kewajiban yang perlu strategi pelunasan
// (bunga/cicilan selalu 0, tidak ada jatuh tempo) -- FIX: exclude dari
// DebtStrategy.activeDebts() (dipakai computeOrder()/Debt Optimizer
// activeCount). Sesi 455 SENGAJA TIDAK mengubah Debt.totalValue() (Kekayaan
// Bersih waktu itu tetap menghitung titipan seperti sebelumnya) -- belakangan
// terbukti itu akar BUG-016 (double-subtraction, lihat
// docs/BUG_REGISTRY.md): porsi non-SELF SUDAH dikecualikan di sisi aset
// (Aset.totalValue()) TAPI ikut kepotong lagi di sisi utang. BUG-016
// DIPERBAIKI Sesi 463 -- Debt.totalValue() sekarang JUGA mengecualikan
// entry titipan (opsi (a) di BUG_REGISTRY.md), test paling bawah diupdate
// mengikuti.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    debts: [
      { id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 },
      { id: 'd2', name: 'Investor A', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedAssetId: 'a1', linkedOwnerId: 'inv1' },
    ],
    bills: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/finance/piutang-utang.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['Debt', 'DebtStrategy'],
  );
}

test('activeDebts() — entri titipan (linkedAssetId) TIDAK ikut, utang biasa tetap ikut', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const active = ctx.DebtStrategy.activeDebts();
  assert.equal(active.some((d) => d.id === 'd1'), true, 'utang biasa harus tetap ada');
  assert.equal(active.some((d) => d.id === 'd2'), false, 'entri titipan harus di-exclude');
});

test('activeDebts() — tanpa entri titipan sama sekali, perilaku lama tidak berubah', () => {
  const D = { debts: [{ id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false }], bills: [] };
  const ctx = makeCtx(D);
  const active = ctx.DebtStrategy.activeDebts();
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'd1');
});

test('Debt.totalValue() — titipan (linkedAssetId) DIKECUALIKAN sejak fix BUG-016 (Sesi 463), sisa cuma utang biasa d1', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // Sebelum fix BUG-016: 7jt (d1 3jt + d2/titipan 4jt dihitung penuh --
  // padahal porsi titipan itu SUDAH dikecualikan di Aset.totalValue(),
  // jadi double-subtraction). Sesudah fix: d2 (linkedAssetId) dikecualikan,
  // sisa cuma d1.
  assert.equal(ctx.Debt.totalValue(), 3000000);
});
