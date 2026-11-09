'use strict';
// S2780 — Pola B untuk Stok Shop dan Penjualan Shop (lepas tautan dgn pengecekan stok/piutang terpakai).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const cart = fs.readFileSync(path.join(root, 'modules/shop/cobek-tx-cart.js'), 'utf8');
const slice = (from, to) => cart.slice(cart.indexOf(from), cart.indexOf(to));
// helper stok (sebelum _txShopStockRev) + helper penjualan (sebelum applyTxShopSaleFromTx) + rollbackShopItems
const src = [
  slice('// S2780 (Pola B): centang "Tambah ke Stok Shop"', '// S2433-B: revisi stok'),
  slice('// S2780 (Pola B): centang "Penjualan Shop"', 'function applyTxShopSaleFromTx'),
].join('\n');

function env({ stockChecked = false, saleChecked = false, panel = 'block', products = [], cobek = [], piutang = [] } = {}) {
  const els = {
    txAddShopStock: { checked: stockChecked }, txShopStockPanel: { style: { display: panel } },
    txAddShopSale: { checked: saleChecked }, txShopSalePanel: { style: { display: panel } },
  };
  const calls = { restore: [], removedPiutang: [], preorder: [] };
  const D = { products, cobek, piutang };
  const ProductRepository = {
    mutateStockDelta(p, d, meta) { if (p.stock + d < 0) return { ok: false, reason: 'neg' }; p.stock += d; calls.last = meta; return { ok: true }; },
  };
  const ctx = {
    D, document: { getElementById: (id) => els[id] || null }, ProductRepository,
    BillDebtPiutangCanonicalWriter: { removeById: (k, id) => { calls.removedPiutang.push(id); D.piutang = D.piutang.filter((x) => x.id !== id); } },
    Preorder: { onSaleRemoved: (id) => calls.preorder.push(id) },
    rollbackShopItems: (items, sign) => items.forEach((it) => { D.products.find((p) => p.id === it.productId).stock += sign * it.qty; calls.restore.push(it.productId); }),
    renderProductList() {}, renderShop() {}, renderShopRecent() {}, toast() {},
  };
  vm.createContext(ctx);
  vm.runInContext(src + ';this.api={txShopStockUnlinkRequested,validateTxShopStockUnlink,unlinkTxShopStockFromTx,txShopSaleUnlinkRequested,validateTxShopSaleUnlink,unlinkTxShopSaleFromTx};', ctx);
  return { api: ctx.api, D, calls, els };
}

test('S2780 stok: tertaut + centang mati -> diminta lepas; dicentang/panel tersembunyi/tak tertaut -> tidak', () => {
  const tx = { id: 't1', stockItems: [{ productId: 'p1', qty: 5 }] };
  assert.equal(env({ products: [{ id: 'p1', stock: 9 }] }).api.txShopStockUnlinkRequested(tx), true);
  assert.equal(env({ stockChecked: true }).api.txShopStockUnlinkRequested(tx), false);
  assert.equal(env({ panel: 'none' }).api.txShopStockUnlinkRequested(tx), false);
  assert.equal(env().api.txShopStockUnlinkRequested({ id: 't2' }), false);
  assert.equal(env().api.txShopStockUnlinkRequested({ id: 't3', stockProductId: 'p1', stockQty: 2 }), true, 'format legacy');
});

test('S2780 stok: pembatalan ditolak bila sebagian sudah terjual; lolos bila stok cukup', () => {
  const tx = { id: 't1', stockItems: [{ productId: 'p1', qty: 5 }] };
  const sold = env({ products: [{ id: 'p1', name: 'Cobek', stock: 3 }] });
  assert.match(sold.api.validateTxShopStockUnlink(tx), /tinggal 3.*\+5/);
  assert.equal(env({ products: [{ id: 'p1', name: 'Cobek', stock: 5 }] }).api.validateTxShopStockUnlink(tx), null);
  assert.equal(env({ stockChecked: true, products: [{ id: 'p1', stock: 0 }] }).api.validateTxShopStockUnlink(tx), null, 'tak diminta lepas');
});

