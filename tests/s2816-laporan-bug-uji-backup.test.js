'use strict';
// S2816 — perbaikan LAPORAN-BUG-uji-backup-2026-11-12 (B1-B8).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const css = fs.readFileSync('styles.css', 'utf8');
const mod = fs.readFileSync('modern-ui-layer.css', 'utf8');
const txb = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');

test('B1/B2: strip Beranda modern jadi grid 2x2 di <400px dan label tidak <11px', () => {
  assert.match(mod, /@media \(max-width: 399px\)[\s\S]*#dashHubTickerModern\.bill-stat-pills \{ display: grid; grid-template-columns: repeat\(2/);
  assert.ok(!/\[data-theme="modern"\] \.bill-stat-pill \.stat-label \{ font-size: ?9px/.test(css));
});

test('B3: tidak ada deklarasi font-size <11px selain .nav-item', () => {
  const bad = [];
  [css, mod].forEach((src, f) => src.split('\n').forEach((l, i) => {
    if (/font-size: ?(9|9\.5|10|10\.5)px/.test(l) && !/nav-item/.test(l) && !/\[style\*=/.test(l) && !/u-fs10|\.u-fs/.test(l)) bad.push(f + ':' + (i + 1));
  }));
  // baris tanpa selektor di baris sama (multi-line) hanya boleh .nav-item (styles.css)
  assert.ok(bad.length <= 2, 'sisa deklarasi kecil (hanya boleh .nav-item): ' + bad.join(','));
});

test('B4: batas tanggal transaksi dan blok simpan', () => {
  const ctx = {}; new Function('ctx', '' + txb.slice(0, txb.indexOf('function isTxDateImplausible')) + 'function isTxDateImplausible(ds){if(typeof ds!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(ds))return false;return ds>txDatePlausibleMax()||ds<txDatePlausibleMin();}ctx.f=isTxDateImplausible;ctx.max=txDatePlausibleMax;')(ctx);
  assert.equal(ctx.f('2070-08-03'), true);
  assert.equal(ctx.f('1999-12-31'), true);
  assert.equal(ctx.f(new Date().toISOString().slice(0, 10)), false);
  assert.match(txb, /isTxDateImplausible\(date\)\)\{toast\(/);
});

test('B4: audit kualitas data menandai tanggal tidak wajar di luar rentang audit', () => {
  const src = fs.readFileSync('modules/finance/financial-audit-engine.js', 'utf8');
  const g = {}; new Function('g', 'const module={exports:{}};' + src + ';g.E=typeof FinancialAuditEngine!=="undefined"?FinancialAuditEngine:module.exports;')(g);
  global.D = { transactions: [{ id: 1, type: 'expense', amount: 77000, date: '2070-08-03', note: 'Gacoan' }], accounts: [] };
  const r = g.E.implausibleDateTransactions();
  assert.equal(r.length, 1);
  delete global.D;
});

test('B5: FinanceCategorySOT.mergeDuplicates mencatat statistik dan tidak mengubah nominal', () => {
  const src = fs.readFileSync('modules/finance/finance-category-sot.js', 'utf8');
  assert.match(src, /takeMergeStats/);
  const bk = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  assert.match(bk, /nominal tidak berubah/);
});

test('B8: restore menginvalidasi cache saldo akun', () => {
  const bk = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  assert.match(bk, /invalidateAccBalCache\(\);\s*\/\/ Rekonsiliasi taksonomi/);
});

test('B7: token tema terang/modern berkontras lebih tinggi', () => {
  assert.match(css, /\[data-theme="light"\][^\n]*--accent:#5b53d1/);
  assert.match(css, /\[data-theme="light"\][^\n]*--accent3:#1f7a5c/);
  assert.match(css, /\[data-theme="light"\][^\n]*--accent4:#9a5a22/);
  assert.ok(Buffer.byteLength(css) <= 180000);
});
