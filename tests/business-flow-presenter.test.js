'use strict';
// tests/business-flow-presenter.test.js — cakupan Sesi 205: Business Flow
// Presenter (modules/shop/business-flow-presenter.js). WIRE ONLY — 100%
// reuse ShopBusinessEnginePresenter.summary() (S199) +
// TripPresenter.summary() (S204-A), TIDAK ada rumus/engine baru. Pola
// loadSource sama persis tests/shop-business-engine-integration.test.js +
// tests/trip-presenter.test.js — flow() murni (tidak sentuh DOM),
// render()/renderTab() hanya dites lewat guard "container tidak ada ->
// aman diam2" (permissive document stub).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {},
    },
    extra,
  );
}

function makeCtx(D) {
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
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['BusinessFlowPresenter', 'ShopBusinessEnginePresenter', 'TripPresenter', 'InventoryEngine', 'OwnershipEngine', 'isCobekOwnershipSelf'],
  );
}

// --- flow() — kalau presenter sumber tidak dimuat -------------------------

test('flow() — kalau ShopBusinessEnginePresenter/TripPresenter tidak dimuat, tetap balikin shape aman (ok:false), tidak throw', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  const f = ctx.BusinessFlowPresenter.flow();
  assert.equal(f.purchase.ok, false);
  assert.equal(f.trip.ok, false);
  assert.equal(f.stock.ok, false);
  assert.equal(f.sale.ok, false);
});

// --- flow() — wiring 4 tahap dari summary() yang sudah ada ----------------

test('flow() — purchase/stock/sale 100% sama dgn ShopBusinessEnginePresenter.summary() (0 recompute)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }],
  });
  const ctx = makeCtx(D);
  const f = ctx.BusinessFlowPresenter.flow();
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.deepEqual(f.purchase, s.purchase);
  assert.deepEqual(f.stock, s.inventory);
  assert.deepEqual(f.sale, s.profit);
});

test('flow() — trip 100% sama dgn TripPresenter.summary() (0 recompute)', () => {
  const D = baseD({
    cobek: [{ id: 't1', delivered: true, ongkir: 10000, marginPct: 20, date: new Date().toISOString(), total: 50000 }],
  });
  const ctx = makeCtx(D);
  const f = ctx.BusinessFlowPresenter.flow();
  const t = ctx.TripPresenter.summary();
  assert.deepEqual(f.trip, t);
  assert.equal(f.trip.trips, 1);
});

// --- render()/renderTab() — aman tanpa container / tanpa throw ------------

test('render() — container tidak ada -> aman diam2 (tidak throw)', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    {
      D: baseD(),
      document: { getElementById: () => null },
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
    },
    ['BusinessFlowPresenter'],
  );
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.render());
});

test('renderTab() — kalau container ada (stub permisif), tidak throw & innerHTML terisi 4 baris tahap', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }],
    cobek: [{ id: 't1', delivered: true, ongkir: 10000, marginPct: 20, date: new Date().toISOString(), total: 50000 }],
  });
  const fakeEl = { innerHTML: '' };
  const ctx = loadSource(
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
      document: { getElementById: (id) => (id === 'businessFlowBody' ? fakeEl : null) },
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['BusinessFlowPresenter'],
  );
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderTab());
  assert.ok(fakeEl.innerHTML.includes('Purchase'));
  assert.ok(fakeEl.innerHTML.includes('Trip'));
  assert.ok(fakeEl.innerHTML.includes('Stock'));
  assert.ok(fakeEl.innerHTML.includes('Sale'));
});

// --- S206 (Wire Purchase -> Trip): restockTripCandidate()/planTripForRestock() ---

test('restockTripCandidate() — null kalau InventoryEngine tidak dimuat', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  assert.equal(ctx.BusinessFlowPresenter.restockTripCandidate(), null);
});

test('restockTripCandidate() — null kalau tidak ada produk yang perlu direstock', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.restockTripCandidate(), null);
});

