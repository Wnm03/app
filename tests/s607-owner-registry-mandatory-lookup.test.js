'use strict';
// tests/s607-owner-registry-mandatory-lookup.test.js — Sesi 607
// (RENCANA-SESI-s607-owner-registry-mandatory-lookup.md): 3 titik
// saveOwners() (Aset.saveOwners(), InvestmentUI.saveOwners(),
// AccOwners.save()) sekarang WAJIB lolos OwnerRegistry.findOrCreate()
// untuk baris pemilik BARU non-SELF -- fallback diam-diam ke uid() acak
// (gap tercatat sejak S583) DIHAPUS total dari ketiga titik ini.
//
// Cakupan test:
//   1. OwnerRegistry undefined + baris non-SELF baru -> saveOwners()/save()
//      BERHENTI (toast warning, D TIDAK berubah sama sekali).
//   2. Baris isSelf:true (SELF) tetap tersimpan walau OwnerRegistry undefined.
//   3. Baris ownerId sudah ada (existing) tetap tersimpan walau OwnerRegistry
//      undefined (tidak perlu lookup ulang).
//   4. OwnerRegistry ada tapi findOrCreate bukan function -> guard tetap
//      menolak (bukan cuma cek typeof OwnerRegistry==='undefined').
//   5. Baris pemilik baru tidak pernah menghasilkan ownerId divergen dari
//      OwnerRegistry (assertion eksplisit ketiga titik).
//
// Out of scope (lihat rencana sesi): dana-titipan-portfolio-render.js
// (sudah fail-fast sebelumnya), TitipanReconcile.*, MultiOwnerEngine.*,
// fallback uid() untuk baris isSelf ganda (bukan bagian registry lookup).

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
      todayStr: () => '2026-08-14',
    },
    extra || {}
  );
}

// ============================================================
// 1. Aset.saveOwners()
// ============================================================

test('Aset.saveOwners(): OwnerRegistry undefined + baris baru non-SELF -> DITOLAK, D.assets[].owners tidak tertulis, toast warning', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000 }], accounts: [], transactions: [], debts: [] };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'], // OwnerRegistry SENGAJA tidak dimuat
    baseGlobals({ D, toast: (m) => toastMessages.push(m) }),
    ['Aset', 'MultiOwnerEngine']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true }, { ownerId: '', ownerName: 'Budi', porsi: 40, isSelf: false }];
  ctx.Aset.saveOwners();

  assert.equal(D.assets[0].owners, undefined, 'D.assets tidak boleh berubah sama sekali saat guard menolak');
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')), 'harus toast warning fitur belum siap');
});

test('Aset.saveOwners(): OwnerRegistry undefined tapi SEMUA baris SELF/ownerId sudah ada -> TETAP tersimpan (tidak lewat findOrCreate())', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000 }], accounts: [], transactions: [], debts: [] };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    baseGlobals({ D, toast: (m) => toastMessages.push(m) }),
    ['Aset', 'MultiOwnerEngine']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true },
    { ownerId: 'legacy-manual-id', ownerName: 'Budi', porsi: 40, isSelf: false }, // ownerId sudah ada, bukan baris baru
  ];
  ctx.Aset.saveOwners();

  assert.equal(D.assets[0].owners.length, 2, 'baris SELF & baris existing tetap tersimpan walau OwnerRegistry undefined');
  assert.equal(D.assets[0].owners.find((o) => !o.isSelf).ownerId, 'legacy-manual-id');
});

test('Aset.saveOwners(): OwnerRegistry ADA tapi findOrCreate bukan function -> DITOLAK sama seperti undefined total', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000 }], accounts: [], transactions: [], debts: [] };
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    baseGlobals({ D, toast: (m) => toastMessages.push(m), OwnerRegistry: { findOrCreate: 'bukan-function' } }),
    ['Aset', 'MultiOwnerEngine']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true }, { ownerId: '', ownerName: 'Budi', porsi: 40, isSelf: false }];
  ctx.Aset.saveOwners();

  assert.equal(D.assets[0].owners, undefined, 'guard harus menolak walau OwnerRegistry ada (findOrCreate bukan function)');
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')));
});

