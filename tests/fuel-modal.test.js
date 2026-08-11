'use strict';
// tests/fuel-modal.test.js — cakupan modules/vehicle/fuel-modal.js
// (TASK-141, Fuel Intelligence Card). Orkestrasi tipis: validasi kendaraan
// via FuelIntelligenceEngine, isi judul, panggil FuelAnalytics.render()/
// FuelHistory.render(), lalu openModal() -- semuanya di-mock supaya test
// ini fokus ke urutan/alur panggilan FuelModal sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { textContent: '' }; });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx(overrides = {}) {
  return loadSource(['modules/vehicle/fuel-modal.js'], overrides, ['FuelModal']);
}

test('open() — kendaraan tidak ditemukan -> toast peringatan, tidak buka modal', () => {
  const toasts = [];
  let openCalled = false;
  const ctx = makeCtx({
    FuelIntelligenceEngine: { vehicleInsight: () => ({ ok: false }) },
    toast: (msg) => toasts.push(msg),
    openModal: () => { openCalled = true; },
  });
  ctx.FuelModal.open('v1');
  assert.equal(openCalled, false);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /tidak ditemukan/);
});

test('open() — kendaraan valid -> isi judul, render analytics+history, lalu openModal("fuelIntelModal")', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelModalVeh']);
  const calls = [];
  const insight = { ok: true, vehicleId: 'v1', name: 'Vario', emoji: '🏍️' };
  const ctx = makeCtx({
    document: doc,
    curVehicleId: 'v9',
    FuelIntelligenceEngine: { vehicleInsight: (vid) => { calls.push(['insight', vid]); return insight; } },
    FuelAnalytics: { render: (vid) => calls.push(['analytics', vid]) },
    FuelHistory: { render: (vid) => calls.push(['history', vid]) },
    openModal: (id) => calls.push(['open', id]),
  });
  ctx.FuelModal.open('v1');
  assert.equal(els.fuelIntelModalVeh.textContent, '🏍️ Vario');
  assert.deepEqual(calls, [
    ['insight', 'v1'],
    ['analytics', 'v1'],
    ['history', 'v1'],
    ['open', 'fuelIntelModal'],
  ]);
});

test('open() — tanpa argumen vehicleId -> default ke curVehicleId', () => {
  const { doc } = makeFakeDoc(['fuelIntelModalVeh']);
  let capturedVid = null;
  const insight = { ok: true, vehicleId: 'v9', name: 'Beat' };
  const ctx = makeCtx({
    document: doc,
    curVehicleId: 'v9',
    FuelIntelligenceEngine: { vehicleInsight: (vid) => { capturedVid = vid; return insight; } },
    FuelAnalytics: { render: () => {} },
    FuelHistory: { render: () => {} },
    openModal: () => {},
  });
  ctx.FuelModal.open();
  assert.equal(capturedVid, 'v9');
});
