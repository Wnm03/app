'use strict';
// S2754 — edit jumlah & harga per baris keranjang Pembelian (Stok Masuk) dan Penjualan Shop
// pada modal Transaksi, tanpa hapus-lalu-tambah ulang.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEnv({ products, withRepo = false } = {}) {
  const els = {};
  const el = (id, v) => (els[id] = els[id] || { id, value: v == null ? '' : v, checked: false, innerHTML: '', style: {}, dataset: {} });
  const D = { products: products || [], produsen: [], cobekKategori: [], cobek: [], transactions: [], piutang: [] };
  const toasts = [];
  const ctx = loadSource(['modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-io.js'], {
    D,
    document: { getElementById: (id) => els[id] || null },
    toast: (m) => toasts.push(m),
    escapeHtml: (s) => String(s),
    fmtFull: (n) => 'Rp' + Number(n).toLocaleString('en-US'),
    fmt: (n) => String(n),
    uid: (() => { let n = 0; return () => 'u' + (++n); })(),
    renderProductList: () => {}, renderShop: () => {}, renderShopRecent: () => {},
    Pelanggan: {}, Etalase: { renderList() {}, renderKategoriList() {}, renderModalStat() {}, bundleAddonShape: () => null }, Laporan: { render() {} }, Order: { renderRecent() {} }, SiapPulang: {}, Produsen: {}, PriceRekoWidget: { render() {} }, StockRekoWidget: { render() {} },
    ...(withRepo ? { ProductRepository: {
      mutateSetPrice(p, f, v) { p[f] = v; return { ok: true }; },
      mutateStockDelta(p, q) { p.stock = (p.stock || 0) + q; return { ok: true }; },
      mutateSetField(p, f, v) { p[f] = v; return { ok: true }; },
      mutateSetHargaProdusen() { return { ok: true }; },
    } } : {}),
  }, ['curShopStockCart', 'curTxShopSaleCart', 'shopCartEdit', 'editShopStockCartItem', 'saveShopStockCartItemEdit', 'cancelShopStockCartEdit',
      'editTxShopSaleCartItem', 'saveTxShopSaleCartItemEdit', 'cancelTxShopSaleCartEdit', 'removeShopStockCartItem', 'removeTxShopSaleCartItem',
      'renderShopStockCartList', 'renderTxShopSaleCartList', 'applyTxShopStockFromTx', 'applyTxShopSaleFromTx', 'resetShopStockCart', 'resetTxShopSaleCart']);
  return { ctx, els, el, D, toasts };
}
const arr = (ctx, name) => ctx[name];

test('pembelian: tombol ✏️ membuka panel edit; tombol hapus tetap ada; edit lagi menutup', () => {
  const { ctx, el, els } = makeEnv();
  el('txShopStockCartList'); el('txAddShopStock').checked = true; el('txAmt');
  ctx.curShopStockCart.push({ productId: 'p1', isNew: false, name: 'Cobek', qty: 2, hargaBeli: 10000, produsenId: '', kategoriInput: '', hargaJual: 0 });
  ctx.renderShopStockCartList();
  assert.match(els.txShopStockCartList.innerHTML, /data-action="editShopStockCartItem"/);
  assert.match(els.txShopStockCartList.innerHTML, /data-action="removeShopStockCartItem"/);
  assert.doesNotMatch(els.txShopStockCartList.innerHTML, /txCartEditQty/);
  ctx.editShopStockCartItem(0);
  assert.match(els.txShopStockCartList.innerHTML, /id="txCartEditBeli"/);
  assert.match(els.txShopStockCartList.innerHTML, /data-action="removeShopStockCartItem"/);
  ctx.editShopStockCartItem(0);
  assert.doesNotMatch(els.txShopStockCartList.innerHTML, /txCartEditQty/);
});

