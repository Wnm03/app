'use strict';
// tests/sales-mutation-fix-s265.test.js — cakupan Modul 2 (Sales Mutation
// fix, sesi s265): recordShopSale() (modules/shop/cobek-tx-cart.js) tidak
// lagi bisa menghasilkan stok negatif dari duplicate cart item, rollback
// stok jadi 1 SSOT (rollbackShopItems), rollback bundle (base+addon
// alu/muntu) diperbaiki di jalur delete/retur (Laporan.delete(), yang JUGA
// dipakai BusinessFlowPresenter.processReturn() — lihat catatan
// "Wire Return->Refund" di cobek-order.js: 0 jalur retur terpisah di app
// ini), edit transaksi selalu restore stok lama dulu sebelum apply baru,
// dan validasi backend (bukan hanya UI) di recordShopSale().
//
// Load order file SAMA PERSIS urutan GROUP_A di scripts/build.js
// (cobek-etalase.js -> cobek-pricing.js -> cobek-order.js -> cobek-tx-cart.js)
// supaya forward-reference (Order/Laporan manggil recordShopSale() &
// rollbackShopItems() yang didefinisikan belakangan di cobek-tx-cart.js,
// pola yang sudah ada & terbukti jalan di production bundle) tetap valid.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [],
      cobek: [],
      cobekKategori: [],
      produsen: [],
      accounts: [{ id: 'acc1', name: 'Kas', emoji: '💵' }],
      transactions: [],
      piutang: [],
      profile: {},
    },
    extra,
  );
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/cobek-tx-cart.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      toast: () => {},
      save: () => {},
      askConfirm: async () => true,
      Pelanggan: { _acList: () => [], onFieldInput: () => {}, select: () => {}, key: () => null },
      // Fan-out render/UI functions dipanggil dari Laporan.delete()/
      // addTxShopSaleCartItem() dkk -- di app aslinya ini fungsi render DOM
      // beneran (modules-render.js dst), di sini cukup no-op krn yang
      // ditest adalah efek pada `D` (stok/D.cobek/D.transactions), bukan DOM.
      renderShopRecent: () => {},
      renderProductList: () => {},
      renderShop: () => {},
      renderTxShopSaleCartList: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderSiapPulang: () => {},
    },
    ['Order', 'Laporan', 'recordShopSale', 'rollbackShopItems', 'applyBundleLinkedStock', 'Etalase', 'curTxShopSaleCart'],
  );
}

// --- 1. Penjualan normal -----------------------------------------------

test('recordShopSale() — penjualan normal: stok berkurang, transaksi tercatat', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 10, hargaBeli: 5000, hargaJual: 10000 }] });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 10000, lineTotal: 30000 }],
    subtotal: 30000, diskon: 0, ongkir: 0, total: 30000, profit: 15000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 7);
  assert.equal(D.cobek.length, 1);
  assert.equal(D.cobek[0].items[0].qty, 3);
});

// --- 2. Duplicate cart item ---------------------------------------------

test('recordShopSale() — duplicate cart item (2 baris produk sama) diakumulasi sebelum validasi, tidak lolos kalau total > stok', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5, hargaBeli: 1000, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  // 2 baris @3 -- masing2 <= stok (5) kalau dicek terpisah, tapi total 6 > 5.
  const result = ctx.recordShopSale({
    items: [
      { productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 },
      { productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 },
    ],
    subtotal: 12000, diskon: 0, ongkir: 0, total: 12000, profit: 6000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /Stok/);
  assert.equal(D.products[0].stock, 5, 'stok TIDAK berubah sama sekali kalau ditolak');
});

test('recordShopSale() — duplicate cart item yang totalnya masih muat di stok tetap diterima & dikurangi sesuai total', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 10, hargaBeli: 1000, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [
      { productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 },
      { productId: 'p1', name: 'Cobek 15cm', qty: 4, harga: 2000, lineTotal: 8000 },
    ],
    subtotal: 14000, diskon: 0, ongkir: 0, total: 14000, profit: 7000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 3);
});

// --- 3. Stok negatif dicegah ---------------------------------------------

test('recordShopSale() — qty > stok tersedia (1 baris) ditolak, stok tidak berubah', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 2, hargaBeli: 1000, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 5, harga: 2000, lineTotal: 10000 }],
    subtotal: 10000, diskon: 0, ongkir: 0, total: 10000, profit: 5000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, false);
  assert.equal(D.products[0].stock, 2);
});

test('recordShopSale() — tidak pernah menghasilkan stok < 0 walau dipanggil berkali-kali hingga stok pas-pasan', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5, hargaBeli: 1000, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  const mk = (qty) => ({
    items: [{ productId: 'p1', name: 'Cobek 15cm', qty, harga: 2000, lineTotal: qty * 2000 }],
    subtotal: qty * 2000, diskon: 0, ongkir: 0, total: qty * 2000, profit: qty * 1000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx' + qty, existingShopId: null,
  });
  assert.equal(ctx.recordShopSale(mk(3)).ok, true);
  assert.equal(D.products[0].stock, 2);
  const r2 = ctx.recordShopSale(mk(3)); // sisa cuma 2, minta 3 -> harus ditolak
  assert.equal(r2.ok, false);
  assert.equal(D.products[0].stock, 2, 'stok tidak boleh minus');
});

