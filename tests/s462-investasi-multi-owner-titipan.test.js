'use strict';
// tests/s462-investasi-multi-owner-titipan.test.js — Sesi 462 (AUD-008,
// tech debt dari audit "dana titipan" Sesi 458/461): sebelum sesi ini,
// model titipan investasi (`h.fundSource`/`h.titipanOwner`) cuma "1 flag +
// 1 nama" -- TIDAK bisa merepresentasikan 1 holding yang dititipkan >1
// orang sekaligus (mis. 60% Ayah + 40% Budi), beda dari `aset.js` yang
// sudah multi-owner penuh lewat MultiOwnerEngine (`a.owners[]`).
//
// FIX: tambah `h.owners` (opsional, format sama persis `a.owners`) +
// Investment.getOwners()/setOwners(), dan _syncTitipanDebt() direvisi jadi
// 1 entry Buku Utang PER OWNER non-SELF (pola SAMA PERSIS
// Aset._syncOwnerDebts()) -- TANPA mengubah perilaku holding single-owner
// lama (lihat tests/s460-investment-titipan-debt-linked-id.test.js, semua
// masih pass tanpa modifikasi).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeInvCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {} },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine'],
  );
}

test('Investment.getOwners() — holding baru (belum titipan) default 1 baris SELF 100%', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Reksadana A', unit: 0, avgPrice: 0, currentPrice: 1000 });
  const owners = ctx.Investment.getOwners(h);
  assert.equal(owners.length, 1);
  assert.equal(owners[0].isSelf, true);
  assert.equal(owners[0].porsi, 100);
});

test('Investment.getOwners() — fundSource:"titipan" legacy disintesis 1 baris non-SELF 100% (backward compat)', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Reksadana B', unit: 0, avgPrice: 0, currentPrice: 1000, fundSource: 'titipan', titipanOwner: 'Budi' });
  const owners = ctx.Investment.getOwners(h);
  assert.equal(owners.length, 1);
  assert.equal(owners[0].isSelf, false);
  assert.equal(owners[0].ownerName, 'Budi');
  assert.equal(owners[0].porsi, 100);
});

test('Investment.setOwners() — 2 pemilik non-SELF (60% Ayah + 40% Budi) bikin 2 entry Buku Utang, masing-masing porsi dari holdingCost()', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Reksadana C', unit: 10, avgPrice: 100000, currentPrice: 120000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'ayah', porsi: 60, ownerName: 'Ayah' },
    { ownerId: 'budi', porsi: 40, ownerName: 'Budi' },
  ]);
  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 2);
  const cost = ctx.Investment.holdingCost(h); // 10 * 100000 = 1.000.000
  const ayah = linked.find((d) => d.linkedOwnerId === 'ayah');
  const budi = linked.find((d) => d.linkedOwnerId === 'budi');
  assert.equal(ayah.nilai, cost * 0.6);
  assert.equal(budi.nilai, cost * 0.4);
  // >1 owner -> h.debtLinkId (pointer lama single-owner) sengaja null,
  // pola sama persis Aset._syncOwnerDebts() (tidak ada pointer tunggal).
  assert.equal(h.debtLinkId, null);
});

test('Investment.setOwners() — 3 owner non-SELF (tanpa SELF sama sekali, whole-entity titipan) tetap 3 entry, porsi total 100%', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Deposito D', unit: 1, avgPrice: 3000000, currentPrice: 3000000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'a', porsi: 50, ownerName: 'A' },
    { ownerId: 'b', porsi: 30, ownerName: 'B' },
    { ownerId: 'c', porsi: 20, ownerName: 'C' },
  ]);
  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 3);
  const total = linked.reduce((s, d) => s + d.nilai, 0);
  assert.equal(total, ctx.Investment.holdingCost(h));
});

test('Investment.setOwners() — owner dicabut (porsi diubah jadi cuma 1 baris) otomatis hapus entry utang yang tidak lagi ada, tidak sisa sampah', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Saham E', unit: 5, avgPrice: 200000, currentPrice: 250000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'ayah', porsi: 60, ownerName: 'Ayah' },
    { ownerId: 'budi', porsi: 40, ownerName: 'Budi' },
  ]);
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 2);
  // Budi dicabut, Ayah naik jadi 100%.
  ctx.Investment.setOwners(h.id, [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah' }]);
  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 1);
  assert.equal(linked[0].linkedOwnerId, 'ayah');
  assert.equal(linked[0].nilai, ctx.Investment.holdingCost(h));
  assert.equal(h.debtLinkId, linked[0].id); // balik ke 1 owner -> pointer lama terisi lagi
});

test('Investment.setOwners() — balik ke 1 owner SELF 100% menghapus h.owners & fundSource, sama seperti holding yang tidak pernah titipan (0 entry utang)', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas F', unit: 2, avgPrice: 1000000, currentPrice: 1100000, fundSource: 'titipan', titipanOwner: 'Budi' });
  assert.equal(D.debts.length, 1);
  ctx.Investment.setOwners(h.id, [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }]);
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 0);
  assert.equal(h.owners, undefined);
  assert.equal(h.fundSource, 'sendiri');
  assert.equal(h.debtLinkId, null);
});

test('Investment.deleteHolding() — multi-owner (>1 entry utang tertaut) semuanya ikut terhapus, bukan cuma h.debtLinkId', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Saham G', unit: 5, avgPrice: 200000, currentPrice: 250000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'ayah', porsi: 50, ownerName: 'Ayah' },
    { ownerId: 'budi', porsi: 50, ownerName: 'Budi' },
  ]);
  assert.equal(D.debts.length, 2);
  ctx.Investment.deleteHolding(h.id);
  assert.equal(D.debts.length, 0);
});

test('Investment.recomputeHolding() — cost basis berubah (tx beli baru) tetap resinkron ke SEMUA owner non-SELF, bukan cuma 1', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Saham H', unit: 0, avgPrice: 0, currentPrice: 100000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'ayah', porsi: 70, ownerName: 'Ayah' },
    { ownerId: 'budi', porsi: 30, ownerName: 'Budi' },
  ]);
  ctx.Investment.addTransaction({ investmentId: h.id, type: 'beli', date: '2026-01-01', qty: 10, price: 100000, fee: 0 });
  const cost = ctx.Investment.holdingCost(h); // 1.000.000
  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 2);
  const ayah = linked.find((d) => d.linkedOwnerId === 'ayah');
  const budi = linked.find((d) => d.linkedOwnerId === 'budi');
  assert.equal(ayah.nilai, cost * 0.7);
  assert.equal(budi.nilai, cost * 0.3);
});
