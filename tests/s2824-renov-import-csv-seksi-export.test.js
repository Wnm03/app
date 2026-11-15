'use strict';
// S2824 — CSV hasil Export CSV proyek (multi-seksi) harus bisa diimpor balik; CSV polos tetap sama.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules/home/renovasi.js'), 'utf8');
const start = src.indexOf('_csvItemSection(all){');
const end = src.indexOf('_parseCSV(text){');
assert.ok(start > 0 && end > start, '_csvItemSection harus ada sebelum _parseCSV');
const sect = new Function('return {' + src.slice(start, end).trim().replace(/,\s*$/, '') + '}')()._csvItemSection;

const HDR = ['Item', 'Kategori', 'Ukuran', 'Harga Rencana', 'Terbayar', 'Sisa', 'Status', 'Akun', 'Tanggal'];
const exported = [
  ["'=== IDENTITAS PROYEK ==="], ['Nama Proyek', 'Klien', 'Nilai Kontrak/RAB', 'Catatan'], ['Dapur', 'Bu Sari', '50000000', ''], [''],
  ["'=== RINGKASAN ==="], ['RAB', 'Rencana Item', 'Terbayar'], ['50000000', '4500000', '3000000'], [''],
  ["'=== DP / TERMIN ==="], ['Label', 'Jenis', 'Tanggal', 'Akun', 'Nominal'], ['DP', 'dp', '2026-11-15', 'BRI', '20000000'], [''],
  ["'=== DAFTAR ITEM ==="], HDR, ['Semen', '', '', '3000000', '3000000', '0', 'Lunas', 'Cash', '2026-11-15'], ['Cat', '', '', '1500000', '0', '1500000', 'Belum', 'Cash', ''], [''],
  ["'=== RIWAYAT CICILAN ==="], ['Item', 'ID Pembayaran', 'Tanggal', 'Akun', 'Label', 'Nominal'], ['Semen', '1', '2026-11-15', 'BRI', 'x', '3000000'],
];

test('S2824: export utuh -> hanya seksi DAFTAR ITEM, header + 2 baris data', () => {
  const r = sect(exported);
  assert.equal(r.rows[0][0], 'Item');
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[2][0], 'Cat');
  assert.equal(r.offset, 13);
});

test('S2824: seksi DAFTAR ITEM dipilih walau seksi Cicilan juga punya kolom Item+Nominal', () => {
  assert.ok(!sect(exported).rows.some((r) => r[0] === 'Semen' && r[1] === '1'));
});

test('S2824: CSV polos (header di baris pertama) tidak berubah', () => {
  const plain = [['Item', 'Harga'], ['Pintu', '1500000']];
  const r = sect(plain);
  assert.equal(r.rows, plain);
  assert.equal(r.offset, 0);
});

test('S2824: tanpa seksi & tanpa header -> dikembalikan apa adanya (error header lama tetap muncul)', () => {
  const junk = [['a', 'b'], ['1', '2']];
  assert.equal(sect(junk).rows, junk);
});

test('S2824: seksi tanpa judul DAFTAR ITEM tetap mencari header pertama yang valid', () => {
  const r = sect([["'=== LAIN ==="], ['Item', 'Harga'], ['Pintu', '10']]);
  assert.equal(r.rows[0][0], 'Item');
  assert.equal(r.offset, 1);
});

test('S2824: importCSV memakai offset untuk nomor baris galat', () => {
  assert.ok(/line:i\+2\+off/.test(src));
  assert.ok(!/line:i\+2,/.test(src));
});