test('Aset.saveOwners(): OwnerRegistry tersedia normal -> baris baru non-SELF ownerId == OwnerRegistry.findOrCreate(nama), 0 divergensi', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 100000000 }], accounts: [], transactions: [], debts: [], ownerRegistry: [] };
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    baseGlobals({ D, toast: () => {} }),
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry']
  );
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 60, isSelf: true }, { ownerId: '', ownerName: 'Budi', porsi: 40, isSelf: false }];
  ctx.Aset.saveOwners();

  const expectedId = ctx.OwnerRegistry.findOrCreate('Budi'); // findOrCreate idempotent, balikin id yang sama
  const savedBudi = D.assets[0].owners.find((o) => !o.isSelf);
  assert.equal(savedBudi.ownerId, expectedId, 'ownerId baris baru harus PERSIS sama dengan hasil OwnerRegistry.findOrCreate()');
});

// ============================================================
// 2. InvestmentUI.saveOwners()
// ============================================================

function makeInvestmentCtx(D, Investment, extra) {
  return loadSource(
    ['modules/asset/investasi-view.js'],
    baseGlobals(Object.assign({ D, Investment }, extra || {})),
    ['InvestmentUI']
  );
}

function makeInvestmentCtxWithRegistry(D, Investment, extra) {
  return loadSource(
    ['modules/shared/owner-registry.js', 'modules/asset/investasi-view.js'],
    baseGlobals(Object.assign({ D, Investment }, extra || {})),
    ['InvestmentUI', 'OwnerRegistry']
  );
}

test('InvestmentUI.saveOwners(): OwnerRegistry undefined + baris baru non-SELF -> DITOLAK, holding.owners tidak berubah, toast warning', () => {
  const holding = { id: 'h1', name: 'RD Saham', owners: [{ ownerId: 'SELF', porsi: 100 }] };
  const D = { investments: [holding], assets: [], debts: [] };
  const Investment = { setOwners(id, owners) { const h = D.investments.find((x) => x.id === id); h.owners = owners; return h; } };
  const toastMessages = [];
  const ctx = makeInvestmentCtx(D, Investment, { toast: (m) => toastMessages.push(m) });
  ctx.InvestmentUI._ownersModalHolding = holding;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 70, isSelf: true }, { ownerId: '', ownerName: 'Sinta', porsi: 30, isSelf: false }];
  ctx.InvestmentUI.saveOwners();

  assert.deepEqual(holding.owners, [{ ownerId: 'SELF', porsi: 100 }], 'holding.owners tidak boleh berubah saat guard menolak');
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')));
});

test('InvestmentUI.saveOwners(): OwnerRegistry undefined tapi baris ownerId sudah ada -> tetap tersimpan', () => {
  const holding = { id: 'h1', name: 'RD Saham', owners: [{ ownerId: 'SELF', porsi: 100 }] };
  const D = { investments: [holding], assets: [], debts: [] };
  const Investment = { setOwners(id, owners) { const h = D.investments.find((x) => x.id === id); h.owners = owners; return h; }, getOwners(h) { return h.owners || []; } };
  const ctx = makeInvestmentCtx(D, Investment, { toast: () => {} });
  ctx.InvestmentUI._ownersModalHolding = holding;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 70, isSelf: true }, { ownerId: 'legacy-id', ownerName: 'Sinta', porsi: 30, isSelf: false }];
  ctx.InvestmentUI.saveOwners();

  assert.equal(holding.owners.length, 2);
  assert.equal(holding.owners.find((o) => !o.isSelf).ownerId, 'legacy-id');
});

test('InvestmentUI.saveOwners(): OwnerRegistry ada tapi findOrCreate bukan function -> DITOLAK', () => {
  const holding = { id: 'h1', name: 'RD Saham', owners: [{ ownerId: 'SELF', porsi: 100 }] };
  const D = { investments: [holding], assets: [], debts: [] };
  const Investment = { setOwners(id, owners) { const h = D.investments.find((x) => x.id === id); h.owners = owners; return h; } };
  const toastMessages = [];
  const ctx = makeInvestmentCtx(D, Investment, { toast: (m) => toastMessages.push(m), OwnerRegistry: {} });
  ctx.InvestmentUI._ownersModalHolding = holding;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 70, isSelf: true }, { ownerId: '', ownerName: 'Sinta', porsi: 30, isSelf: false }];
  ctx.InvestmentUI.saveOwners();

  assert.deepEqual(holding.owners, [{ ownerId: 'SELF', porsi: 100 }]);
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')));
});

