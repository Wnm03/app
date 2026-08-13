'use strict';
// tests/asset-nilai-sync-from-akun-s422f.test.js — Sesi 422f: melengkapi arah
// sync yang sebelumnya TIDAK ADA (Aset<-Akun). Transaksi yang terjadi
// LANGSUNG di akun tertaut (a.accountId) sekarang ikut mengoreksi `a.nilai`
// di Buku Aset lewat `syncLinkedAssetNilaiFromAkun()`, dipanggil dari save().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, sameId: (a, b) => String(a) === String(b) },
    ['MultiOwnerEngine', 'recalcAccBalance', 'syncLinkedAssetNilaiFromAkun']
  );
}

test('syncLinkedAssetNilaiFromAkun() — aset single-owner: nilai ikut naik sesuai transaksi income di akun tertaut', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Tanah', nilai: 500000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Rek Tanah', baseBalance: 500000000, includeInBalance: true }],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 20000000, date: '2026-01-01' }],
  };
  const ctx = makeCtx(D);
  ctx.syncLinkedAssetNilaiFromAkun();
  assert.equal(D.assets[0].nilai, 520000000);
});

test('syncLinkedAssetNilaiFromAkun() — aset multi-owner: nilai ikut saldo akun tertaut apa adanya (SESI 449: akun tertaut nyimpen nilai PENUH, bukan porsi SELF -- 0 scaling porsi lagi), porsi tetap', () => {
  const D = {
    assets: [{
      id: 'as1', name: 'Ruko Patungan', nilai: 1000000000, accountId: 'acc1',
      owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'budi', porsi: 40, ownerName: 'Budi' }],
    }],
    accounts: [{ id: 'acc1', name: 'Rek Patungan', baseBalance: 1000000000, includeInBalance: true }],
    // transaksi tambahan +30000000 di akun tertaut (saldo akun jadi 1030000000)
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 30000000, date: '2026-01-01' }],
  };
  const ctx = makeCtx(D);
  ctx.syncLinkedAssetNilaiFromAkun();
  // saldo akun tertaut 1030000000 -> a.nilai ikut jadi 1030000000 apa adanya, porsi TIDAK berubah
  assert.equal(D.assets[0].nilai, 1030000000);
  assert.equal(D.assets[0].owners[0].porsi, 60);
});

test('syncLinkedAssetNilaiFromAkun() — 0 transaksi baru -> nilai tidak berubah (idempotent)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Tanah', nilai: 500000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Rek Tanah', baseBalance: 500000000, includeInBalance: true }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.syncLinkedAssetNilaiFromAkun();
  assert.equal(D.assets[0].nilai, 500000000);
});

test('syncLinkedAssetNilaiFromAkun() — aset TIDAK tertaut akun -> dilewati, nilai tidak berubah', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Emas', nilai: 10000000 }],
    accounts: [],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.syncLinkedAssetNilaiFromAkun();
  assert.equal(D.assets[0].nilai, 10000000);
});
