'use strict';
// S2433-C/D: rollback stok tx lama pada edit cicilan/langganan (prevTx) + petunjuk kategori Shop.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cart = R('modules/shop/cobek-tx-cart.js');
const saveSrc = R('modules/finance/transaksi-b.js');
const trxSrc = R('modules/finance/transaksi.js');
const a = cart.indexOf('function txShopStockPrecheck');
const body = cart.slice(a, cart.indexOf('let curTxShopSaleCart'));

function mk() {
  const made = [];
  const els = {
    txAddShopStock: { checked: true },
    txShopStockPanel: { style: { display: 'block' }, insertAdjacentElement(_w, el) { made.push(el); els[el.id] = el; } },
    txNote: { value: '', addEventListener() {} },
  };
  const ctx = {
    D: { products: [{ id: 'p1', name: 'Cobek', stock: 10, hargaBeli: 1000 }], transactions: [] },
    document: { getElementById: (id) => els[id] || null, createElement: () => ({ style: {}, id: '' }) },
    curShopStockCart: [], console, els, made,
    toast() {}, renderProductList() {}, fmtFull: (n) => n, uid: () => 'u', resolveShopKategori: () => '',
  };
  vm.createContext(ctx);
  vm.runInContext(R('modules/shop/generic/product-repository.js') + '\n' + R('modules/shop/shop-inventory-ledger.js') + '\n' + body +
    ';this.apply=applyTxShopStockFromTx;this.should=txShopCatHintShouldShow;this.sync=syncTxShopCatHint;', ctx);
  return ctx;
}
const item = (q) => ({ productId: 'p1', isNew: false, name: 'Cobek', qty: q, hargaBeli: 1000, produsenId: '', kategoriInput: '', hargaJual: 0 });

test('edit cicilan/langganan (tx id baru + prevTx): stok tx lama di-rollback lalu qty baru ditambah', () => {
  const c = mk();
  c.D.products[0].stock = 15; // sudah +5 dari tx lama
  const prev = { id: 'old1', stockItems: [{ productId: 'p1', qty: 5 }], stockRev: 1 };
  c.D.transactions.push({ id: 'new1' });
  c.curShopStockCart = [item(7)];
  c.apply('new1', 'n', null, prev);
  assert.strictEqual(c.D.products[0].stock, 17); // 15 -5 +7
  assert.strictEqual(c.D.transactions[0].stockRev, 2);
  assert.strictEqual(c.D.transactions[0].stockItems[0].qty, 7);
});

test('tanpa prevTx perilaku lama: tidak ada rollback', () => {
  const c = mk();
  c.D.transactions.push({ id: 'new1' });
  c.curShopStockCart = [item(5)];
  c.apply('new1', 'n', null);
  assert.strictEqual(c.D.products[0].stock, 15);
});

test('call site cicilan & langganan meneruskan existingTx sebagai prevTx', () => {
  assert.strictEqual((saveSrc.match(/applyTxShopStockFromTx\(billId\+1,nama,null,existingTx\);/g) || []).length, 2);
});

test('txShopCatHintShouldShow: hanya expense, non-Shop, tanpa panel lain, nama cocok produk', () => {
  const c = mk(); const P = c.D.products;
  assert.strictEqual(c.should('beli cobek 3', true, false, false, P), true);
  assert.strictEqual(c.should('beli cobek 3', false, false, false, P), false);
  assert.strictEqual(c.should('beli cobek 3', true, true, false, P), false);
  assert.strictEqual(c.should('beli cobek 3', true, false, true, P), false);
  assert.strictEqual(c.should('beli bensin', true, false, false, P), false);
  assert.strictEqual(c.should('ab', true, false, false, P), false);
});

test('syncTxShopCatHint membuat petunjuk hanya saat perlu & menyembunyikannya lagi', () => {
  const c = mk();
  c.sync(true, false, false);
  assert.strictEqual(c.made.length, 0, 'tidak dibuat bila catatan kosong');
  c.els.txNote.value = 'Beli Cobek';
  c.sync(true, false, false);
  assert.strictEqual(c.made.length, 1);
  assert.strictEqual(c.made[0].style.display, 'block');
  c.sync(true, false, true);
  assert.strictEqual(c.made[0].style.display, 'none');
  assert.strictEqual(c.made.length, 1, 'tidak dobel');
});

test('updateTxVehiclePanels memanggil syncTxShopCatHint', () => {
  assert.match(trxSrc, /syncTxShopCatHint\(isExpense,showBbm\|\|showStock,showShop\)/);
});
