'use strict';
// tests/s585-titipan-reconcile-saveowners-enforce.test.js — S583 sesi-9:
// Rekomendasi #3 bagian ENFORCEMENT. TitipanReconcile.checkAll() (sesi-6)
// sudah di-wire ke Tes Otomatis (sesi-7), tapi belum pernah dipanggil dari
// titik TULIS (saveOwners()) itu sendiri -- gap-nya "ketahuan kalau Tes
// Otomatis dijalankan", bukan "ketahuan saat kejadian". Sesi ini nutup gap
// itu lewat TitipanReconcile.warnIfNotOk(context), dipanggil dari 3 titik:
// Aset.saveOwners(), InvestmentUI.saveOwners(), AccOwners.save().
//
// Kontrak yang diuji:
//   1. Wiring — tiap titik saveOwners() manggil TitipanReconcile.warnIfNotOk()
//      SETELAH simpan berhasil, dengan context string yang benar (dites pakai
//      spy TitipanReconcile, TIDAK load titipan-reconcile.js asli -- logic
//      audit-nya sendiri sudah dites tuntas di titipan-reconcile.test.js).
//   2. Guard — TitipanReconcile belum termuat (typeof undefined, mis. halaman
//      yang tidak nge-load modules/finance/titipan-reconcile.js) -> saveOwners()
//      TETAP jalan tanpa error (0 regresi utk konsumen lama).
//   3. Non-blocking end-to-end — pakai titipan-reconcile.js ASLI + skenario yang
//      betulan bikin checkAll() ok:false (stale debt name pasca-rename manual) ->
//      console.warn terpanggil TAPI saveOwners() tetap SELESAI (data tersimpan,
//      toast sukses tetap muncul) -- gap TIDAK PERNAH menahan simpan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseGlobals(extra) {
  let _n = 0;
  return Object.assign(
    {
      document: { getElementById: () => null },
      escapeHtml: (s) => String(s),
      uid: () => 'owner_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      openModal: () => {},
      closeModal: () => {},
      withSaveGuard: (key, modalId, fn) => fn(),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-13',
    },
    extra || {}
  );
}

// --- 1a. Aset.saveOwners() -> TitipanReconcile.warnIfNotOk('Aset.saveOwners') ---
test('Aset.saveOwners(): memanggil TitipanReconcile.warnIfNotOk("Aset.saveOwners") setelah simpan sukses', () => {
  const calls = [];
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 100 }] }], accounts: [], transactions: [], debts: [] };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    baseGlobals({ D, toast: (m) => toastMessages.push(m), TitipanReconcile: { warnIfNotOk: (context) => { calls.push(context); return { ok: true }; } } }),
    ['Aset', 'MultiOwnerEngine']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true }, { ownerId: '', ownerName: 'Budi', porsi: 40, isSelf: false }];
  ctx.Aset.saveOwners();

  assert.deepEqual(calls, ['Aset.saveOwners'], 'warnIfNotOk() harus terpanggil tepat 1x dgn context yang benar');
  assert.ok(toastMessages.some((m) => m.includes('tersimpan')), 'simpan tetap sukses (toast sukses tetap muncul)');
});

// --- 1b. InvestmentUI.saveOwners() -> TitipanReconcile.warnIfNotOk('InvestmentUI.saveOwners') ---
test('InvestmentUI.saveOwners(): memanggil TitipanReconcile.warnIfNotOk("InvestmentUI.saveOwners") setelah simpan sukses', () => {
  const calls = [];
  const holding = { id: 'h1', name: 'RD Saham', owners: [{ ownerId: 'SELF', porsi: 100 }] };
  const D = { investments: [holding], assets: [], debts: [] };
  const Investment = {
    setOwners(id, owners) {
      const h = D.investments.find((x) => x.id === id);
      h.owners = owners;
      return h;
    },
    getOwners(h) { return h.owners || []; },
    holdingCost() { return 0; },
  };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/asset/investasi-view.js'],
    baseGlobals({ D, Investment, toast: (m) => toastMessages.push(m), TitipanReconcile: { warnIfNotOk: (context) => { calls.push(context); return { ok: true }; } } }),
    ['InvestmentUI']
  );
  ctx.InvestmentUI._ownersModalHolding = holding;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 70, isSelf: true }, { ownerId: '', ownerName: 'Sinta', porsi: 30, isSelf: false }];
  ctx.InvestmentUI.saveOwners();

  assert.deepEqual(calls, ['InvestmentUI.saveOwners'], 'warnIfNotOk() harus terpanggil tepat 1x dgn context yang benar');
  assert.ok(toastMessages.some((m) => m.includes('tersimpan')), 'simpan tetap sukses (toast sukses tetap muncul)');
});

