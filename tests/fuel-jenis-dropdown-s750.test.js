'use strict';
// tests/fuel-jenis-dropdown-s750.test.js — Sesi 750 (fitur "Referensi Harga
// BBM via AI", Sesi 2/3 -- bagian 1/3 dari sesi 2, dipecah lagi jadi sesi
// lebih ringan sesuai instruksi standing "1 sesi 1 patch"): dropdown "Jenis
// BBM" ditambahkan ke `modules/shared/modals.js` di 2 tempat --
// `bbmModal` (dekat field `bbmHarga`) & `txBbmFields` (panel BBM di
// `txModal`, dekat `txBbmVehicle`). Scope sesi ini MURNI markup select +
// wiring onchange ke `FuelPriceRef.onSelectChange(selectId, hargaId)`
// (fungsi ini sudah ada dari sesi 749, lihat modules/vehicle/fuel-price-ref.js).
//
// BELUM dikerjakan sesi ini (menyusul sesi berikutnya sesuai rencana):
// - fuelRefModal markup + tombol "🔄 Cek Update Harga BBM via AI" di kedua
//   modal ini (sesi menyusul).
// - Wiring car-notes.js (BBM.openModal) & modules/finance/tx-bbm.js supaya
//   dropdown ini otomatis di-populate (FuelPriceRef.populateSelect()) &
//   fuelType tersimpan per log BBM (sesi menyusul berikutnya lagi).
//
// Test ini murni menginspeksi string MODAL_HTML (bukan render DOM penuh --
// sesuai batasan loadSource, lihat catatan di helpers/loadSource.js), jadi
// checknya berbasis regex terhadap markup yang sudah dibangun oleh
// modules/shared/modals.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadModalHtml() {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  return ctx.MODAL_HTML.join('\n');
}

test('s750: bbmModal punya dropdown "Jenis BBM" (id=bbmJenis) dekat field bbmHarga', () => {
  const html = loadModalHtml();
  const bbmModalIdx = html.indexOf('id="bbmModal"');
  assert.notEqual(bbmModalIdx, -1, 'bbmModal harus ada di MODAL_HTML');
  const bbmHargaIdx = html.indexOf('id="bbmHarga"', bbmModalIdx);
  assert.notEqual(bbmHargaIdx, -1);
  const bbmJenisIdx = html.indexOf('id="bbmJenis"', bbmModalIdx);
  assert.notEqual(bbmJenisIdx, -1, 'select bbmJenis harus ada di bbmModal');
  assert.ok(bbmJenisIdx < bbmHargaIdx, 'bbmJenis harus muncul sebelum bbmHarga di markup');
});

test('s750: select #bbmJenis wired ke FuelPriceRef.onSelectChange(\'bbmJenis\',\'bbmHarga\', ...) lewat wrapper onBbmJenisChange (CSP-fix: data-onchange, bukan inline onchange)', () => {
  const html = loadModalHtml();
  // Sesi CSP-fix (lanjutan) memigrasikan semua inline onchange="..." jadi
  // data-onchange="namaFungsi" (dispatcher data-onchange dipanggil lewat
  // event delegation, tidak bisa membawa pemanggilan langsung
  // FuelPriceRef.onSelectChange(...) di atribut). Wiring aktualnya sekarang
  // ada di wrapper function onBbmJenisChange() (lihat modules/vehicle/*.js),
  // jadi test ini cukup mengecek select memakai wrapper tsb.
  assert.match(html, /id="bbmJenis"[^>]*data-onchange="onBbmJenisChange"/);
});

test('s750: txBbmFields punya dropdown "Jenis BBM" (id=txBbmJenis) tepat setelah select txBbmVehicle', () => {
  const html = loadModalHtml();
  const wrapIdx = html.indexOf('id="txBbmFields"');
  assert.notEqual(wrapIdx, -1, 'txBbmFields harus ada di MODAL_HTML');
  const vehIdx = html.indexOf('id="txBbmVehicle"', wrapIdx);
  assert.notEqual(vehIdx, -1);
  const jenisIdx = html.indexOf('id="txBbmJenis"', wrapIdx);
  assert.notEqual(jenisIdx, -1, 'select txBbmJenis harus ada di txBbmFields');
  assert.ok(jenisIdx > vehIdx, 'txBbmJenis harus muncul setelah txBbmVehicle di markup');
});

test('s750: select #txBbmJenis wired ke FuelPriceRef.onSelectChange(\'txBbmJenis\',\'txBbmHargaL\', ...) lewat wrapper onTxBbmJenisChange (CSP-fix: data-onchange, bukan inline onchange)', () => {
  const html = loadModalHtml();
  // Sama dgn test bbmJenis di atas -- wiring sekarang lewat wrapper
  // onTxBbmJenisChange() (modules/finance/tx-bbm.js) yg baca ulang
  // txBbmVehicle.value tiap dipanggil, dipasang via data-onchange.
  assert.match(html, /id="txBbmJenis"[^>]*data-onchange="onTxBbmJenisChange"/);
});

test('s750: kedua select baru punya class "fs" (konsisten dgn select lain di app)', () => {
  const html = loadModalHtml();
  assert.match(html, /<select class="fs" id="bbmJenis"/);
  assert.match(html, /<select class="fs" id="txBbmJenis"/);
});