// --- 4. Edit transaksi ----------------------------------------------------

test('recordShopSale() — edit transaksi (existingShopId): restore stok lama dulu, baru apply stok baru', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Cobek 15cm', stock: 4, hargaBeli: 1000, hargaJual: 2000 },
      { id: 'p2', name: 'Cobek 20cm', stock: 10, hargaBeli: 1500, hargaJual: 3000 },
    ],
    cobek: [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 }], total: 6000, profit: 3000, accountId: 'acc1' }],
  });
  const ctx = makeCtx(D);
  // Edit: ganti jadi beli p2 qty 5 (bukan p1 lagi).
  const result = ctx.recordShopSale({
    items: [{ productId: 'p2', name: 'Cobek 20cm', qty: 5, harga: 3000, lineTotal: 15000 }],
    subtotal: 15000, diskon: 0, ongkir: 0, total: 15000, profit: 7500,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: 'shop1',
  });
  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 7, 'stok p1 (3) dikembalikan penuh: 4+3=7');
  assert.equal(D.products[1].stock, 5, 'stok p2 dikurangi qty baru: 10-5=5');
  assert.equal(D.cobek[0].items[0].productId, 'p2');
});

test('recordShopSale() — edit transaksi yang stok barunya tidak cukup: ditolak & stok lama tetap utuh (rollback restore dibatalkan lagi)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 15cm', stock: 4, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 }], total: 6000, profit: 3000, accountId: 'acc1' }],
  });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 999, harga: 2000, lineTotal: 999 * 2000 }],
    subtotal: 0, diskon: 0, ongkir: 0, total: 0, profit: 0,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: 'shop1',
  });
  assert.equal(result.ok, false);
  assert.equal(D.products[0].stock, 4, 'stok balik sama persis spt sebelum edit dipanggil (4-3+3=4)');
});

// --- 5. Delete transaksi (juga = jalur "retur", lihat processReturn) -----

test('Laporan.delete() — hapus transaksi mengembalikan stok produk biasa', async () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 15cm', stock: 2, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 }], total: 6000, profit: 3000, accountId: 'acc1', txLinkId: 'tx1' }],
    transactions: [{ id: 'tx1', type: 'income', amount: 6000 }],
  });
  const ctx = makeCtx(D);
  await ctx.Laporan.delete('shop1');
  assert.equal(D.products[0].stock, 5, '2+3=5');
  assert.equal(D.cobek.length, 0);
  assert.equal(D.transactions.length, 0);
});

// --- 6. Retur (BusinessFlowPresenter.processReturn -> Laporan.delete) ----

test('retur (processReturn) via Laporan.delete() — dipanggil oleh BusinessFlowPresenter, mengembalikan stok', async () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 15cm', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 4, harga: 2000, lineTotal: 8000 }], total: 8000, profit: 4000, accountId: 'acc1' }],
  });
  const ctx = makeCtx(D);
  const bfp = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  bfp.Laporan = ctx.Laporan;
  const out = await bfp.BusinessFlowPresenter.processReturn('shop1');
  assert.equal(D.products[0].stock, 5, '1+4=5 (retur = Laporan.delete(), 0 jalur terpisah)');
  assert.equal(D.cobek.length, 0);
});

// --- 7. Bundle rollback (base + addon alu/muntu) --------------------------

function bundleD() {
  return baseD({
    products: [
      { id: 'base1', name: 'Lumpang 20cm', stock: 5, hargaBeli: 10000, hargaJual: 20000 },
      { id: 'bundle1', name: 'Lumpang 20cm+alu', stock: 3, hargaBeli: 15000, hargaJual: 25000 },
      { id: 'alu1', name: 'Alu 20cm', stock: 6, hargaBeli: 3000, hargaJual: 6000 },
    ],
  });
}

test('recordShopSale() — jual produk bundle (+alu) ikut mengurangi base product & addon alu', () => {
  const D = bundleD();
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [{ productId: 'bundle1', name: 'Lumpang 20cm+alu', qty: 2, harga: 25000, lineTotal: 50000 }],
    subtotal: 50000, diskon: 0, ongkir: 0, total: 50000, profit: 20000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, true);
  assert.equal(D.products[1].stock, 1, 'bundle1 3-2=1');
  assert.equal(D.products[0].stock, 3, 'base1 ikut berkurang 5-2=3');
  assert.equal(D.products[2].stock, 4, 'alu1 ikut berkurang 6-2=4');
});

test('Laporan.delete() — hapus transaksi bundle mengembalikan base product & addon alu (SEBELUMNYA bug: bundle tidak ikut balik)', async () => {
  const D = bundleD();
  D.products[0].stock = 3; // base sudah terpotong
  D.products[1].stock = 1; // bundle sudah terpotong
  D.products[2].stock = 4; // addon sudah terpotong
  D.cobek = [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'bundle1', name: 'Lumpang 20cm+alu', qty: 2, harga: 25000, lineTotal: 50000 }], total: 50000, profit: 20000, accountId: 'acc1' }];
  const ctx = makeCtx(D);
  await ctx.Laporan.delete('shop1');
  assert.equal(D.products[1].stock, 3, 'bundle1 1+2=3');
  assert.equal(D.products[0].stock, 5, 'base1 ikut balik 3+2=5');
  assert.equal(D.products[2].stock, 6, 'alu1 ikut balik 4+2=6');
});

