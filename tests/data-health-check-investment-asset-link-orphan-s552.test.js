'use strict';
// tests/data-health-check-investment-asset-link-orphan-s552.test.js — cakupan
// S552 B.2/Data Health Check tambahan (lihat FIX-s552-asset-investasi-link-badge.md
// bag. "Data Health Check tambahan"): orphan check utk `D.investments[].assetId`
// (link resmi baru) yang menunjuk entry Buku Aset yang sudah dihapus. Pola SAMA
// PERSIS orphan check S506 utk `vehicle.assetId` — level warn, murni baca, 0
// auto-repair (assetId TIDAK di-null-kan otomatis).
//
// Juga meregresi rule S551 (duplikat nama, owner beda) supaya dipastikan TIDAK
// berubah oleh penambahan S552 di file yang sama (lihat
// tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js utk cakupan
// dedicated rule S551 itu sendiri).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [],
    products: [], servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [],
    investments: [], targets: [], eduFunds: [], renovProjects: [], sewaKios: [],
  }, overrides);
}

function run(overrides) {
  const D = makeD(overrides);
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) }
  );
  return ctx.runDataHealthCheck();
}

const ORPHAN_TITLE = 'Link Buku Aset investasi tidak ditemukan';
const MISMATCH_TITLE = 'Nama sama di Buku Aset & Investasi dgn kepemilikan berbeda';

test('runDataHealthCheck: TIDAK warn kalau holding tidak punya assetId sama sekali', () => {
  const issues = run({ investments: [{ id: 'h1', name: 'BBCA' }] });
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau assetId valid & aset masih ada', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Schorder' }],
    investments: [{ id: 'h1', name: 'Schorder', assetId: 'a1' }],
  });
  assert.equal(issues.filter((i) => i.title === ORPHAN_TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau assetId menunjuk aset yang sudah dihapus (orphan)', () => {
  const issues = run({
    assets: [],
    investments: [{ id: 'h1', name: 'Schorder', assetId: 'asset-yang-sudah-dihapus' }],
  });
  const orphan = issues.filter((i) => i.title === ORPHAN_TITLE);
  assert.equal(orphan.length, 1);
  assert.equal(orphan[0].level, 'warn');
  assert.match(orphan[0].detail, /Schorder/);
});

test('runDataHealthCheck: orphan check TIDAK auto-null-kan h.assetId (murni baca)', () => {
  const D = makeD({
    assets: [],
    investments: [{ id: 'h1', name: 'Schorder', assetId: 'asset-yang-sudah-dihapus' }],
  });
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) }
  );
  ctx.runDataHealthCheck();
  assert.equal(D.investments[0].assetId, 'asset-yang-sudah-dihapus');
});

test('runDataHealthCheck: beberapa holding, hanya yang orphan yang dilaporkan (bukan yang linknya valid)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'BBCA' }],
    investments: [
      { id: 'h1', name: 'BBCA', assetId: 'a1' }, // valid
      { id: 'h2', name: 'Schorder', assetId: 'a-hilang' }, // orphan
      { id: 'h3', name: 'Tanpa Link' }, // tidak ada assetId sama sekali
    ],
  });
  const orphan = issues.filter((i) => i.title === ORPHAN_TITLE);
  assert.equal(orphan.length, 1);
  assert.match(orphan[0].detail, /Schorder/);
});

// Regresi: rule S551 (duplikat nama, owner beda) tetap jalan apa adanya
// setelah penambahan orphan check S552 di file yang sama.
test('runDataHealthCheck: rule S551 (nama sama, owner beda) TIDAK berubah oleh penambahan S552', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }], // belum ditautkan resmi (name-match S551, bukan orphan S552)
  });
  const mismatch = issues.filter((i) => i.title === MISMATCH_TITLE);
  const orphan = issues.filter((i) => i.title === ORPHAN_TITLE);
  assert.equal(mismatch.length, 1);
  assert.equal(orphan.length, 0); // tidak punya assetId -> bukan kasus orphan
});
