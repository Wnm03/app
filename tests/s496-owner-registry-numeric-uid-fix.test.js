'use strict';
// tests/s496-owner-registry-numeric-uid-fix.test.js — Sesi 496.
//
// BUG (dilaporkan user via screenshot, modal "Atur Porsi Kepemilikan" holding
// investasi "Kamera"): simpan porsi utk pemilik BARU (nama belum ada di
// OwnerRegistry) gagal dgn toast "Pemilik ke-1: ownerId wajib diisi (string,
// tidak boleh kosong)" — padahal nama & porsi sudah diisi benar.
//
// ROOT CAUSE: `uid()` (modules/shared/features-helpers-global-security.js)
// balikin NUMBER (`Date.now()`-based), bukan string. Test S489 yang sudah ada
// (tests/s489-owner-registry.test.js) TIDAK menangkap ini krn mock `uid` di
// situ sengaja dibuat balikin STRING ('u1','u2',...) — beda dari uid() asli.
// `OwnerRegistry.findOrCreate()` sebelumnya balikin `id` itu APA ADANYA
// (angka), lalu dipakai langsung sbg `ownerId` di
// InvestmentUI.saveOwners()/Aset.saveOwners() (baris baru, non-SELF, nama
// belum ada di registry -> lewat findOrCreate()). Angka itu diteruskan ke
// MultiOwnerEngine.validateOwner(), yg mensyaratkan `typeof ownerId ===
// 'string'` — gagal krn `typeof 123 === 'number'`.
//
// FIX: `findOrCreate()` sekarang SELALU balikin `String(id)`, baik utk id
// yang baru dibuat maupun id existing yang dibaca balik (defense-in-depth,
// jaga-jaga ada entri lama yang kadung tersimpan sbg number sebelum fix ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Mock uid() SENGAJA balikin NUMBER (meniru uid() produksi yang asli,
// modules/shared/features-helpers-global-security.js: `function
// uid(){let n=Date.now();...;return n;}` — bukan string).
function makeCtx(D) {
  let n = 1000;
  return loadSource(
    ['modules/shared/owner-registry.js'],
    { D, uid: () => (n += 1), save: () => { D._saved = (D._saved || 0) + 1; } },
    ['OwnerRegistry'],
  );
}

test('1. findOrCreate(name) baru, uid() balikin number -> id yang dibalikin TETAP string', () => {
  const D = {};
  const ctx = makeCtx(D);
  const id = ctx.OwnerRegistry.findOrCreate('Kamera');
  assert.equal(typeof id, 'string');
  assert.equal(id, '1001');
});

test('2. entri yang tersimpan di D.ownerRegistry juga berupa string (bukan number mentah dari uid())', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.OwnerRegistry.findOrCreate('Kamera');
  assert.equal(typeof D.ownerRegistry[0].id, 'string');
});

test('3. findOrCreate(name) nama sama kedua kali -> balikin id existing, TETAP string (defense-in-depth utk entri lama numeric)', () => {
  // Simulasikan entri "lama" yang kadung tersimpan sbg number (dibuat versi
  // sebelum fix ini) -- findOrCreate() harus tetap balikin string saat baca balik.
  const D = { ownerRegistry: [{ id: 12345, name: 'Sihab' }] };
  const ctx = makeCtx(D);
  const id = ctx.OwnerRegistry.findOrCreate('Sihab');
  assert.equal(typeof id, 'string');
  assert.equal(id, '12345');
});

test('4. id hasil findOrCreate() lolos kontrak MultiOwnerEngine.validateOwner() (typeof ownerId === "string")', () => {
  const D = {};
  const ctx = makeCtx(D);
  const meCtx = loadSource(
    ['modules/shared/multi-owner-engine.js'],
    {},
    ['MultiOwnerEngine'],
  );
  const ownerId = ctx.OwnerRegistry.findOrCreate('Kamera');
  const v = meCtx.MultiOwnerEngine.validateOwner({ ownerId, ownerName: 'Kamera', porsi: 100 });
  assert.equal(v.ok, true);
});