test('S2780 stok: unlink mengurangi stok, melepas field stok, mempertahankan stockRev, key idempotensi per rev', () => {
  const tx = { id: 't1', stockRev: 2, stockItems: [{ productId: 'p1', qty: 5 }, { productId: 'p1', qty: 1 }], stockProductId: 'p1', stockQty: 5, produsenId: 'x', kategoriId: 'k', amount: 900 };
  const e = env({ products: [{ id: 'p1', stock: 10 }] });
  e.api.unlinkTxShopStockFromTx(tx);
  assert.equal(e.D.products[0].stock, 4, '10 - (5+1)');
  assert.deepEqual([tx.stockItems, tx.stockProductId, tx.stockQty, tx.produsenId, tx.kategoriId], [undefined, undefined, undefined, undefined, undefined]);
  assert.equal(tx.stockRev, 2);
  assert.equal(tx.amount, 900);
  assert.equal(e.calls.last.idempotencyKey, 'tx-stock-unlink:t1:p1:r2');
});

test('S2780 penjualan: diminta lepas hanya bila tertaut & centang mati; ditolak bila piutang sudah lunas', () => {
  const tx = { id: 't1', cobekLinkId: 'c1' };
  const base = { cobek: [{ id: 'c1', items: [{ productId: 'p1', qty: 2 }], piutangLinkId: 'pi1' }], products: [{ id: 'p1', stock: 1 }] };
  const open = env({ ...base, piutang: [{ id: 'pi1', lunas: false }] });
  assert.equal(open.api.txShopSaleUnlinkRequested(tx), true);
  assert.equal(open.api.validateTxShopSaleUnlink(tx), null);
  const paid = env({ ...base, piutang: [{ id: 'pi1', lunas: true }] });
  assert.match(paid.api.validateTxShopSaleUnlink(tx), /sudah lunas/);
  assert.equal(env({ ...base, saleChecked: true }).api.txShopSaleUnlinkRequested(tx), false);
  assert.equal(env({ products: [] }).api.txShopSaleUnlinkRequested(tx), false, 'catatan penjualan hilang');
});

test('S2780 penjualan: unlink mengembalikan stok, menghapus piutang & catatan, melepas tautan, transaksi tetap', () => {
  const tx = { id: 't1', cobekLinkId: 'c1', amount: 50000 };
  const e = env({ cobek: [{ id: 'c1', items: [{ productId: 'p1', qty: 2 }], piutangLinkId: 'pi1' }, { id: 'c2', items: [] }], products: [{ id: 'p1', stock: 1 }], piutang: [{ id: 'pi1', lunas: false }] });
  e.api.unlinkTxShopSaleFromTx(tx);
  assert.equal(e.D.products[0].stock, 3);
  assert.deepEqual(e.D.cobek.map((c) => c.id), ['c2']);
  assert.deepEqual(e.calls.removedPiutang, ['pi1']);
  assert.deepEqual(e.calls.preorder, ['c1']);
  assert.equal(tx.cobekLinkId, undefined);
  assert.equal(tx.amount, 50000);
});

test('S2780 sumber: apply memanggil unlink sebelum guard centang; validasi & konfirmasi sebelum mutasi di _saveTxInner', () => {
  assert.ok(cart.indexOf('txShopStockUnlinkRequested(existingTx)){unlinkTxShopStockFromTx') < cart.indexOf("if(!chk||!chk.checked)return;\nconst panel=document.getElementById('txShopStockPanel')"));
  assert.ok(cart.indexOf('txShopSaleUnlinkRequested(existingTx)){unlinkTxShopSaleFromTx') < cart.indexOf("if(!chk||!chk.checked)return;\nconst panel=document.getElementById('txShopSalePanel')"));
  const sv = fs.readFileSync(path.join(root, 'modules/finance/transaksi-b.js'), 'utf8');
  const iVal = sv.indexOf('validateTxShopStockUnlink(existingTx)');
  const iConfirm = sv.indexOf("askConfirm('Centang dimatikan");
  const iApply = sv.indexOf('applyTxShopStockFromTx(savedTxId');
  assert.ok(iVal > 0 && iVal < iConfirm && iConfirm < iApply);
  assert.match(sv, /_undo\.push\('Penambahan stok produk Shop/);
  assert.match(sv, /_undo\.push\('Penjualan Shop tertaut/);
});
