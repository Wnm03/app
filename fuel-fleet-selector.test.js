'use strict';
// tests/fuel-fleet-selector.test.js — cakupan modules/vehicle/
// fuel-fleet-selector.js (TASK-151A, Fuel Fleet Brief Selector).
// FuelInsightEngine di-mock lewat extraGlobals (fungsi getSummary()
// disuntik langsung per test) — test ini fokus ke logic pemilihan
// kendaraan/tie-breaker di modul ini sendiri, bukan ikut nge-test ulang
// FuelInsightEngine (sudah ada tests/fuel-insight-engine.test.js sendiri).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, getSummaryImpl, curVehicleId } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-fleet-selector.js'],
    {
      D,
      curVehicleId,
      FuelInsightEngine: getSummaryImpl ? { getSummary: getSummaryImpl } : undefined,
    },
    ['FuelFleetSelector'],
  );
}

function insight(priority, id) {
  return { id: id || ('ins-' + priority), priority, title: 't', description: 'd', recommendation: 'r' };
}

function summaryOk(highestInsight) {
  return { ok: true, healthScore: 80, highestInsight };
}

// --- Priority selection --------------------------------------------------

test('selectVehicle() — memilih kendaraan dengan insight prioritas tertinggi (CRITICAL menang atas HIGH)', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: (vehicleId) => {
      if (vehicleId === 'v1') return summaryOk(insight('HIGH'));
      if (vehicleId === 'v2') return summaryOk(insight('CRITICAL'));
      return { ok: false, reason: 'Kendaraan tidak ditemukan' };
    },
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.ok, true);
  assert.equal(res.vehicleId, 'v2');
  assert.equal(res.insight.priority, 'CRITICAL');
  assert.equal(res.summary.healthScore, 80);
});

test('selectVehicle() — urutan prioritas penuh CRITICAL>HIGH>MEDIUM>LOW>INFO', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }, { id: 'v5' }] };
  const map = { v1: 'LOW', v2: 'INFO', v3: 'MEDIUM', v4: 'HIGH', v5: 'MEDIUM' };
  const ctx = makeCtx({
    D,
    getSummaryImpl: (vehicleId) => summaryOk(insight(map[vehicleId])),
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.vehicleId, 'v4'); // HIGH tertinggi di antara yang ada
});

// --- Tie breaker -----------------------------------------------------------

test('selectVehicle() — seri prioritas -> pilih curVehicleId kalau dia salah satu kandidat seri', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }] };
  const ctx = makeCtx({
    D,
    curVehicleId: 'v2',
    getSummaryImpl: (vehicleId) => {
      if (vehicleId === 'v3') return summaryOk(insight('LOW'));
      return summaryOk(insight('CRITICAL')); // v1 & v2 seri CRITICAL
    },
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.vehicleId, 'v2');
});

test('selectVehicle() — seri prioritas & curVehicleId bukan salah satu kandidat -> kandidat pertama sesuai urutan D.vehicles', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    curVehicleId: 'v9-tidak-ikut-seri',
    getSummaryImpl: () => summaryOk(insight('HIGH')), // v1 & v2 seri HIGH
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.vehicleId, 'v1');
});

test('selectVehicle() — curVehicleId tidak terdefinisi sama sekali -> fallback kandidat pertama', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: () => summaryOk(insight('MEDIUM')),
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.vehicleId, 'v1');
});

// --- No vehicles / no insights ---------------------------------------------

test('selectVehicle() — 0 kendaraan (D.vehicles kosong) -> null', () => {
  const ctx = makeCtx({ D: { vehicles: [] }, getSummaryImpl: () => summaryOk(insight('HIGH')) });
  assert.equal(ctx.FuelFleetSelector.selectVehicle(), null);
});

test('selectVehicle() — D/D.vehicles tidak ada sama sekali -> null (tidak throw)', () => {
  const ctx = makeCtx({ D: undefined, getSummaryImpl: () => summaryOk(insight('HIGH')) });
  assert.equal(ctx.FuelFleetSelector.selectVehicle(), null);
});

test('selectVehicle() — seluruh kendaraan valid tapi tidak ada insight (highestInsight null) -> null', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({ D, getSummaryImpl: () => summaryOk(null) });
  assert.equal(ctx.FuelFleetSelector.selectVehicle(), null);
});

test('selectVehicle() — FuelInsightEngine belum dimuat -> null (tidak throw)', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctx = loadSource(
    ['modules/vehicle/fuel-fleet-selector.js'],
    { D, curVehicleId: undefined, FuelInsightEngine: undefined },
    ['FuelFleetSelector'],
  );
  assert.equal(ctx.FuelFleetSelector.selectVehicle(), null);
});

// --- Invalid vehicle ---------------------------------------------------

test('selectVehicle() — kendaraan invalid (getSummary {ok:false}) dilewati, kendaraan valid lain tetap terpilih', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: (vehicleId) => {
      if (vehicleId === 'v1') return { ok: false, reason: 'Kendaraan tidak ditemukan' };
      return summaryOk(insight('CRITICAL'));
    },
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.ok, true);
  assert.equal(res.vehicleId, 'v2');
});

test('selectVehicle() — seluruh kendaraan invalid -> null', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }),
  });
  assert.equal(ctx.FuelFleetSelector.selectVehicle(), null);
});

test('selectVehicle() — entri D.vehicles tanpa id dilewati dgn aman (tidak throw)', () => {
  const D = { vehicles: [{ name: 'tanpa-id' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: () => summaryOk(insight('HIGH')),
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.vehicleId, 'v2');
});

test('selectVehicle() — getSummary() throw utk 1 kendaraan tidak menggagalkan seleksi kendaraan lain', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    getSummaryImpl: (vehicleId) => {
      if (vehicleId === 'v1') throw new Error('boom');
      return summaryOk(insight('CRITICAL'));
    },
  });
  const res = ctx.FuelFleetSelector.selectVehicle();
  assert.equal(res.ok, true);
  assert.equal(res.vehicleId, 'v2');
});