test('restockTripCandidate() — balikin productId/qty PERSIS dari InventoryEngine.restockScan() item paling urgent (0 recompute)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk Menipis', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const candidate = ctx.BusinessFlowPresenter.restockTripCandidate();
  const scan = ctx.InventoryEngine.restockScan();
  assert.ok(candidate);
  assert.equal(candidate.productId, scan.items[0].product.id);
  assert.equal(candidate.qty, scan.items[0].restockQty);
  assert.equal(candidate.productId, 'p1');
});

test('planTripForRestock() — tidak throw & TIDAK memanggil DeliveryPlanUI.open() kalau tidak ada kandidat restock', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  let called = false;
  ctx.DeliveryPlanUI = { open: () => { called = true; } };
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.planTripForRestock());
  assert.equal(called, false);
});

test('planTripForRestock() — memanggil DeliveryPlanUI.open(candidate) PERSIS dgn productId/qty dari restockTripCandidate()', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk Menipis', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  let received = null;
  ctx.DeliveryPlanUI = { open: (arg) => { received = arg; } };
  ctx.BusinessFlowPresenter.planTripForRestock();
  assert.ok(received);
  assert.equal(received.productId, 'p1');
  assert.equal(received.qty, ctx.BusinessFlowPresenter.restockTripCandidate().qty);
});

// --- S206: DeliveryPlanUI.open(prefill) — backward compatible ------------

test('DeliveryPlanUI.open() — tanpa argumen, perilaku SAMA PERSIS sebelumnya (tidak throw)', () => {
  const D = { products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5 }], cobekKategori: [], bbmLogs: [], produsen: [], accounts: [], profile: {}, vehicles: [], cobek: [], transactions: [], piutang: [] };
  const ctx = loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
      'modules/shop/cobek-order.js',
      'modules/shop/trip-engine.js',
      'modules/shop/delivery-plan-ui.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      openModal: () => {},
      closeModal: () => {},
    },
    ['DeliveryPlanUI'],
  );
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.open());
});

// --- S207-208 (Wire Trip->Goods Receipt->Stock->Dashboard sync) ----------

test('receiveGoods() — false kalau candidate/productId kosong atau produk tidak ditemukan', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.receiveGoods(null).ok, false);
  assert.equal(ctx.BusinessFlowPresenter.receiveGoods({}).ok, false);
  assert.equal(ctx.BusinessFlowPresenter.receiveGoods({ productId: 'ghost', qty: 5 }).ok, false);
});

test('receiveGoods() — nambah stok produk PERSIS sejumlah qty (0 rumus baru, sama formula StockRekoWidget.applyAll)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 3, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const result = ctx.BusinessFlowPresenter.receiveGoods({ productId: 'p1', qty: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.newStock, 8);
  assert.equal(D.products[0].stock, 8);
});

test('completeTrip() — false kalau tidak ada kandidat restock (tidak throw, stok tidak berubah)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const result = ctx.BusinessFlowPresenter.completeTrip();
  assert.equal(result.ok, false);
  assert.equal(D.products[0].stock, 10);
});

test('completeTrip() — pakai restockTripCandidate() kalau tidak dikasih argumen, stok naik sesuai restockQty', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk Menipis', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const candidate = ctx.BusinessFlowPresenter.restockTripCandidate();
  const result = ctx.BusinessFlowPresenter.completeTrip();
  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 1 + candidate.qty);
});

test('completeTrip() — dgn candidate eksplisit, dipakai APA ADANYA (0 recompute)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 2, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const result = ctx.BusinessFlowPresenter.completeTrip({ productId: 'p1', qty: 7, productName: 'Produk A' });
  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 9);
});

