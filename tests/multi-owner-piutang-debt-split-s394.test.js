'use strict';
// tests/multi-owner-piutang-debt-split-s394.test.js — Sesi 394: Piutang/Utang
// x MultiOwnerEngine (S390). Piutang/utang bisa ditautkan ke aset multi-owner
// lewat field `assetId` (opsional) -- kalau ditautkan, hanya porsi milik
// sendiri (MultiOwnerEngine.selfPorsi) yang dihitung ke Total Piutang/Utang.
// TERPISAH dari Dana Titipan/Ownership Sync (S195/S255, isPiutangOwnershipSelf/
// isDebtOwnershipSelf, OwnershipEngine) -- kedua mekanisme dites tidak saling
// mengganggu di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Aset Patungan 70/30', nilai: 10000000, owners: [
        { ownerId: 'SELF', porsi: 70, isSelf: true },
        { ownerId: 'budi', ownerName: 'Budi', porsi: 30 },
      ] },
      { id: 'a2', name: 'Aset Sendiri', nilai: 5000000 }, // single-owner (default)
    ],
    piutang: [
      { id: 'p1', name: 'Piutang Biasa', nilai: 1000000, lunas: false }, // tanpa assetId
      { id: 'p2', name: 'Piutang Terkait Aset Patungan', nilai: 2000000, lunas: false, assetId: 'a1' },
      { id: 'p3', name: 'Piutang Terkait Aset Single-Owner', nilai: 500000, lunas: false, assetId: 'a2' },
    ],
    debts: [
      { id: 'd1', name: 'Utang Biasa', nilai: 3000000, lunas: false },
      { id: 'd2', name: 'Utang Terkait Aset Patungan', nilai: 4000000, lunas: false, assetId: 'a1' },
    ],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/finance/piutang-utang.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['MultiOwnerEngine', 'Piutang', 'Debt', 'resolveEntryAssetSelfPorsi', 'getMultiOwnerAssets'],
  );
}

test('resolveEntryAssetSelfPorsi: fallback 100 tanpa assetId', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.resolveEntryAssetSelfPorsi(D.piutang[0]), 100);
});

test('resolveEntryAssetSelfPorsi: pakai porsi SELF dari aset multi-owner', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.resolveEntryAssetSelfPorsi(D.piutang[1]), 70);
  assert.equal(ctx.resolveEntryAssetSelfPorsi(D.debts[1]), 70);
});

test('resolveEntryAssetSelfPorsi: fallback 100 kalau aset single-owner', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.resolveEntryAssetSelfPorsi(D.piutang[2]), 100);
});

test('resolveEntryAssetSelfPorsi: fallback 100 kalau assetId tidak ditemukan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.resolveEntryAssetSelfPorsi({ assetId: 'tidak-ada' }), 100);
});

test('Piutang.totalValue(): piutang terkait aset patungan dihitung sesuai porsi SELF saja', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // p1 (1jt, porsi 100) + p2 (2jt * 70%) + p3 (500rb, porsi 100 krn aset single-owner)
  assert.equal(ctx.Piutang.totalValue(), 1000000 + 2000000 * 0.7 + 500000);
});

test('Debt.totalValue(): utang terkait aset patungan dihitung sesuai porsi SELF saja', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // d1 (3jt, porsi 100) + d2 (4jt * 70%)
  assert.equal(ctx.Debt.totalValue(), 3000000 + 4000000 * 0.7);
});

test('getMultiOwnerAssets(): hanya aset dengan >1 pemilik', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const assets = ctx.getMultiOwnerAssets();
  assert.equal(assets.length, 1);
  assert.equal(assets[0].id, 'a1');
});

test('backward compat: piutang/utang tanpa assetId tetap 100% (0 regresi)', () => {
  const D = { assets: [], piutang: [{ id: 'p1', name: 'Lama', nilai: 777000, lunas: false }], debts: [] };
  const ctx = makeCtx(D);
  assert.equal(ctx.Piutang.totalValue(), 777000);
});