test('pembelian: simpan edit memperbarui qty/harga beli/harga jual, nominal transaksi ikut dihitung ulang', () => {
  const { ctx, el, els } = makeEnv();
  el('txShopStockCartList'); el('txAddShopStock').checked = true; el('txAmt');
  ctx.curShopStockCart.push({ productId: 'p1', isNew: false, name: 'Cobek', qty: 2, hargaBeli: 10000, produsenId: '', kategoriInput: '', hargaJual: 0 });
  ctx.editShopStockCartItem(0);
  el('txCartEditQty').value = '3'; el('txCartEditBeli').value = '12500'; el('txCartEditJual').value = '20000';
  ctx.saveShopStockCartItemEdit(0);
  const it = ctx.curShopStockCart[0];
  assert.equal(it.qty, 3); assert.equal(it.hargaBeli, 12500); assert.equal(it.hargaJual, 20000); assert.equal(it.hargaJualEdited, true);
  assert.equal(els.txAmt.value, 37500);
  assert.equal(ctx.shopCartEdit.stock, -1);
});

test('pembelian: input tidak valid ditolak dan baris tidak berubah', () => {
  const { ctx, el, toasts } = makeEnv();
  el('txShopStockCartList'); el('txAddShopStock').checked = true; el('txAmt');
  ctx.curShopStockCart.push({ productId: 'p1', isNew: false, name: 'Cobek', qty: 2, hargaBeli: 10000, produsenId: '', kategoriInput: '', hargaJual: 0 });
  ctx.editShopStockCartItem(0);
  el('txCartEditQty').value = '0'; el('txCartEditBeli').value = '10000'; el('txCartEditJual').value = '';
  ctx.saveShopStockCartItemEdit(0);
  el('txCartEditQty').value = '2'; el('txCartEditBeli').value = '-5';
  ctx.saveShopStockCartItemEdit(0);
  el('txCartEditBeli').value = '10000'; el('txCartEditJual').value = '-1';
  ctx.saveShopStockCartItemEdit(0);
  assert.equal(ctx.curShopStockCart[0].qty, 2); assert.equal(ctx.curShopStockCart[0].hargaBeli, 10000);
  assert.equal(toasts.length, 3);
  assert.equal(ctx.shopCartEdit.stock, 0, 'panel tetap terbuka agar bisa dikoreksi');
});

test('pembelian: harga jual produk lama HANYA berubah bila diedit di panel (tidak ada perubahan diam-diam)', () => {
  for (const edited of [false, true]) {
    const { ctx, el, D } = makeEnv({ products: [{ id: 'p1', name: 'Cobek', stock: 1, hargaBeli: 9000, hargaJual: 15000, kategoriId: '' }], withRepo: true });
    el('txAddShopStock').checked = true; el('txShopStockPanel').style = { display: 'block' }; el('txShopStockCartList'); el('txAmt');
    ctx.curShopStockCart.push({ productId: 'p1', isNew: false, name: 'Cobek', qty: 2, hargaBeli: 10000, produsenId: '', kategoriInput: '', hargaJual: 0 });
    if (edited) { ctx.editShopStockCartItem(0); el('txCartEditQty').value = '2'; el('txCartEditBeli').value = '10000'; el('txCartEditJual').value = '22000'; ctx.saveShopStockCartItemEdit(0); }
    ctx.applyTxShopStockFromTx('tx1', 'n', null, null);
    const p = D.products[0];
    assert.equal(p.hargaJual, edited ? 22000 : 15000);
    assert.equal(p.hargaBeli, 10000);
    assert.equal(p.stock, 3);
  }
});

test('penjualan: edit qty & harga per baris; total & untung dihitung ulang; harga produk tidak berubah tanpa centang', () => {
  const { ctx, el, els, D } = makeEnv({ products: [{ id: 'p1', name: 'Lumpang', stock: 10, hargaBeli: 20000, hargaJual: 40000 }] });
  el('txShopSaleCartList'); el('txAddShopSale').checked = true; el('txAmt');
  ctx.curTxShopSaleCart.push({ productId: 'p1', name: 'Lumpang', qty: 1, harga: 40000 });
  ctx.editTxShopSaleCartItem(0);
  assert.match(els.txShopSaleCartList.innerHTML, /id="txCartEditHarga"/);
  assert.match(els.txShopSaleCartList.innerHTML, /id="txCartEditDefault"/);
  el('txCartEditQty').value = '2'; el('txCartEditHarga').value = '35000';
  ctx.saveTxShopSaleCartItemEdit(0);
  assert.equal(ctx.curTxShopSaleCart[0].qty, 2); assert.equal(ctx.curTxShopSaleCart[0].harga, 35000);
  assert.equal(ctx.curTxShopSaleCart[0].saveAsDefault, false);
  assert.equal(els.txAmt.value, 70000);
  assert.match(els.txShopSaleCartList.innerHTML, /Estimasi untung: Rp30,000/);
  assert.equal(D.products[0].hargaJual, 40000);
});

