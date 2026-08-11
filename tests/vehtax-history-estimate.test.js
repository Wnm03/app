'use strict';
// tests/vehtax-history-estimate.test.js — cakupan modules/vehicle/vehicle-core.js
// via car-notes.js (Sesi di luar batch tracking, permintaan eksplisit user):
// vehTaxHistoryEstimate(vehicleId, jenis) — estimasi biaya pajak kendaraan
// (STNK Tahunan/Ganti Plat 5th/Uji Kelayakan) dari rata-rata histori pembayaran
// sebelumnya, pola SAMA PERSIS PriceReko.autoFillTransport() (rata-rata dari
// transaksi terakhir, 0 rumus tarif baru). Fungsi murni (baca D.transactions/
// D.vehicles saja, TIDAK sentuh DOM) — dites via loadSource dengan D di-inject,
// pola sama tests/fuel-intelligence-engine.test.js. autoFillVehTaxBiaya()
// (wrapper DOM) sengaja TIDAK dites di sini sesuai batasan loadSource.js
// (baca/tulis getElementById), cukup diverifikasi manual/smoke-test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['car-notes.js'],
    { D },
    ['vehTaxHistoryEstimate', 'VEHTAX_ITEMS'],
  );
}

test('vehTaxHistoryEstimate() — null kalau kendaraan tidak ditemukan', () => {
  const ctx = makeCtx({ vehicles: [], transactions: [] });
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'tahunan'), null);
});

test('vehTaxHistoryEstimate() — null kalau jenis tidak dikenal', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario 125' }], transactions: [] };
  const ctx = makeCtx(D);
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'ngasal'), null);
});

test('vehTaxHistoryEstimate() — null kalau belum ada histori pembayaran (note tidak cocok)', () => {
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    transactions: [{ type: 'expense', amount: 300000, note: 'Servis rutin - Vario 125', date: '2026-01-01' }],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'tahunan'), null);
});

test('vehTaxHistoryEstimate() — rata-rata dari histori pembayaran STNK Tahunan sesuai note bayarPajakKendaraan()', () => {
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    transactions: [
      { type: 'expense', amount: 300000, note: 'STNK Tahunan - Vario 125', date: '2024-05-01' },
      { type: 'expense', amount: 350000, note: 'STNK Tahunan - Vario 125', date: '2025-05-01' },
      { type: 'expense', amount: 500000, note: 'Servis rutin - Vario 125', date: '2025-06-01' },
    ],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'tahunan'), 325000);
});

test('vehTaxHistoryEstimate() — hanya pakai transaksi kendaraan yang dimaksud, tidak campur kendaraan lain', () => {
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }, { id: 'v2', name: 'Beat' }],
    transactions: [
      { type: 'expense', amount: 300000, note: 'STNK Tahunan - Vario 125', date: '2025-01-01' },
      { type: 'expense', amount: 999999, note: 'STNK Tahunan - Beat', date: '2025-01-01' },
    ],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'tahunan'), 300000);
});

test('vehTaxHistoryEstimate() — maksimal 5 histori terakhir (sesuai batas), rata-rata dihitung dari 5 itu saja', () => {
  const tx = [];
  for (let i = 1; i <= 7; i++) {
    tx.push({ type: 'expense', amount: i * 100000, note: 'Uji Kelayakan - Beat', date: `2025-0${i > 6 ? 6 : i}-0${i > 6 ? 20 : 1}` });
  }
  const D = { vehicles: [{ id: 'v2', name: 'Beat' }], transactions: tx };
  const ctx = makeCtx(D);
  // 7 transaksi (100rb..700rb), diurutkan tanggal lalu diambil 5 terakhir (300rb..700rb) -> rata2 500rb
  const est = ctx.vehTaxHistoryEstimate('v2', 'uji');
  assert.equal(est, 500000);
});

test('vehTaxHistoryEstimate() — mengabaikan transaksi amount 0/negatif', () => {
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    transactions: [
      { type: 'expense', amount: 0, note: 'Ganti Plat (5th) - Vario 125', date: '2020-01-01' },
      { type: 'expense', amount: 400000, note: 'Ganti Plat (5th) - Vario 125', date: '2025-01-01' },
    ],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.vehTaxHistoryEstimate('v1', 'limaTahun'), 400000);
});
