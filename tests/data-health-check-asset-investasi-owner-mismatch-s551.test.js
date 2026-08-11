'use strict';
// tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js — cakupan
// S551 (audit duplikat nama Aset<->Investasi dgn kepemilikan berbeda, lihat
// FIX-s551-asset-investasi-duplicate-name-owner-mismatch-audit.md). Menggantikan
// smoke-test manual `vm.runInThisContext` yang disebut di FIX doc dgn test
// permanen via harness tests/helpers/loadSource.js (pola sama persis
// tests/data-health-check-catalog-dup-s268.test.js utk cek lain di file yang
// sama).
//
// Cek ini MURNI BACA (0 mutasi D.assets/D.investments), match nama exact
// (trim+lowercase, SENGAJA bukan fuzzy) & bandingkan signature pemilik efektif
// via MultiOwnerEngine.getOwners() (0 rumus baru).

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

const TITLE = 'Nama sama di Buku Aset & Investasi dgn kepemilikan berbeda';

test('runDataHealthCheck: warn kalau nama sama Aset & Investasi dgn owner BEDA (kasus "Schorder" dari laporan user)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Schorder', owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 100, isSelf: true }] }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 1);
  assert.equal(dup[0].level, 'warn');
  assert.match(dup[0].detail, /Schorder/);
});

test('runDataHealthCheck: TIDAK warn kalau nama sama tapi owner SAMA persis', () => {
  const owners = [{ ownerId: 'SELF', ownerName: 'Budi', porsi: 100, isSelf: true }];
  const issues = run({
    assets: [{ id: 'a1', name: 'Sama Persis', owners: owners.map((o) => ({ ...o })) }],
    investments: [{ id: 'h1', name: 'Sama Persis', owners: owners.map((o) => ({ ...o })) }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau nama berbeda (tidak ada match sama sekali)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Tanah Kavling', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'BBCA', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 0);
});

test('runDataHealthCheck: match nama EXACT sengaja bukan fuzzy — beda 1 huruf TIDAK terdeteksi', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'Schroder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }], // typo sengaja beda
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 0);
});

test('runDataHealthCheck: match case-insensitive & trim whitespace (trim+lowercase)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: '  Schorder  ', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'SCHORDER', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 1);
});

test('runDataHealthCheck: default SELF 100% (tanpa field owners/ownership) di kedua sisi -> tidak warn (signature sama)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Reksadana X' }],
    investments: [{ id: 'h1', name: 'Reksadana X' }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  assert.equal(dup.length, 0);
});

test('runDataHealthCheck: 1 nama investasi cocok dgn LEBIH DARI 1 aset nama sama -> tiap pasangan yg mismatch dilaporkan terpisah', () => {
  const issues = run({
    assets: [
      { id: 'a1', name: 'Duplikat', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] },
      { id: 'a2', name: 'Duplikat', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] },
    ],
    investments: [{ id: 'h1', name: 'Duplikat', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
  });
  const dup = issues.filter((i) => i.title === TITLE);
  // a1 (owner renov) mismatch dgn h1 (owner SELF) -> 1 issue; a2 (owner SELF)
  // owner SAMA dgn h1 -> tidak jadi issue.
  assert.equal(dup.length, 1);
});

test('runDataHealthCheck: 0 mutasi ke D.assets/D.investments (murni baca)', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }],
    investments: [{ id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
  });
  const before = JSON.stringify({ assets: D.assets, investments: D.investments });
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) }
  );
  ctx.runDataHealthCheck();
  const after = JSON.stringify({ assets: D.assets, investments: D.investments });
  assert.equal(after, before);
});

test('runDataHealthCheck: cek qty minus lama tetap jalan (regresi, pola sama tests/data-health-check-catalog-dup-s268.test.js)', () => {
  const issues = run({ partsStock: [{ id: 'st_1', name: 'Oli', qty: -1, catalogId: 'cat_a' }] });
  const minus = issues.filter((i) => i.title === 'Stok sparepart minus');
  assert.equal(minus.length, 1);
});
