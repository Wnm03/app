'use strict';
// tests/inventory-transfer-chip-ui-s374.test.js — cakupan Sesi 374: fix
// #inventoryTransferModal yang sebelumnya SELALU nunjuk "Belum ada produk
// ditambahkan" krn markup HTML (#itProductList kosong) dan JS lama
// (openTransferModal()/addTransferCartItem() nunggu elemen #itProduct
// select + #itQty input yang TIDAK ADA di modal) beda kontrak. Fix: ganti
// ke pola chip tap-to-add — renderTransferProductChips()/tapTransferChip().
// Test ini KHUSUS nutup lapisan UI baru (chip render + tap), TIDAK
// mengulang assert stok/lokasi/backend yang sudah dites lengkap di
// tests/inventory-transfer-s243.test.js & tests/inventory-transfer-s265-hardening.test.js
// (chip di sini 100% reuse _availableAtSource()/_sanitizeQty() yang sama,
// 0 rumus stok baru).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
      inventoryTransfers: [],
    },
    extra,
  );
}

function cobekProducts() {
  return [
    { id: 'p20', name: 'Cobek 20', stock: 20, beratPerUnit: 3, hargaBeli: 10000, hargaJual: 20000 },
    { id: 'p24', name: 'Cobek 24', stock: 15, beratPerUnit: 4, hargaBeli: 15000, hargaJual: 30000 },
    { id: 'pHabis', name: 'Munthu Kecil', stock: 0, beratPerUnit: 0.5, hargaBeli: 5000, hargaJual: 10000 },
  ];
}

// fakeDom() — DOM stub minimal: getElementById mengembalikan elemen yang
// bisa dibaca/ditulis (innerHTML, value), dan onchange #itFrom bisa
// disimulasikan dengan langsung mengubah el.value lalu panggil handler.
function fakeDom(overrides) {
  const els = Object.assign(
    {
      itProductList: { innerHTML: '' },
      itCartList: { innerHTML: '' },
      itCartSummary: { innerHTML: '' },
      itFrom: { value: 'MAGELANG_STORAGE' },
      itTo: { value: 'PEKALONGAN_STORAGE' },
    },
    overrides,
  );
  return {
    getElementById: (id) => els[id] || null,
    _els: els,
  };
}

function makeCtx(D, document) {
  return loadSource(
    ['modules/shop/cobek-etalase.js', 'modules/shop/trip-engine.js', 'modules/shop/business-flow-presenter.js'],
    {
      D,
      document,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['BusinessFlowPresenter', 'TripEngine'],
  );
}

// --- renderTransferProductChips() ------------------------------------

test('renderTransferProductChips() — hanya render produk yang stoknya > 0 di lokasi asal', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.renderTransferProductChips();
  const html = document._els.itProductList.innerHTML;
  assert.ok(html.includes('Cobek 20'));
  assert.ok(html.includes('Cobek 24'));
  assert.ok(!html.includes('Munthu Kecil'), 'produk stok 0 tidak boleh muncul sbg chip');
});

test('renderTransferProductChips() — chip menampilkan sisa stok & berat/unit', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.renderTransferProductChips();
  const html = document._els.itProductList.innerHTML;
  assert.ok(html.includes('sisa 20'));
  assert.ok(html.includes('3kg/pcs'));
});

test('renderTransferProductChips() — kalau tidak ada produk berstok, tampilkan pesan kosong (bukan blank)', () => {
  const D = baseD({ products: [{ id: 'z', name: 'Zonk', stock: 0 }] });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.renderTransferProductChips();
  assert.ok(document._els.itProductList.innerHTML.includes('Tidak ada produk dengan stok'));
});

// --- tapTransferChip() — multi-select & increment ----------------------

test('tapTransferChip() — tap chip pertama kali menambah produk ke cart dgn qty 1', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  assert.equal(JSON.stringify(ctx.BusinessFlowPresenter._transferCartState), JSON.stringify([{ productId: 'p20', qty: 1 }]));
  assert.ok(document._els.itCartList.innerHTML.includes('Cobek 20'));
});

test('tapTransferChip() — tap chip yang sama berulang kali menambah qty (+1 tiap tap)', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  assert.equal(JSON.stringify(ctx.BusinessFlowPresenter._transferCartState), JSON.stringify([{ productId: 'p20', qty: 3 }]));
});

