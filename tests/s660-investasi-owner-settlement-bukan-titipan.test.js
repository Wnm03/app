'use strict';
// tests/s657-investasi-owner-settlement-bukan-titipan.test.js — Sesi 657
// (audit user "kepemilikan holding investasi yang bukan dititipkan, mis.
// emas milik istri sendiri, agar bisa difilter kepemilikan istri tapi
// bukan titipan").
//
// ROOT CAUSE sebelum sesi ini: Investment.setOwners() men-derive
// `h.fundSource` otomatis jadi 'titipan' begitu ADA owner non-SELF
// (`nextOwners.some((o) => !o.isSelf)`), dan _syncTitipanDebt() membuat 1
// entry Buku Utang PER owner non-SELF TANPA kecuali — jadi owner yang
// sebenarnya pemilik sungguhan (bukan dana yang dititipkan utk dikelola)
// tetap dianggap "berutang" ke owner itu.
//
// FIX (fondasi, S660): h.ownerSettlement (map ownerId -> 'titipan'|'milik',
// BARU, terpisah total dari h.owners/MultiOwnerEngine — 0 skema owner yang
// diubah). Default TOLERAN 'titipan' (owner tanpa entry di map) supaya 0
// regresi utk seluruh data & test existing (dibuktikan suite penuh masih
// 100% pass tanpa modifikasi, lihat s462/s460/asset-titipan tests).
// `settlement==='milik'` mengecualikan owner itu dari _syncTitipanDebt()
// TANPA menghapusnya dari getOwners() (porsi kepemilikan tetap utuh, tetap
// bisa difilter per-owner lewat holdingsByOwnerSettlement()).

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

test('getOwnerSettlement() default "titipan" kalau belum diisi (0 regresi data lama)', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(h.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  assert.equal(ctx.Investment.getOwnerSettlement(h, 'istri1'), 'titipan');
  // Perilaku lama tetap: owner non-SELF default -> 1 entry Buku Utang.
  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 1);
});

test('setOwnerSettlement(id, ownerId, "milik") menghapus entry Buku Utang owner itu, TIDAK menghapusnya dari getOwners()', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(h.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 1);

  ctx.Investment.setOwnerSettlement(h.id, 'istri1', 'milik');

  const hAfter = ctx.Investment.getHolding(h.id);
  assert.equal(ctx.Investment.getOwnerSettlement(hAfter, 'istri1'), 'milik');
  // Utang harus HILANG (bukan titipan, tidak ada kewajiban dikembalikan).
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 0);
  // Tapi kepemilikan istri TETAP ada (bisa difilter), cuma statusnya beda.
  const owners = ctx.Investment.getOwners(hAfter);
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'istri1');
  assert.equal(owners[0].porsi, 100);
});

test('setOwnerSettlement kembali ke "titipan" memunculkan lagi entry Buku Utang', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(h.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.setOwnerSettlement(h.id, 'istri1', 'milik');
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 0);

  ctx.Investment.setOwnerSettlement(h.id, 'istri1', 'titipan');
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === h.id).length, 1);
});

test('holdingsByOwnerSettlement() — filter "kepemilikan Istri tapi BUKAN titipan" (kasus konkret laporan user)', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const emas = ctx.Investment.addHolding({ name: 'Emas Antam Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emas.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.setOwnerSettlement(emas.id, 'istri1', 'milik');

  const rdTitipan = ctx.Investment.addHolding({ name: 'RD Titipan Istri', type: 'Reksa Dana', unit: 100, avgPrice: 10000 });
  ctx.Investment.setOwners(rdTitipan.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  // Tidak dipanggil setOwnerSettlement -> default 'titipan'.

  const milikIstri = ctx.Investment.holdingsByOwnerSettlement('istri1', 'milik');
  assert.equal(milikIstri.length, 1);
  assert.equal(milikIstri[0].id, emas.id);

  const titipanIstri = ctx.Investment.holdingsByOwnerSettlement('istri1', 'titipan');
  assert.equal(titipanIstri.length, 1);
  assert.equal(titipanIstri[0].id, rdTitipan.id);
});

test('multi-owner campuran: 1 owner "milik" + 1 owner "titipan" -> hanya owner titipan yang punya entry Buku Utang', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Saham Campuran', type: 'Saham', unit: 100, avgPrice: 5000 });
  ctx.Investment.setOwners(h.id, [
    { ownerId: 'istri1', porsi: 60, ownerName: 'Istri', isSelf: false },
    { ownerId: 'budi1', porsi: 40, ownerName: 'Budi', isSelf: false },
  ]);
  ctx.Investment.setOwnerSettlement(h.id, 'istri1', 'milik');

  const linked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(linked.length, 1);
  assert.equal(linked[0].linkedOwnerId, 'budi1');
});

test('setOwnerSettlement() throw kalau holding tidak ditemukan (pola error sama method lain di file ini)', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  assert.throws(() => ctx.Investment.setOwnerSettlement('tidak-ada', 'istri1', 'milik'), /tidak ditemukan/);
});
