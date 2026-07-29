'use strict';
// tests/worthit-jenis.test.js — cakupan modules/finance/worthit.js
// (Sesi 165 lanjutan, "Sisa #5 Worth It?": pertanyaan tambahan per kategori
// Kebutuhan/Keinginan di wiCategory/wlCategory). Fokus test:
// WorthIt.catFieldsHtml() (fungsi murni, tidak sentuh DOM/D) — wiring DOM
// (onCategoryChange/readCatExtra, baca document.getElementById) sengaja
// TIDAK dites di sini sesuai batasan loadSource.js, cukup diverifikasi
// manual/smoke-test. Pola sama persis tests/vehicle-jenis.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/finance/worthit.js'], {}, ['WorthIt']);
}

test('catFieldsHtml() — kebutuhan: dropdown Alasan Kebutuhan (id prefix+AlasanKebutuhan)', () => {
  const ctx = makeCtx();
  const html = ctx.WorthIt.catFieldsHtml('kebutuhan', 'wi');
  assert.match(html, /id="wiAlasanKebutuhan"/);
  assert.match(html, /rusak/);
  assert.match(html, /belum_punya/);
});

test('catFieldsHtml() — keinginan: dropdown Sudah Kepikiran Sejak Kapan (id prefix+SejakKapan)', () => {
  const ctx = makeCtx();
  const html = ctx.WorthIt.catFieldsHtml('keinginan', 'wl');
  assert.match(html, /id="wlSejakKapan"/);
  assert.match(html, /baru_lihat/);
  assert.match(html, /lama/);
});

test('catFieldsHtml() — prefix beda hasilkan id beda (wi vs wl, tidak bentrok di 1 modal)', () => {
  const ctx = makeCtx();
  const wi = ctx.WorthIt.catFieldsHtml('kebutuhan', 'wi');
  const wl = ctx.WorthIt.catFieldsHtml('kebutuhan', 'wl');
  assert.match(wi, /id="wiAlasanKebutuhan"/);
  assert.match(wl, /id="wlAlasanKebutuhan"/);
  assert.doesNotMatch(wi, /id="wlAlasanKebutuhan"/);
});

test('catFieldsHtml() — kategori tidak dikenal -> string kosong (bukan crash)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.WorthIt.catFieldsHtml('tidak_ada', 'wi'), '');
  assert.equal(ctx.WorthIt.catFieldsHtml(undefined, 'wi'), '');
});

test('catFieldsHtml() — value existing (mode edit) ditandai selected', () => {
  const ctx = makeCtx();
  const html = ctx.WorthIt.catFieldsHtml('keinginan', 'wl', 'lama');
  assert.match(html, /value="lama" selected/);
});

test('CAT_FIELDS — kebutuhan & keinginan masing-masing punya minimal 3 opsi', () => {
  const ctx = makeCtx();
  assert.ok(ctx.WorthIt.CAT_FIELDS.kebutuhan.options.length >= 3);
  assert.ok(ctx.WorthIt.CAT_FIELDS.keinginan.options.length >= 3);
});
