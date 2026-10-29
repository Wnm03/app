'use strict';
// S2732: Penjualan Shop dari modal Transaksi — stok divalidasi SEBELUM transaksi dipersist.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const cart = fs.readFileSync(path.join(root, 'modules/shop/cobek-tx-cart.js'), 'utf8');
const saveSrc = fs.readFileSync(path.join(root, 'modules/finance/transaksi-b.js'), 'utf8');

test('txShopSalePrecheck terdefinisi dan memakai aturan stok recordShopSale (+qty lama saat edit)', () => {
  assert.match(cart, /function txShopSalePrecheck\(existingTx\)/);
  assert.match(cart, /cobekLinkId/);
  assert.match(cart, /tidak cukup \(sisa /);
});

test('_saveTxInner memanggil precheck sebelum transaksi dipersist (FinanceTxSOT.create)', () => {
  const iPre = saveSrc.indexOf('txShopSalePrecheck(');
  const iCreate = saveSrc.indexOf('FinanceTxSOT.create(newTx)');
  assert.ok(iPre > 0, 'precheck dipanggil');
  assert.ok(iCreate > 0 && iPre < iCreate, 'precheck sebelum create transaksi');
  assert.match(saveSrc.slice(iPre, iPre + 400), /return;/);
});

test('precheck menolak stok kurang & menerima qty lama saat edit (eksekusi nyata)', () => {
  const vm = require('node:vm');
  const body = cart.slice(cart.indexOf('function txShopSalePrecheck'), cart.indexOf('function applyTxShopSaleFromTx'));
  const mk = (checked, display) => ({ checked, style: { display } });
  const els = { txAddShopSale: mk(true, 'block'), txShopSalePanel: mk(false, 'block') };
  const ctx = {
    document: { getElementById: (id) => els[id] || null },
    curTxShopSaleCart: [{ productId: 'p1', qty: 20 }],
    D: { products: [{ id: 'p1', name: 'Cobek', stock: 10 }], cobek: [{ id: 'c1', items: [{ productId: 'p1', qty: 8 }] }] },
  };
  vm.createContext(ctx);
  vm.runInContext(body + ';this.fn=txShopSalePrecheck;', ctx);
  assert.strictEqual(ctx.fn(null).ok, false);
  ctx.curTxShopSaleCart = [{ productId: 'p1', qty: 10 }];
  assert.strictEqual(ctx.fn(null).ok, true);
  ctx.curTxShopSaleCart = [{ productId: 'p1', qty: 18 }];
  assert.strictEqual(ctx.fn({ cobekLinkId: 'c1' }).ok, true);
  ctx.curTxShopSaleCart = [{ productId: 'p1', qty: 19 }];
  assert.strictEqual(ctx.fn({ cobekLinkId: 'c1' }).ok, false);
  els.txAddShopSale.checked = false;
  assert.strictEqual(ctx.fn(null).ok, true);
});
