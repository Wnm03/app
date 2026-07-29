'use strict';
// tests/data-health-check-target-orphan-s293.test.js — cakupan untuk cek baru
// "accountId orphan pada D.targets" di runDataHealthCheck() (data-health-check.js),
// ditambah Sesi 293 sbg tindak lanjut audit Sesi 292 (akun-del-targets-assets-
// gapfix): delAcc() di akun.js sudah memigrasi accountId di D.targets sejak
// Sesi 292, tapi runDataHealthCheck() belum pernah mengecek orphan-nya —
// padahal D.assets (kasus yang persis sama) sudah dicek sejak lama. Pola test
// identik tests/data-health-check-renov-orphan-s283.test.js (harness
// loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD({ accounts = [], targets = [] }) {
  return {
    accounts, vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], targets,
  };
}

function run(data) {
  const D = makeD(data);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {} }
  );
  return ctx.runDataHealthCheck();
}

const TITLE = 'Target Tabungan dengan akun tautan tidak valid';

test('runDataHealthCheck: warn kalau Target Tabungan menunjuk akun yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    targets: [{ id: 'tg1', name: 'Dana Darurat', accountId: 'acc_gone' }],
  });
  const found = issues.filter((i) => i.title === TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Dana Darurat/);
});

test('runDataHealthCheck: TIDAK warn kalau accountId Target Tabungan masih valid', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    targets: [{ id: 'tg1', name: 'Dana Darurat', accountId: 'acc_a' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: Target Tabungan tanpa accountId (manual, tidak tertaut akun) tidak pernah di-flag', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    targets: [{ id: 'tg1', name: 'Liburan', accountId: null }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('runDataHealthCheck: D.targets kosong/tidak ada tidak pernah error', () => {
  const D = { accounts: [{ id: 'acc_a' }], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [] };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {} }
  );
  assert.doesNotThrow(() => ctx.runDataHealthCheck());
});