test('InvestmentUI.saveOwners(): OwnerRegistry tersedia normal -> ownerId baris baru == findOrCreate(nama), 0 divergensi', () => {
  const holding = { id: 'h1', name: 'RD Saham', owners: [{ ownerId: 'SELF', porsi: 100 }] };
  const D = { investments: [holding], assets: [], debts: [], ownerRegistry: [] };
  const Investment = { setOwners(id, owners) { const h = D.investments.find((x) => x.id === id); h.owners = owners; return h; }, getOwners(h) { return h.owners || []; } };
  const ctx = makeInvestmentCtxWithRegistry(D, Investment, { toast: () => {} });
  ctx.InvestmentUI._ownersModalHolding = holding;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 70, isSelf: true }, { ownerId: '', ownerName: 'Sinta', porsi: 30, isSelf: false }];
  ctx.InvestmentUI.saveOwners();

  const expectedId = ctx.OwnerRegistry.findOrCreate('Sinta');
  const savedSinta = holding.owners.find((o) => !o.isSelf);
  assert.equal(savedSinta.ownerId, expectedId);
});

// ============================================================
// 3. AccOwners.save()
// ============================================================

function makeAccCtx(D, extra) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/finance/akun.js'],
    baseGlobals(Object.assign({ D }, extra || {})),
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'AccOwners', 'getAccOwners', 'setAccOwners']
  );
}

function makeAccCtxWithRegistry(D, extra) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/finance/akun.js'],
    baseGlobals(Object.assign({ D }, extra || {})),
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset', 'AccOwners', 'getAccOwners', 'setAccOwners']
  );
}

test('AccOwners.save(): OwnerRegistry undefined + baris baru non-SELF -> DITOLAK, D.accounts[].owners tidak berubah, toast warning', () => {
  const D = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }], transactions: [] };
  const toastMessages = [];
  const ctx = makeAccCtx(D, { toast: (m) => toastMessages.push(m) });
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'A', porsi: 50, isSelf: false }, { ownerId: '', ownerName: 'B', porsi: 50, isSelf: false }];
  ctx.AccOwners.save();

  assert.equal(D.accounts[0].owners, undefined, 'D.accounts tidak boleh berubah sama sekali saat guard menolak');
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')));
});

test('AccOwners.save(): OwnerRegistry undefined tapi baris SELF baru -> tetap tersimpan (tidak lewat findOrCreate())', () => {
  const D = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }], transactions: [] };
  const ctx = makeAccCtx(D, { toast: () => {} });
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'Saya', porsi: 100, isSelf: true }];
  ctx.AccOwners.save();

  assert.equal(D.accounts[0].owners.length, 1);
  assert.equal(D.accounts[0].owners[0].ownerId, 'SELF');
});

test('AccOwners.save(): OwnerRegistry ada tapi findOrCreate bukan function -> DITOLAK', () => {
  const D = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }], transactions: [] };
  const toastMessages = [];
  const ctx = makeAccCtx(D, { toast: (m) => toastMessages.push(m), OwnerRegistry: { findOrCreate: null } });
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'A', porsi: 50, isSelf: false }, { ownerId: '', ownerName: 'B', porsi: 50, isSelf: false }];
  ctx.AccOwners.save();

  assert.equal(D.accounts[0].owners, undefined);
  assert.ok(toastMessages.some((m) => m.includes('belum siap dimuat')));
});

test('AccOwners.save(): OwnerRegistry tersedia normal -> ownerId baris baru == findOrCreate(nama), 0 divergensi', () => {
  const D = { assets: [], accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }], transactions: [], ownerRegistry: [] };
  const ctx = makeAccCtxWithRegistry(D, { toast: () => {} });
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'A', porsi: 50, isSelf: false }, { ownerId: '', ownerName: 'B', porsi: 50, isSelf: false }];
  ctx.AccOwners.save();

  const expectedA = ctx.OwnerRegistry.findOrCreate('A');
  const expectedB = ctx.OwnerRegistry.findOrCreate('B');
  assert.equal(D.accounts[0].owners.find((o) => o.ownerName === 'A').ownerId, expectedA);
  assert.equal(D.accounts[0].owners.find((o) => o.ownerName === 'B').ownerId, expectedB);
});
