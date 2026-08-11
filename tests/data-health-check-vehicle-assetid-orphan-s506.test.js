'use strict';
// tests/data-health-check-vehicle-assetid-orphan-s506.test.js — cakupan untuk
// cek baru di runDataHealthCheck() (data-health-check.js), S506 Vehicle ↔
// Asset Identity Link: (1) D.vehicles[].assetId orphan (asset sudah dihapus)
// dan (2) 1 entry Buku Aset ditautkan ke lebih dari 1 kendaraan (duplicate
// link safety, §10). Pola test identik tests/data-health-check-tx-assetid-
// orphan-s402.test.js (harness loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD({ accounts = [], assets = [], vehicles = [] }) {
  return {
    accounts, vehicles, transactions: [], bills: [], assets,
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], targets: [],
    eduFunds: [], sewaKios: { units: [] },
  };
}

function run(data) {
  const D = makeD(data);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) }
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: warn kalau Kendaraan tertaut ke Buku Aset yang sudah dihapus', () => {
  const issues = run({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', assetId: 'asset_gone' }],
  });
  const found = issues.filter((i) => i.title === 'Kendaraan tertaut ke Buku Aset yang sudah dihapus');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Vario 125/);
});

test('runDataHealthCheck: TIDAK warn kalau vehicle.assetId masih valid / kosong / tidak ada', () => {
  const TITLE = 'Kendaraan tertaut ke Buku Aset yang sudah dihapus';
  const valid = run({
    assets: [{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }],
    vehicles: [{ id: 'veh_1', name: 'Vario 125', assetId: 'asset_1' }],
  });
  assert.equal(valid.filter((i) => i.title === TITLE).length, 0);

  const noLink = run({
    vehicles: [{ id: 'veh_1', name: 'Vario 125' }],
  });
  assert.equal(noLink.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau 1 entry Buku Aset ditautkan ke lebih dari 1 kendaraan', () => {
  const issues = run({
    assets: [{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }],
    vehicles: [
      { id: 'veh_1', name: 'Vario 125 (unit A)', assetId: 'asset_1' },
      { id: 'veh_2', name: 'Vario 125 (unit B)', assetId: 'asset_1' },
    ],
  });
  const found = issues.filter((i) => i.title === 'Entry Buku Aset ditautkan ke lebih dari 1 kendaraan');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /unit A/);
  assert.match(found[0].detail, /unit B/);
});

test('runDataHealthCheck: TIDAK warn duplicate-link kalau tiap assetId cuma dipakai 1 kendaraan', () => {
  const issues = run({
    assets: [
      { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' },
      { id: 'asset_2', jenis: 'Kendaraan', name: 'Brio' },
    ],
    vehicles: [
      { id: 'veh_1', name: 'Vario 125', assetId: 'asset_1' },
      { id: 'veh_2', name: 'Brio', assetId: 'asset_2' },
    ],
  });
  const found = issues.filter((i) => i.title === 'Entry Buku Aset ditautkan ke lebih dari 1 kendaraan');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: 0 mutasi data — vehicles/assets array tidak berubah setelah cek', () => {
  const vehicles = [{ id: 'veh_1', name: 'Vario 125', assetId: 'asset_gone' }];
  const assets = [];
  const before = JSON.stringify({ vehicles, assets });
  run({ vehicles, assets });
  assert.equal(JSON.stringify({ vehicles, assets }), before);
});
