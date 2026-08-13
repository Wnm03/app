'use strict';
// tests/res-b-owner-resolver.test.js — Sesi Res-B (DESIGN-LOCK-LINKED-
// ASSET-ACCOUNT-OWNER-DEFAULT.md). Test data-layer MURNI (0 DOM/UI):
// getAccOwnersEffective() (akun.js) + resolveOwnerDefaultForAccount()
// (transaksi.js). Load SOURCE ASLI, bukan stub.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/finance/transaksi.js'],
    { D, document: { getElementById: () => null }, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    ['getAccOwnersEffective', 'resolveOwnerDefaultForAccount', 'findLinkedAssetForAccount'],
  );
}

// --- getAccOwnersEffective() -------------------------------------------------

test('Res-B [1/9]: raw owners[] ada -> dikembalikan apa adanya, needsConfirm:false', () => {
  const D = { accounts: [{ id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 100 }] }], assets: [] };
  const ctx = makeCtx(D);
  const res = ctx.getAccOwnersEffective('a1');
  assert.equal(res.needsConfirm, false);
  assert.deepEqual(res.owners.map((o) => o.ownerId), ['o1']);
});

test('Res-B [2/9]: raw kosong + ownership eksplisit SELF -> sintesis 1 owner 100%, needsConfirm:true', () => {
  const D = { accounts: [{ id: 'a1', ownership: 'SELF' }], assets: [] };
  const ctx = makeCtx(D);
  const res = ctx.getAccOwnersEffective('a1');
  assert.equal(res.needsConfirm, true);
  assert.equal(res.owners.length, 1);
  assert.equal(res.owners[0].porsi, 100);
});

test('Res-B [3/9]: raw kosong + ownership tidak diisi (default) -> owners:[]', () => {
  const D = { accounts: [{ id: 'a1' }], assets: [] };
  const ctx = makeCtx(D);
  const res = ctx.getAccOwnersEffective('a1');
  assert.equal(res.owners.length, 0);
  assert.equal(res.needsConfirm, false);
});

test('Res-B [4/9]: akun tidak ditemukan -> owners:[] (0 error)', () => {
  const D = { accounts: [], assets: [] };
  const ctx = makeCtx(D);
  const res = ctx.getAccOwnersEffective('ghost');
  assert.equal(res.owners.length, 0);
});

// --- resolveOwnerDefaultForAccount() -----------------------------------------

test('Res-B [5/9]: aset tertaut 1 owner eksplisit -> source:asset, autoSelectId terisi', () => {
  const D = {
    accounts: [{ id: 'acc1' }],
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100 }] }],
  };
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'asset');
  assert.equal(res.autoSelectId, 'budi');
  assert.equal(res.needsConfirm, false);
});

test('Res-B [6/9]: aset tertaut 2+ owner eksplisit -> source:asset, autoSelectId NULL (0 tie-break)', () => {
  const D = {
    accounts: [{ id: 'acc1' }],
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'budi', porsi: 60 }, { ownerId: 'wisnu', porsi: 40 }] }],
  };
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'asset');
  assert.equal(res.autoSelectId, null);
  assert.equal(res.owners.length, 2);
});

test('Res-B [7/9]: aset tertaut TANPA owners eksplisit (cuma ownership legacy) -> fallback ke account, BUKAN source:asset', () => {
  const D = {
    accounts: [{ id: 'acc1', ownership: 'SELF' }],
    assets: [{ id: 'as1', accountId: 'acc1', ownership: 'SELF' }],
  };
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'account');
  assert.equal(res.needsConfirm, true);
});

test('Res-B [8/9]: tidak ada aset tertaut, account.owners[] raw ada -> source:account, needsConfirm:false', () => {
  const D = {
    accounts: [{ id: 'acc1', owners: [{ ownerId: 'o1', porsi: 100 }] }],
    assets: [],
  };
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'account');
  assert.equal(res.needsConfirm, false);
  assert.equal(res.autoSelectId, 'o1');
});

test('Res-B [9/9]: 0 kandidat sama sekali -> source:none, owners:[] (0 regresi akun polos)', () => {
  const D = { accounts: [{ id: 'acc1' }], assets: [] };
  const ctx = makeCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'none');
  assert.equal(res.owners.length, 0);
  assert.equal(res.autoSelectId, null);
});
