'use strict';
/** S2861 — auto-isi sisa porsi harus ikut dihitung ulang saat user mengetik digit demi digit (baris auto-isi `_auto` boleh jadi target lagi). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const c = loadSource(['modules/shared/modules-calc.js'], { D: {} }, ['calculateRemainingShare']);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('baris kosong tak tersentuh tetap target (perilaku lama utuh)', () => {
  const r = c.calculateRemainingShare([{ porsi: 30, _touched: true }, { porsi: 0 }], 0);
  assert.deepEqual({ ...r }, { targetIndex: 1, porsi: 70 });
});
test('baris auto-isi (_auto) dihitung ulang; baris diketik manual (_touched) tidak disentuh', () => {
  const rows = [{ porsi: 8, _touched: true }, { porsi: 99.9997, _auto: true }];
  assert.equal(c.calculateRemainingShare(rows, 0).porsi, 92);
  rows[0].porsi = 800; rows[0].porsi = 29.7112585615;
  assert.equal(c.calculateRemainingShare(rows, 0).porsi, 70.2887414385);
  rows[1]._touched = true;
  assert.equal(c.calculateRemainingShare(rows, 0), null);
});
test('baris terisi tanpa flag _auto & tanpa _touched (mis. data tersimpan) tidak ditimpa', () => {
  assert.equal(c.calculateRemainingShare([{ porsi: 30, _touched: true }, { porsi: 70 }], 0), null);
});
test('simulasi ketik 800000 digit demi digit pada dasar 2.692.582: baris pendamping selalu = 100 - porsi', () => {
  const base = 2692582, rows = [{ porsi: 0 }, { porsi: 0 }];
  let last;
  for (const v of [8, 80, 800, 8000, 80000, 800000]) {
    rows[0].porsi = Math.round((v / base * 100) * 1e10) / 1e10; rows[0]._touched = true;
    const r = c.calculateRemainingShare(rows, 0);
    rows[r.targetIndex].porsi = r.porsi; rows[r.targetIndex]._auto = true; last = r;
  }
  assert.equal(rows[0].porsi + rows[1].porsi > 99.99999 && rows[0].porsi + rows[1].porsi < 100.00001, true);
  assert.equal(last.porsi, 70.2887414385);
});
test('3 pemanggil (Aset, Investasi, Akun) menandai baris auto-isi dengan _auto', () => {
  assert.match(src('modules/asset/aset-owners.js'), /draft\[result\.targetIndex\]\._auto=true/);
  assert.match(src('modules/asset/investasi-view.js'), /draft\[result\.targetIndex\]\._auto = true/);
  assert.match(src('modules/finance/akun.js'), /_draft\[r\.targetIndex\]\._auto=true/);
});
test('judul modal Porsi Akun tidak lagi mengandung emoji 🏦 ganda', () => {
  assert.match(src('modules/finance/akun.js'), /\(acc\.emoji\|\|'💰'\)==='🏦'\?'':'🏦 '/);
});
