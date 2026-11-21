'use strict';
// S2917 — rename()/merge() pemilik menyentuh SEMUA tempat id pemilik; auditRefs() baca-saja.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, saveImpl) {
  return loadSource(
    ['modules/shared/owner-registry.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: saveImpl || (() => true) },
    ['OwnerRegistry'],
  );
}
function fixture() {
  return {
    ownerRegistry: [{ id: 'o1', name: 'Bidi' }, { id: 'o2', name: 'Budi' }],
    accounts: [
      { id: 'a1', owners: [{ ownerId: 'SELF', isSelf: true, porsi: 50 }, { ownerId: 'o1', ownerName: 'Bidi', porsi: 50 }], ownerAnchor: { v: 1, ids: ['SELF', 'o1'], P: [50, 50], w: [0.5, 0.5], K: [1, 1] } },
    ],
    titipanReturns: [{ id: 'r1', ownerId: 'o1', ownerName: 'Bidi', amount: 5 }],
    transactions: [{ id: 't1', deductionOwnerId: 'o1', titipanLinkId: 'o1', renovLabaOwnerId: 'o1' }, { id: 't2', deductionOwnerId: 'SELF' }],
    bills: [{ id: 'b1', deductionOwnerId: 'o1' }],
    billsArchive: [{ id: 'b0', deductionOwnerId: 'o1' }],
    piutang: [{ id: 'p1', autoTitipanOwnerId: 'o1' }],
    debts: [],
    renovProjects: [{ id: 'pr1', pencairanFinal: { rows: [{ ownerId: 'o1', ownerName: 'Bidi', jumlah: 10 }, { ownerId: 'SELF', isSelf: true, jumlah: 5 }] } }],
  };
}

test('rename() — nama ikut berubah di rekening, pengembalian, pencairan final', () => {
  const D = fixture(); const { OwnerRegistry } = makeCtx(D);
  const r = OwnerRegistry.rename('o1', 'Budiman');
  assert.equal(r.ok, true);
  assert.equal(D.accounts[0].owners[1].ownerName, 'Budiman');
  assert.equal(D.titipanReturns[0].ownerName, 'Budiman');
  assert.equal(D.renovProjects[0].pencairanFinal.rows[0].ownerName, 'Budiman');
  assert.equal(D.accounts[0].owners[0].ownerName, undefined, 'SELF tidak disentuh');
});

test('merge() — semua referensi id pindah ke tujuan, tanpa sisa id asal', () => {
  const D = fixture(); const { OwnerRegistry } = makeCtx(D);
  const r = OwnerRegistry.merge('o1', 'o2');
  assert.equal(r.ok, true);
  assert.equal(D.accounts[0].owners[1].ownerId, 'o2');
  assert.equal(D.accounts[0].owners[1].ownerName, 'Budi');
  assert.deepEqual(D.accounts[0].ownerAnchor.ids, ['SELF', 'o2']);
  assert.equal(D.titipanReturns[0].ownerId, 'o2');
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
  assert.equal(D.transactions[0].titipanLinkId, 'o2');
  assert.equal(D.transactions[0].renovLabaOwnerId, 'o2');
  assert.equal(D.transactions[1].deductionOwnerId, 'SELF');
  assert.equal(D.bills[0].deductionOwnerId, 'o2');
  assert.equal(D.billsArchive[0].deductionOwnerId, 'o2');
  assert.equal(D.piutang[0].autoTitipanOwnerId, 'o2');
  assert.equal(D.renovProjects[0].pencairanFinal.rows[0].ownerId, 'o2');
  assert.equal(OwnerRegistry.countRefs('o1'), 0);
  assert.equal(D.ownerRegistry.length, 1);
});

test('merge() — batal total bila satu rekening memuat asal dan tujuan', () => {
  const D = fixture(); D.accounts[0].owners.push({ ownerId: 'o2', ownerName: 'Budi', porsi: 0 });
  const before = JSON.stringify(D); const { OwnerRegistry } = makeCtx(D);
  const r = OwnerRegistry.merge('o1', 'o2');
  assert.equal(r.ok, false); assert.equal(r.reason, 'conflict');
  assert.ok(r.conflicts.some((c) => c.domain === 'account'));
  assert.equal(JSON.stringify(D), before);
});

test('merge() — batal bila pencairan final memuat asal dan tujuan', () => {
  const D = fixture(); D.renovProjects[0].pencairanFinal.rows.push({ ownerId: 'o2', ownerName: 'Budi', jumlah: 3 });
  const { OwnerRegistry } = makeCtx(D);
  const r = OwnerRegistry.merge('o1', 'o2');
  assert.equal(r.ok, false);
  assert.ok(r.conflicts.some((c) => c.domain === 'pencairanFinal'));
});

test('merge() — batal bila dua komitmen titipan (asal dan tujuan) akan jadi kartu ganda', () => {
  const D = fixture(); D.titipanCommitments = [{ ownerId: 'o1', ownerName: 'Bidi' }, { ownerId: 'o2', ownerName: 'Budi' }];
  const { OwnerRegistry } = makeCtx(D);
  const r = OwnerRegistry.merge('o1', 'o2');
  assert.equal(r.ok, false);
  assert.ok(r.conflicts.some((c) => c.domain === 'titipanCommitment'));
});

test('merge() — rollback penuh (termasuk renovProjects & transaksi) bila simpan gagal', () => {
  const D = fixture(); const before = JSON.stringify(D);
  const { OwnerRegistry } = makeCtx(D, () => false);
  const r = OwnerRegistry.merge('o1', 'o2');
  assert.equal(r.ok, false); assert.equal(r.reason, 'persistence-failed');
  assert.equal(JSON.stringify(D), before);
});

test('auditRefs() — pemilik yatim, nama ganda, nama basi; data bersih = kosong', () => {
  const bersih = fixture(); let { OwnerRegistry } = makeCtx(bersih);
  const a0 = OwnerRegistry.auditRefs();
  assert.deepEqual([a0.orphans.length, a0.duplicateNames.length, a0.staleNames.length], [0, 0, 0]);
  const D = fixture(); D.transactions.push({ id: 't9', deductionOwnerId: 'hilang' });
  D.ownerRegistry.push({ id: 'o3', name: 'budi' });
  D.titipanReturns[0].ownerName = 'Nama Lama';
  OwnerRegistry = makeCtx(D).OwnerRegistry;
  const a = OwnerRegistry.auditRefs();
  assert.equal(a.orphans.length, 1); assert.equal(a.orphans[0].ownerId, 'hilang');
  assert.equal(a.duplicateNames.length, 1);
  assert.equal(a.staleNames.length, 1);
});
