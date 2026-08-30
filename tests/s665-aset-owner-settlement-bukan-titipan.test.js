'use strict';
// tests/s665-aset-owner-settlement-bukan-titipan.test.js — Sesi 665, port
// LANGSUNG dari Investment.getOwnerSettlement()/setOwnerSettlement() (S660)
// ke domain Aset (D.assets[]), sesuai catatan "Belum dikerjakan" S660/S662:
// "Pola sama ke D.assets[] (Buku Aset) -- kalau household-mu juga sering cek
// 'aset mana yang milik istri vs titipan' di luar Investasi, ini natural
// lanjutannya."
//
// Sebelum sesi ini: SETIAP owner non-SELF di a.owners[] otomatis dianggap
// "titipan" oleh Aset._syncOwnerDebts() -> selalu ada entry Buku Utang,
// walau ownernya pemilik sungguhan (mis. rumah warisan istri sendiri).
// Setelah sesi ini: Aset.setOwnerSettlement(assetId, ownerId, 'milik')
// mengecualikan owner itu dari Buku Utang TANPA mengubah porsi kepemilikan
// (a.owners[] 0 disentuh) -- default TETAP 'titipan' kalau tidak pernah
// dipanggil (0 regresi data existing).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/aset-owners.js. modules/asset/aset.js TIDAK disentuh.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset'],
  );
}

function baseD() {
  return {
    assets: [{
      id: 'as1',
      name: 'Rumah Warisan Istri',
      nilai: 500000000,
      owners: [
        { ownerId: 'istri1', porsi: 100, ownerName: 'Istri' },
      ],
    }],
    debts: [],
  };
}

test('default (belum pernah setOwnerSettlement) -> getOwnerSettlement() balikin "titipan", 0 regresi perilaku lama', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset._syncOwnerDebts(D.assets[0]);

  assert.equal(ctx.Aset.getOwnerSettlement(D.assets[0], 'istri1'), 'titipan');
  const debt = D.debts.find((d) => d.linkedAssetId === 'as1' && d.linkedOwnerId === 'istri1');
  assert.ok(debt, 'owner non-SELF default TETAP menghasilkan entry Buku Utang (perilaku lama tidak berubah)');
  assert.equal(debt.nilai, 500000000);
});

test('setOwnerSettlement(id, ownerId, "milik") -> owner itu TIDAK lagi punya entry Buku Utang, porsi kepemilikan 0 berubah', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset._syncOwnerDebts(D.assets[0]);
  assert.ok(D.debts.find((d) => d.linkedOwnerId === 'istri1'), 'sanity: sebelum diubah, debt ada');

  ctx.Aset.setOwnerSettlement('as1', 'istri1', 'milik');

  assert.equal(ctx.Aset.getOwnerSettlement(D.assets[0], 'istri1'), 'milik');
  assert.equal(D.debts.find((d) => d.linkedAssetId === 'as1' && d.linkedOwnerId === 'istri1'), undefined, 'entry Buku Utang harus otomatis dihapus');
  // Porsi kepemilikan (a.owners[]) SENGAJA tidak disentuh sama sekali.
  const owner = D.assets[0].owners.find((o) => o.ownerId === 'istri1');
  assert.equal(owner.porsi, 100);
});

test('setOwnerSettlement kembali ke "titipan" -> entry Buku Utang muncul lagi (idempotent, bukan cuma sekali arah)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset._syncOwnerDebts(D.assets[0]);

  ctx.Aset.setOwnerSettlement('as1', 'istri1', 'milik');
  assert.equal(D.debts.find((d) => d.linkedOwnerId === 'istri1'), undefined);

  ctx.Aset.setOwnerSettlement('as1', 'istri1', 'titipan');
  assert.equal(ctx.Aset.getOwnerSettlement(D.assets[0], 'istri1'), 'titipan');
  const debt = D.debts.find((d) => d.linkedAssetId === 'as1' && d.linkedOwnerId === 'istri1');
  assert.ok(debt, 'balik ke titipan harus memunculkan lagi entry Buku Utang');
});

test('assetsByOwnerSettlement(ownerId, "milik") -> hanya aset yg owner tsb berstatus milik', () => {
  const D = baseD();
  D.assets.push({
    id: 'as2',
    name: 'Emas Titipan Istri',
    nilai: 20000000,
    owners: [
      { ownerId: 'istri1', porsi: 100, ownerName: 'Istri' },
    ],
  });
  const ctx = makeCtx(D);
  ctx.Aset.setOwnerSettlement('as1', 'istri1', 'milik');
  // as2 dibiarkan default 'titipan'.

  const milikOnly = ctx.Aset.assetsByOwnerSettlement('istri1', 'milik');
  assert.equal(milikOnly.length, 1);
  assert.equal(milikOnly[0].id, 'as1');

  const titipanOnly = ctx.Aset.assetsByOwnerSettlement('istri1', 'titipan');
  assert.equal(titipanOnly.length, 1);
  assert.equal(titipanOnly[0].id, 'as2');
});

test('setOwnerSettlement() throw kalau assetId tidak ditemukan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.Aset.setOwnerSettlement('tidak-ada', 'istri1', 'milik'), /tidak ditemukan/i);
});

test('setOwnerSettlement() throw kalau ownerId kosong', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.Aset.setOwnerSettlement('as1', '', 'milik'), /ownerId/i);
});
