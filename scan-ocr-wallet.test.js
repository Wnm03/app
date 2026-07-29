'use strict';
// tests/scan-ocr-wallet.test.js — cakupan parseWalletScreen() di
// modules/shared/scan-ocr.js (BUGFIX laporan user: scan GoPay ke-baca
// angka pengeluaran bulanan "Rp937.000 sudah terpakai di Juli", bukan
// saldo utama "Rp154.834").

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  // normalizeOcrNumber() dipakai parseWalletScreen() tapi didefinisikan di
  // pajak-aset-ui-wrappers.js (global, sama seperti di app asli) — dimuat
  // bareng supaya tidak ReferenceError.
  return loadSource(['pajak-aset-ui-wrappers.js', 'modules/shared/scan-ocr.js'], {}, ['parseWalletScreen']);
}

test('parseWalletScreen() — saldo utama diambil, BUKAN angka "sudah terpakai" di bawahnya', () => {
  const ctx = makeCtx();
  // Perkiraan teks OCR layar GoPay dari laporan user: saldo utama duluan,
  // lalu baris rekap pengeluaran bulan ini.
  const text = 'GoPay\nRp154.834\n500 Coins\nRp937.000 sudah terpakai di Juli\n';
  const result = ctx.parseWalletScreen(text);
  assert.equal(result.nama, 'GoPay');
  assert.equal(result.nominal, 154834);
});

test('parseWalletScreen() — angka "sudah terpakai" tetap disaring walau saldo utama tidak diakhiri newline', () => {
  const ctx = makeCtx();
  const text = 'GoPay\nRp 154.834 \n500 Coins\nRp937.000 sudah terpakai di Juli\n';
  const result = ctx.parseWalletScreen(text);
  assert.equal(result.nominal, 154834);
});

test('parseWalletScreen() — DANA tanpa anotasi pengeluaran tetap terbaca seperti biasa', () => {
  const ctx = makeCtx();
  const text = 'DANA\nSaldo\nRp250.000\n';
  const result = ctx.parseWalletScreen(text);
  assert.equal(result.nama, 'DANA');
  assert.equal(result.nominal, 250000);
});

test('parseWalletScreen() — kalau SEMUA kandidat kebetulan ke-flag "terpakai", tetap fallback ke kandidat pertama (bukan null)', () => {
  const ctx = makeCtx();
  const text = 'GoPay\nRp937.000 sudah terpakai di Juli\n';
  const result = ctx.parseWalletScreen(text);
  assert.equal(result.nominal, 937000);
});

test('parseWalletScreen() — teks kosong/tidak ada Rp -> nominal null, confidence 0', () => {
  const ctx = makeCtx();
  const result = ctx.parseWalletScreen('GoPay\nTidak ada saldo terbaca\n');
  assert.equal(result.nominal, null);
  assert.equal(result.confidence, 0);
});

// BUGFIX S169 (laporan user, foto asli GoPay): teks di bawah ini persis hasil OCR
// (tesseract) thd screenshot GoPay asli yang dilaporkan salah baca -- simbol "Rp" di
// depan saldo utama "154.8540" TIDAK kebaca sama sekali (cuma angkanya polos), sementara
// "Rp937.000 udah terpakai di Juli" di bawahnya kebaca lengkap dgn "Rp". Sebelum
// perbaikan ini, parseWalletScreen() cuma nemu 1 kandidat ("Rp" wajib) -- si angka
// pengeluaran -- dan salah pilih itu jadi saldo.
test('parseWalletScreen() — saldo tanpa prefix "Rp" (OCR gagal baca simbol Rp) tetap terbaca, BUKAN angka "terpakai"', () => {
  const ctx = makeCtx();
  const text = '@ gopay Perlindungan kuat ®\n154.8540 — 7 «C\nTop up\n500 Coins\nRp937.000 udah terpakai di Juli Tarik Tunai\n';
  const result = ctx.parseWalletScreen(text);
  assert.equal(result.nama, 'GoPay');
  // grup terakhir "8540" (4 digit, harusnya selalu 3) dianggap kenoise 1 digit OCR ->
  // dipotong jadi "854" -> nominal 154854 (BUKAN 937000 angka pengeluaran, dan BUKAN
  // salah pindah skala 1548540).
  assert.equal(result.nominal, 154854);
  assert.notEqual(result.nominal, 937000);
});

test('parseWalletScreen() — angka polos (tanpa Rp) dapat confidence lebih rendah drpd yang ber-"Rp"', () => {
  const ctx = makeCtx();
  const bare = ctx.parseWalletScreen('GoPay\n154.834\n');
  const withRp = ctx.parseWalletScreen('GoPay\nRp154.834\n');
  assert.equal(bare.nominal, 154834);
  assert.equal(withRp.nominal, 154834);
  assert.ok(bare.confidence < withRp.confidence);
});

test('parseWalletScreen() — angka 4 digit polos tanpa pemisah ribuan (mis. jam/tahun) TIDAK ikut kehitung sbg saldo', () => {
  const ctx = makeCtx();
  const result = ctx.parseWalletScreen('GoPay\n0854\nRp250.000\n');
  assert.equal(result.nominal, 250000);
});
