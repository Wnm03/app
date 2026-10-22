const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S2619: Excel Etalase delegates product commits to shared ShopDataIO', () => {
  const io = read('modules/shop/cobek-io.js');
  const api = read('modules/business/shop-data-io-api.js');
  const excel = io.slice(io.indexOf('const ImportShopExcel='), io.indexOf('function openImportShopExcelModal'));
  assert.match(excel, /ShopDataIO\.commitShopRows\(rows\)/);
  assert.match(excel, /diskonPersen:r\.diskonPersen/);
  assert.match(api, /mutateSetDiskon\(product, r\.diskonPersen\)/);
  assert.match(api, /produsenId: r\.produsenId \|\| ''/);
});

test('S2619: order edit routes finance and receivable changes through canonical writers', () => {
  const order = read('modules/shop/cobek-order.js');
  const kasir = read('modules/business/kasir.js');
  assert.match(order, /function syncShopSalePayment\(options\)/);
  assert.match(order, /FinanceTxSOT\.updateById\(existingTxId,\{amount:dp,accountId:o\.accountId,note:txNote,date:o\.date,cobekLinkId:o\.shopId\}\)/);
  assert.match(order, /BillDebtPiutangCanonicalWriter\.updateById\('piutang',existingPiutang\.id/);
  assert.match(order, /LINKED_RECEIVABLE_MISSING/);
  assert.match(order, /Transaksi tidak diubah; rekonsiliasi piutang terlebih dahulu/);
  assert.match(kasir, /syncShopSalePayment\(\{shopId:result\.shopId,txId,dpRaw,total/);
});

test('S2619: omzet mode is read-only projection and shared with export/ProfitEngine', () => {
  const order = read('modules/shop/cobek-order.js');
  const io = read('modules/shop/cobek-io.js');
  const html = read('index.html');
  const profit = read('modules/shop/profit-engine.js');
  assert.match(order, /omzetMode:'include-shipping'/);
  assert.match(order, /revenueAmount\(t,mode\)/);
  assert.match(order, /total-Math\.max\(0,ongkir\)/);
  assert.match(html, /data-shop-revenue-mode="exclude-shipping"/);
  assert.match(io, /Mode Omzet/);
  assert.match(profit, /Laporan\.revenueAmount\(t\)/);
});
