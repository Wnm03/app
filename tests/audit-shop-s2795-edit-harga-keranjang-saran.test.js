'use strict';
// S2795 — audit Shop: edit harga baris keranjang (Kasir AI, Order manual, Penjualan di modal Transaksi) + saran rekomendasi lokal.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeDom() {
  const els = {};
  const el = (id, v) => (els[id] = els[id] || { id, value: v == null ? '' : v, checked: false, innerHTML: '', textContent: '', style: {}, dataset: {}, parentNode: null, focus() {}, select() {} });
  return { els, el, document: { getElementById: (id) => els[id] || null, createElement: () => ({ style: {}, dataset: {}, setAttribute() {}, innerHTML: '' }), querySelectorAll: () => [] } };
}
const baseGlobals = (dom, extra = {}) => ({
  document: dom.document, toast: (m) => (dom.toasts = dom.toasts || []).push(m),
  escapeHtml: (s) => String(s), fmt: (n) => String(Math.round(n)), fmtFull: (n) => 'Rp' + Math.round(n),
  ...extra,
});

function loadAdvice() {
  const dom = makeDom();
  const ctx = loadSource(['modules/shop/cobek-pricing.js'], baseGlobals(dom, { D: { products: [] } }), ['ShopCartAdvice']);
  return ctx.ShopCartAdvice;
}

test('parsePrice: kosong, NaN, Infinity, <=0, terlalu besar ditolak; desimal dibulatkan', () => {
  const A = loadAdvice();
  assert.equal(A.parsePrice('').ok, false);
  assert.equal(A.parsePrice('abc').ok, false);
  assert.equal(A.parsePrice('1e999').ok, false); // dulu parseFloat -> Infinity lolos "h>0"
  assert.equal(A.parsePrice('0').ok, false);
  assert.equal(A.parsePrice('-5').ok, false);
  assert.equal(A.parsePrice('0.4').ok, false);
  assert.equal(A.parsePrice('99999999999').reason, 'toolarge');
  assert.deepEqual({ ...A.parsePrice('12500.6') }, { ok: true, value: 12501 });
  assert.equal(A.parsePrice('12500,4').value, 12500);
});

test('analyze: di bawah modal = warn, margin tipis, diskon besar, stok tipis, rugi total', () => {
  const A = loadAdvice();
  const p = { id: 'p1', name: 'Cobek', hargaBeli: 10000, hargaJual: 15000, stock: 5 };
  const warn = A.analyze([{ productId: 'p1', product: p, harga: 8000, hargaDefault: 15000, hargaOverride: 8000, qty: 1 }]);
  assert.equal(warn[0].level, 'warn');
  assert.match(warn[0].text, /di bawah modal/);
  const tipis = A.analyze([{ productId: 'p1', product: p, harga: 10500, hargaDefault: 10500, hargaOverride: null, qty: 1 }]);
  assert.ok(tipis.some((a) => /margin tipis/.test(a.text)));
  const diskon = A.analyze([{ productId: 'p1', product: p, harga: 11500, hargaDefault: 15000, hargaOverride: 11500, qty: 1 }]);
  assert.ok(diskon.some((a) => /diturunkan 23%/.test(a.text)));
  const stok = A.analyze([{ productId: 'p1', product: p, harga: 15000, hargaDefault: 15000, hargaOverride: null, qty: 4 }]);
  assert.ok(stok.some((a) => /stok tinggal 1/.test(a.text)));
  const habis = A.analyze([{ productId: 'p1', product: p, harga: 15000, hargaDefault: 15000, hargaOverride: null, qty: 5 }]);
  assert.ok(habis.some((a) => /stok habis/.test(a.text)));
  const rugi = A.analyze([], { profit: -5000 });
  assert.equal(rugi[0].level, 'warn');
  assert.equal(A.analyze([{ productId: 'p1', product: p, harga: 15000, hargaDefault: 15000, hargaOverride: null, qty: 1 }]).length, 0);
});

function loadKasir({ products, confirmAnswer } = {}) {
  const dom = makeDom();
  ['kasirCartList', 'kasirDiskon', 'kasirOngkir', 'kasirSubDisplay', 'kasirTotalDisplay', 'kasirProfitDisplay', 'kasirPriceEdit', 'kasirPriceEditHint', 'kasirSaranBox'].forEach((id) => dom.el(id));
  const D = { products: products || [], cobekKategori: [], profile: {} };
  const confirms = [];
  const ctx = loadSource(['modules/shop/cobek-pricing.js', 'modules/business/kasir.js'], baseGlobals(dom, {
    D, askConfirm: async (msg) => { confirms.push(msg); return confirmAnswer !== false; },
    Etalase: { pairSiblings: () => [] },
  }), ['Kasir', 'ShopCartAdvice', 'PriceRekoWidget']);
  return { ctx, K: ctx.Kasir, dom, D, confirms, reko: () => Math.round(ctx.PriceRekoWidget.recommend(D.products[0])) };
}
const prod = () => ({ id: 'p1', name: 'Cobek 20', hargaBeli: 10000, hargaJual: 15000, stock: 20 });

