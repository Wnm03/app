'use strict';
// S2433: belanja produk dari Transaksi -> stok etalase Shop.
// (A) daftar kosong harus ditolak SEBELUM persist; (B) edit berulang tidak boleh menghilangkan stok
// (key idempotensi ledger dulu sama di tiap simpan -> penambahan ulang dilewati diam-diam).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cart = R('modules/shop/cobek-tx-cart.js');
const saveSrc = R('modules/finance/transaksi-b.js');
const body = cart.slice(cart.indexOf('function txShopStockPrecheck'), cart.indexOf('let curTxShopSaleCart'));

function mk(opts = {}) {
  const els = { txAddShopStock: { checked: true }, txShopStockPanel: { style: { display: opts.display || 'block' } } };
  const ctx = {
    D: { products: [{ id: 'p1', name: 'Cobek', stock: 10, hargaBeli: 1000 }], transactions: [{ id: 't1' }] },
    document: { getElementById: (id) => els[id] || null },
    curShopStockCart: [], _t: [], console,
    toast(m) { ctx._t.push(m); }, renderProductList() {}, fmtFull: (n) => n, uid: () => 'u', resolveShopKategori: () => '',
  };
  ctx.els = els;
  vm.createContext(ctx);
  vm.runInContext(R('modules/shop/generic/product-repository.js') + '\n' + R('modules/shop/shop-inventory-ledger.js') + '\n' + body +
    ';this.apply=applyTxShopStockFromTx;this.pre=txShopStockPrecheck;', ctx);
  return ctx;
}
const item = (q) => ({ productId: 'p1', isNew: false, name: 'Cobek', qty: q, hargaBeli: 1000, produsenId: '', kategoriInput: '', hargaJual: 0 });

test('precheck menolak centang aktif + daftar kosong, lolos bila ada item / centang mati / panel tersembunyi', () => {
  const c = mk();
  assert.strictEqual(c.pre().ok, false);
  assert.match(c.pre().message, /Tambahkan Produk ke Daftar/);
  c.curShopStockCart = [item(1)];
  assert.strictEqual(c.pre().ok, true);
  c.curShopStockCart = []; c.els.txAddShopStock.checked = false;
  assert.strictEqual(c.pre().ok, true);
  const h = mk({ display: 'none' });
  assert.strictEqual(h.pre().ok, true);
});

test('_saveTxInner memanggil txShopStockPrecheck sebelum transaksi dipersist', () => {
  const iPre = saveSrc.indexOf('txShopStockPrecheck(');
  const iCreate = saveSrc.indexOf('FinanceTxSOT.create(newTx)');
  assert.ok(iPre > 0 && iCreate > 0 && iPre < iCreate);
  assert.match(saveSrc.slice(iPre, iPre + 250), /return;/);
});

test('transaksi baru menambah stok', () => {
  const c = mk();
  c.curShopStockCart = [item(5)]; c.apply('t1', 'n', null);
  assert.strictEqual(c.D.products[0].stock, 15);
  assert.strictEqual(c.D.transactions[0].stockRev, 1);
});

test('edit tanpa ubah qty: stok tetap (regresi: dulu turun ke 10)', () => {
  const c = mk();
  c.curShopStockCart = [item(5)]; c.apply('t1', 'n', null);
  const tx = c.D.transactions[0];
  c.curShopStockCart = [item(5)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 15);
});

test('edit qty berubah & edit berulang: stok selalu = stok awal + qty terakhir', () => {
  const c = mk();
  c.curShopStockCart = [item(5)]; c.apply('t1', 'n', null);
  const tx = c.D.transactions[0];
  c.curShopStockCart = [item(8)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 18);
  c.curShopStockCart = [item(3)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 13);
  c.curShopStockCart = [item(3)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 13);
  assert.strictEqual(tx.stockRev, 4);
  const rec = c.D.shopInventoryLedger.map((x) => x.delta).reduce((a, b) => a + b, 0);
  assert.strictEqual(10 + rec, c.D.products[0].stock, 'ledger rekonsiliasi');
});

test('produk legacy (stockProductId/stockQty tanpa stockItems) ikut ter-rollback benar saat edit', () => {
  const c = mk();
  c.D.products[0].stock = 15;
  const tx = c.D.transactions[0]; tx.stockProductId = 'p1'; tx.stockQty = 5;
  c.curShopStockCart = [item(7)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 17);
});