test('penjualan: harga <= 0 atau jumlah <= 0 ditolak', () => {
  const { ctx, el, toasts } = makeEnv({ products: [{ id: 'p1', name: 'L', stock: 10, hargaBeli: 1, hargaJual: 2 }] });
  el('txShopSaleCartList'); el('txAddShopSale').checked = true; el('txAmt');
  ctx.curTxShopSaleCart.push({ productId: 'p1', name: 'L', qty: 1, harga: 5 });
  ctx.editTxShopSaleCartItem(0);
  el('txCartEditQty').value = '1'; el('txCartEditHarga').value = '0'; ctx.saveTxShopSaleCartItemEdit(0);
  el('txCartEditQty').value = '-1'; el('txCartEditHarga').value = '5'; ctx.saveTxShopSaleCartItemEdit(0);
  assert.equal(ctx.curTxShopSaleCart[0].harga, 5); assert.equal(toasts.length, 2);
});

test('penjualan: centang "Jadikan harga jual produk" menimpa harga produk saat transaksi disimpan', () => {
  for (const check of [false, true]) {
    const { ctx, el, D } = makeEnv({ products: [{ id: 'p1', name: 'Lumpang', stock: 10, hargaBeli: 20000, hargaJual: 40000 }], withRepo: true });
    el('txShopSaleCartList'); el('txAddShopSale').checked = true; el('txShopSalePanel').style = { display: 'block' }; el('txAmt');
    ctx.curTxShopSaleCart.push({ productId: 'p1', name: 'Lumpang', qty: 1, harga: 40000 });
    ctx.editTxShopSaleCartItem(0);
    el('txCartEditQty').value = '1'; el('txCartEditHarga').value = '35000'; el('txCartEditDefault').checked = check;
    ctx.saveTxShopSaleCartItemEdit(0);
    D.transactions.push({ id: 'tx1' });
    ctx.applyTxShopSaleFromTx('tx1', '2026-11-08', 'acc1', 'n', null);
    assert.equal(D.cobek.length, 1);
    assert.equal(D.cobek[0].items[0].harga, 35000, 'transaksi memakai harga hasil edit');
    assert.equal(D.products[0].hargaJual, check ? 35000 : 40000);
  }
});

test('hapus baris & reset menutup panel edit (indeks tidak bergeser)', () => {
  const { ctx, el } = makeEnv({ products: [{ id: 'p1', name: 'A', stock: 5, hargaBeli: 1, hargaJual: 2 }] });
  el('txShopSaleCartList'); el('txShopStockCartList'); el('txAddShopSale').checked = true; el('txAddShopStock').checked = true; el('txAmt');
  ctx.curTxShopSaleCart.push({ productId: 'p1', name: 'A', qty: 1, harga: 2 }, { productId: 'p1', name: 'A2', qty: 1, harga: 2 });
  ctx.curShopStockCart.push({ productId: 'p1', isNew: false, name: 'A', qty: 1, hargaBeli: 1, produsenId: '', kategoriInput: '', hargaJual: 0 });
  ctx.editTxShopSaleCartItem(1); ctx.editShopStockCartItem(0);
  ctx.removeTxShopSaleCartItem(0); assert.equal(ctx.shopCartEdit.sale, -1);
  ctx.removeShopStockCartItem(0); assert.equal(ctx.shopCartEdit.stock, -1);
  ctx.editTxShopSaleCartItem(0); ctx.resetTxShopSaleCart(); assert.equal(ctx.shopCartEdit.sale, -1);
});
