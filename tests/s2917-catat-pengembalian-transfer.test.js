'use strict';
// S2917 poin 1 — Catat Pengembalian + transfer/pengeluaran atomik.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function setup({ saveOk = true } = {}) {
  const D = {
    accounts: [
      { id: 'self1', name: 'Kas Saya', owners: [{ ownerId: 'SELF', isSelf: true, porsi: 100 }] },
      { id: 'tit1', name: 'Titipan Bidi', owners: [{ ownerId: 'o1', ownerName: 'Bidi', porsi: 100 }] },
      { id: 'tit2', name: 'Rek Bidi Lain', owners: [{ ownerId: 'o1', ownerName: 'Bidi', porsi: 100 }] },
      { id: 'mix', name: 'Campur', owners: [{ ownerId: 'SELF', isSelf: true, porsi: 50 }, { ownerId: 'o1', ownerName: 'Bidi', porsi: 50 }] },
    ],
    transactions: [], titipanReturns: [], titipanCommitments: [{ ownerId: 'o1', ownerName: 'Bidi', principalAmount: 1000 }],
  };
  const bal = { tit1: 1000000, tit2: 0, mix: 400000, self1: 5 };
  const SOT = {
    createMany(rows) { rows.forEach((r) => D.transactions.push(JSON.parse(JSON.stringify(r)))); },
    removeWhere(fn) { D.transactions = D.transactions.filter((t) => !fn(t)); return []; },
    replaceSnapshot(rows) { D.transactions = rows.slice(); return D.transactions; },
  };
  let n = 0;
  const ctx = loadSource(
    ['modules/finance/dana-titipan-commitment-return-api.js'],
    { D, uid: () => 'u' + (++n), save: () => saveOk, recalcAccBalance: (id) => bal[id], FinanceTxSOT: SOT, todayStr: () => '2026-11-21',
      DanaTitipanPortfolioAPI: { listExistingOwners: () => [{ ownerId: 'o1', ownerName: 'Bidi' }] } },
    ['DanaTitipanPortfolioAPI'],
  );
  return { D, API: ctx.DanaTitipanPortfolioAPI };
}

test('mode rekening: transfer berpasangan + catatan, id tertaut', () => {
  const { D, API } = setup();
  const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 300000, sourceAccountId: 'tit1', mode: 'rekening', destAccountId: 'tit2' });
  assert.ok(r.id, JSON.stringify(r));
  assert.equal(D.titipanReturns.length, 1);
  assert.equal(D.transactions.length, 2);
  const [o, i] = D.transactions;
  assert.equal(o.type, 'transfer_out'); assert.equal(i.type, 'transfer_in');
  assert.equal(o.transferPairId, i.transferPairId);
  assert.equal(o.accountId, 'tit1'); assert.equal(i.accountId, 'tit2');
  assert.equal(JSON.stringify(r.txIds), JSON.stringify([o.id, i.id]));
  assert.equal(o.deductionOwnerId, 'o1');
});

test('mode keluar: satu pengeluaran kategori Dana Titipan dari rekening sumber', () => {
  const { D, API } = setup();
  const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 100000, sourceAccountId: 'tit1', mode: 'keluar' });
  assert.ok(r.id);
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].type, 'expense'); assert.equal(D.transactions[0].category, 'Dana Titipan');
  assert.equal(D.transactions[0].deductionOwnerId, 'o1');
});

test('tujuan rekening milik sendiri / rekening campur ditolak, tidak ada perubahan', () => {
  for (const dest of ['self1', 'mix']) {
    const { D, API } = setup();
    const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 1000, sourceAccountId: 'tit1', mode: 'rekening', destAccountId: dest });
    assert.equal(r.ok, false);
    assert.equal(D.transactions.length, 0); assert.equal(D.titipanReturns.length, 0);
  }
});

test('sumber harus memuat porsi pemilik; tujuan sama dengan sumber ditolak', () => {
  const { API } = setup();
  assert.equal(API.recordReturnWithTransfer({ ownerId: 'o1', amount: 1, sourceAccountId: 'self1', mode: 'keluar' }).ok, false);
  assert.equal(API.recordReturnWithTransfer({ ownerId: 'o1', amount: 1, sourceAccountId: 'tit1', mode: 'rekening', destAccountId: 'tit1' }).ok, false);
});

test('melebihi hak pemilik ditolak (porsi x saldo); izinkanMinus melewati', () => {
  const { D, API } = setup();
  const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 250000, sourceAccountId: 'mix', mode: 'keluar' });
  assert.equal(r.ok, false); assert.equal(r.minus, true);
  assert.equal(r.saldo, 200000);
  assert.equal(D.transactions.length, 0);
  const r2 = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 250000, sourceAccountId: 'mix', mode: 'keluar', izinkanMinus: true });
  assert.ok(r2.id);
});

test('nominal nol / tujuan kosong ditolak', () => {
  const { API } = setup();
  assert.equal(API.recordReturnWithTransfer({ ownerId: 'o1', amount: 0, sourceAccountId: 'tit1', mode: 'keluar' }).ok, false);
  assert.equal(API.recordReturnWithTransfer({ ownerId: 'o1', amount: 5, sourceAccountId: 'tit1' }).ok, false);
});

test('gagal simpan: catatan dan transaksi di-rollback', () => {
  const { D, API } = setup({ saveOk: false });
  const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 1000, sourceAccountId: 'tit1', mode: 'rekening', destAccountId: 'tit2' });
  assert.equal(r.ok, false); assert.equal(r.code, 'PERSISTENCE_FAILED');
  assert.equal(D.transactions.length, 0); assert.equal(D.titipanReturns.length, 0);
});

test('deleteReturn membatalkan transaksi tertaut; riwayat biasa tetap hanya hapus catatan', () => {
  const { D, API } = setup();
  const r = API.recordReturnWithTransfer({ ownerId: 'o1', amount: 1000, sourceAccountId: 'tit1', mode: 'rekening', destAccountId: 'tit2' });
  D.transactions.push({ id: 'lain', type: 'expense', amount: 1, accountId: 'self1' });
  assert.equal(API.deleteReturn(r.id), true);
  assert.equal(JSON.stringify(D.transactions.map((t) => t.id)), JSON.stringify(['lain']));
  const plain = API.recordReturn({ ownerId: 'o1', amount: 5 });
  assert.equal(D.transactions.length, 1);
  assert.equal(API.deleteReturn(plain.id), true);
  assert.equal(D.transactions.length, 1);
});

test('recordReturn lama tidak berubah (hanya riwayat, tanpa transaksi)', () => {
  const { D, API } = setup();
  const r = API.recordReturn({ ownerId: 'o1', amount: 10 });
  assert.ok(r.id); assert.equal(D.transactions.length, 0);
});
