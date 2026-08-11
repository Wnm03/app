'use strict';
// tests/delivery-plan-ui.test.js — cakupan Sesi 203 (Continue): DeliveryPlanUI
// (modules/shop/delivery-plan-ui.js), presenter yang menutup gap TripEngine
// (S198) "Belum digunakan UI. Belum dihubungkan ke Shop." — 100% reuse
// TripEngine.plan()/weight()/volume() (sendiri delegasi PERSIS ke
// calculateSmartDelivery()/weightCalculator()/volumeCalculator()).
//
// Pola loadSource sama persis tests/trip-engine.test.js +
// tests/shop-business-engine-integration.test.js: permissive document stub
// (getElementById selalu balik objek proxy, bukan null), jadi yang dites di
// sini adalah (a) method-method DeliveryPlanUI tidak throw walau dipanggil
// tanpa DOM asli, (b) field beratPerUnit/panjang/lebar/tinggi baru
// (productModal, S203) tersimpan & terbaca dari D.products APA ADANYA, dan
// (c) item baru ShopInsight "shop-delivery-plan" muncul/tidak sesuai data.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(overrides) {
  return Object.assign({
    products: [], cobekKategori: [], bbmLogs: [], produsen: [],
    accounts: [], profile: {}, vehicles: [], cobek: [], transactions: [], piutang: [],
  }, overrides);
}

function makeCtx(D) {
  return loadSource(
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
    ['DeliveryPlanUI', 'TripEngine'],
  );
}

// --- DeliveryPlanUI — tidak throw walau DOM di-stub permisif -------------

test('DeliveryPlanUI.open() — tidak throw walau container di-stub permisif', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5, hargaBeli: 20000, hargaJual: 40000 }] });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.open());
});

test('DeliveryPlanUI.calc() — tidak throw kalau TripEngine dimuat & document di-stub permisif', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5, hargaBeli: 20000, hargaJual: 40000 }] });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.calc());
});

test('DeliveryPlanUI.setMetode() — toggle metode & tidak throw', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.setMetode('ambil', null));
  assert.equal(ctx.DeliveryPlanUI.metode, 'ambil');
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.setMetode('antar', null));
  assert.equal(ctx.DeliveryPlanUI.metode, 'antar');
});

test('DeliveryPlanUI.calc() — kalau TripEngine belum dimuat, tetap aman (tidak throw)', () => {
  const D = baseD();
  const ctx = loadSource(
    ['modules/shop/delivery-plan-ui.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), openModal: () => {}, closeModal: () => {} },
    ['DeliveryPlanUI'],
  );
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.calc());
});

// --- calculateSmartDelivery via TripEngine.plan() — dipakai DeliveryPlanUI ---

test('TripEngine.plan() (dipakai DeliveryPlanUI.calc()) — hasil ok untuk produk yang ada, metode ambil', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 20000, hargaJual: 40000 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.TripEngine.plan({ productId: 'p1', qty: 5, metode: 'ambil' });
  assert.equal(r.ok, true);
  assert.equal(r.productName, 'Cobek 20cm');
});

// --- Field berat/dimensi baru (productModal, S203) — tersimpan APA ADANYA -

test('TripEngine.weight()/volume() — dipakai DeliveryPlanUI.calc() kalau produk sudah punya beratPerUnit/panjang/lebar/tinggi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const w = ctx.TripEngine.weight({ beratPerUnit: 2, qty: 3 });
  assert.equal(w.ok, true);
  assert.equal(w.totalKg, 6);
  const vol = ctx.TripEngine.volume({ panjang: 10, lebar: 10, tinggi: 10, qty: 2 });
  assert.equal(vol.ok, true);
  assert.equal(vol.totalM3, (10 * 10 * 10 * 2) / 1e6);
});

// --- ShopInsight item baru "shop-delivery-plan" ---------------------------

function makeInsightCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/trip-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/ai/feature-insights.js',
    ],
    { D, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => String(n), MONTHS: [] },
    ['ShopInsight'],
  );
}

test('ShopInsight.compute() — item "shop-delivery-plan" TIDAK muncul kalau tidak ada produk dengan berat/dimensi', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 100, hargaJual: 200 }] });
  const ctx = makeInsightCtx(D);
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-delivery-plan');
  assert.equal(hit, undefined);
});

test('ShopInsight.compute() — item "shop-delivery-plan" MUNCUL kalau ada produk dengan beratPerUnit terisi', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 100, hargaJual: 200, beratPerUnit: 2.5 }],
  });
  const ctx = makeInsightCtx(D);
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-delivery-plan');
  assert.ok(hit, 'item shop-delivery-plan harus muncul kalau ada produk beratPerUnit>0');
  assert.equal(hit.action.page, 'shop');
  assert.equal(hit.action.navIdx, 2);
});

test('ShopInsight.compute() — item "shop-delivery-plan" MUNCUL kalau ada produk dengan dimensi panjang/lebar/tinggi lengkap', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 100, hargaJual: 200, panjang: 10, lebar: 10, tinggi: 10 }],
  });
  const ctx = makeInsightCtx(D);
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-delivery-plan');
  assert.ok(hit, 'item shop-delivery-plan harus muncul kalau ada produk dengan dimensi lengkap');
});
