'use strict';
/**
 * s454-linked-account-multiowner-badge.test.js — lanjutan diskusi BUG-OWN-002/S449:
 * akun tertaut (assetAccId) SELALU disinkron ke NILAI PENUH instrumen, terlepas dari
 * berapa banyak pemilik & berapa porsi masing-masing (lihat linkedAccNilai di
 * Aset.save()/saveOwners()) -- ini SENGAJA (histori: nyoba nulis porsi SELF saja bikin
 * kartu akun tampil Rp0). Porsi non-SELF tetap kepegang lewat _syncOwnerDebts() (Buku
 * Utang), independen dari nominal akun tertaut.
 *
 * Gap: user multi-pemilik bisa salah kira akun tertaut = porsi mereka saja. FIX (opsi
 * 2a dari diskusi S454, disepakati skip opsi 2b/toggle & opsi 3/linkedAccountId per-
 * owner karena scope besar/risiko regresi): tambah badge peringatan di openActionsMenu()
 * KALAU aset multi-pemilik (MultiOwnerEngine.getOwners(a).isMultiOwner). 0 perubahan ke
 * logic saldo/utang -- murni informational, reuse penuh MultiOwnerEngine (sama pola
 * _renderTitipanSummary()).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, ...initial };
}

function baseCtx(D, fakeDoc, MultiOwnerEngine) {
  const recalcAccBalance = (accId) => {
    const acc = D.accounts.find((a) => a.id === accId);
    return acc ? (acc.balance || 0) : 0;
  };
  return loadSource(['modules/asset/aset-owners.js', 'modules/asset/aset.js'], {
    document: fakeDoc,
    D,
    sameId: (a, b) => String(a) === String(b),
    fmt: (n) => 'Rp' + n,
    escapeHtml: (s) => s,
    recalcAccBalance,
    openQS: () => {},
    MultiOwnerEngine,
  }, ['Aset']);
}

test('openActionsMenu() — aset multi-pemilik + akun tertaut -> badge peringatan porsi tampil', () => {
  const els = {
    assetActionsTitle: makeEl(),
    assetActionsMeta: makeEl(),
    assetActionsList: makeEl(),
  };
  const fakeDoc = { getElementById: (id) => els[id] || null };
  const asset = {
    id: 'a1', name: 'Rumah Kontrakan', jenis: 'Rumah/Bangunan', nilai: 1000000, accountId: 'acc1',
    owners: [
      { ownerId: 'SELF', porsi: 30, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'inv1', porsi: 70, ownerName: 'Investor A', isSelf: false },
    ],
  };
  const D = { assets: [asset], accounts: [{ id: 'acc1', name: 'BCA Sewa', balance: 1000000 }] };
  const MultiOwnerEngine = {
    getOwners: (a) => ({ ok: true, isMultiOwner: (a.owners || []).length > 1, owners: a.owners || [] }),
  };
  const ctx = baseCtx(D, fakeDoc, MultiOwnerEngine);
  ctx.Aset.openActionsMenu('a1');
  const meta = els.assetActionsMeta.innerHTML;
  assert.equal(meta.includes('100% nilai aset'), true, 'badge peringatan harus tampil untuk aset multi-pemilik dgn akun tertaut');
  assert.equal(meta.includes('BCA Sewa'), true, 'akun tertaut tetap tampil seperti biasa');
});

test('openActionsMenu() — aset single-owner (SELF saja) + akun tertaut -> TIDAK ada badge', () => {
  const els = {
    assetActionsTitle: makeEl(),
    assetActionsMeta: makeEl(),
    assetActionsList: makeEl(),
  };
  const fakeDoc = { getElementById: (id) => els[id] || null };
  const asset = {
    id: 'a2', name: 'Motor Pribadi', jenis: 'Kendaraan', nilai: 20000000, accountId: 'acc2',
    owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }],
  };
  const D = { assets: [asset], accounts: [{ id: 'acc2', name: 'Kas Utama', balance: 20000000 }] };
  const MultiOwnerEngine = {
    getOwners: (a) => ({ ok: true, isMultiOwner: (a.owners || []).length > 1, owners: a.owners || [] }),
  };
  const ctx = baseCtx(D, fakeDoc, MultiOwnerEngine);
  ctx.Aset.openActionsMenu('a2');
  const meta = els.assetActionsMeta.innerHTML;
  assert.equal(meta.includes('100% nilai aset'), false, 'badge TIDAK boleh tampil untuk aset single-owner');
});

test('openActionsMenu() — aset multi-pemilik TANPA akun tertaut -> TIDAK ada badge (tidak relevan)', () => {
  const els = {
    assetActionsTitle: makeEl(),
    assetActionsMeta: makeEl(),
    assetActionsList: makeEl(),
  };
  const fakeDoc = { getElementById: (id) => els[id] || null };
  const asset = {
    id: 'a3', name: 'Tanah Kebun', jenis: 'Tanah', nilai: 500000000, accountId: null,
    owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'inv2', porsi: 50, ownerName: 'Investor B', isSelf: false },
    ],
  };
  const D = { assets: [asset], accounts: [] };
  const MultiOwnerEngine = {
    getOwners: (a) => ({ ok: true, isMultiOwner: (a.owners || []).length > 1, owners: a.owners || [] }),
  };
  const ctx = baseCtx(D, fakeDoc, MultiOwnerEngine);
  ctx.Aset.openActionsMenu('a3');
  const meta = els.assetActionsMeta.innerHTML;
  assert.equal(meta.includes('100% nilai aset'), false, 'badge TIDAK boleh tampil kalau tidak ada akun tertaut');
});

test('openActionsMenu() — MultiOwnerEngine tidak dimuat -> tidak error, badge tidak tampil (fallback aman)', () => {
  const els = {
    assetActionsTitle: makeEl(),
    assetActionsMeta: makeEl(),
    assetActionsList: makeEl(),
  };
  const fakeDoc = { getElementById: (id) => els[id] || null };
  const asset = {
    id: 'a4', name: 'Ruko Investasi', jenis: 'Rumah/Bangunan', nilai: 300000000, accountId: 'acc4',
    owners: [
      { ownerId: 'SELF', porsi: 40, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'inv3', porsi: 60, ownerName: 'Investor C', isSelf: false },
    ],
  };
  const D = { assets: [asset], accounts: [{ id: 'acc4', name: 'BCA Ruko', balance: 300000000 }] };
  const ctx = baseCtx(D, fakeDoc, undefined);
  assert.doesNotThrow(() => ctx.Aset.openActionsMenu('a4'));
  const meta = els.assetActionsMeta.innerHTML;
  assert.equal(meta.includes('100% nilai aset'), false, 'tanpa MultiOwnerEngine, badge di-skip (fallback aman, bukan crash)');
});
