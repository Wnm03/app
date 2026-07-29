'use strict';
// tests/cobek-vehicle-capacity.test.js — cakupan pertama untuk fungsi
// berat/volume/packing Smart Delivery Engine (Sesi 4, lihat
// RENCANA-SESI-RINGKAS.md): weightCalculator/volumeCalculator/
// packingCalculator (modules/shop/cobek-etalase.js) &
// calculateVehicleCapacity (modules/shop/cobek-pricing.js).
//
// Sebelumnya NOL test untuk fungsi-fungsi ini walau ini yang dipakai utk
// jawab pertanyaan "aman/tidak berat cobek utk motor" -- risiko kalau
// ambang status (AMAN/HAMPIR OVERLOAD/OVERLOAD) berubah tanpa sengaja saat
// refactor, tidak ada yang gagal.
//
// calculateVehicleCapacity() didesain bisa jalan TANPA vehicleId (fuel jadi
// null/fuelReason terisi, tapi status/percentUsed tetap dihitung dari
// items+capacityKg/capacityM3) -- lihat cobek-pricing.js. Jadi harness ini
// tidak perlu LogisticsEngine/D.vehicles sama sekali untuk cakupan inti.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  const D = { products: [] };
  return loadSource(
    ['modules/shop/cobek-etalase.js', 'modules/shop/cobek-pricing.js'],
    { D },
    [],
  );
}

// --- weightCalculator ---

test('weightCalculator() — total berat = beratPerUnit x qty', () => {
  const ctx = makeCtx();
  const r = ctx.weightCalculator({ beratPerUnit: 2.5, qty: 4 });
  assert.equal(r.totalKg, 10);
});

test('weightCalculator() — input negatif/NaN dipaksa 0, tidak throw', () => {
  const ctx = makeCtx();
  const r = ctx.weightCalculator({ beratPerUnit: -5, qty: 'abc' });
  assert.equal(r.beratPerUnit, 0);
  assert.equal(r.qty, 0);
  assert.equal(r.totalKg, 0);
});

// --- packingCalculator ---

test('packingCalculator() — hitung total berat gabungan dari beberapa item', () => {
  const ctx = makeCtx();
  const r = ctx.packingCalculator({
    items: [
      { beratPerUnit: 3, qty: 5 }, // 15 kg
      { beratPerUnit: 1.5, qty: 10 }, // 15 kg
    ],
    capacityKg: 30,
  });
  assert.equal(r.totalKg, 30);
  assert.equal(r.tripsByWeight, 1);
});

test('packingCalculator() — trips membulatkan ke atas kalau lebih dari 1 kapasitas', () => {
  const ctx = makeCtx();
  // 1 set cobek batu = 8kg, 6 set = 48kg, kapasitas motor 20kg -> 3 rit
  const r = ctx.packingCalculator({
    items: [{ beratPerUnit: 8, qty: 6 }],
    capacityKg: 20,
  });
  assert.equal(r.totalKg, 48);
  assert.equal(r.tripsByWeight, 3);
  assert.equal(r.limitingFactor, 'berat');
});

test('packingCalculator() — capacityKg tidak dikasih -> tidak membatasi (trips 0 dari sisi itu)', () => {
  const ctx = makeCtx();
  const r = ctx.packingCalculator({ items: [{ beratPerUnit: 8, qty: 6 }] });
  assert.equal(r.totalKg, 48);
  assert.equal(r.tripsByWeight, 0);
});

// --- calculateVehicleCapacity: status AMAN/HAMPIR OVERLOAD/OVERLOAD ---
// Ini fungsi yang jawab pertanyaan "berapa set cobek aman dibawa motor".

test('calculateVehicleCapacity() — status AMAN kalau pemakaian < 80%', () => {
  const ctx = makeCtx();
  // motor kapasitas 20kg, bawa 3 set @5kg = 15kg -> 75%
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 5, qty: 3 }],
    capacityKg: 20,
  });
  assert.equal(r.ok, true);
  assert.equal(r.totalKg, 15);
  assert.equal(r.status, 'AMAN');
  assert.equal(r.percentUsed, 75);
  assert.equal(r.sisaKapasitasKg, 5);
});

test('calculateVehicleCapacity() — status HAMPIR OVERLOAD kalau 80-100%', () => {
  const ctx = makeCtx();
  // 17kg dari kapasitas 20kg -> 85%
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 17, qty: 1 }],
    capacityKg: 20,
  });
  assert.equal(r.status, 'HAMPIR OVERLOAD');
  assert.equal(r.percentUsed, 85);
});

test('calculateVehicleCapacity() — status OVERLOAD kalau > 100% (motor tidak aman)', () => {
  const ctx = makeCtx();
  // 6 set @5kg = 30kg, kapasitas motor cuma 20kg -> 150%, TIDAK aman
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 5, qty: 6 }],
    capacityKg: 20,
  });
  assert.equal(r.totalKg, 30);
  assert.equal(r.status, 'OVERLOAD');
  assert.equal(r.percentUsed, 150);
  assert.equal(r.sisaKapasitasKg, -10);
});

test('calculateVehicleCapacity() — persis di batas 100% -> HAMPIR OVERLOAD (OVERLOAD baru dipicu > 100%, bukan >=)', () => {
  const ctx = makeCtx();
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 20, qty: 1 }],
    capacityKg: 20,
  });
  assert.equal(r.percentUsed, 100);
  assert.equal(r.status, 'HAMPIR OVERLOAD');
});

test('calculateVehicleCapacity() — persis di batas 80% -> HAMPIR OVERLOAD (bukan AMAN)', () => {
  const ctx = makeCtx();
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 16, qty: 1 }],
    capacityKg: 20,
  });
  assert.equal(r.percentUsed, 80);
  assert.equal(r.status, 'HAMPIR OVERLOAD');
});

test('calculateVehicleCapacity() — tanpa vehicleId, fuel null & fuelReason terisi (bukan error)', () => {
  const ctx = makeCtx();
  const r = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 5, qty: 2 }],
    capacityKg: 20,
  });
  assert.equal(r.ok, true);
  assert.equal(r.fuel, null);
  assert.equal(r.fuelReason, 'Kendaraan belum dipilih');
});

test('calculateVehicleCapacity() — capacityKg tidak dikasih -> status null (tidak bisa dinilai aman/tidak)', () => {
  const ctx = makeCtx();
  const r = ctx.calculateVehicleCapacity({ items: [{ beratPerUnit: 5, qty: 2 }] });
  assert.equal(r.status, null);
  assert.equal(r.percentUsed, null);
});
