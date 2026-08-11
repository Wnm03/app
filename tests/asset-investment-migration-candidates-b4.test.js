'use strict';
// tests/asset-investment-migration-candidates-b4.test.js — Sesi B4 (alat bantu migrasi,
// lanjutan B1 field investmentId + B2a/B2b/B3): Aset._findInvestmentMigrationCandidates()
// (aset.js) + wiring-nya di runDataHealthCheck() (data-health-check.js) sbg SARAN, bukan
// auto-link. Pola harness sama persis tests/asset-investment-bridge-b3.test.js /
// tests/data-health-check-catalog-dup-s268.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    assets: [],
    investments: [],
    accounts: [], vehicles: [], transactions: [], bills: [], bbmLogs: [], piutang: [],
    partsStock: [], debts: [], budgets: [], categories: { income: [], expense: [] },
    cobek: [], lifeBalanceSnapshots: [], products: [], servisLogs: [], wealthSnapshots: [],
    wishlist: [], workDays: [],
  }, overrides);
}

const investmentMock = {
  holdingValue(h) { return (h.unit || 0) * (h.currentPrice || 0); },
};

function loadAset(D) {
  return loadSource(
    ['modules/asset/aset.js'],
    { D, Investment: investmentMock, escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + n },
    ['Aset'],
  );
}

// ============================================================
// Aset._findInvestmentMigrationCandidates() -- fungsi murni
// ============================================================

test('_findInvestmentMigrationCandidates: kosong kalau tidak ada nama mirip', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Tanah Kavling', nilai: 1 }],
    investments: [{ id: 'inv1', name: 'BBCA' }],
  });
  const ctx = loadAset(D);
  assert.equal(ctx.Aset._findInvestmentMigrationCandidates().length, 0);
});

test('_findInvestmentMigrationCandidates: ketemu pasangan nama mirip (belum tertaut)', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Reksadana Pasar Uang X', nilai: 10000000 }],
    investments: [{ id: 'inv1', name: 'Reksadana Pasar Uang X Kelas A', unit: 100, currentPrice: 1000 }],
  });
  const ctx = loadAset(D);
  const cand = ctx.Aset._findInvestmentMigrationCandidates();
  assert.equal(cand.length, 1);
  assert.equal(cand[0].assetId, 'a1');
  assert.equal(cand[0].holdingId, 'inv1');
  assert.equal(cand[0].holdingValue, 100000);
});

test('_findInvestmentMigrationCandidates: aset yang sudah tertaut (investmentId) diabaikan', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'RDPU X', nilai: 1, investmentId: 'inv1' }],
    investments: [{ id: 'inv1', name: 'RDPU X' }],
  });
  const ctx = loadAset(D);
  assert.equal(ctx.Aset._findInvestmentMigrationCandidates().length, 0);
});

test('_findInvestmentMigrationCandidates: holding yang sudah ditautkan aset LAIN diabaikan', () => {
  const D = makeD({
    assets: [
      { id: 'a1', name: 'RDPU X', nilai: 1, investmentId: 'inv1' }, // sudah tertaut
      { id: 'a2', name: 'RDPU X (dobel-catat lama)', nilai: 2 }, // belum tertaut, nama sama
    ],
    investments: [{ id: 'inv1', name: 'RDPU X' }],
  });
  const ctx = loadAset(D);
  assert.equal(ctx.Aset._findInvestmentMigrationCandidates().length, 0);
});

test('_findInvestmentMigrationCandidates: nama pendek generik (<4 char ternormalisasi) diabaikan', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'BRI', nilai: 1 }],
    investments: [{ id: 'inv1', name: 'BRI' }],
  });
  const ctx = loadAset(D);
  assert.equal(ctx.Aset._findInvestmentMigrationCandidates().length, 0);
});

test('_findInvestmentMigrationCandidates: cocok substring 1 arah (bukan cuma exact)', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Emas Antam 10gr', nilai: 1 }],
    investments: [{ id: 'inv1', name: 'Emas Antam' }],
  });
  const ctx = loadAset(D);
  const cand = ctx.Aset._findInvestmentMigrationCandidates();
  assert.equal(cand.length, 1);
});

// ============================================================
// Wiring di runDataHealthCheck() -- issue level 'warn', BUKAN error
// ============================================================

function run(D) {
  const ctx = loadSource(
    ['modules/asset/aset.js', 'data-health-check.js'],
    {
      D,
      Investment: investmentMock,
      openModal: () => {},
      escapeHtml: (s) => String(s),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      sameId: (a, b) => String(a) === String(b),
    },
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: muncul saran level warn kalau ada kandidat migrasi', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Reksadana Pasar Uang X', nilai: 10000000 }],
    investments: [{ id: 'inv1', name: 'Reksadana Pasar Uang X Kelas A', unit: 10, currentPrice: 1000 }],
  });
  const issues = run(D);
  const found = issues.filter((i) => i.title === 'Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /SARAN/);
});

test('runDataHealthCheck: TIDAK muncul saran kalau sudah ditautkan (B1)', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'RDPU X', nilai: 1, investmentId: 'inv1' }],
    investments: [{ id: 'inv1', name: 'RDPU X' }],
  });
  const issues = run(D);
  const found = issues.filter((i) => i.title === 'Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: guard typeof Aset -- diam saja kalau module Aset tidak dimuat', () => {
  const D = makeD({
    assets: [{ id: 'a1', name: 'Reksadana Pasar Uang X', nilai: 1 }],
    investments: [{ id: 'inv1', name: 'Reksadana Pasar Uang X Kelas A' }],
  });
  const ctx = loadSource(['data-health-check.js'], { D, openModal: () => {} });
  const issues = ctx.runDataHealthCheck();
  const found = issues.filter((i) => i.title === 'Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)');
  assert.equal(found.length, 0);
});