// --- 8. Rollback idempotent -----------------------------------------------

test('Laporan.delete() — dipanggil 2x pada id yang sama: idempotent, panggilan ke-2 no-op (tidak dobel restore stok / tidak crash)', async () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 15cm', stock: 2, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [{ id: 'shop1', date: '2026-07-01', items: [{ productId: 'p1', name: 'Cobek 15cm', qty: 3, harga: 2000, lineTotal: 6000 }], total: 6000, profit: 3000, accountId: 'acc1' }],
  });
  const ctx = makeCtx(D);
  await ctx.Laporan.delete('shop1');
  assert.equal(D.products[0].stock, 5);
  await ctx.Laporan.delete('shop1'); // transaksi sudah tidak ada lagi
  assert.equal(D.products[0].stock, 5, 'stok TIDAK bertambah lagi di panggilan ke-2');
});

test('rollbackShopItems() — item dgn productId tidak dikenal / qty 0 dilewati dgn aman, tidak throw', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5 }] });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => {
    ctx.rollbackShopItems([{ productId: 'ghost', qty: 3 }, { productId: 'p1', qty: 0 }, null, { qty: 2 }], 1);
  });
  assert.equal(D.products[0].stock, 5, '0 perubahan krn semua baris invalid/qty 0');
});

// --- 9. Produk tidak ditemukan ---------------------------------------------

test('recordShopSale() — productId tidak ada di D.products -> ditolak, message jelas', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5 }] });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [{ productId: 'p_ghost', name: 'Produk Hantu', qty: 1, harga: 1000, lineTotal: 1000 }],
    subtotal: 1000, diskon: 0, ongkir: 0, total: 1000, profit: 500,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /tidak ditemukan/);
  assert.equal(D.products[0].stock, 5);
});

// --- 10. Qty invalid (validasi backend) ------------------------------------

test('recordShopSale() — qty 0/negatif/NaN ditolak oleh validasi backend (bukan cuma dicegah di UI)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5 }] });
  const ctx = makeCtx(D);
  for (const badQty of [0, -1, NaN, 'abc']) {
    const result = ctx.recordShopSale({
      items: [{ productId: 'p1', name: 'Cobek 15cm', qty: badQty, harga: 1000, lineTotal: 1000 }],
      subtotal: 1000, diskon: 0, ongkir: 0, total: 1000, profit: 500,
      date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
      accountId: 'acc1', txId: 'tx1', existingShopId: null,
    });
    assert.equal(result.ok, false, `qty=${badQty} harus ditolak`);
    assert.equal(D.products[0].stock, 5, `qty=${badQty} tidak boleh mengubah stok`);
  }
});

test('recordShopSale() — baris tanpa productId ditolak seluruh transaksi (tidak di-skip diam2)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 5 }] });
  const ctx = makeCtx(D);
  const result = ctx.recordShopSale({
    items: [
      { productId: 'p1', name: 'Cobek 15cm', qty: 1, harga: 1000, lineTotal: 1000 },
      { productId: null, name: 'Baris rusak', qty: 1, harga: 1000, lineTotal: 1000 },
    ],
    subtotal: 2000, diskon: 0, ongkir: 0, total: 2000, profit: 1000,
    date: '2026-08-01', note: '', customer: {}, priceType: 'normal', delivered: true,
    accountId: 'acc1', txId: 'tx1', existingShopId: null,
  });
  assert.equal(result.ok, false);
  assert.equal(D.products[0].stock, 5);
});

// --- 11. Merge cart (samakan perilaku dgn Order.addItem) -------------------

test('addTxShopSaleCartItem() — produk sama ditambah 2x digabung jadi 1 baris (sama spt Order.addItem), bukan duplikat', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 20, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  const els = {
    txShopSaleItem: { value: 'p1' },
    txShopSaleQty: { value: '2' },
    txShopSaleHarga: { value: '2000' },
  };
  ctx.document.getElementById = (id) => els[id] || { value: '', style: {} };
  ctx.addTxShopSaleCartItem();
  els.txShopSaleQty.value = '3';
  ctx.addTxShopSaleCartItem();
  assert.equal(ctx.curTxShopSaleCart.length, 1, 'harus 1 baris, bukan 2');
  assert.equal(ctx.curTxShopSaleCart[0].qty, 5, '2+3=5');
});

test('Order.addItem() — reference behavior: produk sama digabung jadi 1 baris (dipakai sbg acuan pola merge)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 15cm', stock: 20, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  ctx.document.getElementById = () => ({ value: 'p1', style: {} });
  ctx.Order.items = [];
  ctx.Order.addItem();
  ctx.Order.addItem();
  assert.equal(ctx.Order.items.length, 1);
  assert.equal(ctx.Order.items[0].qty, 2);
});
