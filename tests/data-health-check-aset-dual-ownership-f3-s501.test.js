'use strict';
// tests/data-health-check-aset-dual-ownership-f3-s501.test.js — Sesi 501
// (F3, AUDIT-SESI-B-PERLUASAN-ASET.md §3.2, follow-up dari Sesi B1/B2):
// cek baru di runDataHealthCheck() (data-health-check.js) — aset yang
// punya KEDUANYA `a.ownership` non-SELF (whole-entity) DAN `a.owners[]`
// eksplisit non-SELF (porsi majemuk) sekaligus -> warn (kartu "Dana
// Kelolaan" vs tab "Dana Titipan" bisa tampil pecahan berbeda utk aset
// yang sama). Murni deteksi (0 mutasi data, 0 perubahan rumus
// sumAssets()/build()). Pola test identik
// tests/data-health-check-tx-assetid-orphan-s402.test.js (harness
// loadSource biasa, load OwnershipEngine + MultiOwnerEngine +
// data-health-check.js bareng).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TITLE = 'Aset dengan kepemilikan ganda (Kepemilikan + Porsi Majemuk) berpotensi tidak sinkron';

function makeD({ assets = [] }) {
  return {
    accounts: [], vehicles: [], transactions: [], bills: [], assets,
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], targets: [],
    eduFunds: [], sewaKios: { units: [] },
  };
}

function run(data) {
  const D = makeD(data);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) }
  );
  return ctx.runDataHealthCheck();
}

test('warn: aset ownership non-SELF + owners[] eksplisit non-SELF sekaligus -> flagged', () => {
  const issues = run({
    assets: [
      {
        id: 'a1', name: 'Ruko Dobel', nilai: 100000000, ownership: 'THIRD_PARTY',
        owners: [{ ownerId: 'budi', porsi: 60, ownerName: 'Budi', isSelf: false }, { ownerId: 'SELF', porsi: 40, ownerName: 'Milik Sendiri', isSelf: true }],
      },
    ],
  });
  const found = issues.filter((i) => i.title === TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Ruko Dobel/);
  assert.match(found[0].detail, /60%/);
});

test('TIDAK warn: aset cuma ownership non-SELF, TANPA owners[] eksplisit (kasus umum/legacy)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Ruko Legacy', nilai: 100000000, ownership: 'THIRD_PARTY' }],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('TIDAK warn: aset cuma owners[] eksplisit, ownership SELF/kosong (kasus normal Sesi B1)', () => {
  const issues = run({
    assets: [
      {
        id: 'a1', name: 'Tanah Kavling', nilai: 50000000,
        owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }],
      },
    ],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('TIDAK warn: owners[] eksplisit tapi SEMUA porsi SELF (bukan titipan beneran)', () => {
  const issues = run({
    assets: [
      {
        id: 'a1', name: 'Rumah Sendiri', nilai: 200000000, ownership: 'INVESTOR',
        owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }],
      },
    ],
  });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('guard: aman kalau OwnershipEngine/MultiOwnerEngine belum dimuat (0 crash, 0 false-positive)', () => {
  const D = makeD({ assets: [{ id: 'a1', name: 'Ruko Dobel', nilai: 100000000, ownership: 'THIRD_PARTY', owners: [{ ownerId: 'budi', porsi: 60, ownerName: 'Budi', isSelf: false }] }] });
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) }
  );
  const issues = ctx.runDataHealthCheck();
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});
