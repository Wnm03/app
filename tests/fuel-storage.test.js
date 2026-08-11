'use strict';
// tests/fuel-storage.test.js — cakupan modules/vehicle/fuel-storage.js
// (TASK-141, Fuel Intelligence Card). Murni lapisan akses read-only di
// atas D.bbmLogs — cakupan fokus ke filter per kendaraan, urutan
// terbaru-dulu, dan guard D/D.bbmLogs belum ada.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(['modules/vehicle/fuel-storage.js'], { D }, ['FuelStorage']);
}

test('FuelStorage.logs() — filter per vehicleId', () => {
  const D = { bbmLogs: [
    { id: 'a', vehicleId: 'v1', date: '2026-07-01' },
    { id: 'b', vehicleId: 'v2', date: '2026-07-02' },
    { id: 'c', vehicleId: 'v1', date: '2026-07-03' },
  ] };
  const ctx = makeCtx(D);
  assert.equal(ctx.FuelStorage.logs('v1').length, 2);
  assert.equal(ctx.FuelStorage.logs('v2').length, 1);
});

test('FuelStorage.logs() — tanpa vehicleId balikin semua', () => {
  const D = { bbmLogs: [{ id: 'a', vehicleId: 'v1' }, { id: 'b', vehicleId: 'v2' }] };
  const ctx = makeCtx(D);
  assert.equal(ctx.FuelStorage.logs().length, 2);
});

test('FuelStorage.logs() — guard D.bbmLogs belum ada -> array kosong', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelStorage.logs('v1').length, 0);
});

test('FuelStorage.sortedByDate() — urut tanggal terbaru dulu', () => {
  const D = { bbmLogs: [
    { id: 'a', vehicleId: 'v1', date: '2026-07-01' },
    { id: 'b', vehicleId: 'v1', date: '2026-07-05' },
    { id: 'c', vehicleId: 'v1', date: '2026-07-03' },
  ] };
  const ctx = makeCtx(D);
  const sorted = ctx.FuelStorage.sortedByDate('v1');
  assert.deepEqual(sorted.map((r) => r.id), ['b', 'c', 'a']);
});

test('FuelStorage.latest() — log terbaru, null kalau kosong', () => {
  const D = { bbmLogs: [
    { id: 'a', vehicleId: 'v1', date: '2026-07-01' },
    { id: 'b', vehicleId: 'v1', date: '2026-07-05' },
  ] };
  const ctx = makeCtx(D);
  assert.equal(ctx.FuelStorage.latest('v1').id, 'b');
  assert.equal(ctx.FuelStorage.latest('v9'), null);
});

test('FuelStorage.recent() — batasi N terbaru', () => {
  const D = { bbmLogs: [
    { id: 'a', vehicleId: 'v1', date: '2026-07-01' },
    { id: 'b', vehicleId: 'v1', date: '2026-07-02' },
    { id: 'c', vehicleId: 'v1', date: '2026-07-03' },
  ] };
  const ctx = makeCtx(D);
  const recent = ctx.FuelStorage.recent('v1', 2);
  assert.equal(recent.length, 2);
  assert.deepEqual(recent.map((r) => r.id), ['c', 'b']);
});

test('FuelStorage.count() — jumlah log per kendaraan', () => {
  const D = { bbmLogs: [
    { id: 'a', vehicleId: 'v1' },
    { id: 'b', vehicleId: 'v1' },
    { id: 'c', vehicleId: 'v2' },
  ] };
  const ctx = makeCtx(D);
  assert.equal(ctx.FuelStorage.count('v1'), 2);
  assert.equal(ctx.FuelStorage.count('v2'), 1);
});
