'use strict';
// tests/s610-vehicle-cross-renderlist-trycatch-guard.test.js — lanjutan
// audit pola sama S601/S608 ("0 reaksi" saat 1 item bikin salah satu
// hitungan per-baris throw): sisa renderer di luar cakupan s608
// (modules/vehicle/, modules/cross/) yang masih pakai
// `list.map(...) -> innerHTML` TANPA try/catch per-item.
//
// Fix: FuelHistory.render(), FuelCompare.render(), VehicleAttentionPresenter
// .render() (2 blok), VehicleDecisionPresenter.render(),
// LifePriorityPanel.render(), ActionQueue.render() — semua dibungkus
// try/catch per-item, fallback ke baris aman (atau string kosong utk kartu
// ringkas yang tidak butuh placeholder ⚠️), TIDAK menjatuhkan seluruh render.
//
// Test di sini HANYA memverifikasi kontrak baru (1 item rusak tidak
// menjatuhkan render, item lain tetap muncul).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('FuelHistory.render() — 1 catatan yang bikin _row() throw tidak menjatuhkan render, catatan lain tetap tampil', () => {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const ctx = loadSource(
    ['modules/vehicle/fuel-history.js'],
    {
      document: { getElementById: (id) => (id === 'fuelIntelHistoryList' ? el : null) },
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      FuelStorage: {
        recent: () => [
          { id: 'good1', cost: 50000, km: 1000, liter: 3, date: '2026-08-01' },
          { id: 'bad1', cost: 50000, km: null, liter: 3, date: '2026-08-05' },
        ],
      },
    },
    ['FuelHistory'],
  );
  // paksa _row() throw utk item 'bad1' via override runtime
  const origRow = ctx.FuelHistory._row;
  ctx.FuelHistory._row = function (b) {
    if (b.id === 'bad1') throw new Error('data BBM korup');
    return origRow.call(this, b);
  };
  assert.doesNotThrow(() => ctx.FuelHistory.render('v1'));
  assert.match(el.innerHTML, /1.000 km/);
  assert.match(el.innerHTML, /Gagal menampilkan catatan ini/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
});

test('VehicleDecisionPresenter.render() — 1 rekomendasi yang bikin _row() throw tidak menjatuhkan render, rekomendasi lain tetap tampil', () => {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const ctx = loadSource(
    ['modules/vehicle/vehicle-decision-presenter.js'],
    {
      document: { getElementById: (id) => (id === 'vehDecisionBody' ? el : null) },
      escapeHtml: (s) => String(s),
      VehicleRecommendationEngine: { recommendations: () => [{ vehicleId: 'good1' }, { vehicleId: 'bad1' }] },
      VehiclePriorityScoring: { rank: (r) => r },
      VehicleActionRecommendation: { withAction: (r) => r },
    },
    ['VehicleDecisionPresenter'],
  );
  ctx.VehicleDecisionPresenter._row = (r) => {
    if (r.vehicleId === 'bad1') throw new Error('data kendaraan korup');
    return '<div>OK-' + r.vehicleId + '</div>';
  };
  assert.doesNotThrow(() => ctx.VehicleDecisionPresenter.render());
  assert.match(el.innerHTML, /OK-good1/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
});

test('LifePriorityPanel.render() — 1 item yang bikin _row() throw tidak menjatuhkan render, item lain tetap tampil', () => {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const ctx = loadSource(
    ['modules/cross/life-priority-panel.js'],
    {
      document: { getElementById: (id) => (id === 'lifePriorityBody' ? el : null) },
      escapeHtml: (s) => String(s),
      PriorityEngine: { getItems: () => ({ ok: true, items: [{ kind: 'finance', name: 'good1' }, { kind: 'vehicle', vehicleType: 'bad1' }] }) },
    },
    ['LifePriorityPanel'],
  );
  ctx.LifePriorityPanel._row = (item) => {
    if (item.vehicleType === 'bad1') throw new Error('data prioritas korup');
    return '<div>OK-' + item.name + '</div>';
  };
  assert.doesNotThrow(() => ctx.LifePriorityPanel.render());
  assert.match(el.innerHTML, /OK-good1/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
});

test('ActionQueue.render() — 1 item yang bikin _label() throw tidak menjatuhkan render, item lain tetap tampil', () => {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const ctx = loadSource(
    ['modules/cross/action-queue.js'],
    {
      document: { getElementById: (id) => (id === 'actionQueueBody' ? el : null) },
      escapeHtml: (s) => String(s),
      DecisionCenterAPI: { summary: () => ({ ok: true, priorityItems: [{ kind: 'finance', name: 'good1' }, { kind: 'vehicle', vehicleType: 'bad1' }] }) },
    },
    ['ActionQueue'],
  );
  ctx.ActionQueue._label = (item) => {
    if (item.vehicleType === 'bad1') throw new Error('data antrean korup');
    return 'OK-' + item.name;
  };
  assert.doesNotThrow(() => ctx.ActionQueue.render());
  assert.match(el.innerHTML, /OK-good1/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
});
