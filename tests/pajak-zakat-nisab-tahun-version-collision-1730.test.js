const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'modules/shared/features-helpers-global-security.js'), 'utf8');
const bundleB = fs.readFileSync(path.join(ROOT, 'app-bundle-b.min.js'), 'utf8');

// REGRESSION (ditemukan saat akumulasi patch 1730 di atas 1729/1728).
// Root cause: proses bump versi build (1728 -> 1730) tampaknya melakukan
// string-replace literal "1728" -> "1730" di seluruh file tanpa menyadari
// bahwa `nisabPenghasilanTahun:91681728` BUKAN penanda versi -- angka itu
// hasil perhitungan sungguhan `nisabPenghasilanBulan (7640144) * 12`, yang
// KEBETULAN berakhiran digit sama dengan nomor patch saat itu (1728).
// Akibatnya nilai default nisab zakat penghasilan tahunan ikut korup jadi
// 91681730 (salah, tidak lagi kelipatan 12 dari nisab bulanan).
//
// Gate ini mengunci hubungan matematis yang benar (tahun = bulan * 12)
// SUPAYA bump versi build di sesi manapun ke depan tidak bisa lagi diam-diam
// mengorupsi konstanta finansial ini hanya karena kebetulan mengandung
// substring nomor versi yang sedang di-bump.

function extractPajakZakatDefault(source) {
  const m = source.match(/nisabPenghasilanBulan:(\d+),nisabPenghasilanTahun:(\d+)/);
  if (!m) throw new Error('Pola default D.pajakZakat tidak ditemukan di source yang diberikan');
  return { bulan: Number(m[1]), tahun: Number(m[2]) };
}

test('nisab zakat tahunan (source) harus tetap = nisab bulanan * 12', () => {
  const { bulan, tahun } = extractPajakZakatDefault(src);
  assert.equal(tahun, bulan * 12, `nisabPenghasilanTahun (${tahun}) harus sama dengan nisabPenghasilanBulan*12 (${bulan * 12}) -- kalau beda, kemungkinan besar korup lagi akibat find-replace versi build`);
});

test('nisab zakat tahunan (bundle B hasil build) harus tetap = nisab bulanan * 12', () => {
  const { bulan, tahun } = extractPajakZakatDefault(bundleB);
  assert.equal(tahun, bulan * 12, `Bundle B punya nisabPenghasilanTahun (${tahun}) yang tidak konsisten dengan nisabPenghasilanBulan*12 (${bulan * 12})`);
});

test('nilai nisab zakat tahunan default tidak boleh kebetulan sama dengan nomor versi build manapun (91681728, 91681729, 91681730, dst)', () => {
  const { tahun } = extractPajakZakatDefault(src);
  // Pola korup yang sudah terjadi: 4 digit terakhir == nomor patch tertentu.
  // Bukan larangan angka mengandung "1728"/"1730" di posisi manapun -- yang
  // dicek murni kesesuaian dengan hasil perkalian (test di atas), ini cuma
  // sanity-check tambahan yang mendokumentasikan angka benar yang sudah
  // diverifikasi manual: 91681728.
  assert.equal(tahun, 91681728, 'Nilai nisab tahun default berubah dari angka yang sudah diverifikasi (91681728) -- pastikan perubahan ini disengaja, bukan korupsi find-replace versi build');
});