// --- 1c. AccOwners.save() -> TitipanReconcile.warnIfNotOk('AccOwners.save') ---
test('AccOwners.save(): memanggil TitipanReconcile.warnIfNotOk("AccOwners.save") setelah simpan sukses', () => {
  const calls = [];
  const D = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }], transactions: [] };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js', 'modules/finance/akun.js'],
    baseGlobals({ D, toast: (m) => toastMessages.push(m), TitipanReconcile: { warnIfNotOk: (context) => { calls.push(context); return { ok: true }; } } }),
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'AccOwners', 'getAccOwners', 'setAccOwners']
  );
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'A', porsi: 50, isSelf: false }, { ownerId: '', ownerName: 'B', porsi: 50, isSelf: false }];
  ctx.AccOwners.save();

  assert.deepEqual(calls, ['AccOwners.save'], 'warnIfNotOk() harus terpanggil tepat 1x dgn context yang benar');
  assert.ok(toastMessages.some((m) => m.includes('tersimpan')), 'simpan tetap sukses (toast sukses tetap muncul)');
});

// --- 2. Guard: TitipanReconcile belum termuat -> saveOwners() tetap jalan ---
test('Guard: TitipanReconcile undefined (belum termuat) -> ketiga saveOwners() tetap sukses tanpa error', () => {
  const D1 = { assets: [{ id: 'a1', name: 'Tanah', nilai: 1000000, owners: [{ ownerId: 'SELF', porsi: 100 }] }], accounts: [], transactions: [], debts: [] };
  const ctx1 = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    baseGlobals({ D: D1, toast: () => {} }), // TitipanReconcile SENGAJA tidak diinject
    ['Aset', 'MultiOwnerEngine']
  );
  ctx1.Aset.renderList = () => {};
  ctx1.Aset._ownersModalAsset = D1.assets[0];
  ctx1.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 100, isSelf: true }];
  assert.doesNotThrow(() => ctx1.Aset.saveOwners());

  const D2 = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 1000, includeInBalance: true }], transactions: [] };
  const ctx2 = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js', 'modules/finance/akun.js'],
    baseGlobals({ D: D2, toast: () => {} }),
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'AccOwners']
  );
  ctx2.editAccIdx = 0;
  ctx2.AccOwners._accId = 'acc1';
  ctx2.AccOwners._draft = [{ ownerId: '', ownerName: 'A', porsi: 100, isSelf: true }];
  assert.doesNotThrow(() => ctx2.AccOwners.save());
});

// --- 3. Non-blocking end-to-end: TitipanReconcile ASLI, skenario checkAll() ok:false ---
test('End-to-end: checkAll() ok:false (stale debt name) -> console.warn terpanggil TAPI Aset.saveOwners() tetap SELESAI (non-blocking)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'own_budi', porsi: 40 }] }],
    accounts: [], transactions: [],
    // Debt ber-linkedOwnerId 'own_budi' tapi nama BASI (registry sudah "Budi Santoso") --
    // trigger checkDebtNameStaleness() -> checkAll().ok === false.
    debts: [{ id: 'd1', name: 'Budi', linkedAssetId: 'a1', linkedOwnerId: 'own_budi', nilai: 40000000 }],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
  };
  const toastMessages = [];
  const warnCalls = [];
  const fakeConsole = { warn: (...args) => warnCalls.push(args) };
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/finance/titipan-reconcile.js', 'modules/asset/aset.js'],
    baseGlobals({ D, toast: (m) => toastMessages.push(m), console: fakeConsole }),
    ['Aset', 'MultiOwnerEngine', 'TitipanReconcile']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  // Draft simpan ulang porsi yang SAMA (60/40) -- tujuan skenario ini murni
  // memicu checkDebtNameStaleness() (nama debt "Budi" vs registry "Budi
  // Santoso"), BUKAN mengubah porsi.
  ctx.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true }, { ownerId: 'own_budi', ownerName: 'Budi', porsi: 40, isSelf: false }];
  ctx.Aset.saveOwners();

  assert.equal(warnCalls.length, 1, 'console.warn harus terpanggil tepat 1x saat checkAll() menemukan gap');
  assert.match(warnCalls[0][0], /Aset\.saveOwners/, 'pesan warn harus menyebut context pemanggil');
  assert.ok(toastMessages.some((m) => m.includes('tersimpan')), 'saveOwners() TETAP selesai & toast sukses tetap muncul -- gap TIDAK menahan simpan');
  assert.equal(D.assets[0].owners.length, 2, 'a.owners tetap benar-benar tersimpan walau checkAll() ok:false');
});