test('purchaseStatus() — "pending" kalau ada kandidat restock, "clear" kalau tidak ada', () => {
  const D1 = baseD({ products: [{ id: 'p1', name: 'Produk Menipis', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx1 = makeCtx(D1);
  assert.equal(ctx1.BusinessFlowPresenter.purchaseStatus().status, 'pending');

  const D2 = baseD({ products: [{ id: 'p1', name: 'Produk Aman', stock: 10, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx2 = makeCtx(D2);
  assert.equal(ctx2.BusinessFlowPresenter.purchaseStatus().status, 'clear');
});

// --- S209-210 (Wire Delivery->Payment->Finance->Return->Refund) ----------

function baseD2(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
    },
    extra,
  );
}

test('orderStatus() — ok:false kalau D.cobek tidak ada / order tidak ditemukan', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD2(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  assert.equal(ctx.BusinessFlowPresenter.orderStatus('ghost').ok, false);
});

test('orderStatus() — paid:true kalau tidak ada piutang terhubung (lunas dari awal)', () => {
  const D = baseD2({ cobek: [{ id: 't1', delivered: true, piutangLinkId: null }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.orderStatus('t1');
  assert.equal(s.ok, true);
  assert.equal(s.delivered, true);
  assert.equal(s.paid, true);
});

test('orderStatus() — paid:false kalau piutang terhubung belum lunas', () => {
  const D = baseD2({
    cobek: [{ id: 't1', delivered: false, piutangLinkId: 'pi1' }],
    piutang: [{ id: 'pi1', name: 'Pembeli', nilai: 5000, lunas: false }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.orderStatus('t1');
  assert.equal(s.delivered, false);
  assert.equal(s.paid, false);
});

test('markPaymentReceived() — false kalau order tidak punya piutang terhubung', () => {
  const D = baseD2({ cobek: [{ id: 't1', delivered: true, piutangLinkId: null }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.markPaymentReceived('t1').ok, false);
});

test('markPaymentReceived() — set piutang.lunas=true PERSIS (0 nilai lain berubah)', () => {
  const D = baseD2({
    cobek: [{ id: 't1', delivered: true, piutangLinkId: 'pi1' }],
    piutang: [{ id: 'pi1', name: 'Pembeli', nilai: 5000, lunas: false }],
  });
  const ctx = makeCtx(D);
  const result = ctx.BusinessFlowPresenter.markPaymentReceived('t1');
  assert.equal(result.ok, true);
  assert.equal(D.piutang[0].lunas, true);
  assert.equal(D.piutang[0].nilai, 5000);
});

test('processReturn() — null kalau Laporan tidak dimuat, delegasi PERSIS ke Laporan.delete() kalau ada', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD2(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  assert.equal(ctx.BusinessFlowPresenter.processReturn('t1'), null);

  let received = null;
  ctx.Laporan = { delete: (id) => { received = id; return 'delegated'; } };
  assert.equal(ctx.BusinessFlowPresenter.processReturn('t1'), 'delegated');
  assert.equal(received, 't1');
});

// --- S211-212 (Profit per Trip / Cost Allocation / Business KPI / AI Rec) ---

test('profitPerTrip() — daftar 1 baris per D.cobek (ownership SELF), cost = omzet-profit (0 rumus baru)', () => {
  const D = baseD({
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, marginPct: 30, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  const rows = ctx.BusinessFlowPresenter.profitPerTrip();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].omzet, 100000);
  assert.equal(rows[0].profit, 30000);
  assert.equal(rows[0].cost, 70000);
  assert.equal(rows[0].marginPct, 30);
});

test('costAllocation() — ok:false kalau trip tidak ditemukan; kalau ada, ongkirCost+modalCost = totalCost', () => {
  const D = baseD({
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.costAllocation('ghost').ok, false);
  const alloc = ctx.BusinessFlowPresenter.costAllocation('t1');
  assert.equal(alloc.ok, true);
  assert.equal(alloc.ongkirCost, 5000);
  assert.equal(alloc.modalCost + alloc.ongkirCost, alloc.totalCost);
  assert.equal(alloc.totalCost, 70000);
});

test('businessKPI() — repackaging murni dari flow()/purchaseStatus(), 0 recompute', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }],
    cobek: [{ id: 't1', delivered: true, ongkir: 10000, marginPct: 20, date: new Date().toISOString(), total: 50000, profit: 10000 }],
  });
  const ctx = makeCtx(D);
  const kpi = ctx.BusinessFlowPresenter.businessKPI();
  const f = ctx.BusinessFlowPresenter.flow();
  assert.equal(kpi.omzetBulanIni, f.sale.omzet);
  assert.equal(kpi.tripBulanIni, f.trip.trips);
  assert.equal(kpi.purchaseStatus, ctx.BusinessFlowPresenter.purchaseStatus().status);
});

test('recommendation() — "bkpi-restock" muncul kalau purchaseStatus pending', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk Menipis', stock: 1, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const recs = ctx.BusinessFlowPresenter.recommendation();
  assert.ok(recs.some((r) => r.id === 'bkpi-restock'));
});

test('recommendation() — array kosong kalau tidak ada sinyal (data kosong)', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.recommendation().length, 0);
});

// --- S213-214 (Audit: sync gaps fixed) ------------------------------------

test('markPaymentReceived() — juga memanggil renderKekayaanBersih/hitungZakatMaal/Piutang.renderList (audit fix S213-214)', () => {
  const D = baseD2({
    cobek: [{ id: 't1', delivered: true, piutangLinkId: 'pi1' }],
    piutang: [{ id: 'pi1', name: 'Pembeli', nilai: 5000, lunas: false }],
  });
  const ctx = makeCtx(D);
  let kekayaanCalled = false, zakatCalled = false, piutangListCalled = false;
  ctx.renderKekayaanBersih = () => { kekayaanCalled = true; };
  ctx.hitungZakatMaal = () => { zakatCalled = true; };
  ctx.Piutang = { renderList: () => { piutangListCalled = true; } };
  ctx.BusinessFlowPresenter.markPaymentReceived('t1');
  assert.equal(kekayaanCalled, true);
  assert.equal(zakatCalled, true);
  assert.equal(piutangListCalled, true);
});

test('receiveGoods() — juga memanggil ShopInsight.render() (audit fix S213-214)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Produk A', stock: 3, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  let shopInsightCalled = false;
  ctx.ShopInsight = { render: () => { shopInsightCalled = true; } };
  ctx.BusinessFlowPresenter.receiveGoods({ productId: 'p1', qty: 5 });
  assert.equal(shopInsightCalled, true);
});

test('DeliveryPlanUI.open(prefill) — tidak throw dgn productId/qty (stub DOM permisif)', () => {
  const D = { products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5 }], cobekKategori: [], bbmLogs: [], produsen: [], accounts: [], profile: {}, vehicles: [], cobek: [], transactions: [], piutang: [] };
  const ctx = loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
      'modules/shop/cobek-order.js',
      'modules/shop/trip-engine.js',
      'modules/shop/delivery-plan-ui.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      openModal: () => {},
      closeModal: () => {},
    },
    ['DeliveryPlanUI'],
  );
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.open({ productId: 'p1', qty: 5 }));
});

// --- S215-216 (Cost Analysis / Pricing Analysis) ---------------------------

test('costPerKg() — ok:false kalau items/berat tidak ada; kalau ada, totalCost/totalKg konsisten', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, beratPerUnit: 2 }],
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, date: new Date().toISOString(), items: [{ productId: 'p1', qty: 5, name: 'Cobek 20cm' }] }],
  });
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js', 'modules/shop/trip-engine.js', 'modules/shop/business-flow-presenter.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0) },
    ['BusinessFlowPresenter', 'TripEngine'],
  );
  assert.equal(ctx.BusinessFlowPresenter.costPerKg('ghost').ok, false);
  const r = ctx.BusinessFlowPresenter.costPerKg('t1');
  assert.equal(r.ok, true);
  assert.equal(r.totalKg, 10);
  assert.equal(r.costPerKg, r.totalCost / 10);
});

