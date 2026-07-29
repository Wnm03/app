'use strict';
// tests/scan-ocr-bibit-detail.test.js — cakupan BUGFIX laporan user (Sesi 308):
// layar "Detail Portofolio" per-instrumen Bibit (dibuka lewat tap 1 reksa
// dana/saham, TANPA banner ringkasan "Nilai Portofolio .../Imbal Hasil" di
// atasnya) sebelumnya tidak dikenali detectScreenType() sama sekali -> scan
// gagal total ("Nominal tidak ditemukan"). Lihat komentar BUGFIX di
// modules/shared/scan-ocr.js (detectScreenTypeScores/parseBibitScreen).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(
    ['pajak-aset-ui-wrappers.js', 'modules/shared/scan-ocr.js'],
    {},
    ['detectScreenType', 'parseBibitScreen', 'extractLabeledAmount']
  );
}

// Teks OCR perkiraan dari screenshot user: halaman "Detail Portofolio" Pasar Uang,
// TIDAK ada baris "Nilai Portofolio .../Imbal Hasil" di atasnya sama sekali.
const DETAIL_PORTOFOLIO_PASAR_UANG =
  'Detail Portofolio\n' +
  'Majoris Pasar Uang Syariah Indonesia\n' +
  'Pasar Uang\n' +
  'Nilai Sekarang\n' +
  'Rp11,223,472\n' +
  'Modal Investasi\n' +
  'Rp11,100,000\n' +
  'Keuntungan\n' +
  'Rp123,472\n' +
  'Persentase Keuntungan\n' +
  '+1.11%\n' +
  'Harga Beli\n' +
  'Rp1,465.4662\n' +
  'Total Unit\n' +
  '7,574.3814\n';

// Halaman ringkasan penuh (image 1/3/4 user) -- PUNYA banner "Nilai Portofolio
// Saham"/"Imbal Hasil" di atas, jadi sudah kedetek 'bibit' bahkan sebelum fix ini.
const RINGKASAN_SAHAM_RUGI =
  'Saham\nInvest\n' +
  'Nilai Portofolio Saham\n' +
  'Rp145,117\n' +
  'Keuntungan\n' +
  '-Rp24,883\n' +
  'Schroder Dana Prestasi Plus\n' +
  'Saham\n' +
  'Nilai Sekarang\n' +
  'Rp145,117\n' +
  'Modal Investasi\n' +
  'Rp170,000\n' +
  'Keuntungan\n' +
  'Rp-24,883 (-14.64%)\n' +
  'Harga Beli\n' +
  'Rp34,826.0745\n' +
  'Jumlah Unit\n' +
  '4.8814\n';

test('detectScreenType() — layar "Detail Portofolio" per-instrumen (tanpa banner ringkasan) kedetek sbg bibit', () => {
  const ctx = makeCtx();
  assert.equal(ctx.detectScreenType(DETAIL_PORTOFOLIO_PASAR_UANG), 'bibit');
});

test('detectScreenType() — teks tanpa fingerprint bibit/bank/wallet/jago tetap null (0 regresi)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.detectScreenType('Halaman acak tanpa kata kunci apa pun'), null);
});

test('parseBibitScreen() — layar Detail Portofolio: nominal diambil dari "Nilai Sekarang" (fallback, bukan banner)', () => {
  const ctx = makeCtx();
  const result = ctx.parseBibitScreen(DETAIL_PORTOFOLIO_PASAR_UANG);
  assert.equal(result.nominal, 11223472);
  assert.ok(result.confidence > 0);
});

test('parseBibitScreen() — layar Detail Portofolio: detail Modal Investasi/Keuntungan/Harga Beli/Jumlah Unit ("Total Unit") ikut terbaca', () => {
  const ctx = makeCtx();
  const result = ctx.parseBibitScreen(DETAIL_PORTOFOLIO_PASAR_UANG);
  assert.ok(result.detail);
  assert.equal(result.detail.modal, 11100000);
  assert.equal(result.detail.keuntungan, 123472);
  assert.equal(result.detail.jumlahUnit, 7574.3814);
});

test('parseBibitScreen() — halaman ringkasan (banner "Nilai Portofolio ...") tetap pakai nominal banner, TIDAK berubah (0 regresi)', () => {
  const ctx = makeCtx();
  const result = ctx.parseBibitScreen(RINGKASAN_SAHAM_RUGI);
  assert.equal(result.nominal, 145117);
  assert.equal(result.confidence, 0.6); // via fallback pola "portofolio[^\\d]{0,20}(\\d...)", bukan "total ..."
});

test('parseBibitScreen() — Keuntungan NEGATIF (rugi) terbaca sbg angka negatif, bukan dibuang/positif', () => {
  const ctx = makeCtx();
  const result = ctx.parseBibitScreen(RINGKASAN_SAHAM_RUGI);
  assert.ok(result.detail);
  assert.equal(result.detail.keuntungan, -24883);
});

test('parseBibitScreen() — teks tanpa nominal & tanpa detail apa pun -> nominal null, detail null', () => {
  const ctx = makeCtx();
  const result = ctx.parseBibitScreen('Halaman kosong tanpa data apa pun');
  assert.equal(result.nominal, null);
  assert.equal(result.detail, null);
});
