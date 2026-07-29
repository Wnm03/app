'use strict';
// tests/fuel-history.test.js — cakupan modules/vehicle/fuel-history.js
// (TASK-141, Fuel Intelligence Card). Presenter tipis di atas
// FuelStorage.recent() -- dites lewat fake DOM minimal (sama pola dgn
// tests/fuel-card.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { innerHTML: '' }; });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx({ document, FuelStorage, escapeHtml, fmt } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-history.js'],
    {
      document,
      FuelStorage,
      escapeHtml: escapeHtml || ((s) => String(s)),
      fmt: fmt || ((n) => 'Rp ' + Math.round(n || 0)),
    },
    ['FuelHistory'],
  );
}

test('render() — kosong (belum ada log) -> pesan empty-state', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelHistoryList']);
  const ctx = makeCtx({ document: doc, FuelStorage: { recent: () => [] } });
  ctx.FuelHistory.render('v1');
  assert.match(els.fuelIntelHistoryList.innerHTML, /Belum ada catatan BBM/);
});

test('render() — daftar log terbaru apa adanya dari FuelStorage.recent(vehicleId, 8)', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelHistoryList']);
  const rows = [
    { id: 'b1', km: 12500, liter: 3.5, cost: 35000, date: '2026-07-20', spbu: 'Pertamina', fullTank: true },
    { id: 'b2', km: 12000, liter: 2, cost: 20000, date: '2026-07-10', spbu: '', fullTank: false },
  ];
  let capturedArgs = null;
  const ctx = makeCtx({
    document: doc,
    FuelStorage: { recent: (vid, n) => { capturedArgs = [vid, n]; return rows; } },
  });
  ctx.FuelHistory.render('v1');
  assert.deepEqual(capturedArgs, ['v1', 8]);
  assert.match(els.fuelIntelHistoryList.innerHTML, /12.500 km/);
  assert.match(els.fuelIntelHistoryList.innerHTML, /Rp 35000/);
  assert.match(els.fuelIntelHistoryList.innerHTML, /Pertamina/);
  assert.match(els.fuelIntelHistoryList.innerHTML, /Full Tank/);
  assert.match(els.fuelIntelHistoryList.innerHTML, /openBbmModal/);
});

test('render() — guard FuelStorage belum dimuat -> kosongkan diam-diam, tidak error', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelHistoryList']);
  const ctx = makeCtx({ document: doc });
  assert.doesNotThrow(() => ctx.FuelHistory.render('v1'));
  assert.equal(els.fuelIntelHistoryList.innerHTML, '');
});