test('costPerProduct() — 1 baris per item, modalCost = hargaBeli x qty (0 rumus baru)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000 }],
    cobek: [{ id: 't1', total: 20000, profit: 5000, ongkir: 1000, date: new Date().toISOString(), items: [{ productId: 'p1', qty: 3, name: 'Cobek 20cm' }] }],
  });
  const ctx = makeCtx(D);
  const rows = ctx.BusinessFlowPresenter.costPerProduct('t1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].modalCost, 3000);
});

test('netProfit() — repackaging murni dari profitPerTrip()', () => {
  const D = baseD({ cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, marginPct: 30, date: new Date().toISOString() }] });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.netProfit('t1');
  assert.equal(r.ok, true);
  assert.equal(r.netProfit, 30000);
  assert.equal(r.cost, 70000);
});

test('minimumSellingPrice()/targetMarginPrice() — delegasi ke ProfitEngine.recommendPrice(), marginPct 0 vs custom', () => {
  const ctx = makeCtx(baseD());
  const min = ctx.BusinessFlowPresenter.minimumSellingPrice({ modal: 10000, transport: 2000 });
  assert.equal(min.ok, true);
  assert.equal(min.marginPct, 0);
  const target = ctx.BusinessFlowPresenter.targetMarginPrice({ modal: 10000, transport: 2000, marginPct: 20 });
  assert.equal(target.ok, true);
  assert.equal(target.marginPct, 20);
  assert.ok(target.result >= min.result);
});

