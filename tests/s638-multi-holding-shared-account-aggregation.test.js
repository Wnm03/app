'use strict';
// tests/s638-multi-holding-shared-account-aggregation.test.js — S638.
//
// LATAR: sebelum sesi ini, findLinkedHoldingForAccount() (transaksi.js) &
// semua konsumennya (resolveOwnerDefaultForAccount(), resolveTxOwnerSplitForAccount()
// filter-laporan.js, resolveAccOwnershipBadgeState() akun.js) pakai `.find()`
// (SINGULAR) -- kalau 2+ holding (D.investments[]) kebetulan sama-sama py
// `accountId` menunjuk akun yang sama, cuma holding PERTAMA di array yang
// kepakai; sisanya diam-diam diabaikan dari perhitungan owner/porsi (walau
// tetap terhitung benar di jalur migrasi/hapus akun, akun.js linkedHoldingsCount
// -- itu beda jalur, bukan yang dites di sini).
//
// FIX: findLinkedHoldingsForAccount() (PLURAL, balikin SEMUA holding yang cocok)
// + aggregateOwnersAcrossHoldings() (merge owners[] lintas holding, DIBOBOT
// NILAI Investment.holdingValue(h) tiap holding thd total nilai gabungan).
// Test ini mengunci kontrak fungsi baru itu SENDIRI (unit, tanpa loadSource
// modul lain) supaya independen dari drift resolver di file lain.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/owner-registry.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/finance/akun.js', 'modules/finance/transaksi.js', 'modules/finance/filter-laporan.js'],
    { D, document: { getElementById: () => null }, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s), uid: () => 'u' + Math.random().toString(36).slice(2), save: () => {}, toast: () => {} },
    ['resolveOwnerDefaultForAccount', 'resolveTxOwnerSplitForAccount', 'resolveAccOwnershipBadgeState', 'findLinkedHoldingsForAccount', 'aggregateOwnersAcrossHoldings', 'Investment'],
  );
}

function baseD() {
  return { assets: [], investments: [], investmentTx: [], investmentWatchlist: [], accounts: [{ id: 'accBRI', name: 'BRI', owners: [] }], debts: [], ownerRegistry: [], transactions: [] };
}

function holding(id, { unit, price, owners, accountId = 'accBRI' }) {
  return { id, name: 'Holding ' + id, unit, currentPrice: price, avgPrice: price, accountId, owners };
}

// ---------- findLinkedHoldingsForAccount() (plural) ----------

test('findLinkedHoldingsForAccount() balikin SEMUA holding yang cocok, bukan cuma pertama', () => {
  const D = baseD();
  D.investments = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'A', porsi: 100 }] }),
    holding('h2', { unit: 5, price: 2000, owners: [{ ownerId: 'B', porsi: 100 }] }),
    holding('h3', { unit: 1, price: 500, owners: [{ ownerId: 'C', porsi: 100 }] }),
    holding('h4', { unit: 1, price: 999, owners: [{ ownerId: 'D', porsi: 100 }], accountId: 'accLAIN' }),
  ];
  const ctx = makeCtx(D);
  const result = ctx.findLinkedHoldingsForAccount('accBRI');
  assert.strictEqual(result.length, 3);
  assert.deepStrictEqual(result.map((h) => h.id).sort(), ['h1', 'h2', 'h3']);
});

test('findLinkedHoldingsForAccount() balikin [] kalau tidak ada holding tertaut', () => {
  const D = baseD();
  D.investments = [holding('h1', { unit: 1, price: 1, owners: [], accountId: 'accLAIN' })];
  const ctx = makeCtx(D);
  assert.deepStrictEqual(ctx.findLinkedHoldingsForAccount('accBRI'), []);
});

test('findLinkedHoldingsForAccount() aman (0 crash) kalau accId kosong/Investment belum dimuat', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.strictEqual(ctx.findLinkedHoldingsForAccount(null).length, 0);
  assert.strictEqual(ctx.findLinkedHoldingsForAccount('').length, 0);
});

// ---------- aggregateOwnersAcrossHoldings() ----------

test('aggregateOwnersAcrossHoldings() — 3 holding beda owner, dibobot nilai (bukan rata-rata mentah)', () => {
  const D = baseD();
  // h1: nilai 10*1000=10.000, owner A 100%
  // h2: nilai 5*2000=10.000, owner B 100%
  // h3: nilai 1*500=500,     owner C 100%
  // total nilai = 20.500 -> bobot A=10000/20500, B=10000/20500, C=500/20500
  const holdings = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'A', porsi: 100 }] }),
    holding('h2', { unit: 5, price: 2000, owners: [{ ownerId: 'B', porsi: 100 }] }),
    holding('h3', { unit: 1, price: 500, owners: [{ ownerId: 'C', porsi: 100 }] }),
  ];
  const ctx = makeCtx(D);
  const owners = ctx.aggregateOwnersAcrossHoldings(holdings);
  const byId = Object.fromEntries(owners.map((o) => [o.ownerId, o.porsi]));
  assert.ok(Math.abs(byId.A - (10000 / 20500) * 100) < 0.01);
  assert.ok(Math.abs(byId.B - (10000 / 20500) * 100) < 0.01);
  assert.ok(Math.abs(byId.C - (500 / 20500) * 100) < 0.01);
  // Total porsi gabungan harus tetap ~100 (semua holding 100% teralokasi sendiri-sendiri)
  const total = owners.reduce((s, o) => s + o.porsi, 0);
  assert.ok(Math.abs(total - 100) < 0.01);
});

