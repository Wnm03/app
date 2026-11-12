'use strict';
// S2797: (1) tanggal daftar transaksi tampil "11 Nov 2026", bukan ISO; (2) kontrak CSS FASE 7 (BBM/Aset/Shop).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function loadHelper() {
  const src = read('modules/finance/tx-list-cashflow.js');
  const m = /function fmtTxDateDisplay\(ds\)\{[\s\S]*?\n\}\n/.exec(src);
  assert.ok(m, 'fmtTxDateDisplay harus ada');
  const ctx = {
    escapeHtml: (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')),
  };
  vm.createContext(ctx);
  vm.runInContext(m[0] + ';this.f=fmtTxDateDisplay;', ctx);
  return ctx.f;
}

test('fmtTxDateDisplay: ISO -> "11 Nov 2026", tanpa nol di depan hari', () => {
  const f = loadHelper();
  assert.strictEqual(f('2026-11-11'), '11 Nov 2026');
  assert.strictEqual(f('2026-03-01'), '1 Mar 2026');
  assert.strictEqual(f('2026-08-17'), '17 Agu 2026');
  assert.strictEqual(f('2026-05-09T10:00:00Z'), '9 Mei 2026');
});
test('fmtTxDateDisplay: input aneh dikembalikan apa adanya dan di-escape', () => {
  const f = loadHelper();
  assert.strictEqual(f(''), '');
  assert.strictEqual(f(null), '');
  assert.strictEqual(f(undefined), '');
  assert.strictEqual(f('2026-13-01'), '2026-13-01');
  assert.strictEqual(f('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
});
test('daftar transaksi memakai helper di kartu, tabel (title tetap ISO), dan tagihan terjadwal', () => {
  const s = read('modules/finance/tx-list-cashflow.js');
  assert.ok(!/<div class="tx-meta">\$\{t\.date\}/.test(s), 'tidak ada lagi ${t.date} mentah di tx-meta');
  assert.ok(!/<td class="tx-tbl-date">\$\{t\.date\}/.test(s));
  assert.match(s, /tx-tbl-date" title="\$\{escapeHtml\(t\.date\)\}">\$\{fmtTxDateDisplay\(t\.date\)\}/);
  assert.strictEqual((s.match(/fmtTxDateDisplay\(t\.date\)/g) || []).length, 3);
});
test('data t.date tetap ISO (helper hanya tampilan, tidak dipakai di jalur simpan/sort)', () => {
  const s = read('modules/finance/tx-list-cashflow.js');
  assert.ok(!/t\.date\s*=\s*fmtTxDateDisplay/.test(s));
});

const css = read('tokens.css');
const block = css.slice(css.indexOf('FASE 7 (S2797)'));
test('blok FASE 7 ada, tanpa !important', () => {
  assert.ok(css.includes('FASE 7 (S2797)'));
  assert.ok(!/!important/.test(block));
});
test('nama di Car Notes/Aset/Shop boleh 3 baris, riwayat servis dikecualikan', () => {
  assert.match(block, /:is\(#page-carnotes,#page-aset,#page-shop\) \.tx-name:not\(\.servis-history-title\)\{[\s\S]*?-webkit-line-clamp:3/);
});
test('badge km/L tidak pecah per huruf', () => {
  assert.match(block, /#page-carnotes \.kmL-badge\{white-space:nowrap;flex:0 0 auto\}/);
});
test('helper berdiri sendiri (tidak bergantung MONTHS global; sandbox tes lama hanya memuat file ini)', () => {
  const src = read('modules/finance/tx-list-cashflow.js');
  const fn = /function fmtTxDateDisplay[\s\S]*?\n\}\n/.exec(src)[0];
  assert.ok(!/MONTHS/.test(fn));
  assert.ok(!/data-action=/.test(block));
});
test('kolom nominal BBM tidak menyusut, info yang mengalah, <=599px membungkus', () => {
  assert.match(block, /has\(>\.u-flex>\.tx-amount\)>\.u-flex\{flex:0 0 auto;min-width:max-content;max-width:none\}/);
  assert.match(block, /has\(>\.u-flex>\.tx-amount\)>\.tx-info\{flex:1 1 0;min-width:0\}/);
  assert.match(block, /@media \(max-width:599px\)\{[\s\S]*has\(>\.u-flex>\.tx-amount\)\{flex-wrap:wrap\}/);
});
test('tombol hapus BBM rata kanan saat baris membungkus', () => {
  assert.match(block, /has\(>\.u-flex>\.tx-amount\)>\.tx-del\{margin-left:auto\}/);
});
test('cache-bust HTML dan sw.js >= 2797', () => {
  const sw = read('sw.js');
  const n = Number((/kw-cache-v(\d+)/.exec(sw) || [])[1]);
  assert.ok(n >= 2797, 'sw cache ' + n);
});
