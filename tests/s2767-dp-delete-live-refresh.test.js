'use strict';
// S2767.3 — delTx() menjalankan cascade SEBELUM transaksi dihapus; panel DP harus mengabaikan tx yang sedang dihapus.
// Perilaku nyata diverifikasi di Chromium (hapus DP dari Keuangan -> panel turun tanpa reload).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'home', 'renovasi.js'), 'utf8');
const cash = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tx-list-cashflow.js'), 'utf8');
test('S2767.3: onDpTxDeleted menerima tx, mengabaikan id-nya saat render, lalu render ulang setelah tick', () => {
  assert.match(src, /onDpTxDeleted\(t\)\{/);
  assert.match(src, /Renov\._ignoreTxIds=new Set\(/);
  assert.match(src, /renderFundPanel\(p\)\{[\s\S]*?_ignoreTxIds\.has\(String\(tx\.id\)\)/);
  assert.match(src, /setTimeout\(\(\)=>\{Renov\._ignoreTxIds=null;/);
});
test('S2767.3: delTx tetap memanggil onDpTxDeleted dengan transaksi yang dihapus', () => {
  assert.match(cash, /renovDpProjectId[\s\S]{0,120}Renov\.onDpTxDeleted\(t\)/);
});
