'use strict';
// tests/fuel-ref-modal-s751.test.js — Sesi 751 (fitur "Referensi Harga BBM
// via AI", Sesi 2/3, bagian 1/2 dari sesi 2 -- dipecah lagi per instruksi
// standing "kerjakan 1 modal dulu"): menambahkan
//   1. Markup modal baru `fuelRefModal` ke `modules/shared/modals.js`
//      (`MODAL_HTML`), APPENDED di akhir array (bukan disisipkan di
//      tengah) -- supaya seluruh `data-modal-index` yang sudah ada di
//      `index.html`/`app_production.html` (skrip `modal-write.js` yang
//      menulis tiap modal ke DOM berdasarkan index posisi di array ini)
//      tidak ikut bergeser. ID di dalamnya (`fuelRefModal`/`fuelRefBody`/
//      `fuelRefApplyBtn`) sudah sesuai yang DIASUMSIKAN
//      `modules/vehicle/fuel-price-ref.js` sejak sesi 749 (lihat komentar
//      di kepala file itu).
//   2. Tombol trigger "🔄 Cek Update Harga BBM via AI" (id=`fuelRefCheckBtn`,
//      data-action="FuelPriceRef.check") di `bbmModal` SAJA -- `txBbmFields`
//      SENGAJA belum disentuh sesi ini (menyusul sesi berikutnya), sesuai
//      instruksi "kerjakan 1 modal dulu".
//
// BELUM dikerjakan sesi ini (menyusul sesi-sesi berikutnya sesuai rencana):
// - Tombol "🔄 Cek Update Harga BBM via AI" di `txBbmFields` (panel BBM di
//   `txModal`).
// - Wiring `car-notes.js` (`BBM.openModal`) & `modules/finance/tx-bbm.js`
//   supaya dropdown "Jenis BBM" (S750) otomatis di-populate lewat
//   `FuelPriceRef.populateSelect()` saat modal dibuka, & `fuelType`
//   tersimpan per log BBM.
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

test('s751: fuelRefModal ditambahkan sbg elemen TERAKHIR MODAL_HTML (bukan disisipkan di tengah, supaya data-modal-index lama di index.html tidak bergeser)', () => {
  const arr = loadModalHtmlArray();
  const last = arr[arr.length - 1];
  assert.match(last, /id="fuelRefModal"/, 'elemen terakhir MODAL_HTML harus fuelRefModal');
  // Pastikan tidak ada elemen fuelRefModal lain nyelip di tengah array (cuma 1x, di akhir).
  const countWithFuelRef = arr.filter((s) => s.includes('id="fuelRefModal"')).length;
  assert.equal(countWithFuelRef, 1);
});

test('s751: fuelRefModal punya struktur ID yang diasumsikan fuel-price-ref.js (fuelRefBody, fuelRefApplyBtn->FuelPriceRef.applySelected)', () => {
  const arr = loadModalHtmlArray();
  const fuelRefHtml = arr[arr.length - 1];
  assert.match(fuelRefHtml, /id="fuelRefBody"/);
  assert.match(fuelRefHtml, /id="fuelRefApplyBtn"[^>]*data-action="FuelPriceRef\.applySelected"/);
  assert.match(fuelRefHtml, /data-action="closeModal"\s+data-args='\["fuelRefModal"\]'/);
});

test('s751: bbmModal punya tombol trigger "Cek Update Harga BBM via AI" (id=fuelRefCheckBtn, data-action=FuelPriceRef.check)', () => {
  const html = loadModalHtml();
  const bbmModalIdx = html.indexOf('id="bbmModal"');
  assert.notEqual(bbmModalIdx, -1, 'bbmModal harus ada di MODAL_HTML');
  const bbmHargaIdx = html.indexOf('id="bbmHarga"', bbmModalIdx);
  assert.notEqual(bbmHargaIdx, -1);
  const checkBtnIdx = html.indexOf('id="fuelRefCheckBtn"', bbmModalIdx);
  assert.notEqual(checkBtnIdx, -1, 'tombol fuelRefCheckBtn harus ada di bbmModal');
  assert.ok(checkBtnIdx < bbmHargaIdx, 'tombol cek AI harus muncul sebelum field bbmHarga di markup');
  const btnSection = html.slice(checkBtnIdx, bbmHargaIdx);
  assert.match(btnSection, /data-action="FuelPriceRef\.check"/);
  assert.match(btnSection, /🔄 Cek Update Harga BBM via AI/);
});

// s751: assersi asli sesi ini ("txBbmFields BELUM disentuh, tidak ada
// FuelPriceRef.check di panel BBM txModal") SUDAH SUPERSEDED oleh S752
// (bagian 2/2 dari rencana Sesi 2/3), yang sengaja MENAMBAHKAN tombol cek
// AI itu ke txBbmFields -- lihat tests/fuel-ref-modal-s752.test.js utk
// cakupan test kondisi txBbmFields yang sekarang berlaku. Assersi ini
// sengaja dihapus (bukan diubah jadi assert.ok(true)) supaya tidak ada
// test palsu yang mengklaim menguji sesuatu tapi sebenarnya tidak lagi
// relevan; histori keputusan sesi tetap ada di komentar file & session note.
test('s751: txBbmFields (panel BBM txModal) tetap ada di MODAL_HTML sesi ini (perubahan lanjutannya menyusul S752)', () => {
  const html = loadModalHtml();
  const wrapIdx = html.indexOf('id="txBbmFields"');
  assert.notEqual(wrapIdx, -1, 'txBbmFields harus tetap ada (dari sesi 750)');
});

test('s751: markup lama bbmModal/txBbmFields dari sesi-sesi sebelumnya tidak ikut berubah (dropdown Jenis BBM S750 tetap ada)', () => {
  const html = loadModalHtml();
  // CSP-fix (lanjutan) memigrasikan inline onchange="FuelPriceRef.onSelectChange(...)"
  // jadi data-onchange="onBbmJenisChange" / "onTxBbmJenisChange" (wrapper function
  // yg memanggil FuelPriceRef.onSelectChange di runtime) -- lihat
  // FIX-s750-s751-s752-stale-regex utk histori regex lama yg strict 2-arg.
  assert.match(html, /id="bbmJenis"[^>]*data-onchange="onBbmJenisChange"/);
  assert.match(html, /id="txBbmJenis"[^>]*data-onchange="onTxBbmJenisChange"/);
});
