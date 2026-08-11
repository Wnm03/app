'use strict';
// tests/data-health-check-tx-assetid-orphan-s402.test.js — cakupan untuk
// cek baru di runDataHealthCheck() (data-health-check.js), Sesi 402 sbg
// tindak lanjut audit ringan: gap yang persis sama pola dgn D.piutang[].
// assetId & D.debts[].assetId (sudah dicek sejak S401b) tapi belum pernah
// ditambahkan utk D.transactions[].assetId — padahal field ini sudah
// dipakai nyata oleh resolveTxAssetSplit() (modules/finance/transaksi.js)
// utk menampilkan rincian pembagian ke pemilik aset multi-owner, dipicu
// dari dropdown "Kaitkan ke Aset Multi-Owner" di modal Transaksi. Pola
// test identik tests/data-health-check-assetid-edufund-sewakios-orphan-
// s401.test.js (harness loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD({ accounts = [], assets = [], transactions = [] }) {
  return {
    accounts, vehicles: [], transactions, bills: [], assets,
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

test('runDataHealthCheck: warn kalau Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-01-01', accountId: 'acc_a', assetId: 'asset_gone', note: 'Sewa Kios A' }],
  });
  const found = issues.filter((i) => i.title === 'Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Sewa Kios A/);
});

test('runDataHealthCheck: TIDAK warn kalau assetId Transaksi masih valid / kosong', () => {
  const TITLE = 'Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus';
  const valid = run({
    accounts: [{ id: 'acc_a' }],
    assets: [{ id: 'asset_a' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-01-01', accountId: 'acc_a', assetId: 'asset_a' }],
  });
  const empty = run({
    accounts: [{ id: 'acc_a' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-01-01', accountId: 'acc_a', assetId: null }],
  });
  assert.equal(valid.filter((i) => i.title === TITLE).length, 0);
  assert.equal(empty.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: D.transactions tanpa assetId sama sekali tidak pernah error', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    transactions: [{ id: 't1', amount: 50000, date: '2026-01-01', accountId: 'acc_a' }],
  });
  const TITLE = 'Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus';
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});
