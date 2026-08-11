'use strict';
// tests/asset-zakat-self-portion-s393.test.js — Sesi 393: audit ownership
// menemukan Zakat Maal (Zakat.hitungMaal(), pajak-pbb-zakat.js) & Zakat Maal
// per Aset (PajakAset.hitungZakatAset(), aset.js) menghitung dari NILAI PENUH
// aset zakatable, walau asetnya multi-pemilik (MultiOwnerEngine.owners, S390).
// Fix: MultiOwnerEngine.selfPorsi()/selfOwnedValue() (baru) + field `isSelf`
// per baris pemilik -- porsi milik SENDIRI saja yang dihitung ke zakat.
// File ini fokus ke bagian MultiOwnerEngine (murni, tanpa DOM) karena
// PajakAset/Zakat.hitungMaal() sudah cukup dites lewat guard typeof di
// tests lain (pajak-pbb-zakat-crud.test.js) -- tidak perlu diulang di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/shared/multi-owner-engine.js'], {}, ['MultiOwnerEngine']);
}

// --- selfPorsi() ---------------------------------------------------------

test('selfPorsi() — aset single-owner (default/legacy) -> 100 (0 regresi kasus mayoritas)', () => {
  const { MultiOwnerEngine } = makeCtx();
  assert.equal(MultiOwnerEngine.selfPorsi({}), 100);
  assert.equal(MultiOwnerEngine.selfPorsi({ id: 'a1', nilai: 1000 }), 100);
});

test('selfPorsi() — owners eksplisit, 1 baris ditandai isSelf -> jumlah porsi baris itu saja', () => {
  const { MultiOwnerEngine } = makeCtx();
  const asset = { owners: [{ ownerId: 'me', porsi: 40, isSelf: true }, { ownerId: 'budi', porsi: 60, isSelf: false }] };
  assert.equal(MultiOwnerEngine.selfPorsi(asset), 40);
});

test('selfPorsi() — owners eksplisit, TIDAK ADA baris isSelf/ownerId SELF -> 0 (bukan aset kamu)', () => {
  const { MultiOwnerEngine } = makeCtx();
  const asset = { owners: [{ ownerId: 'ayah', porsi: 60 }, { ownerId: 'budi', porsi: 40 }] };
  assert.equal(MultiOwnerEngine.selfPorsi(asset), 0);
});

test('selfPorsi() — ownerId literal "SELF" (data lama/migrasi tanpa field isSelf) -> tetap dianggap milik sendiri', () => {
  const { MultiOwnerEngine } = makeCtx();
  const asset = { owners: [{ ownerId: 'SELF', porsi: 70 }, { ownerId: 'investor1', porsi: 30 }] };
  assert.equal(MultiOwnerEngine.selfPorsi(asset), 70);
});

// --- selfOwnedValue() ------------------------------------------------------

test('selfOwnedValue() — aset single-owner -> nilai penuh (0 regresi)', () => {
  const { MultiOwnerEngine } = makeCtx();
  assert.equal(MultiOwnerEngine.selfOwnedValue({}, 10000000), 10000000);
});

test('selfOwnedValue() — multi-owner 40% milik sendiri -> nilai * 0.4', () => {
  const { MultiOwnerEngine } = makeCtx();
  const asset = { owners: [{ ownerId: 'me', porsi: 40, isSelf: true }, { ownerId: 'budi', porsi: 60, isSelf: false }] };
  assert.equal(MultiOwnerEngine.selfOwnedValue(asset, 10000000), 4000000);
});

test('selfOwnedValue() — nilai bukan angka -> 0 (aman, tidak throw)', () => {
  const { MultiOwnerEngine } = makeCtx();
  assert.equal(MultiOwnerEngine.selfOwnedValue({}, null), 0);
  assert.equal(MultiOwnerEngine.selfOwnedValue({}, 'abc'), 0);
});

// --- getOwners()/setOwners() carry isSelf ---------------------------------

test('setOwners() -> getOwners() round-trip: isSelf tersimpan & terbaca lagi', () => {
  const { MultiOwnerEngine } = makeCtx();
  const saved = MultiOwnerEngine.setOwners({}, [{ ownerId: 'me', ownerName: 'Aku', porsi: 100, isSelf: true }]);
  assert.equal(saved.ok, true);
  const r = MultiOwnerEngine.getOwners(saved.entity);
  assert.equal(r.owners[0].isSelf, true);
});
