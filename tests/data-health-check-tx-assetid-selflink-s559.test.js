'use strict';
// tests/data-health-check-tx-assetid-selflink-s559.test.js — cakupan untuk
// cek baru di runDataHealthCheck() (data-health-check.js), Sesi 559
// follow-up dari patch akun-majoris-selflink-redundant (fix
// updateTxAssetWrapVisibility() di transaksi.js): transaksi LAMA yang
// kadung tersimpan SEBELUM patch itu bisa masih punya `assetId` yang
// menunjuk ke aset yang `accountId`-nya SAMA dgn `accountId` transaksi itu
// sendiri (self-link redundan) -- gap ini TIDAK kena cek orphan lama
// (asetnya masih ada), jadi butuh cek terpisah. Pola test identik
// tests/data-health-check-tx-assetid-orphan-s402.test.js (harness
// loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TITLE = 'Transaksi tertaut ke Aset Multi-Owner yang redundan (menautkan diri sendiri)';

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
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) }
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: warn kalau Transaksi tertaut ke Aset yang accountId-nya SAMA dgn akun transaksi itu sendiri', () => {
  const issues = run({
    accounts: [{ id: 'acc_majoris' }],
    assets: [{ id: 'asset_majoris', name: 'Majoris', accountId: 'acc_majoris' }],
    transactions: [{ id: 't1', amount: 130950, date: '2026-08-11', accountId: 'acc_majoris', assetId: 'asset_majoris', note: 'Beli semen' }],
  });
  const found = issues.filter((i) => i.title === TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Beli semen/);
  assert.match(found[0].detail, /Majoris/);
});

test('runDataHealthCheck: TIDAK warn kalau assetId menunjuk ke aset LAIN (accountId beda)', () => {
  const issues = run({
    accounts: [{ id: 'acc_majoris' }, { id: 'acc_lain' }],
    assets: [{ id: 'asset_lain', name: 'Ruko Patungan', accountId: 'acc_lain' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-11', accountId: 'acc_majoris', assetId: 'asset_lain' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau assetId kosong / transaksi tanpa accountId', () => {
  const empty = run({
    accounts: [{ id: 'acc_majoris' }],
    assets: [{ id: 'asset_majoris', accountId: 'acc_majoris' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-11', accountId: 'acc_majoris', assetId: null }],
  });
  const noAcc = run({
    accounts: [],
    assets: [{ id: 'asset_majoris', accountId: 'acc_majoris' }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-11', assetId: 'asset_majoris' }],
  });
  assert.equal(empty.filter((i) => i.title === TITLE).length, 0);
  assert.equal(noAcc.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: assetId orphan (aset sudah dihapus) tetap kena cek LAMA, bukan cek self-link baru', () => {
  const issues = run({
    accounts: [{ id: 'acc_majoris' }],
    assets: [],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-11', accountId: 'acc_majoris', assetId: 'asset_gone' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
  assert.equal(issues.filter((i) => i.title === 'Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus').length, 1);
});
