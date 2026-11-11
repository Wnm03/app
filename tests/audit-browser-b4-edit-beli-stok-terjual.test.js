'use strict';
// AUDIT-BROWSER B4 (sinkron stok Shop<->Keuangan): EDIT transaksi pembelian stok saat sebagian barang
// sudah terjual. Dulu stok MENGGELEMBUNG karena rollback qty lama di-clamp ke 0 lalu qty baru ditambah
// penuh (beli 10, jual 15 -> stok 5; edit beli jadi 12 -> stok 12, seharusnya 7). Kini ditolak
// SEBELUM persist bila stok akhir akan negatif, sejajar dgn blokir hapus (S2727) & lepas-centang (S2780).
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

function mk(stock) {
  const els = { txAddShopStock: { checked: true }, txShopStockPanel: { style: { display: 'block' } } };
  const ctx = {
    D: { products: [{ id: 'p1', name: 'Cobek', stock, hargaBeli: 1000 }, { id: 'p2', name: 'Ulekan', stock: 4, hargaBeli: 500 }], transactions: [] },
    document: { getElementById: (id) => els[id] || null },
    curShopStockCart: [], console, toast() {}, renderProductList() {}, fmtFull: (n) => n, uid: () => 'u', resolveShopKategori: () => '',
  };
  vm.createContext(ctx);
  vm.runInContext(R('modules/shop/generic/product-repository.js') + '\n' + R('modules/shop/shop-inventory-ledger.js') + '\n' + body +
    ';this.apply=applyTxShopStockFromTx;this.pre=txShopStockPrecheck;', ctx);
  return ctx;
}
const item = (pid, q) => ({ productId: pid, isNew: false, name: pid, qty: q, hargaBeli: 1000, produsenId: '', kategoriInput: '', hargaJual: 0 });
const txOf = (items) => ({ id: 't1', stockItems: items.map((i) => ({ productId: i[0], qty: i[1] })) });

test('B4: edit beli 10 -> 12 saat stok tinggal 5 (jual 15): lolos hanya bila stok akhir >= 0 (=7), tidak menggelembung', () => {
  const c = mk(5);
  const tx = txOf([['p1', 10]]);
  c.curShopStockCart = [item('p1', 12)];
  assert.strictEqual(c.pre(tx).ok, true);
});

test('B4: edit beli 10 -> 4 saat stok tinggal 5: ditolak (stok akan -1), pesan menyebut minimal 5', () => {
  const c = mk(5);
  const tx = txOf([['p1', 10]]);
  c.curShopStockCart = [item('p1', 4)];
  const r = c.pre(tx);
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /tinggal 5/);
  assert.match(r.message, /minimal 5/);
  c.curShopStockCart = [item('p1', 5)];
  assert.strictEqual(c.pre(tx).ok, true, 'batas persis (stok akhir 0) boleh');
});

test('B4: ganti produk saat produk lama sudah terjual sebagian: ditolak; stok utuh -> lolos', () => {
  const c = mk(5);
  const tx = txOf([['p1', 10]]);
  c.curShopStockCart = [item('p2', 3)];
  assert.strictEqual(c.pre(tx).ok, false);
  const ok = mk(20);
  ok.curShopStockCart = [item('p2', 3)];
  assert.strictEqual(ok.pre(txOf([['p1', 10]])).ok, true);
});

test('B4: transaksi baru (tanpa existingTx) & item produk baru tidak terpengaruh', () => {
  const c = mk(0);
  c.curShopStockCart = [item('p1', 1)];
  assert.strictEqual(c.pre(null).ok, true);
  assert.strictEqual(c.pre().ok, true);
  c.curShopStockCart = [{ productId: null, isNew: true, name: 'Baru', qty: 3, hargaBeli: 1, produsenId: '', kategoriInput: '', hargaJual: 0 }];
  assert.strictEqual(c.pre(txOf([['p1', 10]])).ok, false, 'produk lama p1 dibuang dari daftar tetapi stoknya sudah kurang -> tolak');
});

test('B4: produk pada tx lama sudah dihapus dari Etalase -> tidak memblokir', () => {
  const c = mk(5);
  c.curShopStockCart = [item('p2', 1)];
  assert.strictEqual(c.pre(txOf([['pHILANG', 10]])).ok, true);
});

test('B4: _saveTxInner meneruskan transaksi yang sedang diedit ke txShopStockPrecheck', () => {
  const i = saveSrc.indexOf('txShopStockPrecheck(');
  assert.ok(i > 0);
  assert.match(saveSrc.slice(i, i + 200), /txShopStockPrecheck\(txEditId\?/);
});

test('B4: apply edit beli 10 -> 12 saat stok tinggal 5 => stok 7 (selisih bersih), bukan 12', () => {
  const c = mk(10);
  c.D.transactions.push({ id: 't1' });
  c.curShopStockCart = [item('p1', 10)];
  c.apply('t1', 'n', null); // beli 10 => stok 20
  const tx = c.D.transactions[0];
  c.D.products[0].stock = 5; // terjual 15
  c.curShopStockCart = [item('p1', 12)];
  assert.strictEqual(c.pre(tx).ok, true);
  c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 7);
  const rec = c.D.shopInventoryLedger.map((x) => x.delta).reduce((a, b) => a + b, 0);
  assert.strictEqual(c.D.products[0].stock, 10 + rec - 15, 'ledger beli saja: 10 + (+10) + (+2) lalu jual 15 manual');
});

test('B4: apply edit turun ke batas persis (stok 5, lama 10 -> baru 5) => stok 0, tanpa clamp diam-diam', () => {
  const c = mk(10);
  c.D.transactions.push({ id: 't1' });
  c.curShopStockCart = [item('p1', 10)];
  c.apply('t1', 'n', null);
  const tx = c.D.transactions[0];
  c.D.products[0].stock = 5;
  c.curShopStockCart = [item('p1', 5)];
  assert.strictEqual(c.pre(tx).ok, true);
  c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 0);
});

test('B4: edit biasa (stok utuh) tetap stok awal + qty terakhir (regresi urutan tambah-dulu)', () => {
  const c = mk(10);
  c.D.transactions.push({ id: 't1' });
  c.curShopStockCart = [item('p1', 5)];
  c.apply('t1', 'n', null);
  const tx = c.D.transactions[0];
  c.curShopStockCart = [item('p1', 8)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 18);
  c.curShopStockCart = [item('p1', 2)]; c.apply('t1', 'n', tx);
  assert.strictEqual(c.D.products[0].stock, 12);
});
