'use strict';
// tests/fuel-state-history.test.js — cakupan modules/vehicle/fuel-state-
// history.js (lanjutan rencana "Fuel Estimation Auto-Update", "Saran
// tambahan" #3: histori estimasi). Murni lapisan simpan+baca snapshot
// D.fuelStateHistory, pola sama persis fuel-storage.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(['modules/vehicle/fuel-state-history.js'], { D }, ['FuelStateHistory']);
}

test('record() — nulis snapshot pertama ke D.fuelStateHistory (array baru dibuat kalau belum ada)', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.FuelStateHistory.record('v1', {
    currentFuelBar: 8, currentFuelLiter: 3.2, correctedAt: '2026-08-01T00:00:00.000Z',
    estimatedSource: 'manual-bar-correction', confidenceScore: 100,
  });
  assert.equal(D.fuelStateHistory.length, 1);
  const snap = D.fuelStateHistory[0];
  assert.equal(snap.vehicleId, 'v1');
  assert.equal(snap.currentFuelBar, 8);
  assert.equal(snap.currentFuelLiter, 3.2);
  assert.equal(snap.estimatedSource, 'manual-bar-correction');
  assert.equal(snap.confidenceScore, 100);
  assert.equal(snap.recordedAt, '2026-08-01T00:00:00.000Z');
});

test('record() — beberapa vehicleId, list()/count() terfilter per kendaraan', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 3 });
  ctx.FuelStateHistory.record('v2', { currentFuelLiter: 5 });
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 4 });
  assert.equal(ctx.FuelStateHistory.count('v1'), 2);
  assert.equal(ctx.FuelStateHistory.count('v2'), 1);
  assert.equal(ctx.FuelStateHistory.list().length, 3);
});

test('record() — vehicleId kosong -> diam, tidak menulis apa pun', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.FuelStateHistory.record(null, { currentFuelLiter: 3 });
  ctx.FuelStateHistory.record('', { currentFuelLiter: 3 });
  assert.equal(D.fuelStateHistory === undefined || D.fuelStateHistory.length === 0, true);
});

test('record() — fuelState kosong/currentFuelLiter bukan angka -> diam, tidak menulis apa pun', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.FuelStateHistory.record('v1', null);
  ctx.FuelStateHistory.record('v1', {});
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 'tiga' });
  assert.equal(D.fuelStateHistory === undefined || D.fuelStateHistory.length === 0, true);
});

test('record() — currentFuelBar/estimatedSource/confidenceScore opsional -> null kalau tidak ada, TIDAK error', () => {
  const D = {};
  const ctx = makeCtx(D);
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 3.5 });
  const snap = D.fuelStateHistory[0];
  assert.equal(snap.currentFuelBar, null);
  assert.equal(snap.estimatedSource, null);
  assert.equal(snap.confidenceScore, null);
  assert.equal(typeof snap.recordedAt, 'string'); // fallback new Date().toISOString()
});

test('record() — cap MAX_ENTRIES_PER_VEHICLE, buang entry TERLAMA milik vehicleId itu saja', () => {
  const D = {};
  const ctx = makeCtx(D);
  const max = ctx.FuelStateHistory.MAX_ENTRIES_PER_VEHICLE;
  for (let i = 0; i < max + 5; i++) {
    ctx.FuelStateHistory.record('v1', { currentFuelLiter: i, correctedAt: `t${i}` });
  }
  ctx.FuelStateHistory.record('v2', { currentFuelLiter: 99, correctedAt: 'v2-entry' });
  assert.equal(ctx.FuelStateHistory.count('v1'), max);
  assert.equal(ctx.FuelStateHistory.count('v2'), 1); // kendaraan lain tidak ikut kepotong
  const v1rows = ctx.FuelStateHistory.list('v1');
  // 5 entry paling lama (liter 0-4) sudah dibuang, sisa liter 5..max+4
  assert.equal(v1rows[0].currentFuelLiter, 5);
  assert.equal(v1rows[v1rows.length - 1].currentFuelLiter, max + 4);
});

test('latest() — snapshot paling baru, null kalau belum ada', () => {
  const D = {};
  const ctx = makeCtx(D);
  assert.equal(ctx.FuelStateHistory.latest('v1'), null);
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 3 });
  ctx.FuelStateHistory.record('v1', { currentFuelLiter: 7 });
  assert.equal(ctx.FuelStateHistory.latest('v1').currentFuelLiter, 7);
});

test('list()/count() — guard D/D.fuelStateHistory belum ada -> array kosong / 0', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelStateHistory.list('v1').length, 0);
  assert.equal(ctx.FuelStateHistory.count('v1'), 0);
  assert.equal(ctx.FuelStateHistory.latest('v1'), null);
});

test('record() — guard typeof D belum ada sama sekali -> tidak throw', () => {
  const ctx = loadSource(['modules/vehicle/fuel-state-history.js'], {}, ['FuelStateHistory']);
  assert.doesNotThrow(() => ctx.FuelStateHistory.record('v1', { currentFuelLiter: 3 }));
});
