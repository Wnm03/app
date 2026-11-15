'use strict';
// S2828 — import CSV memberi tahu seksi (DP/Termin, Riwayat Cicilan) yang tidak ikut diimpor.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/home/renovasi.js'), 'utf8');
const start = src.indexOf('_csvSkippedSections(all){');
const end = src.indexOf('_parseCSV(text){');
assert.ok(start > 0 && end > start, '_csvSkippedSections harus ada sebelum _parseCSV');
const fn = new Function('return {' + src.slice(start, end).trim().replace(/,\s*$/, '') + '}')()._csvSkippedSections;

const exported = [
  ["'=== DP / TERMIN ==="], ['Label', 'Nominal'], ['DP', '20000000'], ['Termin 1', '5000000'], [''],
  ["'=== DAFTAR ITEM ==="], ['Item', 'Harga'], ['Semen', '3000000'], [''],
  ["'=== RIWAYAT CICILAN ==="], ['Item', 'Nominal'], ['Semen', '1000000'], ['Semen', '2000000'], ['Cat', '500000'],
];

test('S2828: menghitung baris DP/Termin dan Riwayat Cicilan yang dilewati', () => {
  assert.deepEqual(fn(exported), { dp: 2, cicilan: 3 });
});
test('S2828: CSV polos tanpa seksi -> 0 dan 0', () => {
  assert.deepEqual(fn([['Item', 'Harga'], ['A', '1']]), { dp: 0, cicilan: 0 });
  assert.deepEqual(fn(null), { dp: 0, cicilan: 0 });
});
test('S2828: preview & toast importCSV memuat catatan seksi dilewati', () => {
  assert.match(src, /_csvSkippedSections\(parsed\.rows\)/);
  assert.match(src, /tidak ikut diimpor/);
});
