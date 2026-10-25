// S2725 — audit Kasir K1/K4. Uji statis kontrak perbaikan (uji perilaku nyata dilakukan di browser Chromium).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const kasir = fs.readFileSync(path.join(__dirname, '..', 'modules/business/kasir.js'), 'utf8');
const cascade = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/tx-list-cashflow.js'), 'utf8');

test('S2725 K1: ongkir Kasir dibatasi >= 0 (paritas Order S2307)', () => {
  assert.match(kasir, /Number\.isFinite\(_ongkirN\)\?Math\.max\(0,_ongkirN\):0/);
});
test('S2725 K1: preflight total sebelum recordShopSale', () => {
  assert.ok(kasir.indexOf('Total tidak valid') > -1 && kasir.indexOf('Total tidak valid') < kasir.indexOf('const result=recordShopSale('));
});
test('S2725 K1: kegagalan sinkron pembayaran (return !ok & throw) membatalkan penjualan via rollbackShopItems', () => {
  assert.match(kasir, /_undoNewSale\(\);toast\('⚠️ Pembayaran gagal/);
  assert.match(kasir, /if\(!payment\.ok\)\{_undoNewSale\(\)/);
  assert.match(kasir, /rollbackShopItems\(items,1,txId\)/);
});
test('S2725 K4: hapus pembelian stok memperingatkan saat stok di-clamp', () => {
  assert.match(cascade, /_stockShort/);
  assert.match(cascade, /Sebagian stok sudah terjual/);
});
