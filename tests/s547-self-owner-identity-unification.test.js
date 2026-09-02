'use strict';
// tests/s547-self-owner-identity-unification.test.js — GAP3-AUD-001 poin 4
// (audit awal): baris "Milik Sendiri" baru yang ditambah lewat modal
// Aset.saveOwners()/InvestmentUI.saveOwners() sebelumnya jatuh ke uid()
// acak, BUKAN literal 'SELF' yang dipakai getOwners() default (MultiOwnerEngine)
// & fallback investasi.js -- 2 identitas lepas utk "aku" yang sama. Fix:
// baris isSelf tanpa ownerId existing pakai 'SELF' (sekali per entity, baris
// isSelf ke-2 dst tetap fallback uid() krn multi-baris-isSelf memang dibolehkan).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeAsetCtx(D) {
  const el = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
  return loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    {
      D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, toast: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s),
      todayStr: () => '2026-08-10',
      fmt: (n) => String(n), fmtFull: (n) => String(n), fmtFullSigned: (n) => String(n),
      document: { getElementById: () => el, querySelectorAll: () => [], querySelector: () => null, createElement: () => el },
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
}

function baseD(assets) {
  return { assets: assets || [], accounts: [], debts: [], transactions: [], ownerRegistry: [] };
}

test('1. Aset.saveOwners() — baris baru isSelf:true tanpa ownerId existing -> ownerId "SELF" (bukan uid acak)', () => {
  const D = baseD([{ id: 'a1', name: 'Rumah', nilai: 500000000 }]);
  const { Aset } = makeAsetCtx(D);
  Aset._ownersModalAsset = D.assets[0];
  Aset._ownersDraft = [{ ownerId: '', ownerName: 'Saya', porsi: 100, isSelf: true }];
  Aset.saveOwners();
  const a = D.assets.find((x) => x.id === 'a1');
  assert.equal(a.owners[0].ownerId, 'SELF');
});

test('2. Aset.saveOwners() — >1 baris isSelf:true (dibolehkan by design) -> hanya baris pertama dapat "SELF", sisanya uid() unik (0 duplikat ownerId)', () => {
  const D = baseD([{ id: 'a1', name: 'Rumah', nilai: 500000000 }]);
  const { Aset } = makeAsetCtx(D);
  Aset._ownersModalAsset = D.assets[0];
  Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Saya', porsi: 50, isSelf: true },
    { ownerId: '', ownerName: 'Saya (catatan lain)', porsi: 50, isSelf: true },
  ];
  Aset.saveOwners();
  const a = D.assets.find((x) => x.id === 'a1');
  assert.equal(a.owners.length, 2);
  const ids = a.owners.map((o) => o.ownerId);
  assert.equal(new Set(ids).size, 2, 'ownerId harus unik, 0 duplikat');
  assert.ok(ids.includes('SELF'), 'salah satu baris tetap dapat SELF');
});

test('3. Aset.saveOwners() — konsistensi lintas 2 aset berbeda: SELF di aset A == SELF di aset B', () => {
  const D = baseD([
    { id: 'a1', name: 'Rumah', nilai: 500000000 },
    { id: 'a2', name: 'Mobil', nilai: 200000000 },
  ]);
  const { Aset } = makeAsetCtx(D);
  Aset._ownersModalAsset = D.assets[0];
  Aset._ownersDraft = [{ ownerId: '', ownerName: 'Saya', porsi: 100, isSelf: true }];
  Aset.saveOwners();
  Aset._ownersModalAsset = D.assets[1];
  Aset._ownersDraft = [{ ownerId: '', ownerName: 'Saya', porsi: 100, isSelf: true }];
  Aset.saveOwners();
  assert.equal(D.assets[0].owners[0].ownerId, D.assets[1].owners[0].ownerId);
  assert.equal(D.assets[0].owners[0].ownerId, 'SELF');
});

test('4. Aset.saveOwners() — baris non-SELF tetap lewat OwnerRegistry seperti sebelumnya (0 regresi S490)', () => {
  const D = baseD([{ id: 'a1', name: 'Rumah', nilai: 500000000 }]);
  const { Aset, OwnerRegistry } = makeAsetCtx(D);
  Aset._ownersModalAsset = D.assets[0];
  Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Saya', porsi: 50, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  Aset.saveOwners();
  const a = D.assets.find((x) => x.id === 'a1');
  const budiRow = a.owners.find((o) => o.ownerName === 'Budi');
  assert.equal(budiRow.ownerId, OwnerRegistry.findOrCreate('Budi'));
});