test('priceSimulation() — profit & marginPct dari 1 harga jual hipotetis, sama rumus ProfitEngine.margin()', () => {
  const ctx = makeCtx(baseD());
  const sim = ctx.BusinessFlowPresenter.priceSimulation({ modal: 10000, transport: 2000, sellingPrice: 15000 });
  assert.equal(sim.ok, true);
  assert.equal(sim.cost, 12000);
  assert.equal(sim.profit, 3000);
  assert.equal(sim.marginPct, (3000 / 15000) * 100);
});

test('costPricingKPI() — ok:false kalau belum ada trip; kalau ada, rata2 cost/margin dari profitPerTrip()', () => {
  const ctxEmpty = makeCtx(baseD());
  assert.equal(ctxEmpty.BusinessFlowPresenter.costPricingKPI().ok, false);

  const D = baseD({
    cobek: [
      { id: 't1', total: 100000, profit: 30000, ongkir: 5000, marginPct: 30, date: new Date().toISOString() },
      { id: 't2', total: 50000, profit: 2500, ongkir: 2000, marginPct: 5, date: new Date().toISOString() },
    ],
  });
  const ctx = makeCtx(D);
  const kpi = ctx.BusinessFlowPresenter.costPricingKPI();
  assert.equal(kpi.ok, true);
  assert.equal(kpi.tripCount, 2);
  assert.equal(kpi.thinMarginCount, 1);
});

