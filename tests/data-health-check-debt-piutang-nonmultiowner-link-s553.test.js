'use strict';
// tests/data-health-check-debt-piutang-nonmultiowner-link-s553.test.js — S553
// (gap dari rekomendasi audit S551/S552): field `assetId` di Piutang/Utang
// berlabel "Kaitkan ke Aset Multi-Owner" (lihat modules/finance/
// piutang-utang.js resolveEntryAssetSelfPorsi()), tapi kalau aset yang
// ditautkan ternyata SINGLE-owner, tautan itu silent no-op (selfPorsi
// fallback 100%, sama spt tidak ditautkan) -- sebelumnya tidak ada
// peringatan apa pun soal ini. Beda dari S551 (owner-signature mismatch
// antara 2 entity yang sama-sama punya owners[]) -- piutang/utang TIDAK
// punya owners[] sendiri, jadi cek yang relevan di sini bukan "mismatch"
// tapi "link tidak berpengaruh apa-apa".

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

test('runDataHealthCheck: warn kalau Piutang tertaut ke aset SINGLE-owner', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Motor Vario', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
    piutang: [{ id: 'p1', name: 'Budi', nilai: 500000, assetId: 'a1' }],
  });
  const found = issues.filter((i) => i.title === 'Piutang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Motor Vario/);
});

test('runDataHealthCheck: TIDAK warn kalau Piutang tertaut ke aset MULTI-owner', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Tanah Patungan', owners: [
      { ownerId: 'SELF', porsi: 50, isSelf: true },
      { ownerId: 'adik', porsi: 50, isSelf: false },
    ] }],
    piutang: [{ id: 'p1', name: 'Budi', nilai: 500000, assetId: 'a1' }],
  });
  const found = issues.filter((i) => i.title === 'Piutang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau Piutang tidak ditautkan ke aset sama sekali', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Motor Vario', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
    piutang: [{ id: 'p1', name: 'Budi', nilai: 500000 }],
  });
  const found = issues.filter((i) => i.title === 'Piutang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: warn kalau Utang tertaut ke aset SINGLE-owner (pola sama dgn Piutang)', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Ruko Sendiri', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }],
    debts: [{ id: 'd1', name: 'Bank ABC', nilai: 10000000, assetId: 'a1' }],
  });
  const found = issues.filter((i) => i.title === 'Utang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Ruko Sendiri/);
});

test('runDataHealthCheck: TIDAK warn kalau Utang tertaut ke aset MULTI-owner', () => {
  const issues = run({
    assets: [{ id: 'a1', name: 'Ruko Patungan', owners: [
      { ownerId: 'SELF', porsi: 60, isSelf: true },
      { ownerId: 'partner', porsi: 40, isSelf: false },
    ] }],
    debts: [{ id: 'd1', name: 'Bank ABC', nilai: 10000000, assetId: 'a1' }],
  });
  const found = issues.filter((i) => i.title === 'Utang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: assetId orphan (aset dihapus) TIDAK ikut trigger cek non-multi-owner (guard linkedAsset ada)', () => {
  const issues = run({
    assets: [],
    piutang: [{ id: 'p1', name: 'Budi', nilai: 500000, assetId: 'sudah-dihapus' }],
  });
  const found = issues.filter((i) => i.title === 'Piutang tertaut ke aset yang bukan multi-owner');
  assert.equal(found.length, 0);
  const orphan = issues.filter((i) => i.title === 'Piutang tertaut ke Aset Multi-Owner yang sudah dihapus');
  assert.equal(orphan.length, 1);
});
