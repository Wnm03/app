const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('transfer dari saldo tidak cukup meminta konfirmasi sebelum menulis transaksi', () => {
  const source = fs.readFileSync(path.join(root, 'modules/finance/tx-transfer.js'), 'utf8');
  assert.match(source, /async function saveTransfer\(\)/);
  assert.match(source, /recalcAccBalance\(from\)/);
  assert.match(source, /await askConfirm\(/);
  assert.match(source, /if\(!ok\)return/);
  const writeAt = source.indexOf('FinanceTxSOT.createMany');
  const confirmAt = source.indexOf("title:'Saldo akan minus'");
  assert.ok(confirmAt >= 0 && writeAt > confirmAt, 'konfirmasi harus terjadi sebelum transaksi ditulis');
});

test('FAB Uang dan Laporan yang tidak terjangkau tidak mengambil ruang/klik', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(css, /#keuFab, #laporanFab\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /pointer-events:\s*none\s*!important/);
});
