'use strict';
// tests/shop-katalog-dinamis-interval-override-sk.test.js — cakupan fix
// S/K: ShopKatalogDinamisAPI.katalogUntuk() (modules/vehicle/
// shop-katalog-dinamis-api.js) sebelumnya SELALU pakai
// kategori.intervalKm (interval GLOBAL) walau kendaraan yang dipilih
// punya interval KHUSUS (v.intervalOverrides, diatur lewat
// editVehicleIntervalOverride() di 🔧 Pengingat Servis,
// modules/vehicle/sparepart-servis.js) — akibatnya status
// aman/perlu-ganti di "Katalog Sparepart per Kendaraan" (Shop) bisa
// salah utk kendaraan yang sudah diset interval khususnya lewat
// Pengingat Servis. Fix: _effectiveIntervalKm() reuse
// getEffectiveIntervalKm() APA ADANYA (0 rumus baru).
//
// Sesuai pola tests/sparepart-dashboard.test.js: load source ASLI lewat
// loadSource() (bukan re-implement logic), sparepart-servis.js dimuat
// SEBELUM shop-katalog-dinamis-api.js (sama urutan scripts/build.js)
// supaya getEffectiveIntervalKm()/hasIntervalOverride() tersedia.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    vehicles: [
      { id: 'v1', name: 'Vario 125', jenis: 'motor', kmAwal: 20000 },
      { id: 'v2', name: 'Vario 110', jenis: 'motor', kmAwal: 20000, intervalOverrides: { cat_oli: 5000 } },
    ],
    sparepartCats: [
      { id: 'cat_oli', name: 'Oli Mesin', intervalKm: 2000, showInReminder: true },
    ],
    partsCatalog: [
      { id: 'part1', name: 'Oli Mesin' },
    ],
    servisLogs: [
      // Servis terakhir 3000 km lalu utk kedua kendaraan (kmAwal 20000 - lastKm 17000 = 3000).
      // Item log sengaja dibuat SUPERSET dari nama part ("Ganti Oli Mesin"
      // includes "oli mesin") supaya cocok pola _servisTerakhir() (item log
      // harus MENGANDUNG nama part, bukan sebaliknya) apa adanya.
      { vehicleId: 'v1', item: 'Ganti Oli Mesin', km: 17000, tanggal: '2026-01-01' },
      { vehicleId: 'v2', item: 'Ganti Oli Mesin', km: 17000, tanggal: '2026-01-01' },
    ],
  };
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/vehicle/sparepart-servis.js',
      'modules/vehicle/shop-katalog-dinamis-api.js',
    ],
    {
      D,
      MY_WRENCH: { brand: 'MOLLAR', sku: 'MLR-B11950', minNm: 13.56, maxNm: 108.48, minLbft: 10, maxLbft: 80, panjang: 280 },
    },
    ['ShopKatalogDinamisAPI'],
  );
}

test('katalogUntuk() — kendaraan TANPA override: intervalKm = global (perilaku lama, tetap benar)', () => {
  const ctx = makeCtx(makeD());
  const res = ctx.ShopKatalogDinamisAPI.katalogUntuk('v1');
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].intervalKm, 2000);
  assert.equal(res.items[0].intervalOverridden, false);
  // kmSejakServis (3000) >= intervalKm global (2000) -> perlu-ganti.
  assert.equal(res.items[0].status, 'perlu-ganti');
});

test('katalogUntuk() — kendaraan DENGAN override: intervalKm ikut interval khusus, bukan global (FIX)', () => {
  const ctx = makeCtx(makeD());
  const res = ctx.ShopKatalogDinamisAPI.katalogUntuk('v2');
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
  // Sebelum fix ini akan 2000 (global) walau v2.intervalOverrides.cat_oli=5000.
  assert.equal(res.items[0].intervalKm, 5000);
  assert.equal(res.items[0].intervalOverridden, true);
  // kmSejakServis (3000) < intervalKm khusus (5000) -> aman (BEDA dari v1 di atas).
  assert.equal(res.items[0].status, 'aman');
});

test('katalogUntuk() — dimuat TANPA sparepart-servis.js (getEffectiveIntervalKm absen): fallback ke intervalKm global, tidak error', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/vehicle/shop-katalog-dinamis-api.js'],
    { D },
    ['ShopKatalogDinamisAPI'],
  );
  const res = ctx.ShopKatalogDinamisAPI.katalogUntuk('v2');
  assert.equal(res.ok, true);
  // getEffectiveIntervalKm tidak ada di sandbox ini -> fallback intervalKm global (2000),
  // BUKAN crash/throw (guard typeof di _effectiveIntervalKm()).
  assert.equal(res.items[0].intervalKm, 2000);
  assert.equal(res.items[0].intervalOverridden, false);
});