test('Kasir: savePrice menyimpan override & computeTotals memakainya; harga sama dgn normal -> override null', async () => {
  const { K, dom } = loadKasir({ products: [prod()] });
  K.addToCart('p1'); K.changeQty(0, 1);
  K.editPrice(0);
  assert.equal(K.priceEditIdx, 0);
  assert.match(dom.els.kasirCartList.innerHTML, /id="kasirPriceEdit"/);
  dom.els.kasirPriceEdit.value = '13000';
  await K.savePrice(0);
  assert.equal(K.cart[0].hargaOverride, 13000);
  assert.equal(K.priceEditIdx, -1);
  const t = K.computeTotals();
  assert.equal(t.lines[0].harga, 13000);
  assert.equal(t.subtotal, 26000);
  assert.match(dom.els.kasirCartList.innerHTML, /diedit, normal 15000/);
  K.editPrice(0);
  dom.els.kasirPriceEdit.value = '15000';
  await K.savePrice(0);
  assert.equal(K.cart[0].hargaOverride, null);
});

test('Kasir: harga tidak valid ditolak (Infinity, 0, kosong) & override lama tidak berubah', async () => {
  const { K, dom } = loadKasir({ products: [prod()] });
  K.addToCart('p1'); K.editPrice(0);
  for (const bad of ['1e999', '0', '', '-3', 'abc']) {
    dom.els.kasirPriceEdit.value = bad;
    await K.savePrice(0);
    assert.equal(K.cart[0].hargaOverride, null, 'bad=' + bad);
  }
  assert.equal(K.priceEditIdx, 0); // panel tetap terbuka utk dikoreksi
});

test('Kasir: harga di bawah modal minta konfirmasi; batal -> tidak berubah; setuju -> tersimpan + peringatan di keranjang', async () => {
  let r = loadKasir({ products: [prod()], confirmAnswer: false });
  r.K.addToCart('p1'); r.K.editPrice(0); r.dom.els.kasirPriceEdit.value = '9000';
  await r.K.savePrice(0);
  assert.equal(r.confirms.length, 1);
  assert.equal(r.K.cart[0].hargaOverride, null);
  r = loadKasir({ products: [prod()], confirmAnswer: true });
  r.K.addToCart('p1'); r.K.editPrice(0); r.dom.els.kasirPriceEdit.value = '9000';
  await r.K.savePrice(0);
  assert.equal(r.K.cart[0].hargaOverride, 9000);
  assert.match(r.dom.els.kasirCartList.innerHTML, /Di bawah modal/);
  assert.match(r.dom.els.kasirSaranBox.innerHTML, /rugi/);
});

test('Kasir: preset harga normal/reko mengisi input & hint; hapus/qty-0 menutup editor; draft bertahan saat render ulang', () => {
  const { K, dom, reko } = loadKasir({ products: [prod()] });
  K.addToCart('p1'); K.editPrice(0);
  K.setPricePreset('reko');
  assert.ok(reko() > 0);
  assert.equal(dom.els.kasirPriceEdit.value, String(reko()));
  K.setPricePreset('default');
  assert.equal(dom.els.kasirPriceEdit.value, '15000');
  K.onPriceInput('12345');
  K.renderCart(); // mis. user mengetik Diskon
  assert.match(dom.els.kasirCartList.innerHTML, /value="12345"/);
  K.changeQty(0, -1);
  assert.equal(K.priceEditIdx, -1);
  assert.equal(K.cart.length, 0);
});

test('Kasir: aiSuggest menyertakan harga edit & modal dalam prompt', async () => {
  const dom = makeDom();
  ['kasirCartList', 'kasirDiskon', 'kasirOngkir', 'kasirAiCard', 'kasirAiBody'].forEach((id) => dom.el(id));
  const D = { products: [prod()], cobekKategori: [], profile: { apiKey: 'k' } };
  let sent = null;
  const ctx = loadSource(['modules/shop/cobek-pricing.js', 'modules/business/kasir.js'], baseGlobals(dom, {
    D, Etalase: { pairSiblings: () => [] },
    callAIProviderRaw: async (sys, msgs) => { sent = { sys, msgs }; return { ok: true, text: '• ok' }; },
  }), ['Kasir']);
  ctx.Kasir.addToCart('p1'); ctx.Kasir.cart[0].hargaOverride = 11000;
  await ctx.Kasir.aiSuggest();
  assert.match(sent.msgs[0].content, /@11000 \(harga diedit kasir, normal 15000\)/);
  assert.match(sent.msgs[0].content, /modal 10000/);
  assert.match(sent.sys, /di bawah atau terlalu dekat dengan modal/);
});

