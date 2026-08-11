'use strict';
// tests/debt-jenis.test.js — cakupan modules/finance/piutang-utang.js
// (Sesi 164, dropdown "Jenis Utang" KTA/Kartu Kredit/Pinjol/Pribadi/Koperasi/
// Lainnya). Fokus test: Debt.getJenisDefault() (fungsi murni, tidak sentuh
// DOM/D) — pemilihan modal/save() (baca document.getElementById) sengaja
// TIDAK dites di sini sesuai batasan loadSource.js (lihat catatan di file
// itu), cukup diverifikasi manual/smoke-test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/finance/piutang-utang.js'], {}, ['Debt']);
}

test('getJenisDefault() — kta punya default bunga 18%/th', () => {
  const ctx = makeCtx();
  const kta = ctx.Debt.getJenisDefault('kta');
  assert.equal(kta.label, 'KTA (Kredit Tanpa Agunan)');
  assert.equal(kta.bunga, 18);
});

test('getJenisDefault() — kartu_kredit & pinjol lebih tinggi dari kta (urutan risiko wajar)', () => {
  const ctx = makeCtx();
  const kta = ctx.Debt.getJenisDefault('kta').bunga;
  const kk = ctx.Debt.getJenisDefault('kartu_kredit').bunga;
  const pinjol = ctx.Debt.getJenisDefault('pinjol').bunga;
  assert.ok(kk > kta);
  assert.ok(pinjol > kk);
});

test('getJenisDefault() — pribadi & lainnya tidak punya default bunga (null)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.Debt.getJenisDefault('pribadi').bunga, null);
  assert.equal(ctx.Debt.getJenisDefault('lainnya').bunga, null);
});

test('getJenisDefault() — jenis tidak dikenal -> null (bukan lempar error)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.Debt.getJenisDefault('tidak_ada'), null);
  assert.equal(ctx.Debt.getJenisDefault(undefined), null);
});

test('JENIS_DEFAULTS — semua 6 jenis di dropdown modal punya entri (sinkron dgn modules/shared/modals.js)', () => {
  const ctx = makeCtx();
  const keys = Object.keys(ctx.Debt.JENIS_DEFAULTS).sort();
  assert.deepEqual(keys, ['kartu_kredit', 'koperasi', 'kta', 'lainnya', 'pinjol', 'pribadi'].sort());
});
