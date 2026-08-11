'use strict';
// tests/s561-owner-registry-rename-merge-r4.test.js — R4 (audit
// ownership/titipan), menutup OWNREG-GATE3-001: OwnerRegistry.rename()/
// merge() belum ada sejak S489, out-of-scope eksplisit sampai sesi ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/owner-registry.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; } },
    ['OwnerRegistry'],
  );
}

test('rename() — ganti nama registry + propagasi ke owners[] Aset/Investasi/titipanCommitments', () => {
  const D = {
    ownerRegistry: [{ id: 'o1', name: 'Bidi' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'SELF', isSelf: true, ownerName: 'Milik Sendiri', porsi: 50 }, { ownerId: 'o1', isSelf: false, ownerName: 'Bidi', porsi: 50 }] }],
    investments: [{ id: 'h1', owners: [{ ownerId: 'o1', isSelf: false, ownerName: 'Bidi', porsi: 100 }] }],
    titipanCommitments: [{ ownerId: 'o1', ownerName: 'Bidi', principalAmount: 1000 }],
  };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.rename('o1', 'Budi');
  assert.equal(res.ok, true);
  assert.equal(res.assets, 1);
  assert.equal(res.investments, 1);
  assert.equal(res.commitments, 1);
  assert.equal(D.ownerRegistry[0].name, 'Budi');
  assert.equal(D.assets[0].owners[1].ownerName, 'Budi');
  assert.equal(D.assets[0].owners[0].ownerName, 'Milik Sendiri', 'baris SELF tidak ikut berubah');
  assert.equal(D.investments[0].owners[0].ownerName, 'Budi');
  assert.equal(D.titipanCommitments[0].ownerName, 'Budi');
});

test('rename() — id tidak ditemukan -> ok:false, 0 mutasi', () => {
  const D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }] };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.rename('ghost', 'X');
  assert.equal(res.ok, false);
  assert.equal(D.ownerRegistry[0].name, 'Budi');
});

test('rename() — nama baru kosong -> ok:false, entri lama tidak berubah', () => {
  const D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }] };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.rename('o1', '   ');
  assert.equal(res.ok, false);
  assert.equal(D.ownerRegistry[0].name, 'Budi');
});

test('rename() — TIDAK auto-collapse: rename ke nama entri lain yang sudah ada tetap 2 entri terpisah (Gate #3 keputusan (b))', () => {
  const D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Cici' }] };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.rename('o2', 'Budi');
  assert.equal(res.ok, true);
  assert.equal(D.ownerRegistry.length, 2, 'tetap 2 entri, tidak collapse jadi 1');
  assert.equal(D.ownerRegistry[1].name, 'Budi');
});

test('merge() — pindahkan semua referensi source ke target, hapus entri source dari registry', () => {
  const D = {
    ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Budi W' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'SELF', isSelf: true, ownerName: 'Milik Sendiri', porsi: 60 }, { ownerId: 'o2', isSelf: false, ownerName: 'Budi W', porsi: 40 }] }],
    investments: [],
    titipanCommitments: [{ ownerId: 'o2', ownerName: 'Budi W', principalAmount: 500 }],
    debts: [{ id: 'd1', linkedAssetId: 'a1', linkedOwnerId: 'o2', name: 'Budi W', nilai: 400 }],
  };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.merge('o2', 'o1');
  assert.equal(res.ok, true);
  assert.equal(res.assets, 1);
  assert.equal(res.commitments, 1);
  assert.equal(res.debts, 1);
  assert.equal(D.assets[0].owners[1].ownerId, 'o1');
  assert.equal(D.assets[0].owners[1].ownerName, 'Budi');
  assert.equal(D.titipanCommitments[0].ownerId, 'o1');
  assert.equal(D.debts[0].linkedOwnerId, 'o1');
  assert.equal(D.debts[0].id, 'd1', 'id debt tidak berubah, histori tetap');
  assert.equal(D.ownerRegistry.length, 1, 'entri source dihapus dari registry');
  assert.equal(D.ownerRegistry[0].id, 'o1');
});

test('merge() — guard tabrakan: 1 aset sudah punya source & target sekaligus -> batal total, 0 perubahan', () => {
  const D = {
    ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Budi W' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'o1', isSelf: false, ownerName: 'Budi', porsi: 30 }, { ownerId: 'o2', isSelf: false, ownerName: 'Budi W', porsi: 30 }] }],
    investments: [],
  };
  const ctx = makeCtx(D);
  const res = ctx.OwnerRegistry.merge('o2', 'o1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'conflict');
  assert.equal(res.conflicts.length, 1);
  assert.equal(D.assets[0].owners[1].ownerId, 'o2', '0 perubahan, batal total');
  assert.equal(D.ownerRegistry.length, 2, 'registry tidak berubah');
});

test('merge() — sourceId/targetId sama atau tidak ditemukan -> ok:false', () => {
  const D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }] };
  const ctx = makeCtx(D);
  assert.equal(ctx.OwnerRegistry.merge('o1', 'o1').ok, false);
  assert.equal(ctx.OwnerRegistry.merge('o1', 'ghost').ok, false);
  assert.equal(ctx.OwnerRegistry.merge('ghost', 'o1').ok, false);
});
