'use strict';
// tests/s540a-custodian-registry.test.js — Sesi S540-A (Tahap 1/4,
// DESIGN-S540-CUSTODIAN-GROUPING.md, Gate seed KOSONG — sama pola Gate #1
// OwnerRegistry S489).
//
// Target: `CustodianRegistry.listAll()`/`findOrCreate()`
// (modules/shared/custodian-registry.js) — fondasi registry MURNI, 0
// consumer sesi ini (investasi.js/UI form/presenter belum disentuh, itu
// S540-B/C/D). Test ini mirror 1:1 tests/s489-owner-registry.test.js
// (pola findOrCreate identik), diadaptasi ke nama field/entity kustodian.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/custodian-registry.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; } },
    ['CustodianRegistry'],
  );
}

test('1. listAll() kosong kalau D.investmentCustodians belum pernah diisi (getter TIDAK menulis D)', () => {
  const D = {};
  const ctx = makeCtx(D);
  assert.equal(ctx.CustodianRegistry.listAll().length, 0);
  assert.equal(D.investmentCustodians, undefined); // getter tidak side-effect nulis D
});

test('2. findOrCreate(name) baru -> push entri baru {id, name}, panggil save()', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id = ctx.CustodianRegistry.findOrCreate('Majoris');
  assert.equal(typeof id, 'string');
  assert.equal(D.investmentCustodians.length, 1);
  assert.equal(D.investmentCustodians[0].id, id);
  assert.equal(D.investmentCustodians[0].name, 'Majoris');
  assert.equal(D._saved, 1);
});

test('3. findOrCreate(name) nama sama (exact) -> balikin id yang SAMA, TIDAK duplikat', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.CustodianRegistry.findOrCreate('Majoris');
  const id2 = ctx.CustodianRegistry.findOrCreate('Majoris');
  assert.equal(id1, id2);
  assert.equal(D.investmentCustodians.length, 1);
});

test('4. findOrCreate(name) case-insensitive & trim -> tetap dianggap sama', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.CustodianRegistry.findOrCreate('Majoris');
  const id2 = ctx.CustodianRegistry.findOrCreate('  majoris  ');
  assert.equal(id1, id2);
  assert.equal(D.investmentCustodians.length, 1);
});

test('5. findOrCreate(name) nama beda -> 2 entri terpisah, id beda', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.CustodianRegistry.findOrCreate('Majoris');
  const id2 = ctx.CustodianRegistry.findOrCreate('Bibit');
  assert.notEqual(id1, id2);
  assert.equal(D.investmentCustodians.length, 2);
});

test('6. dedup registry itu sendiri by ID, bukan by name — 2 entri manual nama sama TETAP 2 baris (rename out-of-scope)', () => {
  const D = { investmentCustodians: [{ id: 'x1', name: 'Ajaib' }, { id: 'x2', name: 'Ajaib' }] };
  const ctx = makeCtx(D);
  const all = ctx.CustodianRegistry.listAll();
  assert.equal(all.length, 2);
  assert.notEqual(all[0].id, all[1].id);
});

test('7. findOrCreate("") atau whitespace -> throw Error, TIDAK menulis D', () => {
  const D = {};
  const ctx = makeCtx(D);
  assert.throws(() => ctx.CustodianRegistry.findOrCreate(''), /wajib diisi/);
  assert.throws(() => ctx.CustodianRegistry.findOrCreate('   '), /wajib diisi/);
  assert.equal(D.investmentCustodians, undefined);
});

test('8. listAll() balikin referensi array yang sama dgn D.investmentCustodians setelah findOrCreate (bukan salinan)', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.CustodianRegistry.findOrCreate('Majoris');
  assert.equal(ctx.CustodianRegistry.listAll(), D.investmentCustodians);
});

test('9. registry kustodian TERPISAH dari D.ownerRegistry — 0 kolisi nama/field antar 2 registry berbeda', () => {
  const D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }] };
  const ctx = makeCtx(D);
  const custodianId = ctx.CustodianRegistry.findOrCreate('Budi'); // nama sama sengaja, entity beda
  assert.notEqual(custodianId, 'o1');
  assert.equal(D.ownerRegistry.length, 1); // ownerRegistry tidak tersentuh
  assert.equal(D.investmentCustodians.length, 1);
});
