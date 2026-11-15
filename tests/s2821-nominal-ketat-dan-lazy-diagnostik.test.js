'use strict';
// S2821 — (1) parseAmtStrict menolak nominal rusak yang dulu lolos lewat parseFloat, (2) 5 aksi diagnostik
// self-test.js terdaftar di peta lazy-load dispatcher (bug "Tombol ini belum berfungsi" di sesi segar).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(['modules/shared/kalkulator-input.js'], {});
const P = (s) => ctx.parseAmtStrict(s);

test('S2821: nominal valid tetap terbaca benar', () => {
  assert.equal(P('50000'), 50000);
  assert.equal(P('1.500.000'), 1500000);
  assert.equal(P('1.500,50'), 1500.5);
  assert.equal(P('1500,50'), 1500.5);
  assert.equal(P('12+3*2'), 18);
  assert.equal(P('1.500.000+250.000'), 1750000);
});

test('S2821: nominal rusak ditolak (NaN), tidak dipotong diam-diam', () => {
  ['12abc34', '1.5jt', '', '   ', 'abc', '1,2,3', '1.500,5x', '1,5+2', ',5', '1..5,'].forEach((s) => {
    assert.ok(Number.isNaN(P(s)), 'harus NaN: ' + JSON.stringify(s));
  });
  assert.ok(Number.isNaN(ctx.parseAmtStrict(null)));
  assert.ok(Number.isNaN(ctx.parseAmtStrict(123)));
});

test('S2821: saveTx memakai parseAmtStrict + pembulatan rupiah (kontrak sumber)', () => {
  const src = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(src, /parseAmtStrict\(_amtRaw\)/);
  assert.match(src, /Math\.round\(_amtParsed\)/);
  assert.doesNotMatch(src, /const amt=parseFloat\(document\.getElementById\('txAmt'\)\.value\)/);
});

test('S2821: semua aksi self-test.js yang dipakai UI ada di peta lazy-load', () => {
  const src = fs.readFileSync('modules/shared/features-helpers-global-security.js', 'utf8');
  ['runSelfTest', 'copySelfTestResults', 'runNavSmokeTest', 'runModalSweep', 'copyNavSmokeResults', 'copyModalSweepResults', 'repairTitipanOrphans']
    .forEach((n) => assert.match(src, new RegExp(n + ':\\s*typeof ensureSelfTest'), 'belum di peta lazy: ' + n));
});
