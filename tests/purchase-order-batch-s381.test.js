'use strict';
// tests/purchase-order-batch-s381.test.js — cakupan Sesi 381: PO
// Multi-Produk (createPurchaseOrderBatch()/receivePurchaseOrderBatch()/
// purchaseOrderBatches(), modules/shop/business-flow-presenter.js). 1 PO
// bisa berisi banyak produk sekaligus, tiap produk tetap jadi 1 record
// D.purchaseOrders TERPISAH (0 breaking change ke createPurchaseOrder()/
// receivePurchaseOrder()/riwayat lama S378-380) — cuma ditambah field
// `batchId` (BARU, additive) buat mengelompokkan. Pola cart UI 100% mirip
// _transferCartState (S243/S374, tests/inventory-transfer-chip-ui-s374.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
    },
    extra,
  );
}

function makeEl() { return { innerHTML: '' }; }

function makeCtx(D, document) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/shop/trip-presenter.js',
      'modules/shop/business-flow-presenter.js',
    ],
    {
      D,
      document,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['BusinessFlowPresenter', 'OwnershipEngine'],
  );
}

// --- createPurchaseOrderBatch() -------------------------------------------

test('createPurchaseOrderBatch() — 1 batch berisi banyak produk, tiap produk jadi record terpisah dgn batchId sama', () => {
  const D = baseD({ products: [{ id: 'pob_p1', stock: 0 }, { id: 'pob_p2', stock: 0 }, { id: 'pob_p3', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({
    items: [{ productId: 'pob_p1', qty: 10 }, { productId: 'pob_p2', qty: 5 }, { productId: 'pob_p3', qty: 2 }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.purchases.length, 3);
  assert.equal(D.purchaseOrders.length, 3);
  const batchId = result.batchId;
  assert.ok(batchId);
  D.purchaseOrders.forEach((p) => assert.equal(p.batchId, batchId));
  assert.equal(D.purchaseOrders.every((p) => p.status === 'ORDERED'), true);
});

test('createPurchaseOrderBatch() — item invalid (produk tak dikenal / qty<=0) di-skip, bukan gagalkan seluruh batch', () => {
  const D = baseD({ products: [{ id: 'pob_p4', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({
    items: [
      { productId: 'pob_p4', qty: 8 },
      { productId: 'tidak_ada', qty: 5 },
      { productId: 'pob_p4', qty: -1 },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.purchases.length, 1);
  assert.equal(D.purchaseOrders.length, 1);
  assert.equal(D.purchaseOrders[0].productId, 'pob_p4');
  assert.equal(D.purchaseOrders[0].qty, 8);
});

test('createPurchaseOrderBatch() — gagal total kalau TIDAK ADA satupun item valid', () => {
  const D = baseD({ products: [] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'tidak_ada', qty: 5 }] });
  assert.equal(result.ok, false);
  assert.equal((D.purchaseOrders || []).length, 0);
});

test('createPurchaseOrderBatch() — keranjang kosong ditolak', () => {
  const D = baseD();
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [] });
  assert.equal(result.ok, false);
});

test('createPurchaseOrderBatch() — 0 breaking change ke createPurchaseOrder() single-produk lama (S378)', () => {
  const D = baseD({ products: [{ id: 'pob_p5', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const single = ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pob_p5', qty: 3 });
  assert.equal(single.ok, true);
  assert.equal(D.purchaseOrders[0].batchId, undefined);
  const batch = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p5', qty: 7 }] });
  assert.equal(batch.ok, true);
  assert.equal(D.purchaseOrders.length, 2);
  // PO single lama tetap muncul di riwayat per-produk (renderPurchaseOrderHistory), tidak terganggu batch baru
  const histEl = makeEl();
  const ctx2 = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderHistory' ? histEl : null) });
  ctx2.BusinessFlowPresenter.renderPurchaseOrderHistory('pob_p5');
  assert.ok(histEl.innerHTML.includes('3 pcs'));
  assert.ok(histEl.innerHTML.includes('7 pcs'));
});

// --- receivePurchaseOrderBatch() ------------------------------------------

test('receivePurchaseOrderBatch() — terima SEMUA item dalam 1 batch sekaligus', () => {
  const D = baseD({ products: [{ id: 'pob_p6', stock: 0 }, { id: 'pob_p7', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const { batchId } = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({
    items: [{ productId: 'pob_p6', qty: 4 }, { productId: 'pob_p7', qty: 6 }],
  });
  const result = ctx.BusinessFlowPresenter.receivePurchaseOrderBatch(batchId);
  assert.equal(result.ok, true);
  assert.equal(D.purchaseOrders.every((p) => p.status === 'RECEIVED'), true);
  assert.ok(D.purchaseOrders.every((p) => !!p.receivedDate));
});

test('receivePurchaseOrderBatch() — idempotent, dipanggil 2x tidak menimpa ulang receivedDate', () => {
  const D = baseD({ products: [{ id: 'pob_p8', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const { batchId } = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p8', qty: 2 }] });
  ctx.BusinessFlowPresenter.receivePurchaseOrderBatch(batchId);
  const firstReceivedDate = D.purchaseOrders[0].receivedDate;
  const result2 = ctx.BusinessFlowPresenter.receivePurchaseOrderBatch(batchId);
  assert.equal(result2.ok, true);
  assert.equal(D.purchaseOrders[0].receivedDate, firstReceivedDate);
});

test('receivePurchaseOrderBatch() — batchId tak dikenal balik ok:false', () => {
  const D = baseD();
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.receivePurchaseOrderBatch('batch_tidak_ada');
  assert.equal(result.ok, false);
});

// --- purchaseOrderBatches() ------------------------------------------------

test('purchaseOrderBatches() — kelompokkan by batchId, status RECEIVED hanya kalau SEMUA item sudah diterima', () => {
  const D = baseD({ products: [{ id: 'pob_p9', stock: 0 }, { id: 'pob_p10', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const { batchId } = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({
    items: [{ productId: 'pob_p9', qty: 3 }, { productId: 'pob_p10', qty: 9 }],
  });
  let batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].status, 'ORDERED');
  assert.equal(batches[0].totalPcs, 12);
  assert.equal(batches[0].items.length, 2);
  // terima cuma 1 dari 2 produk lewat receivePurchaseOrder() langsung -> batch masih ORDERED
  ctx.BusinessFlowPresenter.receivePurchaseOrder(D.purchaseOrders[0].id);
  batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches[0].status, 'ORDERED');
  ctx.BusinessFlowPresenter.receivePurchaseOrder(D.purchaseOrders[1].id);
  batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches[0].status, 'RECEIVED');
});

test('purchaseOrderBatches() — PO lama tanpa batchId (S378) TIDAK muncul di daftar batch', () => {
  const D = baseD({ products: [{ id: 'pob_p11', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pob_p11', qty: 5 });
  const batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches.length, 0);
});

test('purchaseOrderBatches() — terbaru duluan, orphan produk (sudah dihapus dari Etalase) ditandai tanpa crash', () => {
  const D = baseD({ products: [{ id: 'pob_p12', stock: 0 }, { id: 'pob_p13', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const first = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p12', qty: 1 }] });
  first.purchases.forEach((p) => { p.createdDate = '2026-01-01T00:00:00.000Z'; });
  const second = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p13', qty: 1 }] });
  second.purchases.forEach((p) => { p.createdDate = '2026-02-01T00:00:00.000Z'; });
  // hapus produk p12 dari Etalase SETELAH batch dibuat
  D.products = D.products.filter((p) => p.id !== 'pob_p12');
  const batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches.length, 2);
  assert.equal(batches[0].batchId, second.batchId); // terbaru duluan
  const orphanBatch = batches.find((b) => b.batchId === first.batchId);
  assert.equal(orphanBatch.items[0].orphan, true);
  assert.equal(orphanBatch.items[0].name, 'pob_p12'); // fallback nama = productId
});

// --- Cart UI: openPurchaseOrderBatchModal()/tapPurchaseOrderBatchChip()/... -

test('openPurchaseOrderBatchModal() — reset keranjang & render chip produk', () => {
  const chipsEl = makeEl();
  const cartListEl = makeEl();
  const cartSumEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p14', stock: 0, name: 'Batu Alam' }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'pobProductList') return chipsEl;
      if (id === 'pobCartList') return cartListEl;
      if (id === 'pobCartSummary') return cartSumEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [{ productId: 'sisa_lama', qty: 9 }];
  ctx.BusinessFlowPresenter.openPurchaseOrderBatchModal();
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 0);
  assert.ok(chipsEl.innerHTML.includes('Batu Alam'));
  assert.ok(cartListEl.innerHTML.includes('Belum ada produk'));
});

test('tapPurchaseOrderBatchChip() — ketuk chip += qty ke cart, TIDAK dibatasi stok (beda dari Transfer)', () => {
  const chipsEl = makeEl();
  const cartListEl = makeEl();
  const cartSumEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p15', stock: 0, name: 'Cobek Kecil' }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'pobProductList') return chipsEl;
      if (id === 'pobCartList') return cartListEl;
      if (id === 'pobCartSummary') return cartSumEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter.tapPurchaseOrderBatchChip('pob_p15');
  ctx.BusinessFlowPresenter.tapPurchaseOrderBatchChip('pob_p15');
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState[0].qty, 2);
  assert.ok(cartListEl.innerHTML.includes('Cobek Kecil × 2'));
  assert.ok(cartSumEl.innerHTML.includes('Total Produk: 1'));
  assert.ok(cartSumEl.innerHTML.includes('Total PCS: 2'));
});

test('removePurchaseOrderBatchCartItem() — hapus 1 baris dari keranjang sementara', () => {
  const chipsEl = makeEl();
  const cartListEl = makeEl();
  const cartSumEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p16', stock: 0, name: 'A' }, { id: 'pob_p17', stock: 0, name: 'B' }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'pobProductList') return chipsEl;
      if (id === 'pobCartList') return cartListEl;
      if (id === 'pobCartSummary') return cartSumEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter.tapPurchaseOrderBatchChip('pob_p16');
  ctx.BusinessFlowPresenter.tapPurchaseOrderBatchChip('pob_p17');
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 2);
  ctx.BusinessFlowPresenter.removePurchaseOrderBatchCartItem(0);
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 1);
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState[0].productId, 'pob_p17');
});

// --- _purchaseOrderBatchCartEstimatedCost()/estimasi biaya di cart summary (S382) ---

test('_purchaseOrderBatchCartEstimatedCost() — reuse PurchaseEngine.estimatedCost(), total = qty x hargaBeli tiap produk', () => {
  const D = baseD({
    products: [
      { id: 'pob_p20', stock: 0, name: 'E', hargaBeli: 1000 },
      { id: 'pob_p21', stock: 0, name: 'F', hargaBeli: 2500 },
    ],
  });
  const ctx = makeCtx(D, { getElementById: () => null });
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [
    { productId: 'pob_p20', qty: 3 },
    { productId: 'pob_p21', qty: 2 },
  ];
  const est = ctx.BusinessFlowPresenter._purchaseOrderBatchCartEstimatedCost();
  assert.equal(est, 3 * 1000 + 2 * 2500);
});

test('_purchaseOrderBatchCartEstimatedCost() — keranjang kosong = 0, produk tanpa hargaBeli dianggap 0 (tidak error)', () => {
  const D = baseD({ products: [{ id: 'pob_p22', stock: 0, name: 'G' }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartEstimatedCost(), 0);
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [{ productId: 'pob_p22', qty: 5 }];
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartEstimatedCost(), 0);
});

test('_renderPurchaseOrderBatchCart() — ringkasan #pobCartSummary menampilkan Estimasi Biaya kalau > 0', () => {
  const chipsEl = makeEl();
  const cartListEl = makeEl();
  const cartSumEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p23', stock: 0, name: 'H', hargaBeli: 4000 }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'pobProductList') return chipsEl;
      if (id === 'pobCartList') return cartListEl;
      if (id === 'pobCartSummary') return cartSumEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter.tapPurchaseOrderBatchChip('pob_p23');
  assert.match(cartSumEl.innerHTML, /Estimasi Biaya/);
  assert.match(cartSumEl.innerHTML, /4000/);
});

// --- restockCandidatesForBatch()/fillPurchaseOrderBatchCartFromRestock() (S382 lanjutan) ---

test('restockCandidatesForBatch() — [] kalau InventoryEngine tidak dimuat', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  assert.equal(ctx.BusinessFlowPresenter.restockCandidatesForBatch().length, 0);
});

test('restockCandidatesForBatch() — balikin SEMUA produk yang perlu direstock (bukan cuma 1 paling urgent)', () => {
  const D = baseD({
    products: [
      { id: 'pob_r1', name: 'Menipis A', stock: 1, hargaBeli: 1000, hargaJual: 1500 },
      { id: 'pob_r2', name: 'Menipis B', stock: 1, hargaBeli: 2000, hargaJual: 3000 },
      { id: 'pob_r3', name: 'Aman', stock: 100, hargaBeli: 500, hargaJual: 800 },
    ],
  });
  const ctx = makeCtx(D, { getElementById: () => null });
  const candidates = ctx.BusinessFlowPresenter.restockCandidatesForBatch();
  const ids = candidates.map((c) => c.productId);
  assert.ok(ids.includes('pob_r1'));
  assert.ok(ids.includes('pob_r2'));
  assert.ok(!ids.includes('pob_r3'));
});

test('fillPurchaseOrderBatchCartFromRestock() — isi keranjang sekaligus dari semua kandidat restock', () => {
  const chipsEl = makeEl();
  const cartListEl = makeEl();
  const cartSumEl = makeEl();
  const D = baseD({
    products: [
      { id: 'pob_r4', name: 'Menipis C', stock: 1, hargaBeli: 1000, hargaJual: 1500 },
      { id: 'pob_r5', name: 'Menipis D', stock: 1, hargaBeli: 2000, hargaJual: 3000 },
    ],
  });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'pobProductList') return chipsEl;
      if (id === 'pobCartList') return cartListEl;
      if (id === 'pobCartSummary') return cartSumEl;
      return null;
    },
  });
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 0);
  ctx.BusinessFlowPresenter.fillPurchaseOrderBatchCartFromRestock();
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 2);
});

test('fillPurchaseOrderBatchCartFromRestock() — produk yang sudah ada di keranjang ditambah qty-nya, bukan ditimpa', () => {
  const D = baseD({ products: [{ id: 'pob_r6', name: 'Menipis E', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [{ productId: 'pob_r6', qty: 3 }];
  const before = ctx.BusinessFlowPresenter.restockCandidatesForBatch()[0].qty;
  ctx.BusinessFlowPresenter.fillPurchaseOrderBatchCartFromRestock();
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 1);
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState[0].qty, 3 + before);
});

test('fillPurchaseOrderBatchCartFromRestock() — tidak throw & tidak mengubah cart kalau tidak ada kandidat', () => {
  const D = baseD({ products: [{ id: 'pob_r7', name: 'Aman', stock: 100, hargaBeli: 500, hargaJual: 800 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.fillPurchaseOrderBatchCartFromRestock());
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 0);
});

test('savePurchaseOrderBatchFromModal() — delegasi ke createPurchaseOrderBatch(), reset cart & tutup modal setelah sukses', () => {
  let closedModal = null;
  const D = baseD({ products: [{ id: 'pob_p18', stock: 0, name: 'C' }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  ctx.closeModal = (id) => { closedModal = id; };
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [{ productId: 'pob_p18', qty: 6 }];
  ctx.BusinessFlowPresenter.savePurchaseOrderBatchFromModal();
  assert.equal(D.purchaseOrders.length, 1);
  assert.equal(D.purchaseOrders[0].qty, 6);
  assert.equal(ctx.BusinessFlowPresenter._purchaseOrderBatchCartState.length, 0);
  assert.equal(closedModal, 'purchaseOrderBatchModal');
});

// --- renderPurchaseOrderBatchList()/receivePurchaseOrderBatchFromUI() -----

test('renderPurchaseOrderBatchList() — render daftar batch dgn tombol Terima Semua utk yg masih ORDERED', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p19', stock: 0, name: 'D' }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'businessFlowPurchaseOrderBatchList' ? listEl : null) });
  ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p19', qty: 5 }] });
  ctx.BusinessFlowPresenter.renderPurchaseOrderBatchList();
  assert.ok(listEl.innerHTML.includes('D × 5'));
  assert.ok(listEl.innerHTML.includes('Terima Semua'));
  assert.ok(listEl.innerHTML.includes('belum diterima'));
});

test('receivePurchaseOrderBatchFromUI() — terima semua & re-render list jadi status Diterima', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p20', stock: 0, name: 'E' }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'businessFlowPurchaseOrderBatchList' ? listEl : null) });
  const { batchId } = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p20', qty: 5 }] });
  ctx.BusinessFlowPresenter.receivePurchaseOrderBatchFromUI(batchId);
  assert.equal(D.purchaseOrders[0].status, 'RECEIVED');
  assert.ok(listEl.innerHTML.includes('Diterima'));
  assert.ok(!listEl.innerHTML.includes('Terima Semua'));
});

// --- Supplier per batch (S383 lanjutan) -------------------------------

test('createPurchaseOrderBatch() — supplier opsional tersimpan di tiap record & di-trim', () => {
  const D = baseD({ products: [{ id: 'pob_p21', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({
    items: [{ productId: 'pob_p21', qty: 3 }],
    supplier: '  UD Batu Alam  ',
  });
  assert.equal(result.supplier, 'UD Batu Alam');
  assert.equal(D.purchaseOrders[0].supplier, 'UD Batu Alam');
});

test('createPurchaseOrderBatch() — tanpa supplier tetap sukses, field default string kosong', () => {
  const D = baseD({ products: [{ id: 'pob_p22', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  const result = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p22', qty: 1 }] });
  assert.equal(result.ok, true);
  assert.equal(result.supplier, '');
  assert.equal(D.purchaseOrders[0].supplier, '');
});

test('purchaseOrderBatches() — supplier ikut muncul di ringkasan batch', () => {
  const D = baseD({ products: [{ id: 'pob_p23', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: () => null });
  ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p23', qty: 2 }], supplier: 'CV Sumber Jaya' });
  const batches = ctx.BusinessFlowPresenter.purchaseOrderBatches();
  assert.equal(batches[0].supplier, 'CV Sumber Jaya');
});

test('savePurchaseOrderBatchFromModal() — baca #pobSupplier dari DOM & teruskan ke createPurchaseOrderBatch()', () => {
  const supplierInput = { value: 'Toko Makmur' };
  const D = baseD({ products: [{ id: 'pob_p24', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'pobSupplier' ? supplierInput : null) });
  ctx.BusinessFlowPresenter._purchaseOrderBatchCartState = [{ productId: 'pob_p24', qty: 4 }];
  ctx.BusinessFlowPresenter.savePurchaseOrderBatchFromModal();
  assert.equal(D.purchaseOrders[0].supplier, 'Toko Makmur');
  assert.equal(supplierInput.value, ''); // form direset setelah sukses simpan
});

test('renderPurchaseOrderBatchList() — tampilkan nama supplier kalau diisi', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p25', stock: 0, name: 'F' }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'businessFlowPurchaseOrderBatchList' ? listEl : null) });
  ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p25', qty: 1 }], supplier: 'PT Sumber Rejeki' });
  ctx.BusinessFlowPresenter.renderPurchaseOrderBatchList();
  assert.ok(listEl.innerHTML.includes('PT Sumber Rejeki'));
});

// --- Riwayat/archive batch PO (S383 lanjutan) --------------------------

test('renderPurchaseOrderBatchList() — pisah label Aktif/Riwayat hanya kalau kedua kelompok ada isinya', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p26', stock: 0, name: 'G' }, { id: 'pob_p27', stock: 0, name: 'H' }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'businessFlowPurchaseOrderBatchList' ? listEl : null) });
  const b1 = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p26', qty: 1 }] });
  ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p27', qty: 1 }] });
  ctx.BusinessFlowPresenter.renderPurchaseOrderBatchList();
  // masih 2 batch aktif, belum ada riwayat -> tidak ada label section
  assert.ok(!listEl.innerHTML.includes('Aktif'));
  assert.ok(!listEl.innerHTML.includes('Riwayat'));
  // terima 1 batch -> sekarang ada aktif & riwayat sekaligus -> label muncul
  ctx.BusinessFlowPresenter.receivePurchaseOrderBatchFromUI(b1.batchId);
  assert.ok(listEl.innerHTML.includes('🧾 Aktif'));
  assert.ok(listEl.innerHTML.includes('📋 Riwayat'));
});

test('renderPurchaseOrderBatchList() — batch riwayat (RECEIVED) tetap tampil tanpa tombol Terima Semua', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'pob_p28', stock: 0, name: 'I' }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'businessFlowPurchaseOrderBatchList' ? listEl : null) });
  const { batchId } = ctx.BusinessFlowPresenter.createPurchaseOrderBatch({ items: [{ productId: 'pob_p28', qty: 6 }] });
  ctx.BusinessFlowPresenter.receivePurchaseOrderBatchFromUI(batchId);
  assert.ok(listEl.innerHTML.includes('I × 6'));
  assert.ok(listEl.innerHTML.includes('✅ Diterima'));
  assert.ok(!listEl.innerHTML.includes('Terima Semua'));
});