test('recommendation() — nambahin sinyal cost/pricing (bkpi-cost-thin) kalau ada trip margin tipis', () => {
  const D = baseD({
    cobek: [{ id: 't1', total: 50000, profit: 2500, ongkir: 2000, marginPct: 5, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  const recs = ctx.BusinessFlowPresenter.recommendation();
  assert.ok(recs.some((r) => r.id === 'bkpi-cost-thin'));
});

// --- S217-218 (Trip Load Analysis / Transportation Cost Analysis) ---------

function makeCtxWithTrip(D) {
  return loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
      'modules/shop/cobek-order.js',
      'modules/shop/trip-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/business-flow-presenter.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['BusinessFlowPresenter', 'TripEngine'],
  );
}

test('tripLoadAnalysis() — ok:false kalau TripEngine/packingCalculator tidak ada input; kalau lengkap, field ter-rename dari calculateVehicleCapacity()', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek', beratPerUnit: 5 }] });
  const ctx = makeCtxWithTrip(D);
  const r = ctx.BusinessFlowPresenter.tripLoadAnalysis({
    items: [{ beratPerUnit: 5, qty: 4 }],
    capacityKg: 100,
  });
  assert.equal(r.ok, true);
  assert.equal(r.weightUsedKg, 20);
  assert.equal(r.motorLoadPct, 20);
  assert.equal(r.remainingKg, 80);
});

test('costPerKm() — ok:false kalau TripEngine tidak dimuat', () => {
  const ctx = loadSource(
    ['modules/shop/business-flow-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessFlowPresenter'],
  );
  assert.equal(ctx.BusinessFlowPresenter.costPerKm('v1').ok, false);
});

test('fuelCostPerKg() — ok:false kalau data BBM/berat belum cukup (tanpa vehicleId)', () => {
  const D = baseD();
  const ctx = makeCtxWithTrip(D);
  const r = ctx.BusinessFlowPresenter.fuelCostPerKg({ items: [{ beratPerUnit: 5, qty: 4 }], capacityKg: 100 });
  assert.equal(r.ok, false);
});

test('transportCostPerProduct() — alokasi proporsional berdasar berat, total = ongkirCost trip', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Berat', beratPerUnit: 8 },
      { id: 'p2', name: 'Ringan', beratPerUnit: 2 },
    ],
    cobek: [{
      id: 't1', total: 100000, profit: 30000, ongkir: 10000, date: new Date().toISOString(),
      items: [{ productId: 'p1', qty: 1, name: 'Berat' }, { productId: 'p2', qty: 1, name: 'Ringan' }],
    }],
  });
  const ctx = makeCtxWithTrip(D);
  const rows = ctx.BusinessFlowPresenter.transportCostPerProduct('t1');
  assert.equal(rows.length, 2);
  const sum = rows.reduce((s, r) => s + r.transportCost, 0);
  assert.ok(Math.abs(sum - 10000) < 0.001);
  const berat = rows.find((r) => r.productId === 'p1');
  assert.ok(berat.transportCost > 6000); // 8/10 porsi berat -> lebih besar dari rekan ringan
});

test('tripEfficiency() — omzet/ongkir dari profitPerTrip(), null kalau ongkir 0', () => {
  const D = baseD({
    cobek: [
      { id: 't1', total: 100000, profit: 30000, ongkir: 10000, date: new Date().toISOString() },
      { id: 't2', total: 50000, profit: 20000, ongkir: 0, date: new Date().toISOString() },
    ],
  });
  const ctx = makeCtx(D);
  const r1 = ctx.BusinessFlowPresenter.tripEfficiency('t1');
  assert.equal(r1.ok, true);
  assert.equal(r1.omzetPerOngkir, 10);
  const r2 = ctx.BusinessFlowPresenter.tripEfficiency('t2');
  assert.equal(r2.ok, true);
  assert.equal(r2.omzetPerOngkir, null);
});

test('profitAfterTransport() — alias persis netProfit()', () => {
  const D = baseD({ cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, marginPct: 30, date: new Date().toISOString() }] });
  const ctx = makeCtx(D);
  const a = ctx.BusinessFlowPresenter.profitAfterTransport('t1');
  const b = ctx.BusinessFlowPresenter.netProfit('t1');
  assert.deepEqual(a, b);
});

test('loadCostKPI() — ok:false kalau belum ada trip berongkir; kalau ada, rata2 omzet/ongkir & inefficientCount', () => {
  const ctxEmpty = makeCtx(baseD());
  assert.equal(ctxEmpty.BusinessFlowPresenter.loadCostKPI().ok, false);

  const D = baseD({
    cobek: [
      { id: 't1', total: 100000, profit: 30000, ongkir: 10000, date: new Date().toISOString() }, // 10x
      { id: 't2', total: 15000, profit: 5000, ongkir: 10000, date: new Date().toISOString() }, // 1.5x -> inefficient
    ],
  });
  const ctx = makeCtx(D);
  const kpi = ctx.BusinessFlowPresenter.loadCostKPI();
  assert.equal(kpi.ok, true);
  assert.equal(kpi.tripCount, 2);
  assert.equal(kpi.inefficientCount, 1);
});