test('aggregateOwnersAcrossHoldings() — owner yang sama muncul di >1 holding, porsinya DIJUMLAH', () => {
  const D = baseD();
  // h1 nilai 10.000 owner A 100%; h2 nilai 10.000 owner A 50% + owner B 50%
  // bobot masing2 holding 50/50 (nilai sama) -> A total = 100*0.5 + 50*0.5 = 75, B = 50*0.5=25
  const holdings = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'A', porsi: 100 }] }),
    holding('h2', { unit: 10, price: 1000, owners: [{ ownerId: 'A', porsi: 50 }, { ownerId: 'B', porsi: 50 }] }),
  ];
  const ctx = makeCtx(D);
  const owners = ctx.aggregateOwnersAcrossHoldings(holdings);
  const byId = Object.fromEntries(owners.map((o) => [o.ownerId, o.porsi]));
  assert.ok(Math.abs(byId.A - 75) < 0.01);
  assert.ok(Math.abs(byId.B - 25) < 0.01);
});

test('aggregateOwnersAcrossHoldings() — 1 holding: hasil PERSIS Investment.getOwners() apa adanya (0 regresi)', () => {
  const D = baseD();
  const holdings = [holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'A', porsi: 60 }, { ownerId: 'B', porsi: 40 }] })];
  const ctx = makeCtx(D);
  const owners = ctx.aggregateOwnersAcrossHoldings(holdings);
  const byId = Object.fromEntries(owners.map((o) => [o.ownerId, o.porsi]));
  assert.strictEqual(byId.A, 60);
  assert.strictEqual(byId.B, 40);
});

test('aggregateOwnersAcrossHoldings() — semua holding nilai 0, fallback bobot sama rata (0 div-by-zero crash)', () => {
  const D = baseD();
  const holdings = [
    holding('h1', { unit: 0, price: 0, owners: [{ ownerId: 'A', porsi: 100 }] }),
    holding('h2', { unit: 0, price: 0, owners: [{ ownerId: 'B', porsi: 100 }] }),
  ];
  const ctx = makeCtx(D);
  const owners = ctx.aggregateOwnersAcrossHoldings(holdings);
  const byId = Object.fromEntries(owners.map((o) => [o.ownerId, o.porsi]));
  assert.ok(Math.abs(byId.A - 50) < 0.01);
  assert.ok(Math.abs(byId.B - 50) < 0.01);
});

test('aggregateOwnersAcrossHoldings() — [] kalau holdings kosong', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.strictEqual(ctx.aggregateOwnersAcrossHoldings([]).length, 0);
});

// ---------- Integrasi: resolveOwnerDefaultForAccount() / resolveTxOwnerSplitForAccount() ----------

test('resolveOwnerDefaultForAccount() — 3 holding tertaut ke 1 akun, owners gabungan (bukan cuma holding pertama)', () => {
  const D = baseD();
  D.investments = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'renov', porsi: 100 }] }),
    holding('h2', { unit: 5, price: 2000, owners: [{ ownerId: 'mas_sihab', porsi: 100 }] }),
    holding('h3', { unit: 1, price: 500, owners: [{ ownerId: 'aku', porsi: 100 }] }),
  ];
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('accBRI');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.source, 'holding');
  const ownerIds = res.owners.map((o) => o.ownerId).sort();
  assert.deepStrictEqual(ownerIds, ['aku', 'mas_sihab', 'renov']);
  // 3 owner -> tidak ada autoSelectId otomatis (butuh pilih manual, pola sama seperti 2+ owner biasa)
  assert.strictEqual(res.autoSelectId, null);
});

test('resolveOwnerDefaultForAccount() — 1 holding tertaut (kasus umum): hasil sama seperti sebelum S638', () => {
  const D = baseD();
  D.investments = [holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'aku', porsi: 100 }] })];
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('accBRI');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.source, 'holding');
  assert.strictEqual(res.owners.length, 1);
  assert.strictEqual(res.owners[0].ownerId, 'aku');
  assert.strictEqual(res.autoSelectId, 'aku');
});

test('resolveTxOwnerSplitForAccount() — 3 holding tertaut, field `holdings` (array) & `holding` (holding pertama, kompat lama) sama-sama terisi', () => {
  const D = baseD();
  D.investments = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'renov', porsi: 100 }] }),
    holding('h2', { unit: 5, price: 2000, owners: [{ ownerId: 'mas_sihab', porsi: 100 }] }),
    holding('h3', { unit: 1, price: 500, owners: [{ ownerId: 'aku', porsi: 100 }] }),
  ];
  const ctx = makeCtx(D);
  const res = ctx.resolveTxOwnerSplitForAccount('accBRI');
  assert.ok(res);
  assert.strictEqual(res.holdings.length, 3);
  assert.strictEqual(res.holding.id, 'h1');
  const ownerIds = res.owners.map((o) => o.ownerId).sort();
  assert.deepStrictEqual(ownerIds, ['aku', 'mas_sihab', 'renov']);
});

test('resolveAccOwnershipBadgeState() — 3 holding tertaut, badge baca owners gabungan (source:holding)', () => {
  const D = baseD();
  D.investments = [
    holding('h1', { unit: 10, price: 1000, owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] }),
    holding('h2', { unit: 5, price: 2000, owners: [{ ownerId: 'mas_sihab', porsi: 100, isSelf: false }] }),
    holding('h3', { unit: 1, price: 500, owners: [{ ownerId: 'aku', porsi: 100, isSelf: true }] }),
  ];
  const ctx = makeCtx(D);
  const res = ctx.resolveAccOwnershipBadgeState('accBRI');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.source, 'holding');
  assert.strictEqual(res.owners.length, 3);
  assert.strictEqual(res.isAllSelf, false);
});
