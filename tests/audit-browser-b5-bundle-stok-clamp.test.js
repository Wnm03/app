'use strict';
// AUDIT-BROWSER B5 (sinkron stok bundle): komponen bundle (produk dasar + alu/muntu) di-clamp ke >=0 saat consume,
// tetapi restore dulu menambah qty PENUH -> stok komponen menggelembung setelah hapus/edit penjualan
// (bundle x3, stok dasar 1 -> 0; hapus -> 3, seharusnya 1). Kini consume mencatat jumlah yg benar-benar
// terpotong (item.linked) dan restore mengembalikan persis jumlah itu ke produk yg sama.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cart = R('modules/shop/cobek-tx-cart.js');
const body = cart.slice(cart.indexOf('function _bundleMutate'), cart.indexOf('// S2732: pra-validasi'));

const Etalase = {
  bundleAddonShape: (p) => (/\+alu/i.test(p.name) ? 'alu' : null),
  bracketRange: (p) => { const m = /(\d+)cm/.exec(p.name); return m ? m[1] : null; },
  parseSizeName: (n) => (/^alu/i.test(n) ? { shape: 'alu' } : null),
};
function mk(extra) {
  const ctx = {
    D: { products: [
      { id: 'b', name: 'Lumpang 20cm+alu', stock: 5, hargaBeli: 1 },
      { id: 'base', name: 'Lumpang 20cm', stock: 1, hargaBeli: 1 },
      { id: 'a1', name: 'Alu 1', stock: 1, hargaBeli: 1 },
    ].concat(extra || []), cobek: [], transactions: [] },
    Etalase, console, toast() {}, uid: (() => { let n = 0; return () => 's' + (++n); })(),
  };
  vm.createContext(ctx);
  vm.runInContext(R('modules/shop/generic/product-repository.js') + '\n' + R('modules/shop/shop-inventory-ledger.js') + '\n' + body +
    ';this.rec=recordShopSale;this.rb=rollbackShopItems;', ctx);
  ctx.st = () => Object.fromEntries(ctx.D.products.map((p) => [p.id, p.stock]));
  ctx.sell = (qty, extraOpts) => ctx.rec(Object.assign({ date: 'd', items: [{ productId: 'b', qty, price: 1 }], total: qty, subtotal: qty, txId: 't1' }, extraOpts));
  return ctx;
}

test('B5: jual bundle x3 (stok dasar 1) lalu hapus -> stok dasar kembali 1, bukan 3', () => {
  const c = mk();
  assert.ok(c.sell(3).ok);
  assert.deepStrictEqual(c.st(), { b: 2, base: 0, a1: 0 });
  c.rb(c.D.cobek[0].items, 1, 't1');
  assert.deepStrictEqual(c.st(), { b: 5, base: 1, a1: 1 });
});

test('B5: edit penjualan tanpa ubah qty tidak mengubah stok komponen', () => {
  const c = mk();
  const r = c.sell(3);
  const after = c.st();
  c.sell(3, { existingShopId: r.shopId });
  assert.deepStrictEqual(c.st(), after);
});

test('B5: edit naik 2 -> 4 lalu hapus: semua stok kembali ke awal (tanpa gelembung)', () => {
  const c = mk();
  const r = c.sell(2);
  c.sell(4, { existingShopId: r.shopId });
  c.rb(c.D.cobek[0].items, 1, 't1');
  assert.deepStrictEqual(c.st(), { b: 5, base: 1, a1: 1 });
});

test('B5: stok komponen cukup -> perilaku normal tetap (consume penuh, restore penuh)', () => {
  const c = mk();
  c.D.products.find((p) => p.id === 'base').stock = 10;
  c.D.products.find((p) => p.id === 'a1').stock = 10;
  c.sell(3);
  assert.deepStrictEqual(c.st(), { b: 2, base: 7, a1: 7 });
  c.rb(c.D.cobek[0].items, 1, 't1');
  assert.deepStrictEqual(c.st(), { b: 5, base: 10, a1: 10 });
});

test('B5: add-on dipotong dari kandidat yg stoknya cukup & dikembalikan ke kandidat YANG SAMA', () => {
  const c = mk([{ id: 'a2', name: 'Alu 2', stock: 9, hargaBeli: 1 }]);
  c.D.products.find((p) => p.id === 'a1').stock = 0; // kandidat pertama kosong
  c.sell(3);
  assert.strictEqual(c.st().a2, 6, 'dipotong dari a2 (stok cukup)');
  c.rb(c.D.cobek[0].items, 1, 't1');
  assert.strictEqual(c.st().a2, 9, 'dikembalikan ke a2, bukan a1');
  assert.strictEqual(c.st().a1, 0);
});

test('B5: rollback-on-failure memakai item input caller (kasir/order) -> simetris', () => {
  const c = mk();
  const items = [{ productId: 'b', qty: 3, price: 1 }];
  assert.ok(c.rec({ date: 'd', items, total: 3, subtotal: 3, txId: 't9' }).ok);
  c.rb(items, 1, 't9');
  assert.deepStrictEqual(c.st(), { b: 5, base: 1, a1: 1 });
});

test('B5: data lama tanpa item.linked memakai fallback perilaku lama (tidak error)', () => {
  const c = mk();
  c.D.products.find((p) => p.id === 'base').stock = 10;
  c.rb([{ productId: 'b', qty: 2 }], 1, 'tx');
  assert.strictEqual(c.st().b, 7);
  assert.strictEqual(c.st().base, 12);
});