test('recommendation() — nambahin sinyal load/transport (bkpi-load-inefficient) kalau ongkir relatif besar', () => {
  const D = baseD({
    cobek: [{ id: 't1', total: 15000, profit: 5000, ongkir: 10000, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  const recs = ctx.BusinessFlowPresenter.recommendation();
  assert.ok(recs.some((r) => r.id === 'bkpi-load-inefficient'));
});

// --- S221-222 (Business Decision Dashboard) --------------------------------

test('decisionDashboard() — repackaging 6 ringkasan yang sudah ada (trip/cost/profit/stock/delivery/finance)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }],
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 10000, marginPct: 30, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  const dd = ctx.BusinessFlowPresenter.decisionDashboard();
  const f = ctx.BusinessFlowPresenter.flow();
  assert.deepEqual(dd.tripSummary, f.trip);
  assert.deepEqual(dd.stockSummary, f.stock);
  assert.deepEqual(dd.profitSummary, f.sale);
  assert.deepEqual(dd.costSummary, ctx.BusinessFlowPresenter.costPricingKPI());
  assert.deepEqual(dd.deliverySummary, ctx.BusinessFlowPresenter.loadCostKPI());
  assert.equal(dd.financeSummary.ok, false); // FinanceIntelligence tidak dimuat di makeCtx
});

test('_financeCard() — fallback aman kalau financeSummary belum ada healthScore, tampil normal kalau ada', () => {
  const ctx = makeCtx(baseD());
  const empty = ctx.BusinessFlowPresenter._financeCard({ ok: false });
  assert.equal(empty.value, 'Belum ada data');

  const filled = ctx.BusinessFlowPresenter._financeCard({ ok: true, healthScore: { score: 72, label: 'Cukup Sehat' } });
  assert.equal(filled.value, 'Skor Kesehatan 72/100');
  assert.equal(filled.sub, 'Cukup Sehat');
  assert.equal(filled.cls, '');

  const low = ctx.BusinessFlowPresenter._financeCard({ ok: true, healthScore: { score: 40, label: 'Waspada' } });
  assert.equal(low.cls, 'red');
});

test('aiDecisionSummary() — ok:false kalau belum ada trip, tetap kasih actionRecommendation; kalau ada trip, biggestCost/highestProfit/lowestMargin benar', () => {
  const ctxEmpty = makeCtx(baseD());
  const emptyResult = ctxEmpty.BusinessFlowPresenter.aiDecisionSummary();
  assert.equal(emptyResult.ok, false);
  assert.ok(Array.isArray(emptyResult.actionRecommendation));

  const D = baseD({
    cobek: [
      { id: 't1', total: 100000, profit: 30000, ongkir: 10000, marginPct: 30, date: new Date().toISOString() },
      { id: 't2', total: 20000, profit: 1000, ongkir: 15000, marginPct: 5, date: new Date().toISOString() },
    ],
  });
  const ctx = makeCtx(D);
  const ds = ctx.BusinessFlowPresenter.aiDecisionSummary();
  assert.equal(ds.ok, true);
  assert.equal(ds.highestProfit.id, 't1');
  assert.equal(ds.lowestMargin.id, 't2');
  assert.ok(Array.isArray(ds.actionRecommendation));
});

test('recommendation() — nambahin sinyal decision (bkpi-decision-lowest-margin) kalau ada trip margin < 10%, tanpa rekursi tak berhingga', () => {
  const D = baseD({
    cobek: [{ id: 't1', total: 20000, profit: 1000, ongkir: 15000, marginPct: 5, date: new Date().toISOString() }],
  });
  const ctx = makeCtx(D);
  const recs = ctx.BusinessFlowPresenter.recommendation();
  assert.ok(recs.some((r) => r.id === 'bkpi-decision-lowest-margin'));
});
