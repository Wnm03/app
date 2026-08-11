'use strict';
// tests/s489-owner-registry.test.js — Sesi 489 (langkah 1/5,
// PLAN-owner-registry-multi-session.md, Gate #1 = seed KOSONG).
//
// Target: `OwnerRegistry.listAll()`/`findOrCreate()`
// (modules/shared/owner-registry.js) — fondasi registry MURNI, 0 consumer
// sesi ini (aset.js/investasi-view.js/titipanCommitmentModal belum
// disentuh, itu S490-S492).

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

test('1. listAll() kosong kalau D.ownerRegistry belum pernah diisi (getter TIDAK menulis D)', () => {
  const D = {};
  const ctx = makeCtx(D);
  assert.equal(ctx.OwnerRegistry.listAll().length, 0);
  assert.equal(D.ownerRegistry, undefined); // getter tidak side-effect nulis D
});

test('2. findOrCreate(name) baru -> push entri baru {id, name}, panggil save()', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id = ctx.OwnerRegistry.findOrCreate('Budi');
  assert.equal(typeof id, 'string');
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].id, id);
  assert.equal(D.ownerRegistry[0].name, 'Budi');
  assert.equal(D._saved, 1);
});

test('3. findOrCreate(name) nama sama (exact) -> balikin id yang SAMA, TIDAK duplikat', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.OwnerRegistry.findOrCreate('Budi');
  const id2 = ctx.OwnerRegistry.findOrCreate('Budi');
  assert.equal(id1, id2);
  assert.equal(D.ownerRegistry.length, 1);
});

test('4. findOrCreate(name) case-insensitive & trim -> tetap dianggap sama', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.OwnerRegistry.findOrCreate('Budi');
  const id2 = ctx.OwnerRegistry.findOrCreate('  budi  ');
  assert.equal(id1, id2);
  assert.equal(D.ownerRegistry.length, 1);
});

test('5. findOrCreate(name) nama beda -> 2 entri terpisah, id beda', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id1 = ctx.OwnerRegistry.findOrCreate('Budi');
  const id2 = ctx.OwnerRegistry.findOrCreate('Ani');
  assert.notEqual(id1, id2);
  assert.equal(D.ownerRegistry.length, 2);
});

test('6. dedup registry itu sendiri by ID, bukan by name — 2 entri manual nama sama TETAP 2 baris (rename out-of-scope)', () => {
  const D = { ownerRegistry: [{ id: 'x1', name: 'Cici' }, { id: 'x2', name: 'Cici' }] };
  const ctx = makeCtx(D);
  const all = ctx.OwnerRegistry.listAll();
  assert.equal(all.length, 2);
  assert.notEqual(all[0].id, all[1].id);
});

test('7. findOrCreate("") atau whitespace -> throw Error, TIDAK menulis D', () => {
  const D = {};
  const ctx = makeCtx(D);
  assert.throws(() => ctx.OwnerRegistry.findOrCreate(''), /wajib diisi/);
  assert.throws(() => ctx.OwnerRegistry.findOrCreate('   '), /wajib diisi/);
  assert.equal(D.ownerRegistry, undefined);
});

test('8. listAll() balikin referensi array yang sama dgn D.ownerRegistry setelah findOrCreate (bukan salinan)', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.OwnerRegistry.findOrCreate('Budi');
  assert.equal(ctx.OwnerRegistry.listAll(), D.ownerRegistry);
});
