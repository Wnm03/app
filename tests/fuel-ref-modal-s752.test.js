'use strict';
// tests/fuel-ref-modal-s752.test.js — Sesi 752 (fitur "Referensi Harga BBM
// via AI", Sesi 2/3, bagian 2/2): menambahkan tombol trigger "🔄 Cek Update
// Harga BBM via AI" ke `txBbmFields` (panel BBM di `txModal`), pola identik
// dgn yang ditambahkan ke `bbmModal` di S751 -- BEDANYA id tombol WAJIB
// beda (`txFuelRefCheckBtn`, bukan `fuelRefCheckBtn`) karena
// `FuelPriceRef.check()` (modules/vehicle/fuel-price-ref.js) hardcode
// `getElementById('fuelRefCheckBtn')` utk disable/ubah teks tombol saat
// proses cek berjalan -- 2 elemen dgn id sama akan melanggar keunikan ID
// HTML & bikin `getElementById` cuma pernah mengenai instance bbmModal.
// `data-action="FuelPriceRef.check"` tetap sama persis (fungsi cek & modal
// hasil `fuelRefModal` memang didesain dipakai bersama dari 2 tempat
// pemicu ini, lihat komentar kepala fuel-price-ref.js).
//
// Test ini murni menginspeksi string `MODAL_HTML` (bukan render DOM penuh,
// sesuai batasan `loadSource` -- lihat catatan di `tests/helpers/loadSource.js`).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadModalHtmlArray() {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  return ctx.MODAL_HTML;
}

function loadModalHtml() {
  return loadModalHtmlArray().join('\n');
}

test('s752: txBbmFields (panel BBM txModal) punya tombol trigger "Cek Update Harga BBM via AI" (id=txFuelRefCheckBtn, data-action=FuelPriceRef.check)', () => {
  const html = loadModalHtml();
  const wrapIdx = html.indexOf('id="txBbmFields"');
  assert.notEqual(wrapIdx, -1, 'txBbmFields harus ada di MODAL_HTML');
  const gridIdx = html.indexOf('u-grid2', wrapIdx);
  assert.notEqual(gridIdx, -1);
  const checkBtnIdx = html.indexOf('id="txFuelRefCheckBtn"', wrapIdx);
  assert.notEqual(checkBtnIdx, -1, 'tombol txFuelRefCheckBtn harus ada di txBbmFields');
  assert.ok(checkBtnIdx < gridIdx, 'tombol cek AI harus muncul sebelum grid KM Odometer/Liter di markup');
  const btnSection = html.slice(checkBtnIdx, gridIdx);
  assert.match(btnSection, /data-action="FuelPriceRef\.check"/);
  assert.match(btnSection, /🔄 Cek Update Harga BBM via AI/);
});

test('s752: id tombol txBbmFields BEDA dari bbmModal (tidak ada id duplikat "fuelRefCheckBtn" di 2 tempat)', () => {
  const html = loadModalHtml();
  const occurrences = (html.match(/id="fuelRefCheckBtn"/g) || []).length;
  assert.equal(occurrences, 1, 'id="fuelRefCheckBtn" hanya boleh muncul 1x (di bbmModal, dari S751)');
  const txOccurrences = (html.match(/id="txFuelRefCheckBtn"/g) || []).length;
  assert.equal(txOccurrences, 1, 'id="txFuelRefCheckBtn" harus muncul tepat 1x (di txBbmFields)');
});

test('s752: bbmModal (S751) tidak ikut berubah -- tombol fuelRefCheckBtn tetap di posisi sebelum bbmHarga', () => {
  const html = loadModalHtml();
  const bbmModalIdx = html.indexOf('id="bbmModal"');
  assert.notEqual(bbmModalIdx, -1);
  const bbmHargaIdx = html.indexOf('id="bbmHarga"', bbmModalIdx);
  const checkBtnIdx = html.indexOf('id="fuelRefCheckBtn"', bbmModalIdx);
  assert.notEqual(checkBtnIdx, -1);
  assert.ok(checkBtnIdx < bbmHargaIdx);
});

test('s752: fuelRefModal (S751) tetap elemen TERAKHIR MODAL_HTML, tidak tergeser/berubah sesi ini', () => {
  const arr = loadModalHtmlArray();
  const last = arr[arr.length - 1];
  assert.match(last, /id="fuelRefModal"/, 'elemen terakhir MODAL_HTML harus tetap fuelRefModal');
  const countWithFuelRefModal = arr.filter((s) => s.includes('id="fuelRefModal"')).length;
  assert.equal(countWithFuelRefModal, 1);
});

test('s752: markup lama dropdown "Jenis BBM" (S750) di bbmModal & txBbmFields tidak ikut berubah', () => {
  const html = loadModalHtml();
  // Regex tolerant thd argumen ke-3 -- lihat FIX-s750-s751-s752-stale-regex.
  assert.match(html, /id="bbmJenis"[^>]*onchange="FuelPriceRef\.onSelectChange\('bbmJenis','bbmHarga'[^"]*\)"/);
  assert.match(html, /id="txBbmJenis"[^>]*onchange="FuelPriceRef\.onSelectChange\('txBbmJenis','txBbmHargaL'[^"]*\)"/);
});