test('Order manual: updateItemHarga menolak Infinity/<=0 (harga lama bertahan), kosong = kembali default, saran di bawah modal', () => {
  const dom = makeDom();
  ['oPriceType', 'oDiskon', 'oOngkir', 'oTotalDisplay', 'oProfitDisplay', 'orderItemList', 'orderLineTag0', 'orderLineHint0'].forEach((id) => dom.el(id));
  dom.els.oPriceType.value = 'jual';
  const D = { products: [prod()], cobek: [], cobekKategori: [] };
  const ctx = loadSource(['modules/shop/cobek-pricing.js', 'modules/shop/cobek-order.js'], baseGlobals(dom, { D, Etalase: { pairSiblings: () => [] } }), ['Order']);
  const O = ctx.Order;
  O.items = [{ productId: 'p1', qty: 2, hargaOverride: null }];
  O.updateItemHarga(0, '13000');
  assert.equal(O.items[0].hargaOverride, 13000);
  O.updateItemHarga(0, '1e999');
  assert.equal(O.items[0].hargaOverride, 13000);
  assert.match(dom.els.orderLineHint0.textContent, /angka yang valid/);
  O.updateItemHarga(0, '-5');
  assert.equal(O.items[0].hargaOverride, 13000);
  O.updateItemHarga(0, '9000');
  assert.match(dom.els.orderLineHint0.textContent, /Di bawah modal/);
  O.updateItemHarga(0, '');
  assert.equal(O.items[0].hargaOverride, null);
  assert.equal(dom.els.oTotalDisplay.textContent, 'Rp30000');
});

test('Keuangan: edit harga baris Penjualan menolak Infinity & menampilkan peringatan di bawah modal', () => {
  const dom = makeDom();
  ['txShopSaleCartList', 'txAddShopSale', 'txAmt', 'txCartEditQty', 'txCartEditHarga', 'txCartEditDefault', 'txShopSaleDiskon', 'txShopSaleOngkir'].forEach((id) => dom.el(id));
  dom.els.txAddShopSale.checked = true;
  const D = { products: [prod()], produsen: [], cobekKategori: [], cobek: [], transactions: [], piutang: [] };
  const ctx = loadSource(['modules/shop/cobek-pricing.js', 'modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-io.js'], baseGlobals(dom, {
    D, uid: () => 'u1', renderProductList() {}, renderShop() {}, renderShopRecent() {}, Pelanggan: {},
    Etalase: { renderList() {}, renderKategoriList() {}, renderModalStat() {}, bundleAddonShape: () => null }, Laporan: { render() {} }, Order: { renderRecent() {} }, SiapPulang: {}, StockRekoWidget: { render() {} },
  }), ['curTxShopSaleCart', 'shopCartEdit', 'editTxShopSaleCartItem', 'saveTxShopSaleCartItemEdit', 'renderTxShopSaleCartList']);
  ctx.curTxShopSaleCart.push({ productId: 'p1', name: 'Cobek 20', qty: 1, harga: 15000 });
  ctx.editTxShopSaleCartItem(0);
  dom.els.txCartEditQty.value = '1'; dom.els.txCartEditHarga.value = '1e999';
  ctx.saveTxShopSaleCartItemEdit(0);
  assert.equal(ctx.curTxShopSaleCart[0].harga, 15000);
  dom.els.txCartEditHarga.value = '8000';
  ctx.saveTxShopSaleCartItemEdit(0);
  assert.equal(ctx.curTxShopSaleCart[0].harga, 8000);
  assert.match(dom.els.txShopSaleCartList.innerHTML, /Di bawah modal/);
  assert.match(dom.els.txShopSaleCartList.innerHTML, /Saran cepat/);
});

test('S2796 Kasir: struk menampilkan @harga bila diedit; centang "jadikan harga produk" tersimpan di baris', async () => {
  const { K, dom } = loadKasir({ products: [prod()] });
  K.addToCart('p1'); K.editPrice(0);
  dom.el('kasirPriceEditDefault').checked = true;
  dom.els.kasirPriceEdit.value = '13000';
  await K.savePrice(0);
  assert.equal(K.cart[0].saveAsDefault, true);
  assert.match(dom.els.kasirCartList.innerHTML, /jadi harga produk/);
  assert.match(K.buildReceiptText(), /Cobek 20 x1 @13000\s+13000/);
  K.editPrice(0); dom.els.kasirPriceEditDefault.checked = false; dom.els.kasirPriceEdit.value = '15000';
  await K.savePrice(0);
  assert.equal(K.cart[0].saveAsDefault, false);
  assert.doesNotMatch(K.buildReceiptText(), /@/);
});
