'use strict';
// tests/data-health-check-vehicle-self-uncovered-opsiA.test.js — cakupan cek
// baru di runDataHealthCheck() (data-health-check.js) dari patch "Auto-Create
// Asset dari Kendaraan SELF (Opsi A)": kendaraan ownership SELF tanpa assetId
// sama sekali -> reminder warn "Kendaraan milik sendiri belum tercatat
// nilainya di Buku Aset" (murni baca, 0 auto-repair). Pola harness sama
// persis tests/data-health-check-vehicle-assetid-orphan-s506.test.js, cuma
// modules/vehicle/vehicle-core.js & ownership-engine.js ikut di-load supaya
// isVehicleOwnershipSelf() tersedia.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TITLE = 'Kendaraan milik sendiri belum tercatat nilainya di Buku Aset';

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
    ['modules/shared/ownership-engine.js', 'modules/shared/helper-teks.js', 'modules/vehicle/vehicle-core.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) }
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: warn kalau kendaraan ownership SELF sama sekali belum tertaut assetId', () => {
  const issues = run({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', ownership: 'SELF' }],
  });
  const found = issues.filter((i) => i.title === TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Vario 125/);
});

test('runDataHealthCheck: reminder ikut actions[] "Buka Kendaraan" -> editVehicle(idx) supaya tap langsung buka modal edit', () => {
  const issues = run({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', ownership: 'SELF' }],
  });
  const found = issues.find((i) => i.title === TITLE);
  assert.ok(found.actions && found.actions.length === 1);
  assert.equal(found.actions[0].action, 'editVehicle');
  assert.equal(found.actions[0].args.length, 1);
  assert.equal(found.actions[0].args[0], 0);
});

test('runDataHealthCheck: multi-kendaraan -- args editVehicle mengikuti index array D.vehicles yang benar (bukan selalu 0)', () => {
  const issues = run({
    vehicles: [
      { id: 'veh_1', name: 'Vario 125', ownership: 'SELF', assetId: 'asset_1' },
      { id: 'veh_2', name: 'Beat', ownership: 'SELF' },
    ],
    assets: [{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }],
  });
  const found = issues.find((i) => i.title === TITLE);
  assert.equal(found.actions[0].args[0], 1);
});

test('runDataHealthCheck: kendaraan TANPA field ownership sama sekali (data lama) tetap dianggap SELF -> ikut warn', () => {
  const issues = run({
    vehicles: [{ id: 'veh_1', name: 'Vario Lama' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 1, 'default OwnershipEngine harus resolve ke SELF utk kendaraan lama tanpa field ownership');
});

test('runDataHealthCheck: TIDAK warn kalau kendaraan SELF sudah tertaut assetId (apa pun validitasnya -- itu ranah cek orphan lain)', () => {
  const issues = run({
    assets: [{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }],
    vehicles: [{ id: 'veh_1', name: 'Vario 125', ownership: 'SELF', assetId: 'asset_1' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau ownership kendaraan BUKAN SELF walau assetId kosong', () => {
  const issues = run({
    vehicles: [{ id: 'veh_1', name: 'Motor Kantor', ownership: 'FAMILY' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: multi-kendaraan -- cuma yang SELF & belum tertaut yang di-warn, satu per kendaraan', () => {
  const issues = run({
    vehicles: [
      { id: 'veh_1', name: 'Vario 125', ownership: 'SELF' },
      { id: 'veh_2', name: 'Motor Kantor', ownership: 'FAMILY' },
      { id: 'veh_3', name: 'Brio', ownership: 'SELF', assetId: 'asset_1' },
      { id: 'veh_4', name: 'Beat', ownership: 'SELF' },
    ],
    assets: [{ id: 'asset_1', jenis: 'Kendaraan', name: 'Brio' }],
  });
  const found = issues.filter((i) => i.title === TITLE);
  assert.equal(found.length, 2);
  const names = found.map((i) => i.detail).join(' ');
  assert.match(names, /Vario 125/);
  assert.match(names, /Beat/);
  assert.doesNotMatch(names, /Motor Kantor/);
  assert.doesNotMatch(names, /"Brio"/);
});

test('runDataHealthCheck: 0 mutasi data — cek ini murni baca (vehicles/assets tidak berubah)', () => {
  const vehicles = [{ id: 'veh_1', name: 'Vario 125', ownership: 'SELF' }];
  const assets = [];
  const before = JSON.stringify({ vehicles, assets });
  run({ vehicles, assets });
  assert.equal(JSON.stringify({ vehicles, assets }), before);
});
