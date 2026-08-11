'use strict';
// tests/car-notes-window-expose-s345.test.js — Sesi 345
//
// Bug: tombol Car Notes (BBM/Servis/Torsi) tidak bereaksi, 0 toast.
//
// Akar masalah: `const BBM={...}`, `const Servis={...}`, `const Torsi={...}`
// di car-notes.js hanya membuat binding lexical-scope, BUKAN properti
// window. Dispatcher klik global (features-helpers-global-security.js)
// selalu resolve data-action="Owner.method" lewat window[Owner][method] —
// jadi window.BBM/window.Servis/window.Torsi yang tidak pernah ada bikin
// SEMUA tombol dengan data-action berbentuk "BBM.xxx"/"Servis.xxx"/
// "Torsi.xxx" gagal diam-diam (tidak ada error, tidak ada toast).
//
// Pola bug yang sama (dan fixnya) sudah pernah terjadi utk FuelModal/
// FuelBarCorrection/FuelTankProfileUI — lihat komentar di fuel-modal.js.
//
// Test ini memuat car-notes.js ASLI (bukan re-implementasi) lewat harness
// vm loadSource(), lalu memverifikasi window.BBM/window.Servis/window.Torsi
// benar-benar ada dan sama-persis dengan objek lexical-scope-nya. Ini
// permanen menjaga supaya regresi ini tidak terulang lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('car-notes.js — window.BBM/Servis/Torsi ter-ekspos utk dispatcher data-action global', () => {
  const ctx = loadSource(['car-notes.js']);

  assert.equal(typeof ctx.window.BBM, 'object', 'window.BBM harus ada (dipakai data-action="BBM.xxx")');
  assert.equal(typeof ctx.window.Servis, 'object', 'window.Servis harus ada (dipakai data-action="Servis.xxx", termasuk chip rekomendasi part)');
  assert.equal(typeof ctx.window.Torsi, 'object', 'window.Torsi harus ada (dipakai data-action="Torsi.xxx", modal Kalkulator Torsi)');
});

test('car-notes.js — window.BBM/Servis/Torsi adalah objek yang SAMA dengan binding lexical (bukan copy)', () => {
  const ctx = loadSource(['car-notes.js'], {}, ['BBM', 'Servis', 'Torsi']);

  assert.strictEqual(ctx.window.BBM, ctx.BBM, 'window.BBM harus referensi identik ke const BBM, bukan objek terpisah');
  assert.strictEqual(ctx.window.Servis, ctx.Servis, 'window.Servis harus referensi identik ke const Servis, bukan objek terpisah');
  assert.strictEqual(ctx.window.Torsi, ctx.Torsi, 'window.Torsi harus referensi identik ke const Torsi, bukan objek terpisah');
});

test('car-notes.js — dispatcher-style lookup window["Owner"]["method"] berhasil resolve method nyata', () => {
  const ctx = loadSource(['car-notes.js']);

  // Simulasikan persis cara features-helpers-global-security.js resolve
  // data-action="Owner.method" -> window[Owner][method].
  assert.equal(typeof ctx.window['BBM']['loadMore'], 'function');
  assert.equal(typeof ctx.window['Servis']['populatePartSelect'], 'function');
  assert.equal(typeof ctx.window['Torsi']['toggleCheck'], 'function');
});
