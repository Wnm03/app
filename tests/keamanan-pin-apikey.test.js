'use strict';
// tests/keamanan-pin-apikey.test.js — cakupan enkripsi/dekripsi API key AI
// berbasis PIN (encryptApiKeyWithPin/decryptApiKeyWithPin di
// modules/shared/keamanan-pin.js).
//
// Latar: Audit Real Test 2026-07-26 mencatat console.warn "OperationError"
// muncul saat self-test otomatis mencoba mendekripsi API key, ditandai
// "worth dicek manual apakah expected". Test ini memverifikasi lewat kode
// ASLI (bukan re-implementasi) bahwa itu memang perilaku yang disengaja:
// AES-GCM lazimnya throw OperationError saat kunci/PIN tidak cocok, dan
// decryptApiKeyWithPin() menangkapnya lalu balik `null` dengan aman (tanpa
// uncaught exception) supaya alur unlock/ganti-PIN tidak pernah crash.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/shared/keamanan-pin.js']);
}

test('encryptApiKeyWithPin()/decryptApiKeyWithPin() — round-trip PIN benar berhasil', async () => {
  const ctx = makeCtx();
  const enc = await ctx.encryptApiKeyWithPin('1234', 'sk-rahasia-abc');
  assert.ok(enc.salt && enc.iv && enc.ct);
  const decrypted = await ctx.decryptApiKeyWithPin('1234', enc);
  assert.equal(decrypted, 'sk-rahasia-abc');
});

test('decryptApiKeyWithPin() — PIN salah balik null, TIDAK throw (expected, bukan bug)', async () => {
  const ctx = makeCtx();
  const enc = await ctx.encryptApiKeyWithPin('1234', 'sk-rahasia-abc');
  // PIN salah lazimnya bikin crypto.subtle.decrypt() throw OperationError
  // (auth tag AES-GCM tidak cocok) -- ini harus tertangkap internal, bukan
  // lolos jadi uncaught rejection.
  let decrypted;
  await assert.doesNotReject(async () => { decrypted = await ctx.decryptApiKeyWithPin('9999', enc); });
  assert.equal(decrypted, null);
});

test('decryptApiKeyWithPin() — data terenkripsi rusak/tidak lengkap balik null, TIDAK throw', async () => {
  const ctx = makeCtx();
  assert.equal(await ctx.decryptApiKeyWithPin('1234', null), null);
  assert.equal(await ctx.decryptApiKeyWithPin('1234', {}), null);
  assert.equal(await ctx.decryptApiKeyWithPin('1234', { salt: 'x', iv: 'y', ct: 'bukan-base64-valid-###' }), null);
});