test('tapTransferChip() — multi-select: tap beberapa produk BERBEDA semuanya masuk cart', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  ctx.BusinessFlowPresenter.tapTransferChip('p24');
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  const cart = ctx.BusinessFlowPresenter._transferCartState;
  assert.equal(cart.length, 2);
  assert.equal(cart.find((it) => it.productId === 'p20').qty, 2);
  assert.equal(cart.find((it) => it.productId === 'p24').qty, 1);
  const summary = document._els.itCartSummary.innerHTML;
  assert.ok(summary.includes('Total PCS'));
  assert.ok(!summary.includes('Belum ada produk ditambahkan'));
});

test('tapTransferChip() — tap melebihi sisa stok di lokasi asal ditolak (toast), qty TIDAK bertambah', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk Tipis', stock: 2, beratPerUnit: 1 }] });
  const document = fakeDom();
  let toastMsg = null;
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js', 'modules/shop/trip-engine.js', 'modules/shop/business-flow-presenter.js'],
    {
      D,
      document,
      toast: (msg) => { toastMsg = msg; },
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['BusinessFlowPresenter', 'TripEngine'],
  );
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p1');
  ctx.BusinessFlowPresenter.tapTransferChip('p1');
  ctx.BusinessFlowPresenter.tapTransferChip('p1'); // stok cuma 2, tap ke-3 harus ditolak
  const cart = ctx.BusinessFlowPresenter._transferCartState;
  assert.equal(cart.find((it) => it.productId === 'p1').qty, 2);
  assert.ok(toastMsg && /stok/i.test(toastMsg));
});

test('tapTransferChip() — sisa stok di chip berkurang mengikuti qty yang sudah masuk cart', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  assert.ok(document._els.itProductList.innerHTML.includes('sisa 18'));
  assert.ok(document._els.itProductList.innerHTML.includes('(2x)'));
});

// --- openTransferModal() / onTransferOriginChange() ---------------------

test('openTransferModal() — reset cart & render chip awal, tidak throw walau tanpa openModal global', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [{ productId: 'p20', qty: 5 }]; // sisa dari sesi sebelumnya
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.openTransferModal());
  assert.equal(ctx.BusinessFlowPresenter._transferCartState.length, 0);
  assert.ok(document._els.itProductList.innerHTML.includes('Cobek 20'));
});

test('onTransferOriginChange() — ganti Origin mengosongkan cart & render ulang chip sesuai stok Origin baru', () => {
  const D = baseD({
    products: [
      { id: 'pA', name: 'Produk A', stock: 5, beratPerUnit: 1 },
    ],
    inventoryTransfers: [
      // pA sudah ada 5 unit yang berangkat dari PEKALONGAN_STORAGE
      // sebelumnya -> stok tersisa di PEKALONGAN_STORAGE = 0.
      { id: 't-old', from: 'PEKALONGAN_STORAGE', to: 'MAGELANG_STORAGE', status: 'RECEIVED', items: [{ productId: 'pA', qty: 5 }] },
    ],
  });
  const document = fakeDom({ itFrom: { value: 'MAGELANG_STORAGE' } });
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [{ productId: 'pA', qty: 2 }];
  document._els.itFrom.value = 'PEKALONGAN_STORAGE'; // simulasi user ganti Origin
  ctx.BusinessFlowPresenter.onTransferOriginChange();
  assert.equal(ctx.BusinessFlowPresenter._transferCartState.length, 0);
  assert.ok(document._els.itProductList.innerHTML.includes('Tidak ada produk dengan stok'));
});

// --- saveTransferFromModal() — end-to-end lewat chip cart ---------------

test('saveTransferFromModal() — cart hasil tap chip berhasil disimpan lewat createInventoryTransfer() (0 logic baru)', () => {
  const D = baseD({ products: cobekProducts() });
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.BusinessFlowPresenter._transferCartState = [];
  ctx.BusinessFlowPresenter.tapTransferChip('p20');
  ctx.BusinessFlowPresenter.tapTransferChip('p24');
  ctx.BusinessFlowPresenter.saveTransferFromModal();
  assert.equal(D.inventoryTransfers.length, 1);
  const t = D.inventoryTransfers[0];
  assert.equal(t.from, 'MAGELANG_STORAGE');
  assert.equal(t.to, 'PEKALONGAN_STORAGE');
  assert.equal(t.items.length, 2);
  assert.equal(ctx.BusinessFlowPresenter._transferCartState.length, 0);
});
