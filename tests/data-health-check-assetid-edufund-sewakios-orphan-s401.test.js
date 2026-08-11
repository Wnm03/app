'use strict';
// tests/data-health-check-assetid-edufund-sewakios-orphan-s401.test.js —
// cakupan untuk 4 cek baru di runDataHealthCheck() (data-health-check.js),
// ditambah Sesi 401b sbg tindak lanjut audit ringan: gap yang persis sama
// pola dgn D.targets (sudah dicek sejak S293) tapi belum pernah ditambahkan
// utk D.eduFunds.accountId, D.sewaKios.units[].accountId, D.piutang[].assetId,
// & D.debts[].assetId — padahal field-nya sudah dipakai sync saldo/porsi
// kepemilikan nyata (edukasi-dana.js, sewakios.js, piutang-utang.js). Pola
// test identik tests/data-health-check-target-orphan-s293.test.js (harness
// loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD({ accounts = [], assets = [], eduFunds = [], sewaKios = { units: [] }, piutang = [], debts = [] }) {
  return {
    accounts, vehicles: [], transactions: [], bills: [], assets,
    bbmLogs: [], piutang, partsStock: [], debts, budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], targets: [],
    eduFunds, sewaKios,
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

test('runDataHealthCheck: warn kalau Dana Pendidikan menunjuk akun yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    eduFunds: [{ id: 'ef1', name: 'Kayla — SD', accountId: 'acc_gone' }],
  });
  const found = issues.filter((i) => i.title === 'Dana Pendidikan dengan akun tautan tidak valid');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Kayla/);
});

test('runDataHealthCheck: TIDAK warn kalau accountId Dana Pendidikan masih valid / kosong', () => {
  const valid = run({ accounts: [{ id: 'acc_a' }], eduFunds: [{ id: 'ef1', name: 'X', accountId: 'acc_a' }] });
  const empty = run({ accounts: [{ id: 'acc_a' }], eduFunds: [{ id: 'ef1', name: 'X', accountId: null }] });
  const TITLE = 'Dana Pendidikan dengan akun tautan tidak valid';
  assert.equal(valid.filter((i) => i.title === TITLE).length, 0);
  assert.equal(empty.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau Unit Sewa Kios menunjuk akun tujuan yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    sewaKios: { units: [{ id: 'sk1', name: 'Kios A', accountId: 'acc_gone' }] },
  });
  const found = issues.filter((i) => i.title === 'Unit Sewa Kios dengan akun tujuan tidak valid');
  assert.equal(found.length, 1);
  assert.match(found[0].detail, /Kios A/);
});

test('runDataHealthCheck: D.sewaKios tidak ada / units kosong tidak pernah error', () => {
  const D = makeD({ accounts: [{ id: 'acc_a' }] });
  delete D.sewaKios;
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) }
  );
  assert.doesNotThrow(() => ctx.runDataHealthCheck());
});

test('runDataHealthCheck: warn kalau Piutang tertaut ke Aset Multi-Owner yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    piutang: [{ id: 'p1', name: 'Budi', nilai: 100000, assetId: 'asset_gone' }],
  });
  const found = issues.filter((i) => i.title === 'Piutang tertaut ke Aset Multi-Owner yang sudah dihapus');
  assert.equal(found.length, 1);
  assert.match(found[0].detail, /Budi/);
});

test('runDataHealthCheck: TIDAK warn kalau assetId Piutang masih valid / kosong', () => {
  const TITLE = 'Piutang tertaut ke Aset Multi-Owner yang sudah dihapus';
  const valid = run({ accounts: [{ id: 'acc_a' }], assets: [{ id: 'asset_a' }], piutang: [{ id: 'p1', name: 'Budi', nilai: 1, assetId: 'asset_a' }] });
  const empty = run({ accounts: [{ id: 'acc_a' }], piutang: [{ id: 'p1', name: 'Budi', nilai: 1, assetId: null }] });
  assert.equal(valid.filter((i) => i.title === TITLE).length, 0);
  assert.equal(empty.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau Utang tertaut ke Aset Multi-Owner yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    debts: [{ id: 'd1', name: 'Bank ABC', nilai: 100000, assetId: 'asset_gone' }],
  });
  const found = issues.filter((i) => i.title === 'Utang tertaut ke Aset Multi-Owner yang sudah dihapus');
  assert.equal(found.length, 1);
  assert.match(found[0].detail, /Bank ABC/);
});

test('runDataHealthCheck: TIDAK warn kalau assetId Utang masih valid / kosong', () => {
  const TITLE = 'Utang tertaut ke Aset Multi-Owner yang sudah dihapus';
  const valid = run({ accounts: [{ id: 'acc_a' }], assets: [{ id: 'asset_a' }], debts: [{ id: 'd1', name: 'X', nilai: 1, assetId: 'asset_a' }] });
  const empty = run({ accounts: [{ id: 'acc_a' }], debts: [{ id: 'd1', name: 'X', nilai: 1, assetId: null }] });
  assert.equal(valid.filter((i) => i.title === TITLE).length, 0);
  assert.equal(empty.filter((i) => i.title === TITLE).length, 0);
});
