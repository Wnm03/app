'use strict';
// tests/trip-engine.test.js — cakupan modules/shop/trip-engine.js (S198,
// Business Engine untuk Shop). TripEngine delegasi ke fungsi Shop existing
// (weightCalculator/volumeCalculator/packingCalculator di cobek-etalase.js,
// OngkirCalc/calculateFuel/calculateVehicleCapacity di cobek-pricing.js,
// LogisticsEngine di logistics-engine.js, calculateSmartDelivery di
// cobek-order.js) — jadi harness perlu memuat file-file itu juga, pola sama
// tests/cobek-vehicle-capacity.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(overrides) {
  return Object.assign({
    products: [], cobekKategori: [], bbmLogs: [], produsen: [],
    accounts: [], profile: {}, vehicles: [], cobek: [], transactions: [], piutang: [],
  }, overrides);
}

function makeFullCtx(D) {
  return loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
      'modules/shop/cobek-order.js',
      'modules/shop/trip-engine.js',
    ],
    { D: D || baseD() },
    ['TripEngine'],
  );
}

// --- guard: engine belum dimuat -> ok:false, bukan throw ------------------

test('weight()/volume()/packing()/route() — reason kalau fungsi dependency belum dimuat', () => {
  const ctx = loadSource(['modules/shop/trip-engine.js'], {}, ['TripEngine']);
  assert.equal(ctx.TripEngine.weight({}).ok, false);
  assert.equal(ctx.TripEngine.volume({}).ok, false);
  assert.equal(ctx.TripEngine.packing({}).ok, false);
  assert.equal(ctx.TripEngine.route({}).ok, false);
  assert.equal(ctx.TripEngine.fuel('v1').ok, false);
  assert.equal(ctx.TripEngine.vehicleCapacity({}).ok, false);
  assert.equal(ctx.TripEngine.plan({}).ok, false);
});

// --- weight/volume/packing — delegasi persis ke cobek-etalase.js ----------

test('weight() — delegasi ke weightCalculator, totalKg = beratPerUnit x qty', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.weight({ beratPerUnit: 2.5, qty: 4 });
  assert.equal(r.ok, true);
  assert.equal(r.totalKg, 10);
});

test('volume() — delegasi ke volumeCalculator', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.volume({ panjang: 10, lebar: 10, tinggi: 10, qty: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.totalM3, 0.002);
});

test('packing() — delegasi ke packingCalculator, hitung trips dari kapasitas', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.packing({
    items: [{ beratPerUnit: 3, qty: 5 }, { beratPerUnit: 1.5, qty: 10 }],
    capacityKg: 30,
  });
  assert.equal(r.ok, true);
  assert.equal(r.totalKg, 30);
  assert.equal(r.tripsByWeight, 1);
});

// --- route — delegasi ke LogisticsEngine.route (-> OngkirCalc.leg) --------

test('route() — delegasi ke LogisticsEngine.route(), metode ambil = 1 etape', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.route({
    kmProdusen: 5, biayaPerKmProdusen: 1000, metode: 'ambil', pcs: 2,
  });
  assert.equal(r.ok, true);
  assert.equal(r.legProdusen, 2500);
  assert.equal(r.legKonsumen, 0);
  assert.equal(r.totalPerPcs, 2500);
});

// --- fuel / vehicleCapacity — delegasi ke cobek-pricing.js -----------------

test('fuel() — reason kalau histori BBM kendaraan belum cukup', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.fuel('vX');
  assert.equal(r.ok, false);
  assert.match(r.reason, /Histori BBM/);
});

test('vehicleCapacity() — status AMAN kalau pemakaian di bawah 80%', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.vehicleCapacity({
    items: [{ beratPerUnit: 1, qty: 5 }], capacityKg: 10,
  });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'AMAN');
  assert.equal(r.percentUsed, 50);
});

test('vehicleCapacity() — status OVERLOAD kalau pemakaian > 100%', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.vehicleCapacity({
    items: [{ beratPerUnit: 5, qty: 5 }], capacityKg: 10,
  });
  assert.equal(r.status, 'OVERLOAD');
});

// --- plan — delegasi ke calculateSmartDelivery (baca D.products/D.produsen) --

test('plan() — produk tidak ditemukan -> ok:false', () => {
  const ctx = makeFullCtx();
  const r = ctx.TripEngine.plan({ productId: 'ghost', qty: 1 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /tidak ditemukan/);
});

test('plan() — rencana lengkap (route+profit) dari produk & produsen valid', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 19cm', hargaBeli: 10000, hargaJual: 20000, stock: 5 }],
    produsen: [{ id: 'pr1', name: 'Produsen A', jarakKm: 10, biayaPerKm: 1000 }],
  });
  const ctx = makeFullCtx(D);
  const r = ctx.TripEngine.plan({
    productId: 'p1', qty: 2, produsenId: 'pr1', metode: 'ambil',
  });
  assert.equal(r.ok, true);
  assert.equal(r.productName, 'Cobek 19cm');
  assert.equal(r.plan.route.totalPerPcs, 5000);
  assert.equal(r.profit.revenue, 40000);
});
