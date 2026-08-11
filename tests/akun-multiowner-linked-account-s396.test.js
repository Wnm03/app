'use strict';
// tests/akun-multiowner-linked-account-s396.test.js — Sesi 396 (lanjutan
// MultiOwnerEngine S390-395), DI-REVERT Sesi 422c.
//
// S396 dulu nambah "porsi SELF akun tertaut ikut ditambahkan ke Total Saldo
// Akun" (bukan 0%, bukan 100%). Sesi 422c membalikkan ini: porsi SELF sebuah
// aset SEKARANG kehitung lewat Aset.totalValue() (pakai
// MultiOwnerEngine.selfOwnedValue() per-aset) -- kalau totalSaldoAkun() JUGA
// nambah porsi SELF dari akun tertautnya, porsi itu dobel-kehitung di
// Kekayaan Bersih. Fix: akun tertaut ke Aset SELALU dikecualikan PENUH dari
// Total Saldo Akun, apa pun status single/multi-owner aset yang menautkannya
// -- sama seperti perilaku Sesi 192 (sebelum S396 ada).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    { D },
    ['OwnershipEngine', 'MultiOwnerEngine', '_accBalCache', '_totalSaldoCache']
  );
}

test('totalSaldoAkun() — akun tertaut aset single-owner tetap dikecualikan penuh (0 regresi)', () => {
  const D = {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true },
      { id: 'a2', name: 'Rek Tanah', baseBalance: 500000, includeInBalance: true },
    ],
    transactions: [],
    assets: [{ id: 'as1', name: 'Tanah', nilai: 500000, accountId: 'a2' }],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 100000);
});

test('totalSaldoAkun() — akun tertaut aset multi-owner (Sesi 422c): tetap dikecualikan penuh, porsi SELF sudah dihitung lewat Aset.totalValue()', () => {
  const D = {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true },
      { id: 'a2', name: 'Rek Patungan', baseBalance: 1000000, includeInBalance: true },
    ],
    transactions: [],
    assets: [{
      id: 'as1', name: 'Ruko Patungan', nilai: 1000000, accountId: 'a2',
      owners: [
        { ownerId: 'SELF', porsi: 60 },
        { ownerId: 'investor-budi', porsi: 40, ownerName: 'Budi' },
      ],
    }],
  };
  const ctx = makeCtx(D);
  // 100000 (Kas) saja -- porsi SELF (60%) dari Rek Patungan TIDAK lagi
  // ditambahkan di sini (dobel-hitung dgn Aset.totalValue(), lihat
  // asset-totalvalue-selfowned-s422c.test.js).
  assert.equal(ctx.totalSaldoAkun(), 100000);
});

test('totalSaldoAkun() — akun tertaut aset multi-owner tapi ownership akun itu sendiri bukan SELF -> tetap dikecualikan', () => {
  const D = {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true },
      { id: 'a2', name: 'Rek Patungan', baseBalance: 1000000, includeInBalance: true, ownership: 'INVESTOR' },
    ],
    transactions: [],
    assets: [{
      id: 'as1', name: 'Ruko Patungan', nilai: 1000000, accountId: 'a2',
      owners: [
        { ownerId: 'SELF', porsi: 60 },
        { ownerId: 'investor-budi', porsi: 40, ownerName: 'Budi' },
      ],
    }],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 100000);
});
